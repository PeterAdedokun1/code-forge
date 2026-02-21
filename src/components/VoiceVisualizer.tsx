import { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  isRecording: boolean;
  audioLevel: number;
  className?: string;
  width?: number;
  height?: number;
}

export const VoiceVisualizer = ({
  isRecording,
  audioLevel,
  className = '',
  width = 300,
  height = 100
}: VoiceVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<number[]>(Array(20).fill(0));
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const barCount = 20;
    const barWidth = width / barCount;
    const targetHeight = audioLevel * height * 0.8;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      barsRef.current = barsRef.current.map((currentHeight) => {
        const randomVariation = (Math.random() - 0.5) * 10;
        const targetWithVariation = isRecording ? targetHeight + randomVariation : 2;
        const smoothingFactor = 0.2;
        return currentHeight + (targetWithVariation - currentHeight) * smoothingFactor;
      });

      barsRef.current.forEach((barHeight, index) => {
        const x = index * barWidth;
        const normalizedHeight = Math.max(2, Math.min(barHeight, height));
        const y = (height - normalizedHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + normalizedHeight);
        gradient.addColorStop(0, '#EC4899');
        gradient.addColorStop(0.5, '#E91E63');
        gradient.addColorStop(1, '#DB2777');

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 2, y, barWidth - 4, normalizedHeight);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, audioLevel, width, height]);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    </div>
  );
};
