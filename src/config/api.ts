export const environment = import.meta.env.VITE_ENVIRONMENT;

export const API_URL =
  environment === "prod"
    ? import.meta.env.VITE_PROD_API_URL
    : import.meta.env.VITE_DEV_API_URL;

export const STREAM_URL = `${API_URL}/stream`;
