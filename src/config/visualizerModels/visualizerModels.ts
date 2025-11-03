import { parseCSSColor } from "@utils/parseCSSColor";
import { DEFAULT_OPTIONS, interpolateColor } from "./DEFAULT";
import { radialPetals } from "./radialPetals";

export type VisualizationModelOptions = {
  darkMode?: boolean;
  scale?: number;
  colors?: string[];
  speed?: number;
  gamma?: number; // степень нелинейности
  percentile?: number; // уровень перцентиля нормализации (0..1)
};

// Базовая модель для всех визуализаций
export const baseVisualizer = (options: VisualizationModelOptions = {}) => {
  const { colors = DEFAULT_OPTIONS.colors, speed = DEFAULT_OPTIONS.speed } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const parsedColors = colors.map(
    (c) => parseCSSColor(c) || { r: 0, g: 0, b: 0 }
  );

  return {
    parsedColors,
    speed,
    options,
  };
};

// Модель "Pulse Circles"
export const pulseCircles = (options: VisualizationModelOptions = {}) => {
  const { parsedColors } = baseVisualizer(options);

  const getGradientColor = (pulseFactor: number) => {
    const colorCount = parsedColors.length;
    if (colorCount === 1) return parsedColors[0];

    const offset = pulseFactor * (colorCount - 1);
    const index1 = Math.floor(offset) % colorCount;
    const index2 = (index1 + 1) % colorCount;
    const factor = offset - Math.floor(offset);

    return interpolateColor(parsedColors[index1], parsedColors[index2], factor);
  };

  return (
    x: number,
    y: number,
    width: number,
    height: number,
    frequencyData: Uint8Array
  ) => {
    // Определяем позицию относительно центра
    const centerX = width / 2;
    const centerY = height / 2;
    const angle = Math.atan2(y - centerY, x - centerX);
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI); // От 0 до 1

    // Выбираем частоту в зависимости от угла
    const freqIndex = Math.floor(normalizedAngle * frequencyData.length);
    const amplitude = frequencyData[freqIndex] / 255;

    // Цвет зависит от амплитуды в этой точке
    const pulseFactor = amplitude;
    return getGradientColor(pulseFactor);
  };
};

// Остальные модели оставим как есть для краткости
// 1. Energy Bars
export const energyBars = (options: VisualizationModelOptions = {}) => {
  const { parsedColors } = baseVisualizer(options);
  const gamma = Math.max(0.3, options.gamma ?? 1.7);
  const percentile = Math.min(0.99, Math.max(0.5, options.percentile ?? 0.75));

  const getGradientColor = (energy: number) => {
    const colorCount = parsedColors.length;
    if (colorCount === 1) return parsedColors[0];

    const offset = energy * (colorCount - 1);
    const index1 = Math.floor(offset) % colorCount;
    const index2 = (index1 + 1) % colorCount;
    const factor = offset - Math.floor(offset);

    return interpolateColor(parsedColors[index1], parsedColors[index2], factor);
  };

  return (
    x: number,
    _y: number,
    width: number,
    _height: number,
    frequencyData: Uint8Array
  ) => {
    const len = Math.max(1, frequencyData.length);
    const norm = new Array<number>(len);
    for (let i = 0; i < len; i++) norm[i] = frequencyData[i] / 255;
    // референс по перцентилю спектра
    const sorted = norm.slice().sort((a, b) => a - b);
    const pIndex = Math.min(
      sorted.length - 1,
      Math.max(0, Math.floor(percentile * sorted.length))
    );
    const pRef = Math.max(0.05, sorted[pIndex]);

    const avg = norm.reduce((s, v) => s + v, 0) / len;
    const sensitivity = 2.0;
    const normalized = Math.min(1, (avg / pRef) * sensitivity);
    const nonlinear = Math.min(1, Math.pow(Math.max(0, normalized), gamma));
    return getGradientColor(nonlinear);
  };
};

// 2. Spectrum Waves
export const spectrumWaves = (options: VisualizationModelOptions = {}) => {
  const { parsedColors } = baseVisualizer(options);
  const gamma = Math.max(0.3, options.gamma ?? 1.7);
  const percentile = Math.min(0.99, Math.max(0.5, options.percentile ?? 0.75));

  const getGradientColor = (waveFactor: number) => {
    const colorCount = parsedColors.length;
    if (colorCount === 1) return parsedColors[0];

    const offset = waveFactor * (colorCount - 1);
    const index1 = Math.floor(offset) % colorCount;
    const index2 = (index1 + 1) % colorCount;
    const factor = offset - Math.floor(offset);

    return interpolateColor(parsedColors[index1], parsedColors[index2], factor);
  };

  return (
    x: number,
    y: number,
    width: number,
    height: number,
    frequencyData: Uint8Array
  ) => {
    const len = Math.max(1, frequencyData.length);
    const freqIndex = Math.min(
      len - 1,
      Math.max(0, Math.floor((x / Math.max(1, width)) * len))
    );
    const amp = frequencyData[freqIndex] / 255;

    const norm = new Array<number>(len);
    for (let i = 0; i < len; i++) norm[i] = frequencyData[i] / 255;
    const sorted = norm.slice().sort((a, b) => a - b);
    const pIndex = Math.min(
      sorted.length - 1,
      Math.max(0, Math.floor(percentile * sorted.length))
    );
    const pRef = Math.max(0.05, sorted[pIndex]);
    const sensitivity = 2.0;
    const normalized = Math.min(1, (amp / pRef) * sensitivity);
    const nonlinear = Math.min(1, Math.pow(Math.max(0, normalized), gamma));
    return getGradientColor(nonlinear);
  };
};

// 3. Polar
export const polar = (options: VisualizationModelOptions = {}) => {
  const { parsedColors } = baseVisualizer(options);

  const getGradientByFactor = (factor01: number) => {
    const colorCount = parsedColors.length;
    if (colorCount === 1) return parsedColors[0];
    const offset = factor01 * (colorCount - 1);
    const index1 = Math.floor(offset) % colorCount;
    const index2 = (index1 + 1) % colorCount;
    const factor = offset - Math.floor(offset);
    return interpolateColor(parsedColors[index1], parsedColors[index2], factor);
  };

  return (
    x: number,
    y: number,
    width: number,
    height: number,
    frequencyData: Uint8Array
  ) => {
    const lowRange =
      frequencyData
        .slice(0, frequencyData.length / 3)
        .reduce((a, b) => a + b, 0) /
      (frequencyData.length / 3) /
      255;
    const midRange =
      frequencyData
        .slice(frequencyData.length / 3, (2 * frequencyData.length) / 3)
        .reduce((a, b) => a + b, 0) /
      (frequencyData.length / 3) /
      255;
    const highRange =
      frequencyData
        .slice((2 * frequencyData.length) / 3)
        .reduce((a, b) => a + b, 0) /
      (frequencyData.length / 3) /
      255;

    const frequencyFactor = lowRange * 0.3 + midRange * 0.4 + highRange * 0.3; // 0..1

    // Усиленная чувствительность цвета (адаптивный перцентиль + pow)
    const len = Math.max(1, frequencyData.length);
    const norm = new Array<number>(len);
    for (let i = 0; i < len; i++) norm[i] = frequencyData[i] / 255;
    const sorted = norm.slice().sort((a, b) => a - b);
    const p75Index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.floor(0.75 * sorted.length))
    );
    const p75 = Math.max(0.05, sorted[p75Index]);
    const colorSensitivity = 1.7;
    const normalized = Math.min(1, (frequencyFactor / p75) * colorSensitivity);
    const nonlinear = Math.min(1, Math.pow(Math.max(0, normalized), 1.6));
    return getGradientByFactor(nonlinear);
  };
};

// 4. Adaptive colors (усиленная чувствительность по всему спектру)
export const adaptiveColors = (options: VisualizationModelOptions = {}) => {
  const { parsedColors } = baseVisualizer(options);
  const gamma = Math.max(0.3, options.gamma ?? 1.7);
  const percentile = Math.min(0.99, Math.max(0.5, options.percentile ?? 0.75));

  const getGradientByFactor = (factor01: number) => {
    const colorCount = parsedColors.length;
    if (colorCount === 1) return parsedColors[0];
    const offset = factor01 * (colorCount - 1);
    const index1 = Math.floor(offset) % colorCount;
    const index2 = (index1 + 1) % colorCount;
    const factor = offset - Math.floor(offset);
    return interpolateColor(parsedColors[index1], parsedColors[index2], factor);
  };

  return (
    x: number,
    _y: number,
    width: number,
    _height: number,
    frequencyData: Uint8Array
  ) => {
    const len = Math.max(1, frequencyData.length);
    // Выбираем частотный бин относительно позиции x (для warpGrid: x=i, width=layers)
    const binIndex = Math.min(
      len - 1,
      Math.max(0, Math.floor((x / Math.max(1, width)) * len))
    );
    const binAmp = frequencyData[binIndex] / 255; // 0..1

    // Адаптивная чувствительность по спектру
    const norm = new Array<number>(len);
    for (let i = 0; i < len; i++) norm[i] = frequencyData[i] / 255;
    const sorted = norm.slice().sort((a, b) => a - b);
    const pIndex = Math.min(
      sorted.length - 1,
      Math.max(0, Math.floor(percentile * sorted.length))
    );
    const pRef = Math.max(0.05, sorted[pIndex]);
    const colorSensitivity = 2.0;
    const normalized = Math.min(1, (binAmp / pRef) * colorSensitivity);
    const nonlinear = Math.min(1, Math.pow(Math.max(0, normalized), gamma));
    return getGradientByFactor(nonlinear);
  };
};

export { radialPetals };
