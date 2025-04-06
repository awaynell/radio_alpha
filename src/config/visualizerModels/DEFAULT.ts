export const DEFAULT_OPTIONS = {
  darkMode: true,
  scale: 2,
  colors: ["#A47864", "#BB2649", "#6667AB", "#F5DF4D", "#FF6F61", "#88B04B"],
  speed: 0.2,
};

export const interpolateColor = (
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  factor: number
) => ({
  r: Math.round(color1.r + (color2.r - color1.r) * factor),
  g: Math.round(color1.g + (color2.g - color1.g) * factor),
  b: Math.round(color1.b + (color2.b - color1.b) * factor),
});
