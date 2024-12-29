export interface IRadioStatus {
  icestats: Icestats;
}

export interface Icestats {
  admin: string;
  host: string;
  location: string;
  server_id: string;
  server_start: string;
  server_start_iso8601: string;
  source: Source;
}

export interface Source {
  audio_info: string;
  bitrate: number;
  genre: string;
  "ice-bitrate": number;
  "ice-channels": number;
  "ice-samplerate": number;
  listener_peak: number;
  listeners: number;
  listenurl: string;
  server_description: string;
  server_name: string;
  server_type: string;
  stream_start: string;
  stream_start_iso8601: string;
  dummy: null;
  title: string | null;
}
