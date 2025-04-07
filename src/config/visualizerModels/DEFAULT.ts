// Функция интерполяции цветов (оставляем как есть)
export const interpolateColor = (
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  factor: number
) => ({
  r: Math.round(color1.r + (color2.r - color1.r) * factor),
  g: Math.round(color1.g + (color2.g - color1.g) * factor),
  b: Math.round(color1.b + (color2.b - color1.b) * factor),
});

// Обновленные настройки с новой палитрой
export const DEFAULT_OPTIONS = {
  darkMode: true,
  scale: 2,
  colors: [
    "#FF0055", // Малиновый неон (низкие)
    "#FF5500", // Оранжевый неон
    "#FFCC00", // Ярко-желтый
    "#33FF99", // Мятный
    "#00FFFF", // Голубой неон
    "#3366FF", // Электрик-синий
    "#9933FF", // Фиолетовый неон
    "#FF66CC", // Ярко-розовый
  ],
  speed: 0.2,
};
