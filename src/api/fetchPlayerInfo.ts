import { API_URL } from "../config/api";
import { IRadioStatus } from "../types/IRadioStatus";

export const fetchStatusJson = async (): Promise<IRadioStatus | null> => {
  try {
    const response = await fetch(`${API_URL}/status`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching status JSON:", error);
    return null;
  }
};
