/**
 * Маппинг технических ошибок на понятные сообщения для пользователя
 */

export enum ErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface ErrorInfo {
  message: string;
  description?: string;
  retryable: boolean;
}

const ERROR_MESSAGES: Record<ErrorType, ErrorInfo> = {
  [ErrorType.NETWORK_ERROR]: {
    message: "Ошибка подключения",
    description:
      "Не удалось подключиться к серверу. Проверьте интернет-соединение.",
    retryable: true,
  },
  [ErrorType.TIMEOUT_ERROR]: {
    message: "Превышено время ожидания",
    description: "Сервер не отвечает. Попробуйте позже.",
    retryable: true,
  },
  [ErrorType.SERVER_ERROR]: {
    message: "Ошибка сервера",
    description: "Проблемы на стороне сервера. Мы уже работаем над этим.",
    retryable: true,
  },
  [ErrorType.NOT_FOUND]: {
    message: "Страница не найдена",
    description: "Запрашиваемый ресурс не существует.",
    retryable: false,
  },
  [ErrorType.UNAUTHORIZED]: {
    message: "Ошибка авторизации",
    description: "Недостаточно прав для выполнения операции.",
    retryable: false,
  },
  [ErrorType.UNKNOWN_ERROR]: {
    message: "Произошла ошибка",
    description: "Неизвестная ошибка. Попробуйте перезагрузить страницу.",
    retryable: true,
  },
};

/**
 * Определяет тип ошибки на основе объекта ошибки
 */
export const getErrorType = (error: unknown): ErrorType => {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return ErrorType.NETWORK_ERROR;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("timed out")) {
      return ErrorType.TIMEOUT_ERROR;
    }

    if (message.includes("network") || message.includes("failed to fetch")) {
      return ErrorType.NETWORK_ERROR;
    }

    if (message.includes("404") || message.includes("not found")) {
      return ErrorType.NOT_FOUND;
    }

    if (message.includes("401") || message.includes("unauthorized")) {
      return ErrorType.UNAUTHORIZED;
    }

    if (message.includes("500") || message.includes("server")) {
      return ErrorType.SERVER_ERROR;
    }
  }

  return ErrorType.UNKNOWN_ERROR;
};

/**
 * Получает понятное сообщение об ошибке для пользователя
 */
export const getErrorMessage = (error: unknown): ErrorInfo => {
  const errorType = getErrorType(error);
  return ERROR_MESSAGES[errorType];
};

/**
 * Форматирует сообщение об ошибке с дополнительным контекстом
 */
export const formatErrorMessage = (
  error: unknown,
  context?: string
): string => {
  const errorInfo = getErrorMessage(error);
  let message = errorInfo.message;

  if (context) {
    message = `${message} (${context})`;
  }

  return message;
};
