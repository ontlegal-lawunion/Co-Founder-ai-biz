import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  audioContext?: AudioContext | null;
  stream?: MediaStream | null;
}

export default function AudioVisualizer({ isActive, audioContext, stream }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isActive || !audioContext || !stream || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create analyser
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyserRef.current = analyser;

    // Animation loop
    const draw = () => {
      if (!ctx || !canvas) return;

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(243, 244, 246)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, 'rgb(147, 51, 234)');
        gradient.addColorStop(1, 'rgb(59, 130, 246)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (analyserRef.current) {
        source.disconnect(analyserRef.current);
      }
    };
  }, [isActive, audioContext, stream]);

  if (!isActive) return null;

  return (
    <div className="mt-4">
      <div className="text-sm text-gray-600 mb-2">Audio Input Level:</div>
      <canvas
        ref={canvasRef}
        width={600}
        height={80}
        className="w-full rounded-lg border border-gray-200"
      />
    </div>
  );
}
