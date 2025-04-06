import { MutableRefObject, useCallback, useRef, useEffect } from "react";

export const AudioVisualizer = (props: {
  model: (
    x: number,
    y: number,
    width: number,
    height: number,
    frequencyData: Uint8Array
  ) => { r: number; g: number; b: number };
  modelType: string;
  audioSrcRef?: MutableRefObject<MediaElementAudioSourceNode | null>;
  analyserRef?: React.RefObject<AnalyserNode>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}) => {
  const { model, modelType, audioSrcRef, analyserRef, canvasRef } = props;
  const lastAnimationFrameRequest = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);
  const FPS_LIMIT = 30;
  const FRAME_INTERVAL = 1000 / FPS_LIMIT;

  const renderFrame = useCallback(() => {
    if (!canvasRef?.current || !analyserRef?.current) return;

    const now = performance.now();
    if (now - lastFrameTime.current < FRAME_INTERVAL) {
      lastAnimationFrameRequest.current = requestAnimationFrame(renderFrame);
      return;
    }

    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    ctx.clearRect(0, 0, width, height);

    const baseColor = model(0, 0, width, height, frequencyData);

    switch (modelType) {
      case "polar":
      case "dominantFrequency": {
        const count = 128;
        const step = Math.floor(frequencyData.length / count);
        const maxRadius = Math.sqrt(centerX ** 2 + centerY ** 2) * 1.2;

        for (let i = 0; i < count; i++) {
          const index = i * step;
          const amplitude = frequencyData[index] / 255;
          if (amplitude < 0.02) continue;

          const radius = (i / count) * maxRadius;
          const alpha = 0.1 + amplitude * 0.8;

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`;
          ctx.lineWidth = 1 + amplitude * 4;
          ctx.stroke();
        }
        break;
      }

      case "energyBars": {
        const barCount = 64;
        const barWidth = width / barCount;
        const maxBarHeight = height * 0.8;

        for (let i = 0; i < barCount; i++) {
          const freqIndex = Math.floor((i / barCount) * frequencyData.length);
          const amplitude = frequencyData[freqIndex] / 255;

          const gradient = ctx.createLinearGradient(
            0,
            height,
            0,
            height - maxBarHeight
          );
          gradient.addColorStop(
            0,
            `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`
          );
          gradient.addColorStop(
            1,
            `rgb(${baseColor.r * 0.5}, ${baseColor.g * 0.5}, ${
              baseColor.b * 0.5
            })`
          );

          ctx.fillStyle = gradient;
          ctx.fillRect(
            i * barWidth + 2,
            height - amplitude * maxBarHeight,
            barWidth - 4,
            amplitude * maxBarHeight
          );
        }
        break;
      }

      case "spectrumWaves": {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        const time = performance.now() / 1000;

        for (let x = 0; x < width; x += 2) {
          const freqIndex = Math.floor((x / width) * frequencyData.length);
          const amplitude = frequencyData[freqIndex] / 255;

          const yPos =
            height / 2 +
            Math.sin(x * 0.02 + time * 2) * amplitude * 50 +
            Math.cos(x * 0.015 + time) * amplitude * 30;

          ctx.lineTo(x, yPos);
        }

        ctx.strokeStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }

      case "pulseCircles": {
        const time = performance.now() / 1000;
        const maxRadius = Math.min(width, height) * 0.4;
        const peaks = Array.from(frequencyData)
          .filter((_, i) => i % 10 === 0)
          .map((val) => val / 255);

        peaks.forEach((amplitude, i) => {
          const angle = (i / peaks.length) * Math.PI * 2;
          const pulse = Math.sin(time * 2 + i) * 0.5 + 0.5;

          // Вычисляем координаты круга
          const circleX = centerX + Math.cos(angle) * maxRadius * 0.8;
          const circleY = centerY + Math.sin(angle) * maxRadius * 0.8;

          // Получаем индивидуальный цвет для каждого круга
          const color = model(circleX, circleY, width, height, frequencyData);

          ctx.beginPath();
          ctx.arc(
            circleX,
            circleY,
            amplitude * maxRadius * 0.2 + pulse * 10,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${
            amplitude * 0.7
          })`;
          ctx.fill();
        });
        break;
      }

      default:
        console.warn("Unknown visualization type:", modelType);
    }

    lastFrameTime.current = now;
    lastAnimationFrameRequest.current = requestAnimationFrame(renderFrame);
  }, [canvasRef, analyserRef, model, modelType]);

  useEffect(() => {
    if (audioSrcRef?.current && analyserRef?.current && canvasRef?.current) {
      if (lastAnimationFrameRequest.current) {
        cancelAnimationFrame(lastAnimationFrameRequest.current);
      }
      lastFrameTime.current = performance.now();
      lastAnimationFrameRequest.current = requestAnimationFrame(renderFrame);
    }

    return () => {
      if (lastAnimationFrameRequest.current) {
        cancelAnimationFrame(lastAnimationFrameRequest.current);
      }
    };
  }, [audioSrcRef, analyserRef, canvasRef, renderFrame]);

  const refitCanvas = useCallback(() => {
    if (canvasRef?.current) {
      const { current: canvas } = canvasRef;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
  }, [canvasRef]);

  useEffect(() => {
    refitCanvas();
    if (canvasRef?.current) {
      const resizeObserver = new ResizeObserver(refitCanvas);
      resizeObserver.observe(canvasRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [canvasRef, refitCanvas]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};
