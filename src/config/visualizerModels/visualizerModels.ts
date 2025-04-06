import { parseCSSColor } from "@utils/parseCSSColor";
import { DEFAULT_OPTIONS, interpolateColor } from "./DEFAULT";

export type VisualizationModelOptions = {
  darkMode?: boolean;
  scale?: number;
  colors?: string[];
  speed?: number;
};

// Базовая модель для всех визуализаций
export const baseVisualizer = (options: VisualizationModelOptions = {}) => {
  const {
    colors = [
      "#FF6B6B", // Красный
      "#FF9F1C", // Оранжевый
      "#FFD60A", // Жёлтый
      "#2ECC71", // Зелёный
      "#4ECDC4", // Бирюзовый
      "#45B7D1", // Голубой
      "#3498DB", // Синий
      "#9B59B6", // Фиолетовый
      "#D4A5A5", // Розовый
    ],
    speed = DEFAULT_OPTIONS.speed,
  } = {
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

  const getGradientColor = (energy: number) => {
    const colorCount = parsedColors.length;
    if (colorCount === 1) return parsedColors[0];

    const offset = energy * (colorCount - 1);
    const index1 = Math.floor(offset) % colorCount;
    const index2 = (index1 + 1) % colorCount;
    const factor = offset - Math.floor(offset);

    return interpolateColor(parsedColors[index1], parsedColors[index2], factor);
  };

  return (frequencyData: Uint8Array) => {
    const energy =
      frequencyData.reduce((sum, val) => sum + val, 0) /
      frequencyData.length /
      255;
    return getGradientColor(energy);
  };
};

// 2. Spectrum Waves
export const spectrumWaves = (options: VisualizationModelOptions = {}) => {
  const { parsedColors } = baseVisualizer(options);

  const getGradientColor = (waveFactor: number) => {
    const colorCount = parsedColors.length;
    if (colorCount === 1) return parsedColors[0];

    const offset = waveFactor * (colorCount - 1);
    const index1 = Math.floor(offset) % colorCount;
    const index2 = (index1 + 1) % colorCount;
    const factor = offset - Math.floor(offset);

    return interpolateColor(parsedColors[index1], parsedColors[index2], factor);
  };

  return (x: number, width: number, frequencyData: Uint8Array) => {
    const freqIndex = Math.floor((x / width) * frequencyData.length);
    const amplitude = frequencyData[freqIndex] / 255;
    const waveFactor = amplitude;
    return getGradientColor(waveFactor);
  };
};

// 3. Polar
export const polar = (options: VisualizationModelOptions = {}) => {
  const { parsedColors } = baseVisualizer(options);

  const getGradientColor = (frequencyFactor: number) => {
    const colorCount = parsedColors.length;
    if (colorCount === 1) return parsedColors[0];

    const offset = frequencyFactor * (colorCount - 1);
    const index1 = Math.floor(offset) % colorCount;
    const index2 = (index1 + 1) % colorCount;
    const factor = offset - Math.floor(offset);

    return interpolateColor(parsedColors[index1], parsedColors[index2], factor);
  };

  return (frequencyData: Uint8Array) => {
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

    const frequencyFactor = lowRange * 0.3 + midRange * 0.4 + highRange * 0.3;
    return getGradientColor(frequencyFactor);
  };
};
