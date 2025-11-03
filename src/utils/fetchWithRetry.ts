type RetryOptions = {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
};

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000, // 1 секунда
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Выполняет fetch запрос с автоматическим retry при ошибках
 * @param url - URL для запроса
 * @param options - Опции для fetch и retry
 * @returns Promise с ответом или null при неудаче
 */
export const fetchWithRetry = async (
  url: string,
  fetchOptions?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response | null> => {
  const opts = { ...DEFAULT_OPTIONS, ...retryOptions };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // Если запрос успешен или статус не требует retry
      if (response.ok || !opts.retryableStatuses.includes(response.status)) {
        return response;
      }

      // Если это последняя попытка или статус не требует retry
      if (attempt === opts.maxRetries) {
        return response; // Возвращаем ответ даже если он не успешен
      }

      // Вычисляем задержку с экспоненциальным backoff
      const delay = opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt);

      // Ждем перед следующей попыткой
      await new Promise((resolve) => setTimeout(resolve, delay));

      continue;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Если это последняя попытка
      if (attempt === opts.maxRetries) {
        console.error(
          `Failed to fetch after ${opts.maxRetries + 1} attempts:`,
          lastError
        );
        return null;
      }

      // Вычисляем задержку с экспоненциальным backoff
      const delay = opts.retryDelay * Math.pow(opts.backoffMultiplier, attempt);

      // Ждем перед следующей попыткой
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return null;
};
