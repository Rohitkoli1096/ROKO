
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isListening: boolean;
  isActive: boolean;
  stream: MediaStream | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isListening, isActive, stream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current || !stream || !isListening) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const ctx = canvasRef.current.getContext('2d');

    const draw = () => {
      if (!ctx || !canvasRef.current) return;
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.8;
        ctx.fillStyle = isActive ? `rgb(0, 242, 255)` : `rgb(0, 242, 255, 0.3)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f2ff';
        ctx.fillRect(x, height / 2 - barHeight / 2, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audioCtx.close();
    };
  }, [isListening, stream, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={100} 
      className="w-full h-full"
    />
  );
};

export default AudioVisualizer;
