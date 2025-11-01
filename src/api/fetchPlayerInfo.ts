import { API_URL } from "../config/api";
import { IRadioStatus } from "../types/IRadioStatus";
import { fetchWithRetry } from "../utils/fetchWithRetry";
import { getErrorMessage } from "../utils/errorMessages";

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
      `${API_URL}/status-json.xsl`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
      {
        maxRetries: 3,
        retryDelay: 1000,
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
      const data = await response.json();
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
