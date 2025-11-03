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

export function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  const el = document.createElement("textarea");
  el.innerHTML = str;
  return el.value;
}

/**
 * Декодирует массив байтов как Windows-1251 в строку UTF-8
 * @param bytes - Массив байтов в кодировке Windows-1251
 * @returns Декодированная строка в UTF-8
 */
export function decodeWindows1251(bytes: Uint8Array): string {
  let result = "";

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];

    // ASCII символы (0-127) остаются без изменений
    if (byte < 128) {
      result += String.fromCharCode(byte);
    } else {
      // Маппинг Windows-1251 на Unicode
      // Для кириллицы: 192-223 -> А-Я (0x0410-0x042F), 224-255 -> а-я (0x0430-0x044F)
      if (byte >= 192 && byte <= 223) {
        // Кириллица верхний регистр
        result += String.fromCharCode(0x0410 + (byte - 192));
      } else if (byte >= 224 && byte <= 255) {
        // Кириллица нижний регистр
        result += String.fromCharCode(0x0430 + (byte - 224));
      } else {
        // Другие символы Windows-1251 (128-191, если есть)
        // Используем базовый маппинг для наиболее распространенных символов
        const cp1251ToUnicode: { [key: number]: number } = {
          // Специальные символы Windows-1251
          128: 0x0402, // Ђ
          129: 0x0403, // Ѓ
          130: 0x201a, // ‚
          131: 0x0453, // ѓ
          132: 0x201e, // „
          133: 0x2026, // …
          134: 0x2020, // †
          135: 0x2021, // ‡
          136: 0x20ac, // €
          137: 0x2030, // ‰
          138: 0x0409, // Љ
          139: 0x2039, // ‹
          140: 0x040a, // Њ
          141: 0x040c, // Ќ
          142: 0x040b, // Ћ
          143: 0x040f, // Џ
          144: 0x0452, // ђ
          145: 0x2018, // '
          146: 0x2019, // '
          147: 0x201c, // "
          148: 0x201d, // "
          149: 0x2022, // •
          150: 0x2013, // –
          151: 0x2014, // —
          152: 0x2122, // ™
          153: 0x0459, // љ
          154: 0x203a, // ›
          155: 0x045a, // њ
          156: 0x045c, // ќ
          157: 0x045b, // ћ
          158: 0x045f, // џ
          159: 0x00a0, // (неразрывный пробел)
          160: 0x040e, // Ў
          161: 0x045e, // ў
          162: 0x0408, // Ј
          163: 0x04a0, // Ҡ
          164: 0x0490, // Ґ
          165: 0x0491, // ґ
          166: 0x0401, // Ё
          167: 0x0451, // ё
          168: 0x0404, // Є
          169: 0x0454, // є
          170: 0x0406, // І
          171: 0x0456, // і
          172: 0x0407, // Ї
          173: 0x0457, // ї
          174: 0x0492, // Ғ
          175: 0x0493, // ғ
          176: 0x0405, // Ѕ
          177: 0x0455, // ѕ
          178: 0x0494, // Ҕ
          179: 0x0495, // ҕ
          180: 0x0496, // Җ
          181: 0x0497, // җ
          182: 0x0498, // Ҙ
          183: 0x0499, // ҙ
          184: 0x049a, // Қ
          185: 0x049b, // қ
          186: 0x049c, // Ҝ
          187: 0x049d, // ҝ
          188: 0x049e, // Ҟ
          189: 0x049f, // ҟ
          190: 0x04a0, // Ҡ
          191: 0x04a1, // ҡ
        };

        if (cp1251ToUnicode[byte] !== undefined) {
          result += String.fromCharCode(cp1251ToUnicode[byte]);
        } else {
          // Если символ не в маппинге, используем заменяющий символ
          result += String.fromCharCode(0xfffd); //
        }
      }
    }
  }

  return result;
}

/**
 * Исправляет double-encoding: когда UTF-8 текст был прочитан как Latin-1
 * Конвертирует строку вида "ÐŸÑÐ¸Ð²ÐµÑ" обратно в правильный UTF-8
 * @param str - Строка с неправильной кодировкой (double-encoded)
 * @returns Строка с правильной кодировкой
 */
export function fixDoubleEncoding(str: string): string {
  if (!str) return "";

  try {
    // Когда UTF-8 текст читается как Latin-1, каждый байт UTF-8 становится символом
    // Нужно получить байты из строки (интерпретируя каждый символ как байт) и декодировать как UTF-8
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.charCodeAt(i);
      // Если код больше 255, это уже не Latin-1 - возможно, текст уже правильный
      if (codePoint > 255) {
        return str; // Текст уже правильный, не трогаем
      }
      bytes[i] = codePoint;
    }

    // Декодируем байты как UTF-8
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
  } catch (error) {
    console.warn("Error fixing double encoding:", error);
    return str;
  }
}

/**
 * Исправляет неправильную кодировку кириллицы
 * Конвертирует строку, которая была интерпретирована как UTF-8, но на самом деле была в Windows-1251
 * @param str - Строка с неправильной кодировкой
 * @returns Строка с правильной кодировкой
 */
export function fixEncoding(str: string): string {
  if (!str) return "";

  // Сначала проверяем на double-encoding (когда UTF-8 читается как Latin-1)
  // Признаки: символы типа Ð, Ñ, Ð¸ и т.д. (диапазон 0x80-0xFF, но не кириллица)
  if (/[Ð-ÿ]/.test(str) && !/[А-Яа-яЁё]/.test(str)) {
    const fixed = fixDoubleEncoding(str);
    // Проверяем, исправилось ли (должна появиться кириллица)
    if (/[А-Яа-яЁё]/.test(fixed)) {
      return fixed;
    }
  }

  try {
    // Маппинг: когда Windows-1251 декодируется как UTF-8, получаются определенные символы
    // Мы маппим эти неправильно декодированные символы обратно на правильные
    // Это таблица соответствий для кириллицы Windows-1251 -> UTF-8
    const encodingMap: { [key: string]: string } = {
      // Маппинг кракозябр (когда Windows-1251 читается как UTF-8) на правильные символы
      Р: "А",
      С: "Б",
      Т: "В",
      У: "Г",
      Ф: "Д",
      Х: "Е",
      Ц: "Ж",
      Ч: "З",
      Ш: "И",
      Щ: "Й",
      Ъ: "К",
      Ы: "Л",
      Ь: "М",
      Э: "Н",
      Ю: "О",
      Я: "П",
      р: "а",
      с: "б",
      т: "в",
      у: "г",
      ф: "д",
      х: "е",
      ц: "ж",
      ч: "з",
      ш: "и",
      щ: "й",
      ъ: "к",
      ы: "л",
      ь: "м",
      э: "н",
      ю: "о",
      я: "п",
      // Дополнительные символы
      Ђ: "Р",
      Ѓ: "С",
      "‚": "Т",
      ѓ: "У",
      "„": "Ф",
      "…": "Х",
      "†": "Ц",
      "‡": "Ч",
      "€": "Ш",
      "‰": "Щ",
      Љ: "Ъ",
      "‹": "Ы",
      Њ: "Ь",
      Ќ: "Э",
      Ћ: "Ю",
      Џ: "Я",
      // Попытка использовать более точный маппинг через кодовые точки
    };

    // Альтернативный подход: пытаемся получить байты и переинтерпретировать их
    // Когда текст в Windows-1251 декодируется как UTF-8, некоторые символы превращаются в последовательности
    let result = "";

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const codePoint = char.charCodeAt(0);

      // Если символ в диапазоне кириллицы Windows-1251 (0x80-0xFF)
      // и он был неправильно декодирован, пытаемся исправить
      if (codePoint >= 0x400 && codePoint <= 0x4ff) {
        // Это может быть кириллица, но неправильно декодированная
        // Пытаемся переинтерпретировать через маппинг байтов
        const byte = codePoint & 0xff;

        // Маппинг Windows-1251 байтов на Unicode кириллицу
        if (byte >= 0xc0 && byte <= 0xff) {
          // Кириллица в Windows-1251 (192-255)
          const unicodeOffset = byte >= 0xe0 ? 0x0430 - 0xe0 : 0x0410 - 0xc0;
          const correctChar = String.fromCharCode(byte + unicodeOffset);

          // Проверяем, действительно ли это была ошибка кодировки
          // Если текущий символ не соответствует ожидаемому, заменяем
          if (encodingMap[char] || char !== correctChar) {
            result += correctChar;
          } else {
            result += char;
          }
        } else {
          result += char;
        }
      } else if (encodingMap[char]) {
        // Используем прямую замену из маппинга
        result += encodingMap[char];
      } else {
        result += char;
      }
    }

    // Если результат не изменился и есть подозрение на неправильную кодировку,
    // пытаемся более агрессивный подход: получаем байты через TextEncoder
    // и переинтерпретируем их
    if (
      result === str &&
      /[А-Яа-я]/.test(str) === false &&
      /[Р-Яр-я]/.test(str)
    ) {
      // Есть подозрение на неправильную кодировку (есть кракозябры)
      const encoder = new TextEncoder();
      const bytes = encoder.encode(str);

      // Пытаемся декодировать байты как Windows-1251
      // Создаем маппинг Windows-1251 -> Unicode для кириллицы
      let fixed = "";
      for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];

        if (byte < 128) {
          fixed += String.fromCharCode(byte);
        } else if (byte >= 192 && byte <= 223) {
          // Кириллица верхний регистр в Windows-1251
          fixed += String.fromCharCode(0x0410 + (byte - 192));
        } else if (byte >= 224 && byte <= 255) {
          // Кириллица нижний регистр в Windows-1251
          fixed += String.fromCharCode(0x0430 + (byte - 224));
        } else {
          fixed += String.fromCharCode(byte);
        }
      }

      // Используем исправленную версию только если она имеет смысл
      if (fixed !== str && /[А-Яа-я]/.test(fixed)) {
        return fixed;
      }
    }

    return result;
  } catch (error) {
    // В случае ошибки возвращаем исходную строку
    console.warn("Error fixing encoding:", error);
    return str;
  }
}
