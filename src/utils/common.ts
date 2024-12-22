export function generateGoodHexColor() {
  const hue = Math.floor(Math.random() * 360); // Оттенок от 0 до 360
  const saturation = Math.floor(Math.random() * 50) + 50; // Насыщенность от 50% до 100%
  const lightness = Math.floor(Math.random() * 30) + 40; // Яркость от 40% до 70%

  return hslToHex(hue, saturation, lightness);
}

function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
