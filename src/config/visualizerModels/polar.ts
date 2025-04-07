import { parseCSSColor } from "@utils/parseCSSColor";
import { DEFAULT_OPTIONS, interpolateColor } from "./DEFAULT";

export type PolarVisualizationModelOptions = {
  darkMode?: boolean;
  scale?: number;
  colors?: string[];
  speed?: number;
};

export const polar = (options: PolarVisualizationModelOptions = {}) => {
  const {
    scale,
    darkMode,
    colors = DEFAULT_OPTIONS.colors,
    speed = DEFAULT_OPTIONS.speed,
  } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const parsedColors = colors.map(
    (c) => parseCSSColor(c) || { r: 0, g: 0, b: 0 }
  );

  const getGradientColor = (frequencyFactor: number) => {
    const colorCount = parsedColors.length;
    if (colorCount === 1) return parsedColors[0];

    // Распределяем частоты на всю палитру
    const offset = frequencyFactor * colorCount; // От 0 до последнего цвета
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
    // Делим частоты на диапазоны: низкие, средние, высокие
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

    // Смешиваем влияние диапазонов
    const frequencyFactor = lowRange * 0.3 + midRange * 0.4 + highRange * 0.3; // Взвешенная сумма

    return getGradientColor(frequencyFactor);
  };
};
