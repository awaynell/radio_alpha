export function generateNextColor(currentColor: string): string {
  const { h, s, l } = hexToHsl(currentColor);

  const nextHue = ((h + 20) % 360) / 1; // Сдвиг на 20 градусов

  const nextColor = hslToHex(nextHue, s, l);

  return nextColor;
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  const hex = `#${f(0)}${f(8)}${f(4)}`;
  console.log(`Converted HSL(${h}, ${s}, ${l}) to HEX: ${hex}`);
  return hex;
}

function hexToHsl(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    throw new Error("Invalid HEX color format.");
  }

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }

    h *= 60;
    s = delta / (1 - Math.abs(2 * l - 1));
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hexToRgb(hex: string) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

export const encodeString = (rawData: string) => {
  const byteArray = Uint8Array.from(
    rawData.split("").map((c) => c.charCodeAt(0))
  );

  return new TextDecoder("UTF-8").decode(byteArray);
};
