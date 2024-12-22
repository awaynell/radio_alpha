import { API_URL } from "../config/api";

export const fetchCurrentSongTitle = async (
  onFullfilled: (songTitle: string) => void
) => {
  try {
    const response = await fetch(`${API_URL}/status-json.xsl`);
    const data = await response.json();
    onFullfilled(data?.icestats?.source?.title);
  } catch (error) {
    console.error("Error fetching song title:", error);
  }
};
