import { MutableRefObject, useCallback, useRef, useEffect } from "react";

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  age: number;
};
const VIS: {
  rot: number;
  prevPeaks: number[];
  beatEma: number;
  lastBeatT: number;
  beatPulse: number;
  beatCooldown: number;
  threshold: number;
  energyEma: number;
  _prevTime: number;
  sparks: Spark[];
  zOffset: number; // для warpGrid — сдвиг по глубине (0..1)
  smoothBins: number[];
  activityEma: number;
} = {
  rot: 0,
  prevPeaks: [],
  beatEma: 0,
  lastBeatT: -1,
  beatPulse: 0,
  beatCooldown: 0.22, // сек между срабатываниями бита
  threshold: 0.08, // дельта над EMA для детекции бита
  energyEma: 0, // эксп. среднее общей энергии (для глобального пульса)
  _prevTime: 0,
  sparks: [],
  zOffset: 0,
  smoothBins: [],
  activityEma: 0,
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
  analyserRef?: React.RefObject<AnalyserNode | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}) => {
  const { model, modelType, analyserRef, canvasRef } = props;

  const lastAnimationFrameRequest = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);
  const OVERSCAN = 1.0;
  const RENDER_SCALE = 0.65; // понижаем внутреннее разрешение ещё сильнее

  const FPS_DEFAULT = 24;
  const FPS_WARP = 20; // ниже FPS для тяжёлой анимации
  const FRAME_INTERVAL_DEFAULT = 1000 / FPS_DEFAULT;
  const FRAME_INTERVAL_WARP = 1000 / FPS_WARP;

  const renderFrame = useCallback(() => {
    if (!canvasRef?.current) return;

    const now = performance.now();
    const targetInterval =
      modelType === "warpGrid" ? FRAME_INTERVAL_WARP : FRAME_INTERVAL_DEFAULT;
    if (now - lastFrameTime.current < targetInterval) {
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

    const binCount = analyserRef?.current
      ? analyserRef.current.frequencyBinCount
      : 0;
    const frequencyData = new Uint8Array(binCount || 256);
    if (analyserRef?.current && binCount > 0) {
      analyserRef.current.getByteFrequencyData(frequencyData);
    } else {
      // Плейсхолдер: нулевой спектр, как при выключенном радио/нулевой громкости
      frequencyData.fill(0);
    }

    // Средняя энергия кадра 0..1
    let avgEnergy = 0;
    for (let i = 0; i < frequencyData.length; i++)
      avgEnergy += frequencyData[i];
    avgEnergy /= Math.max(1, frequencyData.length) * 255;

    ctx.clearRect(0, 0, width, height);

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

      case "radialPetals": {
        // Параметры лепестков
        const petalCount = 40;
        const step = Math.max(1, Math.floor(frequencyData.length / petalCount));
        // Радиус до угла экрана + небольшой запас, чтобы выходить за границы
        const maxRadius =
          Math.sqrt(centerX * centerX + centerY * centerY) * 1.08;

        for (let i = 0; i < petalCount; i++) {
          const idx = Math.min(frequencyData.length - 1, i * step);
          const amp = (frequencyData[idx] || 0) / 255; // 0..1

          const angle = (i / petalCount) * Math.PI * 2 + time * 0.2; // лёгкое вращение
          const angleLeft = angle - Math.PI / petalCount;
          const angleRight = angle + Math.PI / petalCount;

          // Длина и ширина зависят от амплитуды
          const length = maxRadius * (0.45 + amp * 0.55);
          const widthFactor = 0.25 + amp * 0.35; // «толщина» лепестка

          const cx = centerX;
          const cy = centerY;

          const tipX = cx + Math.cos(angle) * length;
          const tipY = cy + Math.sin(angle) * length;

          const ctrlLeftX = cx + Math.cos(angleLeft) * (length * widthFactor);
          const ctrlLeftY = cy + Math.sin(angleLeft) * (length * widthFactor);
          const ctrlRightX = cx + Math.cos(angleRight) * (length * widthFactor);
          const ctrlRightY = cy + Math.sin(angleRight) * (length * widthFactor);

          const color = model(i, 0, petalCount, height, frequencyData);
          const alpha = 0.25 + amp * 0.6;

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          // Левая кривая к вершине
          ctx.quadraticCurveTo(ctrlLeftX, ctrlLeftY, tipX, tipY);
          // Правая кривая обратно к центру
          ctx.quadraticCurveTo(ctrlRightX, ctrlRightY, cx, cy);

          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
          ctx.fill();

          // Обводка для чёткости
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${
            color.b
          }, ${Math.min(1, alpha + 0.15)})`;
          ctx.lineWidth = 1 + amp * 2.5;
          ctx.stroke();
        }
        // Второй слой лепестков (смещение фазы, меньший размер)
        const petalCount2 = Math.max(10, Math.floor(petalCount * 0.6));
        for (let i = 0; i < petalCount2; i++) {
          const idx = Math.min(frequencyData.length - 1, i * step);
          const amp = (frequencyData[idx] || 0) / 255;

          const angle =
            (i / petalCount2) * Math.PI * 2 +
            time * 0.35 +
            Math.PI / petalCount;
          const angleLeft = angle - Math.PI / petalCount2;
          const angleRight = angle + Math.PI / petalCount2;

          const length = maxRadius * (0.3 + amp * 0.4);
          const widthFactor = 0.18 + amp * 0.25;

          const cx = centerX;
          const cy = centerY;
          const tipX = cx + Math.cos(angle) * length;
          const tipY = cy + Math.sin(angle) * length;
          const ctrlLeftX = cx + Math.cos(angleLeft) * (length * widthFactor);
          const ctrlLeftY = cy + Math.sin(angleLeft) * (length * widthFactor);
          const ctrlRightX = cx + Math.cos(angleRight) * (length * widthFactor);
          const ctrlRightY = cy + Math.sin(angleRight) * (length * widthFactor);

          const color = model(i + 1000, 0, petalCount2, height, frequencyData);
          const alpha = 0.18 + amp * 0.45;

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.quadraticCurveTo(ctrlLeftX, ctrlLeftY, tipX, tipY);
          ctx.quadraticCurveTo(ctrlRightX, ctrlRightY, cx, cy);
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
          ctx.fill();
        }

        // Орбитальные точки
        const orbitCount = 24;
        const baseOrbit = Math.min(width, height) * (0.28 + avgEnergy * 0.12);
        for (let k = 0; k < orbitCount; k++) {
          const phase =
            (k / orbitCount) * Math.PI * 2 + time * (0.6 + avgEnergy * 1.2);
          const r = baseOrbit * (1.0 + 0.12 * Math.sin(time * 1.3 + k));
          const x = centerX + Math.cos(phase) * r;
          const y = centerY + Math.sin(phase) * r;
          const color = model(k + 2000, 0, orbitCount, height, frequencyData);
          const s = 2 + avgEnergy * 3;
          ctx.beginPath();
          ctx.arc(x, y, s, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${
            0.35 + avgEnergy * 0.4
          })`;
          ctx.fill();
        }
        // Искры: простые частицы, зависящие от энергии
        const sparksPerFrame = Math.floor(1 + avgEnergy * 3);
        for (let s = 0; s < sparksPerFrame; s++) {
          if (VIS.sparks.length < 120) {
            const a = Math.random() * Math.PI * 2;
            VIS.sparks.push({
              x: centerX,
              y: centerY,
              vx: Math.cos(a) * (20 + Math.random() * 80) * (0.5 + avgEnergy),
              vy: Math.sin(a) * (20 + Math.random() * 80) * (0.5 + avgEnergy),
              life: 0.8 + Math.random() * 0.7,
              age: 0,
            });
          }
        }
        const dt = 1 / 60; // приблизительно
        VIS.sparks = VIS.sparks.filter((sp) => {
          sp.age += dt;
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          const t = Math.max(0, 1 - sp.age / sp.life);
          const k = 1 - t;
          const cc = model(
            3000 + Math.floor(k * 1000),
            0,
            1000,
            height,
            frequencyData
          );
          const size = 1.5 + 2.5 * t;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cc.r}, ${cc.g}, ${cc.b}, ${0.15 + 0.5 * t})`;
          ctx.fill();
          return (
            sp.age < sp.life &&
            sp.x > -100 &&
            sp.x < width + 100 &&
            sp.y > -100 &&
            sp.y < height + 100
          );
        });

        break;
      }

      case "warpGrid": {
        // Параметры «полёта» через космос: слои квадратной матрицы
        const layers = 20; // меньше слоёв → выше FPS
        const speedZ = 0.16; // ещё более медленное движение к центру
        const twist = 0.12; // мягче поворот
        const timeZ = time * speedZ;

        // Частотная модуляция: используем усреднения для искажений
        const len = Math.max(1, frequencyData.length);
        const third = Math.floor(len / 3) || 1;
        let low = 0,
          mid = 0,
          high = 0;
        for (let i = 0; i < third; i++) low += frequencyData[i];
        for (let i = third; i < 2 * third; i++) mid += frequencyData[i];
        for (let i = 2 * third; i < len; i++) high += frequencyData[i];
        low = low / third / 255;
        mid = mid / third / 255;
        high = high / Math.max(1, len - 2 * third) / 255;

        // Искажения: масштаб по низким, волна по средним, «дрожь» по высоким (уменьшена рандомность)
        const scaleBoost = 1 + low * 0.5;
        const waveAmp = 0.05 + mid * 0.12;
        const jitter = 0.0008 + high * 0.004;

        // Общие настройки линий — плавность, скруглённые концы
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // Вспомогательная: рисуем скруглённый прямоугольник
        const roundedRect = (
          x: number,
          y: number,
          w: number,
          h: number,
          r: number
        ) => {
          const rr = Math.max(0, Math.min(r, Math.min(w, h) * 0.5));
          ctx.beginPath();
          ctx.moveTo(x + rr, y);
          ctx.lineTo(x + w - rr, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
          ctx.lineTo(x + w, y + h - rr);
          ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
          ctx.lineTo(x + rr, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
          ctx.lineTo(x, y + rr);
          ctx.quadraticCurveTo(x, y, x + rr, y);
        };

        // Проекция: для слоя по z берём фазу и выводим квадраты с перспективой
        for (let i = 0; i < layers; i++) {
          const depth = (i / layers + (timeZ % 1)) % 1; // 0..1, ближе к 0 — близко к камере
          // Перспектива: чем меньше depth, тем больше квадрат
          const inv = Math.max(0.05, depth);
          const baseScale = (1 / inv) * 0.16 * scaleBoost; // масштаб слоя
          const rot = time * twist + i * 0.04; // плавный поворот

          // Небольшие волновые искажения сторон от средних частот
          const wobble = Math.sin(time * 2 + i * 0.7) * waveAmp;
          // детерминированная «дрожь» вместо случайной — от высоких частот
          const noise = Math.sin(time * 6 + i * 1.3) * jitter;
          const sx = (1 + wobble) * baseScale * (1 + noise);
          const sy = (1 - wobble) * baseScale * (1 - noise);

          // Цвет/прозрачность по частоте слоя
          const layerBin = Math.min(
            len - 1,
            Math.max(0, Math.floor((i / Math.max(1, layers)) * len))
          );
          const layerAmp = (frequencyData[layerBin] || 0) / 255; // 0..1
          const color = model(i, 0, layers, height, frequencyData);
          const alpha = Math.min(1, 0.28 + (1 - depth) * 0.5 + layerAmp * 0.18);

          // Рисуем «проволочный» квадрат (матрицу) с перспективой
          const half = Math.min(width, height) * 0.5;
          const size = half * Math.min(2.2, Math.max(0.1, Math.max(sx, sy)));

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(rot);
          // Скругление углов зависит от глубины + низких частот
          const corner = Math.max(4, (1 - depth) * 18 + low * 12);
          roundedRect(-size, -size, size * 2, size * 2, corner);
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
          ctx.lineWidth = Math.max(1, (1 - depth) * 2.5 + layerAmp * 1.5);
          ctx.stroke();

          // Внутренние линии матрицы
          const gridN = depth < 0.55 ? 5 : depth < 0.82 ? 4 : 3;
          for (let g = 1; g < gridN; g++) {
            const t = g / gridN;
            const offset = (t - 0.5) * 2 * size;
            // лёгкое дугообразное отклонение линий зависимо от частоты
            const bend = wobble * size * 0.35;

            // Цвет от центра к краям: градиенты на линиях (меньше вызовов model)
            const buildGradient = (isVertical: boolean): CanvasGradient => {
              const grad = isVertical
                ? ctx.createLinearGradient(offset, -size, offset, size)
                : ctx.createLinearGradient(-size, offset, size, offset);
              const stops = [0, 0.25, 0.5, 0.75, 1]; // край→центр→край
              for (let si = 0; si < stops.length; si++) {
                const s = stops[si];
                // 0 и 1 — края; 0.5 — центр. Проецируем на частоты так, чтобы от краёв к центру рос индекс бина
                const centerProximity =
                  1 - Math.min(1, Math.abs(s - 0.5) / 0.5); // 0..1
                const binIndex = Math.min(
                  len - 1,
                  Math.max(0, Math.floor(centerProximity * (len - 1)))
                );
                const colorIdx = i * 100 + g * 10 + binIndex;
                const c = model(colorIdx, 0, len, height, frequencyData);
                grad.addColorStop(
                  s,
                  `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.max(0.28, alpha * 0.6)})`
                );
              }
              return grad;
            };

            // вертикали (сглаженные квадратичные кривые)
            ctx.beginPath();
            ctx.moveTo(offset, -size);
            ctx.quadraticCurveTo(offset + bend, 0, offset, size);
            ctx.strokeStyle = buildGradient(true);
            ctx.lineWidth = Math.max(0.9, (1 - depth) * 1.3 + layerAmp * 0.9);
            ctx.stroke();

            // горизонтали
            ctx.beginPath();
            ctx.moveTo(-size, offset);
            ctx.quadraticCurveTo(0, offset - bend, size, offset);
            ctx.strokeStyle = buildGradient(false);
            ctx.lineWidth = Math.max(0.9, (1 - depth) * 1.3 + layerAmp * 0.9);
            ctx.stroke();
          }
          ctx.restore();
        }
        break;
      }

      default:
        console.warn("Unknown visualization type:", modelType);
    }

    lastFrameTime.current = now;
    lastAnimationFrameRequest.current = requestAnimationFrame(renderFrame);
  }, [
    canvasRef,
    analyserRef,
    model,
    modelType,
    FRAME_INTERVAL_DEFAULT,
    FRAME_INTERVAL_WARP,
  ]);

  useEffect(() => {
    // Запускаем цикл отрисовки, даже если analyser ещё не инициализирован —
    // отрисуем плейсхолдер до старта аудио
    if (canvasRef?.current) {
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
  }, [canvasRef, renderFrame]);

  const refitCanvas = useCallback(() => {
    if (canvasRef?.current) {
      const { current: canvas } = canvasRef;
      const vw = Math.max(1, window.innerWidth);
      const vh = Math.max(1, window.innerHeight);
      canvas.width = Math.ceil(vw * OVERSCAN * RENDER_SCALE);
      canvas.height = Math.ceil(vh * OVERSCAN * RENDER_SCALE);
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

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
};
