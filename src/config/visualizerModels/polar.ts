import { parseCSSColor } from "@utils/parseCSSColor";
import { DEFAULT_OPTIONS, interpolateColor } from "./DEFAULT";

export type PolarVisualizationModelOptions = {
  darkMode?: boolean;
  scale?: number;
  colors?: string[];
  speed?: number;
  gamma?: number; // степень нелинейности для цветового маппинга
  percentile?: number; // уровень перцентиля нормализации (0..1)
};

export const polar = (options: PolarVisualizationModelOptions = {}) => {
  const {
    colors = DEFAULT_OPTIONS.colors,
    gamma = 1.6,
    percentile = 0.75,
  } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const parsedColors = colors.map(
    (c) => parseCSSColor(c) || { r: 0, g: 0, b: 0 }
  );

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
    _x: number,
    _y: number,
    _width: number,
    _height: number,
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
    const frequencyFactor = lowRange * 0.3 + midRange * 0.4 + highRange * 0.3; // 0..1

    // Усиленная чувствительность цвета:
    // 1) нормируем по перцентилю текущего спектра, чтобы усилить заметность всплесков
    const len = Math.max(1, frequencyData.length);
    const norm = new Array<number>(len);
    for (let i = 0; i < len; i++) norm[i] = frequencyData[i] / 255;
    const sorted = norm.slice().sort((a, b) => a - b);
    const pIndex = Math.min(
      sorted.length - 1,
      Math.max(
        0,
        Math.floor(Math.min(0.99, Math.max(0.5, percentile)) * sorted.length)
      )
    );
    const pRef = Math.max(0.05, sorted[pIndex]);

    // 2) адаптивный гейн + нелинейность для более резких смен
    const colorSensitivity = 1.7;
    const normalized = Math.min(1, (frequencyFactor / pRef) * colorSensitivity);
    const nonlinear = Math.min(
      1,
      Math.pow(Math.max(0, normalized), Math.max(0.3, gamma))
    );

    return getGradientByFactor(nonlinear);
  };
};
