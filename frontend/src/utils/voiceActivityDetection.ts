/**
 * Voice Activity Detection (VAD) for detecting when user is speaking
 * Used for barge-in functionality to interrupt AI responses
 */

export class VoiceActivityDetector {
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private threshold: number;
  private isListening: boolean = false;
  private checkInterval: number = 100; // ms between checks

  constructor(audioContext: AudioContext, stream: MediaStream, threshold: number = 30) {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.threshold = threshold;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
  }

  /**
   * Check if there is voice activity above threshold
   */
  public checkActivity(): boolean {
    // @ts-ignore - Web Audio API type mismatch
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate average volume across frequency bins
    const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;
    
    return average > this.threshold;
  }

  /**
   * Start continuously monitoring for voice activity
   * @param onActivity Callback when voice activity is detected
   * @param interval How often to check (ms)
   */
  public startListening(onActivity: () => void, interval: number = 100) {
    this.isListening = true;
    this.checkInterval = interval;
    
    const check = () => {
      if (!this.isListening) return;
      
      if (this.checkActivity()) {
        onActivity();
      }
      
      setTimeout(check, this.checkInterval);
    };
    
    check();
  }

  /**
   * Stop monitoring for voice activity
   */
  public stopListening() {
    this.isListening = false;
  }

  /**
   * Update the sensitivity threshold
   * @param threshold New threshold value (higher = less sensitive)
   */
  public setThreshold(threshold: number) {
    this.threshold = threshold;
  }

  /**
   * Clean up resources
   */
  public destroy() {
    this.stopListening();
    this.analyser.disconnect();
  }
}
