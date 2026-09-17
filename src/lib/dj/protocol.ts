export type DjTrack = {
  id: string;
  title: string;
  artist: string;
  tidalId?: string;
  tidalUrl?: string;
  spotifyUrl?: string;
};

export type DjVibe = {
  id: string;
  name: string;
  hue: string;
  shuffle: boolean;
  tracks: DjTrack[];
  tidalPlaylistId?: string;
};

export type DjCharacter = {
  id: string;
  name: string;
  anthem?: DjTrack;
};

export type DjOneshot = {
  characterId: string;
  resumeVibeId: string | null;
  resumeQueue: string[];
  resumeIndex: number;
};

export type DjTransport = {
  playing: boolean;
  vibeId: string | null;
  queue: string[];
  queueIndex: number;
  volume: number;
  oneshot: DjOneshot | null;
};

export type DjNowPlaying = {
  title: string;
  artist: string;
  isPlaying: boolean;
};

export type DjSearch = {
  requestId: string;
  query: string;
  status: "idle" | "searching" | "done" | "error";
  results: DjTrack[];
  error?: string;
};

export type DjState = {
  version: number;
  daemonOnline: boolean;
  vibes: DjVibe[];
  characters: DjCharacter[];
  transport: DjTransport;
  nowPlaying: DjNowPlaying | null;
  search: DjSearch | null;
  lastError?: string;
};

export type DjCommandName =
  | "playVibe"
  | "playAnthem"
  | "pause"
  | "resume"
  | "next"
  | "prev"
  | "setVolume"
  | "addTrack"
  | "removeTrack"
  | "reorderTracks"
  | "addCharacter"
  | "removeCharacter"
  | "updateCharacter"
  | "search"
  | "setShuffle";

export type DjCommand = {
  type: "command";
  id: string;
  name: DjCommandName;
  payload: Record<string, unknown>;
};

export type ClientHello =
  | { type: "hello"; role: "daemon"; secret: string }
  | { type: "hello"; role: "remote" };

export type RelayMessage =
  | { type: "ready"; daemonOnline: boolean; snapshot: DjState | null }
  | { type: "snapshot"; snapshot: DjState }
  | { type: "error"; message: string };

export type DaemonMessage = {
  type: "snapshot";
  snapshot: DjState;
};

export type WireMessage = ClientHello | DjCommand | RelayMessage | DaemonMessage;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseWireMessage(raw: string): WireMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || typeof value.type !== "string") return null;
    return value as WireMessage;
  } catch {
    return null;
  }
}

export function emptyTransport(): DjTransport {
  return {
    playing: false,
    vibeId: null,
    queue: [],
    queueIndex: 0,
    volume: 80,
    oneshot: null,
  };
}
