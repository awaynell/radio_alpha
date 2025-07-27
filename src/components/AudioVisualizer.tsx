import { MutableRefObject, useCallback, useRef, useEffect } from "react";

const VIS = {
  rot: 0,
  prevPeaks: [],
  beatEma: 0,
  lastBeatT: -1,
  beatPulse: 0,
  beatCooldown: 0.22, // сек между срабатываниями бита
  threshold: 0.08, // дельта над EMA для детекции бита
  energyEma: 0, // эксп. среднее общей энергии (для глобального пульса)
  _prevTime: 0,
};

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

        // --- стабильное dt ---
        const dt = Math.max(0.001, time - (VIS._prevTime || time));
        VIS._prevTime = time;

        // --- Бит по басу (как раньше, но чуть компактно) ---
        const bassBins = Math.min(32, frequencyData.length);
        let bassEnergy = 0;
        for (let i = 0; i < bassBins; i++) bassEnergy += frequencyData[i] / 255;
        bassEnergy /= Math.max(1, bassBins);

        const emaAlphaBeat = 0.15;
        VIS.beatEma =
          (1 - emaAlphaBeat) * VIS.beatEma + emaAlphaBeat * bassEnergy;

        const isBeat =
          bassEnergy - VIS.beatEma > VIS.threshold &&
          time - VIS.lastBeatT > VIS.beatCooldown;

        if (isBeat) {
          VIS.lastBeatT = time;
          VIS.beatPulse = 1; // краткий импульс на удар
        }
        // быстрый спад импульса бита
        VIS.beatPulse *= Math.exp(-dt * 6.0);

        // --- ГЛОБАЛЬНАЯ АКТИВНОСТЬ (чтобы пульсировал весь круг) ---
        // Усреднённая энергия по всему спектру
        let energy = 0;
        for (let i = 0; i < frequencyData.length; i++)
          energy += frequencyData[i];
        energy /= 255 * Math.max(1, frequencyData.length); // 0..1

        // EMA общей энергии
        const emaAlphaEnergy = 0.06; // более инертное среднее, чтобы не «молотило»
        VIS.energyEma =
          (1 - emaAlphaEnergy) * VIS.energyEma + emaAlphaEnergy * energy;

        // Положительная дельта над EMA — «активная партия»
        // Усиливаем коэффициентом, затем ограничиваем до [0..1]
        const activityPulse = Math.min(
          1,
          Math.max(0, (energy - VIS.energyEma) * 6.0)
        );

        // Итоговый импульс для «общего пульса» всей сцены:
        const globalPulse = Math.max(VIS.beatPulse, activityPulse);

        // --- Пики как у тебя, но слегка сгладим, чтобы убрать дрожь ---
        const rawPeaks = Array.from(frequencyData)
          .filter((_, i) => i % 10 === 0)
          .map((val) => val / 255);

        if (VIS.prevPeaks.length !== rawPeaks.length) {
          VIS.prevPeaks = rawPeaks.slice();
        }
        const peaks = rawPeaks.map((v, i) => {
          const prev = VIS.prevPeaks[i];
          return prev + (v - prev) * 0.25; // лёгкое сглаживание
        });
        VIS.prevPeaks = peaks;

        // --- Скорость вращения зависит от ритма/активности ---
        const baseRot = 0.9; // рад/сек
        const rotSpeed = baseRot * (0.7 + 0.6 * energy) + 1.8 * globalPulse;
        VIS.rot += rotSpeed * dt;

        // --- Кольцо «дышит» радиусом от активности/бита ---
        // Было 0.8, сделаем чуть больше + пульс при активной музыке
        const ringPulse = 1 + 0.05 * energy + 0.12 * globalPulse;
        const baseRing = maxRadius * 0.9 * ringPulse;

        peaks.forEach((amplitude, i) => {
          const angle = (i / peaks.length) * Math.PI * 2 + VIS.rot;

          // Небольшой, но не шумный wobble, чтобы узор жил
          const wobble =
            (Math.sin(time * 1.5 + i * 0.7) * 0.5 +
              Math.sin(time * 0.9 + i * 2.1) * 0.5) *
            0.012; // ±1.2%

          const radius = baseRing * (1 + wobble);
          const circleX = centerX + Math.cos(angle) * radius;
          const circleY = centerY + Math.sin(angle) * radius;

          // Базовое дыхание точки + локальная амплитуда + ГЛОБАЛЬНЫЙ ПУЛЬС
          const basePulse = Math.sin(time * 2 + i) * 0.5 + 0.5;

          // Усиление размера на активной партии — влияет на ВСЕ точки
          const sizeBoostOnPulse = globalPulse * 14; // px

          // Немного усилим вклад локальной амплитуды, чтобы не терялась детализация
          const r =
            basePulse * 20 +
            amplitude * maxRadius * 0.25 + // было 0.2 → чуть заметнее локальные пики
            sizeBoostOnPulse;

          // Цвет как у тебя
          const color = model(i, 0, peaks.length, height, frequencyData);

          // Альфа также «общая», чтобы круг целиком «дышал»
          const alpha = Math.min(
            1,
            0.28 + amplitude * 0.6 + globalPulse * 0.35
          );

          ctx.beginPath();
          ctx.arc(circleX, circleY, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
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
