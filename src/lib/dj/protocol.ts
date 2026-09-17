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
  tidalId?: string;
};

export type DjPendingAction =
  | "playVibe"
  | "playAnthem"
  | "next"
  | "prev"
  | "pause"
  | "resume";

export type DjPending = {
  action: DjPendingAction;
  label: string;
  vibeId?: string;
};

export type DjState = {
  version: number;
  catalogVersion: number;
  daemonOnline: boolean;
  vibes: DjVibe[];
  characters: DjCharacter[];
  transport: DjTransport;
  nowPlaying: DjNowPlaying | null;
  pending?: DjPending | null;
  lastError?: string;
};

export type DjLive = {
  version: number;
  catalogVersion: number;
  daemonOnline: boolean;
  transport: DjTransport;
  nowPlaying: DjNowPlaying | null;
  pending?: DjPending | null;
  lastError?: string;
};

export type DjCatalog = {
  catalogVersion: number;
  vibes: DjVibe[];
  characters: DjCharacter[];
};

export type DjCommandName =
  | "playVibe"
  | "playAnthem"
  | "pause"
  | "resume"
  | "next"
  | "prev"
  | "setVolume"
  | "addCharacter"
  | "removeCharacter"
  | "updateCharacter"
  | "refreshVibe";

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
  | { type: "live"; live: DjLive }
  | { type: "catalog"; catalog: DjCatalog }
  | { type: "error"; message: string };

export type DaemonMessage =
  | { type: "snapshot"; snapshot: DjState }
  | { type: "live"; live: DjLive }
  | { type: "catalog"; catalog: DjCatalog };

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

export function liveFromState(state: DjState): DjLive {
  return {
    version: state.version,
    catalogVersion: state.catalogVersion,
    daemonOnline: state.daemonOnline,
    transport: state.transport,
    nowPlaying: state.nowPlaying,
    pending: state.pending,
    lastError: state.lastError,
  };
}

export function catalogFromState(state: DjState): DjCatalog {
  return {
    catalogVersion: state.catalogVersion,
    vibes: state.vibes,
    characters: state.characters,
  };
}

export function emptyState(overrides?: Partial<DjState>): DjState {
  return {
    version: 0,
    catalogVersion: 0,
    daemonOnline: false,
    vibes: [],
    characters: [],
    transport: emptyTransport(),
    nowPlaying: null,
    pending: null,
    ...overrides,
  };
}

export function mergeLive(state: DjState, live: DjLive): DjState {
  return {
    ...state,
    version: live.version,
    catalogVersion: live.catalogVersion,
    daemonOnline: live.daemonOnline,
    transport: live.transport,
    nowPlaying: live.nowPlaying,
    pending: live.pending,
    lastError: live.lastError,
  };
}

export function mergeCatalog(state: DjState, catalog: DjCatalog): DjState {
  return {
    ...state,
    catalogVersion: catalog.catalogVersion,
    vibes: catalog.vibes,
    characters: catalog.characters,
  };
}

export function mergeParts(
  catalog: DjCatalog | null,
  live: DjLive | null,
  daemonOnline: boolean,
): DjState {
  return {
    version: live?.version ?? 0,
    catalogVersion: live?.catalogVersion ?? catalog?.catalogVersion ?? 0,
    daemonOnline,
    vibes: catalog?.vibes ?? [],
    characters: catalog?.characters ?? [],
    transport: live?.transport ?? emptyTransport(),
    nowPlaying: live?.nowPlaying ?? null,
    pending: live?.pending ?? null,
    lastError: live?.lastError,
  };
}
