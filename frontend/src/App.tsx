import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Message, SessionState } from './types';
import { prepareAudioChunk, decode, decodeAudioData } from './utils/audioUtils';
import { VoiceActivityDetector } from './utils/voiceActivityDetection';
import { useConversations } from './utils/useConversations';
import ConversationMessage from './components/ConversationMessage';
import Controls from './components/Controls';
import StatusIndicator from './components/StatusIndicator';
import AudioVisualizer from './components/AudioVisualizer';

// WebSocket configuration
const WS_URL = 'ws://localhost:8080';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

// This is a minimal type definition for the message we expect from the backend.
// We no longer import the full type from @google/genai on the frontend.
interface GeminiServerMessage {
  serverContent?: {
    modelTurn?: {
      parts: { inlineData: { data: string } }[];
    };
    inputTranscription?: { text: string };
    outputTranscription?: { text: string };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
}


const App: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.IDLE);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [interimTranscript, setInterimTranscript] = useState({ user: '', ai: '' });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Supabase conversation management
  const { saveCurrentConversation, savingConversation } = useConversations();

  // Refs for audio and WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputTranscriptionRef = useRef<string>('');
  const outputTranscriptionRef = useRef<string>('');
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const bargeInTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isBargeInActiveRef = useRef<boolean>(false);
  const isAISpeakingRef = useRef<boolean>(false);
  
  const stopAudioProcessing = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (vadRef.current) {
      vadRef.current.destroy();
      vadRef.current = null;
    }
    if (bargeInTimeoutRef.current) {
      clearTimeout(bargeInTimeoutRef.current);
      bargeInTimeoutRef.current = null;
    }
  }, []);

  const handleStopSession = useCallback(async () => {
    setSessionState(SessionState.IDLE);
    setErrorMessage('');
    setRetryCount(0);
    
    // Save conversation to Supabase if there are messages
    if (transcript.length > 0) {
      try {
        const durationSeconds = sessionStartTime 
          ? Math.floor((Date.now() - sessionStartTime) / 1000)
          : 0;
        
        const sessionId = `session-${Date.now()}`;
        await saveCurrentConversation(sessionId, transcript, durationSeconds);
      } catch (error) {
        console.error('Failed to save conversation:', error);
      }
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
    }
    wsRef.current = null;
    stopAudioProcessing();
    for (const source of audioSourcesRef.current.values()) {
        source.stop();
    }
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setSessionStartTime(null);
  }, [stopAudioProcessing, transcript, sessionStartTime, saveCurrentConversation]);


  const handleRetry = useCallback(() => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      setErrorMessage(`Failed to connect after ${MAX_RETRY_ATTEMPTS} attempts`);
      setSessionState(SessionState.ERROR);
      stopAudioProcessing();
      return;
    }

    setRetryCount(prev => prev + 1);
    setSessionState(SessionState.CONNECTING);
    setErrorMessage(`Reconnecting... (Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
    
    stopAudioProcessing();
    
    retryTimeoutRef.current = setTimeout(() => {
      handleStartSession();
    }, RETRY_DELAY);
  }, [retryCount, stopAudioProcessing]);

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    if (!outputAudioContextRef.current) return;
    
    // Skip playing if barge-in is active
    if (isBargeInActiveRef.current) {
      console.log('🚫 Skipping audio chunk - barge-in active');
      return;
    }
    
    try {
      const audioData = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, outputAudioContextRef.current, 24000, 1);
      
      // Check again right before starting (in case barge-in happened during decoding)
      if (isBargeInActiveRef.current) {
        console.log('🚫 Skipping audio start - barge-in active');
        return;
      }
      
      const source = outputAudioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContextRef.current.destination);
      
      const currentTime = outputAudioContextRef.current.currentTime;
      const startTime = Math.max(currentTime, nextStartTimeRef.current);
      
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
      
      // Mark AI as speaking
      setIsAISpeaking(true);
      isAISpeakingRef.current = true;
      
      audioSourcesRef.current.add(source);
      source.onended = () => {
        audioSourcesRef.current.delete(source);
        // If no more audio chunks playing, AI is done speaking
        if (audioSourcesRef.current.size === 0) {
          setIsAISpeaking(false);
          isAISpeakingRef.current = false;
          isBargeInActiveRef.current = false; // Reset barge-in flag when naturally done
        }
      };
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      setIsAISpeaking(false);
      isAISpeakingRef.current = false;
    }
  }, []);

    const handleBargeIn = useCallback(() => {
    console.log('🔴 BARGE-IN TRIGGERED - EMERGENCY STOP');
    
    // Set flag IMMEDIATELY to prevent new audio chunks from playing
    isBargeInActiveRef.current = true;
    
    // Clear any existing barge-in timeout
    if (bargeInTimeoutRef.current) {
      clearTimeout(bargeInTimeoutRef.current);
    }
    
    // IMMEDIATELY stop and disconnect all audio sources
    audioSourcesRef.current.forEach(source => {
      try {
        source.stop(0); // Stop immediately with no fade
        source.disconnect();
      } catch (error) {
        // Ignore if already stopped
      }
    });
    audioSourcesRef.current.clear();
    
    // Suspend audio context to halt ALL audio processing
    if (outputAudioContextRef.current?.state === 'running') {
      outputAudioContextRef.current.suspend();
    }
    
    // Reset audio timing to NOW (no queued audio)
    if (outputAudioContextRef.current) {
      nextStartTimeRef.current = 0; // Force reset
    }
    
    // Resume audio context quickly for next response
    setTimeout(() => {
      if (outputAudioContextRef.current?.state === 'suspended') {
        outputAudioContextRef.current.resume();
        if (outputAudioContextRef.current) {
          nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
        }
      }
    }, 50); // Reduced from 100ms
    
    setIsAISpeaking(false);
    isAISpeakingRef.current = false;
    
    // Send interrupt signal to backend
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    
    // Reset barge-in flag after 500ms (reduced from 1s) to allow new AI response
    bargeInTimeoutRef.current = setTimeout(() => {
      isBargeInActiveRef.current = false;
      console.log('✓ Barge-in cooldown complete');
    }, 500);
  }, []);

  const handleStartSession = useCallback(async () => {
    setTranscript([]);
    setInterimTranscript({ user: '', ai: '' });
    inputTranscriptionRef.current = '';
    outputTranscriptionRef.current = '';
    setSessionState(SessionState.CONNECTING);
    setErrorMessage('');
    setSessionStartTime(Date.now());

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      mediaStreamRef.current = stream;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection opened");
        setRetryCount(0);
        setErrorMessage('');
        
        // Reset barge-in flag for new session
        isBargeInActiveRef.current = false;
        
        try {
          // @ts-ignore
          inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
          // @ts-ignore
          outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

          mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
          scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
        } catch (audioError) {
          console.error("Audio context setup error:", audioError);
          setErrorMessage('Audio setup failed: ' + (audioError as Error).message);
          setSessionState(SessionState.ERROR);
          ws.close();
          return;
        }
        
        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
          const pcmBytes = prepareAudioChunk(inputData);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(pcmBytes);
          }
        };
        
        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);

        // Initialize Voice Activity Detection for barge-in
        if (inputAudioContextRef.current && stream) {
          vadRef.current = new VoiceActivityDetector(inputAudioContextRef.current, stream, 40); // Increased threshold to reduce false positives
          
          let activityStartTime: number | null = null;
          const SUSTAINED_ACTIVITY_THRESHOLD = 200; // ms - increased from 80ms to reduce false positives
          
          vadRef.current.startListening(() => {
            // ONLY trigger barge-in if AI is ACTUALLY speaking and barge-in isn't already active
            if (isAISpeakingRef.current && !isBargeInActiveRef.current) {
              if (!activityStartTime) {
                activityStartTime = Date.now();
              } else if (Date.now() - activityStartTime > SUSTAINED_ACTIVITY_THRESHOLD) {
                // Clear timeout to prevent duplicate triggers
                if (bargeInTimeoutRef.current) {
                  clearTimeout(bargeInTimeoutRef.current);
                }
                
                handleBargeIn();
                activityStartTime = null;
              }
            } else {
              activityStartTime = null;
            }
          }, 50); // Increased from 20ms to reduce CPU load and false positives
          
          console.log('✓ Voice Activity Detection enabled for barge-in');
        }
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Skip ALL incoming audio if barge-in is active
        if (data.type === 'audio' && isBargeInActiveRef.current) {
          console.log('🚫 Dropping incoming audio - barge-in active');
          return;
        }
        
        switch(data.type) {
          case 'session_ready':
            setSessionState(SessionState.ACTIVE);
            break;
          case 'audio':
            if(data.audio) {
              playAudioChunk(data.audio);
            }
            break;
          case 'transcription':
            if(data.who === 'user') {
              inputTranscriptionRef.current += data.text;
              setInterimTranscript(prev => ({ ...prev, user: inputTranscriptionRef.current }));
            } else if(data.who === 'ai') {
              outputTranscriptionRef.current += data.text;
              setInterimTranscript(prev => ({ ...prev, ai: outputTranscriptionRef.current }));
            }
            break;
          case 'turn_complete':
            if(inputTranscriptionRef.current.trim()) {
              setTranscript((prev) => [...prev, { sender: 'user', text: inputTranscriptionRef.current.trim() }]);
              inputTranscriptionRef.current = '';
              setInterimTranscript(prev => ({ ...prev, user: '' }));
            }
            if(outputTranscriptionRef.current.trim()) {
              setTranscript((prev) => [...prev, { sender: 'ai', text: outputTranscriptionRef.current.trim() }]);
              outputTranscriptionRef.current = '';
              setInterimTranscript(prev => ({ ...prev, ai: '' }));
            }
            break;
          case 'interrupted':
            // Google's server-side VAD detected interruption!
            console.log('🔴 Server-side interruption detected by Gemini');
            handleBargeIn();
            break;
          case 'error':
            console.error('Session error:', data.message);
            setSessionState(SessionState.ERROR);
            setErrorMessage(data.message || 'An error occurred');
            
            if (data.canRetry) {
              handleRetry();
            } else {
              handleStopSession();
            }
            break;
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setSessionState(SessionState.ERROR);
        setErrorMessage('Connection error occurred');
        handleRetry();
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        // If session was active, try to reconnect
        if (sessionState === SessionState.ACTIVE || sessionState === SessionState.CONNECTING) {
          setErrorMessage('Connection lost');
          handleRetry();
        }
      };

    } catch (error) {
      console.error('Failed to start session:', error);
      setSessionState(SessionState.ERROR);
      setErrorMessage('Failed to start session. Please try again.');
    }
  }, [handleStopSession, playAudioChunk, handleRetry, handleBargeIn, sessionState, isAISpeaking]);
  
  // Cleanup on component unmount only
  useEffect(() => {
    return () => {
      // Only cleanup when component actually unmounts
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      stopAudioProcessing();
    };
  }, []); // Empty dependency array = only run on mount/unmount

  return (
    <div className="flex flex-col h-screen font-sans bg-slate-900 text-white p-4 max-w-3xl mx-auto">
      <header className="text-center p-4 border-b border-slate-700">
        <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">A.I. ADHD Coach</h1>
        <p className="text-slate-400 mt-2">Your real-time partner for focus and clarity.</p>
      </header>

      {errorMessage && (
        <div className="bg-red-600/20 border border-red-600 rounded-lg p-3 m-4 text-center">
          <p className="text-red-400">{errorMessage}</p>
        </div>
      )}

      {isAISpeaking && (
        <div className="bg-blue-600/20 border border-blue-400 rounded-lg p-3 m-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <p className="text-blue-400 text-sm">AI is speaking - start talking to interrupt</p>
          </div>
        </div>
      )}

      <main className="flex-grow overflow-y-auto p-4 space-y-6 scroll-smooth" ref={el => el?.scrollTo(0, el.scrollHeight)}>
        {transcript.map((msg, index) => (
          <ConversationMessage key={index} message={msg} />
        ))}
        {interimTranscript.user && (
          <div className="flex justify-end">
            <div className="bg-blue-600/50 rounded-lg rounded-br-none p-3 max-w-xs md:max-w-md animate-pulse">
                <p className="text-white italic">{interimTranscript.user}</p>
            </div>
          </div>
        )}
        {interimTranscript.ai && (
            <div className="flex justify-start">
                <div className="bg-slate-700/50 rounded-lg rounded-bl-none p-3 max-w-xs md:max-w-md animate-pulse">
                    <p className="text-slate-300 italic">{interimTranscript.ai}</p>
                </div>
            </div>
        )}
        {sessionState === SessionState.IDLE && transcript.length === 0 && (
             <div className="text-center text-slate-500 pt-16">
                 <p>Press the microphone button to start your session.</p>
             </div>
        )}
      </main>

      <footer className="flex flex-col items-center justify-center p-4 border-t border-slate-700 bg-slate-900 sticky bottom-0">
        <AudioVisualizer 
          isActive={sessionState === SessionState.ACTIVE} 
          audioContext={inputAudioContextRef.current}
          stream={mediaStreamRef.current}
        />
        <StatusIndicator state={sessionState} />
        <Controls
          sessionState={sessionState}
          onStart={handleStartSession}
          onStop={handleStopSession}
        />
      </footer>
    </div>
  );
};

export default App;