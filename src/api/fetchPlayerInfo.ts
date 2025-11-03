import { API_URL, environment } from "../config/api";
import { IRadioStatus } from "../types/IRadioStatus";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { getErrorMessage } from "../utils/errorMessages";
import { decodeWindows1251, fixDoubleEncoding } from "../utils/common";

/**
 * Рекурсивно исправляет кодировку во всех строковых значениях объекта
 */
function fixEncodingInObject(obj: unknown): unknown {
  if (typeof obj === "string") {
    // Если строка содержит признаки double-encoding, исправляем
    if (/[Ð-ÿ]/.test(obj) && !/[А-Яа-яЁё]/.test(obj)) {
      return fixDoubleEncoding(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => fixEncodingInObject(item));
  }

  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = fixEncodingInObject(
          (obj as Record<string, unknown>)[key]
        );
      }
    }
    return result;
  }

  return obj;
}

export type FetchStatusResult = {
  data: IRadioStatus | null;
  error: string | null;
  isRetryable: boolean;
};

/**
 * Получает статус радио с автоматическим retry при ошибках
 * @returns Объект с данными, ошибкой и флагом возможности повтора
 */
export const fetchStatusJson = async (): Promise<FetchStatusResult> => {
  try {
    const response = await fetchWithRetry(
      environment === "dev"
        ? `${API_URL}/status-json.xsl`
        : `${API_URL}/status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
      {
        maxRetries: 1, // Уменьшено до 1 попытки, т.к. запросы статуса выполняются каждые 5 секунд
        retryDelay: 500, // Уменьшена задержка для более быстрого ответа
        backoffMultiplier: 2,
      }
    );

    if (!response) {
      const errorInfo = getErrorMessage(new Error("Network error"));
      return {
        data: null,
        error: errorInfo.message,
        isRetryable: errorInfo.retryable,
      };
    }

    if (!response.ok) {
      const errorInfo = getErrorMessage(
        new Error(`HTTP ${response.status}: ${response.statusText}`)
      );
      return {
        data: null,
        error: errorInfo.message,
        isRetryable: errorInfo.retryable,
      };
    }

    try {
      // Получаем данные как ArrayBuffer для правильного декодирования кодировки
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Сначала пытаемся декодировать как UTF-8
      let text = new TextDecoder("utf-8").decode(arrayBuffer);

      // Проверяем на double-encoding (когда UTF-8 читается как Latin-1)
      // Признаки: символы типа Ð, Ñ, Ð¸ и т.д., но нет нормальной кириллицы
      if (/[Ð-ÿ]/.test(text) && !/[А-Яа-яЁё]/.test(text)) {
        const fixed = fixDoubleEncoding(text);
        // Если исправление дало кириллицу, используем исправленный вариант
        if (/[А-Яа-яЁё]/.test(fixed)) {
          text = fixed;
        }
      }

      // Проверяем, есть ли признаки неправильной кодировки (кракозябры Windows-1251)
      // Если в тексте есть символы, которые выглядят как неправильно декодированная кириллица,
      // пробуем декодировать как Windows-1251
      const hasInvalidCyrillic =
        /[Р-Яр-яЁё]/.test(text) && !/[А-Яа-яЁё]/.test(text);
      const hasCommonCyrillicChars = /[А-Яа-яЁё]/.test(text);

      // Если есть подозрительные символы и нет нормальной кириллицы, пробуем Windows-1251
      if (hasInvalidCyrillic && !hasCommonCyrillicChars) {
        text = decodeWindows1251(bytes);
      }

      // Парсим JSON из правильно декодированного текста
      let data = JSON.parse(text) as IRadioStatus;

      // Рекурсивно исправляем кодировку во всех строковых значениях JSON
      // (на случай, если строки внутри JSON содержат double-encoding)
      data = fixEncodingInObject(data) as IRadioStatus;

      return {
        data,
        error: null,
        isRetryable: false,
      };
    } catch (parseError) {
      const errorInfo = getErrorMessage(parseError);
      return {
        data: null,
        error: "Не удалось обработать данные с сервера",
        isRetryable: errorInfo.retryable,
      };
    }
  } catch (error) {
    const errorInfo = getErrorMessage(error);

    console.error("Error fetching status JSON:", error);

    return {
      data: null,
      error: errorInfo.message,
      isRetryable: errorInfo.retryable,
    };
  }
};
