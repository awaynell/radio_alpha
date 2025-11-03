import { parseCSSColor } from "@utils/parseCSSColor";
import { DEFAULT_OPTIONS, interpolateColor } from "./DEFAULT";

export type RadialPetalsOptions = {
  darkMode?: boolean;
  scale?: number;
  colors?: string[];
  speed?: number;
  colorSensitivity?: number; // 1.0..2.0 — усиление чувствительности цвета
};

// Вспомогательная функция для быстрого расчёта перцентиля (по упорядоченному массиву значений 0..1)
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const idx = Math.min(
    values.length - 1,
    Math.max(0, Math.floor(p * values.length))
  );
  return values[idx];
}

export const radialPetals = (options: RadialPetalsOptions = {}) => {
  const {
    colors = DEFAULT_OPTIONS.colors,
    speed = DEFAULT_OPTIONS.speed,
    colorSensitivity = 1.6,
  } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const parsedColors = colors.map(
    (c) => parseCSSColor(c) || { r: 0, g: 0, b: 0 }
  );

  // Возвращаем цвет по индексу «лепестка» и текущему спектру
  return (
    x: number,
    y: number,
    width: number,
    height: number,
    frequencyData: Uint8Array
  ) => {
    // Энергия по диапазонам (0..1)
    const len = frequencyData.length;
    if (len === 0) return parsedColors[0] || { r: 255, g: 255, b: 255 };

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

    // Взвешенная сумма
    const energy = low * 0.3 + mid * 0.4 + high * 0.3; // 0..1

    // Подготовим массив нормированных значений для адаптивного нормирования по перцентилю
    const norm = new Array(len);
    for (let i = 0; i < len; i++) norm[i] = frequencyData[i] / 255;
    const sorted = norm.slice().sort((a, b) => a - b);
    const p75 = Math.max(0.05, percentile(sorted, 0.75)); // избежим слишком малых значений

    // Усиленная чувствительность: нормируем по p75 и добавляем нелинейность
    const normalized = Math.min(1, energy / p75) * colorSensitivity;
    const nonlinear = Math.min(1, Math.pow(Math.max(0, normalized), 1.8));

    // Маппинг на палитру
    const colorCount = parsedColors.length || 1;
    const offset = nonlinear * (colorCount - 1);
    const index1 = Math.floor(offset) % colorCount;
    const index2 = (index1 + 1) % colorCount;
    const factor = offset - Math.floor(offset);

    return interpolateColor(parsedColors[index1], parsedColors[index2], factor);
  };
};
