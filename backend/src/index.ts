// backend/src/index.ts

import express from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
// FIX: Import `Modality` as a value.
import { GoogleGenAI, Modality } from '@google/genai';
// FIX: Remove `LiveSession` as it's not an exported type.
import type { LiveServerMessage, Blob } from '@google/genai';

dotenv.config();

// Load system prompt from file
const PROMPT_FILE = process.env.PROMPT_FILE || 'adhd-coach.txt';
let systemPrompt: string;

try {
  systemPrompt = readFileSync(
    join(__dirname, '../prompts', PROMPT_FILE), 
    'utf-8'
  ).trim();
  console.log(`✓ Loaded system prompt from: ${PROMPT_FILE}`);
  console.log(`  Length: ${systemPrompt.length} characters (~${Math.round(systemPrompt.split(' ').length)} words)`);
} catch (error) {
  console.error(`✗ Failed to load prompt file: ${PROMPT_FILE}`);
  console.error('  Using default prompt...');
  
  // Fallback to default
  systemPrompt = `You are an AI ADHD Coach. Your goal is to be a supportive, empathetic, and motivating partner. 
Keep your responses concise, actionable, and encouraging. Focus on helping the user with tasks related to focus, 
procrastination, organization, and emotional regulation. Break down complex tasks into smaller steps. 
Use a calm and reassuring tone. Ask clarifying questions to understand the user's challenges.`;
}

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Simple base64 encode function for the backend
function encode(bytes: Buffer): string {
  return Buffer.from(bytes).toString('base64');
}

// FIX: Instantiate GoogleGenAI client once at the top level.
// FIX: Use `process.env.API_KEY` as per the coding guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// FIX: Infer the LiveSession type since it is not exported from the library.
type LiveSession = Awaited<ReturnType<typeof ai.live.connect>>;

// Map to store a Gemini session for each connected client
const sessions = new Map<WebSocket, LiveSession>();

// Session timeout configuration (5 minutes of inactivity)
const SESSION_TIMEOUT = 5 * 60 * 1000;
const sessionTimeouts = new Map<WebSocket, NodeJS.Timeout>();

function clearSessionTimeout(ws: WebSocket) {
  const timeout = sessionTimeouts.get(ws);
  if (timeout) {
    clearTimeout(timeout);
    sessionTimeouts.delete(ws);
  }
}

function setSessionTimeout(ws: WebSocket) {
  clearSessionTimeout(ws);
  
  const timeout = setTimeout(() => {
    console.log('Session timeout - closing connection due to inactivity');
    try {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Session timeout due to inactivity',
        canRetry: true
      }));
    } catch (e) {
      console.error('Error sending timeout message:', e);
    }
    
    const session = sessions.get(ws);
    if (session) {
      try {
        session.close();
      } catch (e) {
        console.error('Error closing session:', e);
      }
      sessions.delete(ws);
    }
    
    clearSessionTimeout(ws);
    ws.close();
  }, SESSION_TIMEOUT);
  
  sessionTimeouts.set(ws, timeout);
}

wss.on('connection', async (ws) => {
  console.log('Client connected. Initializing Gemini session...');

  // Set initial timeout
  setSessionTimeout(ws);

  try {
    const session = await ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        systemInstruction: systemPrompt,
      },
      callbacks: {
        onopen: () => {
          console.log('Gemini session opened.');
          try {
            ws.send(JSON.stringify({ type: 'session_ready' }));
          } catch (e) {
            console.error('Error sending session ready message:', e);
          }
        },
        onmessage: (message: LiveServerMessage) => {
          // Reset timeout on activity from Gemini
          setSessionTimeout(ws);
          
          try {
            // Process different types of messages from Gemini
            if (message.serverContent) {
              const content = message.serverContent;
              
              // Handle model turn (audio output)
              if (content.modelTurn) {
                const parts = content.modelTurn.parts || [];
                
                // Check if this response has audio
                const hasAudio = parts.some(p => p.inlineData?.mimeType?.startsWith('audio/pcm'));
                
                for (const part of parts) {
                  // Send audio data
                  if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
                    ws.send(JSON.stringify({
                      type: 'audio',
                      audio: part.inlineData.data
                    }));
                  }
                  
                  // If there's text but no audio in the response, it's a whisper (text-only response)
                  // Send it as transcription so it appears in the UI
                  if (part.text && !hasAudio) {
                    ws.send(JSON.stringify({
                      type: 'transcription',
                      who: 'ai',
                      text: part.text
                    }));
                  }
                }
              }
              
              // Handle input (user) audio transcription
              if ((content as any).inputAudioTranscription?.text) {
                ws.send(JSON.stringify({
                  type: 'transcription',
                  who: 'user',
                  text: (content as any).inputAudioTranscription.text
                }));
              }
              
              // Handle output (AI) audio transcription (what AI actually spoke)
              // This only exists when AI sends audio output
              if ((content as any).outputAudioTranscription?.text) {
                ws.send(JSON.stringify({
                  type: 'transcription',
                  who: 'ai',
                  text: (content as any).outputAudioTranscription.text
                }));
              }
              
              // Handle turn complete
              if (content.turnComplete) {
                ws.send(JSON.stringify({
                  type: 'turn_complete'
                }));
              }
              
              // Handle interrupted flag
              if (content.interrupted) {
                ws.send(JSON.stringify({
                  type: 'interrupted'
                }));
              }
            }
          } catch (e) {
            console.error('Error processing Gemini message:', e);
          }
        },
        onclose: () => {
          console.log('Gemini session closed.');
          clearSessionTimeout(ws);
          sessions.delete(ws);
        },
        onerror: (e: ErrorEvent) => {
          console.error('Gemini session error:', e);
          try {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Gemini session error',
              canRetry: true
            }));
          } catch (err) {
            console.error('Error sending error message:', err);
          }
          clearSessionTimeout(ws);
          sessions.delete(ws);
        },
      },
    });

    // Store the session in the map after connection is established
    sessions.set(ws, session);

  } catch (error) {
    console.error('Failed to initialize Gemini session:', error);
    try {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to initialize Gemini session',
        canRetry: true 
      }));
    } catch (e) {
      console.error('Error sending init error message:', e);
    }
    clearSessionTimeout(ws);
    ws.close();
  }

  ws.on('message', (message: Buffer) => {
    try {
      // Reset timeout on activity from client
      setSessionTimeout(ws);
      
      // Check if it's a JSON control message or binary audio data
      // JSON messages start with '{' and are typically small (<1KB)
      // Audio data is large binary buffers
      let isJSON = false;
      
      if (message.length < 1000) { // JSON messages are small
        try {
          const str = message.toString('utf8');
          if (str[0] === '{') {
            JSON.parse(str); // Validate it's proper JSON
            isJSON = true;
          }
        } catch (e) {
          // Not JSON, treat as audio
          isJSON = false;
        }
      }
      
      if (isJSON) {
        // Handle control messages
        const controlMsg = JSON.parse(message.toString());
        
        if (controlMsg.type === 'interrupt') {
          console.log('🔴 Interrupt signal received from client');
          
          const session = sessions.get(ws);
          if (session) {
            try {
              // Note: Gemini Live API will handle the interruption internally
              // We just log it and acknowledge. The audio generation will naturally stop
              // as the user starts sending new audio input.
              
              ws.send(JSON.stringify({ 
                type: 'interrupt_acknowledged',
                timestamp: Date.now()
              }));
              
              console.log('✓ Interrupt acknowledged');
            } catch (e) {
              console.error('Error handling interrupt:', e);
            }
          }
          return;
        }
      }
      
      // Handle audio data
      const session = sessions.get(ws);
      if (session) {
        const pcmBlob: Blob = {
          data: encode(message),
          mimeType: 'audio/pcm;rate=16000',
        };
        session.sendRealtimeInput({ media: pcmBlob });
      } else {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'No active session',
          canRetry: true 
        }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      try {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Error processing message',
          canRetry: false
        }));
      } catch (e) {
        console.error('Error sending error message:', e);
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected. Cleaning up session.');
    clearSessionTimeout(ws);
    const session = sessions.get(ws);
    if (session) {
      try {
        session.close();
      } catch (e) {
        console.error('Error closing session on disconnect:', e);
      }
      sessions.delete(ws);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearSessionTimeout(ws);
    const session = sessions.get(ws);
    if (session) {
      try {
        session.close();
      } catch (e) {
        console.error('Error closing session on error:', e);
      }
      sessions.delete(ws);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connections: wss.clients.size,
    activeSessions: sessions.size,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Received shutdown signal. Closing server gracefully...');
  
  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({ 
          type: 'error', 
          message: 'Server is shutting down' 
        }));
      } catch (e) {
        console.error('Error sending shutdown message:', e);
      }
      client.close();
    }
  });

  // Close all Gemini sessions
  sessions.forEach((session) => {
    try {
      session.close();
    } catch (e) {
      console.error('Error closing session during shutdown:', e);
    }
  });

  // Clear all timeouts
  sessionTimeouts.forEach((timeout) => clearTimeout(timeout));

  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);