let currentHsl = { h: 0, s: 100, l: 50 }; // Начальные значения HSL (можно изменить)

export function generateNextColor(baseColor: string): string {
  if (!currentHsl || currentHsl.h === undefined) {
    // Конвертируем начальный цвет в HSL при первом вызове
    currentHsl = hexToHsl(baseColor);
  }

  // Сдвигаем оттенок на 20 градусов
  currentHsl.h = (currentHsl.h + 20) % 360;

  // Генерируем новый цвет
  const nextColor = hslToHex(currentHsl.h, currentHsl.s, currentHsl.l);

  return nextColor;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`;

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
