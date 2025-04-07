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
    if (!canvasRef?.current) return;

    const now = performance.now();
    if (now - lastFrameTime.current < FRAME_INTERVAL) {
      lastAnimationFrameRequest.current = requestAnimationFrame(renderFrame);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const frequencyData = new Uint8Array(
      analyserRef?.current!.frequencyBinCount
    );
    if (analyserRef?.current) {
      analyserRef.current.getByteFrequencyData(frequencyData);
    }

    ctx.clearRect(0, 0, width, height);
    const baseColor = model(0, 0, width, height, frequencyData); // Базовый цвет

    const time = performance.now() / 1000;

    switch (modelType) {
      case "polar": {
        const count = 128;
        const step = Math.floor(frequencyData.length / count);
        const maxRadius = Math.sqrt(centerX ** 2 + centerY * 2) * 4;

        for (let i = 0; i < count; i++) {
          const index = i * step;
          const amplitude = frequencyData[index] / 255 || 0;
          const basePulse = Math.sin(time + i * 0.1) * 0.05;
          const radius = (i / count) * maxRadius;
          const alpha = 0.3 + amplitude * 0.7;

          // Получаем цвет для текущей частоты
          const color = model(i, 0, count, height, frequencyData);

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius * (0.5 + basePulse), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
          ctx.lineWidth = 1 + amplitude * 4;
          ctx.stroke();
        }
        break;
      }

      case "energyBars": {
        const barCount = 128;
        const barWidth = width / barCount;
        const maxBarHeight = height * 0.9;

        for (let i = 0; i < barCount; i++) {
          const freqIndex = Math.floor((i / barCount) * frequencyData.length);
          const amplitude = frequencyData[freqIndex] / 255 || 0;
          const baseHeight = 0.15;

          // Получаем цвет для текущей частоты
          const color = model(i, 0, barCount, height, frequencyData);

          const gradient = ctx.createLinearGradient(
            0,
            height,
            0,
            height - maxBarHeight
          );
          gradient.addColorStop(0, `rgb(${color.r}, ${color.g}, ${color.b})`);
          gradient.addColorStop(
            1,
            `rgb(${color.r * 0.5}, ${color.g * 0.5}, ${color.b * 0.5})`
          );

          ctx.fillStyle = gradient;
          ctx.fillRect(
            i * barWidth + 2,
            height - (amplitude + baseHeight) * maxBarHeight,
            barWidth - 4,
            (amplitude + baseHeight) * maxBarHeight
          );
        }
        break;
      }

      case "spectrumWaves": {
        const layers = 12;
        const verticalSpacing = height / (layers + 1);

        for (let layer = 0; layer < layers; layer++) {
          ctx.beginPath();
          ctx.moveTo(0, verticalSpacing * (layer + 1));

          for (let x = 0; x < width; x += 2) {
            const freqIndex = Math.floor((x / width) * frequencyData.length);
            const amplitude = frequencyData[freqIndex] / 255 || 0;
            const baseWave = Math.sin(x * 0.02 + time * 2 + layer * 0.5) * 10;

            const yPos =
              verticalSpacing * (layer + 1) +
              baseWave +
              Math.sin(x * 0.02 + time * 2 + layer * 0.5) * amplitude * 50 +
              Math.cos(x * 0.015 + time + layer * 0.3) * amplitude * 30;

            ctx.lineTo(x, yPos);
          }

          // Получаем цвет для текущего слоя
          const color = model(layer, 0, layers, height, frequencyData);
          ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          ctx.lineWidth = 10;
          ctx.stroke();

          // Вторая волна
          ctx.beginPath();
          ctx.moveTo(0, verticalSpacing * (layer + 1));
          for (let x = 0; x < width; x += 2) {
            const freqIndex = Math.floor((x / width) * frequencyData.length);
            const amplitude = frequencyData[freqIndex] / 255 || 0;
            const baseWave = Math.sin(x * 0.02 + time * 2 + layer * 0.5) * 20;

            const yPos =
              verticalSpacing * (layer + 1) +
              baseWave +
              Math.sin(x * 0.02 + time * 2 + layer * 0.5) * amplitude * 50 +
              Math.cos(x * 0.015 + time + layer * 0.3) * amplitude * 30;

            ctx.lineTo(x + 100, yPos);
          }
          ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          ctx.lineWidth = 5;
          ctx.stroke();

          // Третья волна
          ctx.beginPath();
          ctx.moveTo(0, verticalSpacing * (layer + 1));
          for (let x = 0; x < width; x += 1) {
            const freqIndex = Math.floor((x / width) * frequencyData.length);
            const amplitude = frequencyData[freqIndex] / 255 || 0;
            const baseWave = Math.sin(x * 0.03 + time * 1.5 + layer * 0.7) * 15;

            const yPos =
              verticalSpacing * (layer + 1) +
              baseWave +
              Math.sin(x * 0.03 + time * 1.5 + layer * 0.7) * amplitude * 40 +
              Math.cos(x * 0.01 + time * 0.8 + layer * 0.4) * amplitude * 25;

            ctx.lineTo(x + 200, yPos);
          }
          ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        break;
      }

      case "pulseCircles": {
        const maxRadius = Math.min(width, height) * 0.4;
        const peaks = Array.from(frequencyData)
          .filter((_, i) => i % 10 === 0)
          .map((val) => val / 255);

        peaks.forEach((amplitude, i) => {
          const angle = (i / peaks.length) * Math.PI * 2;
          const basePulse = Math.sin(time * 2 + i) * 0.5 + 0.5;
          const circleX = centerX + Math.cos(angle) * maxRadius * 0.8;
          const circleY = centerY + Math.sin(angle) * maxRadius * 0.8;

          // Получаем цвет для текущей частоты
          const color = model(i, 0, peaks.length, height, frequencyData);

          ctx.beginPath();
          ctx.arc(
            circleX,
            circleY,
            basePulse * 20 + amplitude * maxRadius * 0.2,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${
            0.3 + amplitude * 0.7
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
