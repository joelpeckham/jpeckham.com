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
  tidalId: string;
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

export type DjHealth = {
  cdp: boolean;
  tidal: boolean;
};

export type DjAck = {
  id: string;
  ok: boolean;
  error?: string;
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
  commandId?: string;
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
  lastAck?: DjAck | null;
  health?: DjHealth;
};

export type DjLive = {
  version: number;
  catalogVersion: number;
  daemonOnline: boolean;
  transport: DjTransport;
  nowPlaying: DjNowPlaying | null;
  pending?: DjPending | null;
  lastError?: string;
  lastAck?: DjAck | null;
  health?: DjHealth;
};

export type DjCatalog = {
  catalogVersion: number;
  vibes: DjVibe[];
  characters: DjCharacter[];
};

export const DJ_COMMAND_NAMES = [
  "playVibe",
  "playAnthem",
  "pause",
  "resume",
  "next",
  "prev",
  "setVolume",
  "addCharacter",
  "removeCharacter",
  "updateCharacter",
  "refreshVibe",
] as const;

export type DjCommandName = (typeof DJ_COMMAND_NAMES)[number];

export type DjCommand = {
  type: "command";
  id: string;
  name: DjCommandName;
  payload: Record<string, unknown>;
  enqueuedAt?: number;
};

export type ClientHello =
  | { type: "hello"; role: "daemon"; secret: string }
  | { type: "hello"; role: "remote"; secret: string };

export type RelayMessage =
  | { type: "ready"; daemonOnline: boolean; snapshot: DjState | null }
  | { type: "snapshot"; snapshot: DjState }
  | { type: "live"; live: DjLive }
  | { type: "catalog"; catalog: DjCatalog }
  | { type: "ack"; id: string; ok: boolean; error?: string }
  | { type: "pong" }
  | { type: "error"; message: string; code?: string };

export type DaemonMessage =
  | { type: "snapshot"; snapshot: DjState }
  | { type: "live"; live: DjLive }
  | { type: "catalog"; catalog: DjCatalog }
  | { type: "ack"; id: string; ok: boolean; error?: string }
  | { type: "ping" };

export type WireMessage = ClientHello | DjCommand | RelayMessage | DaemonMessage;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isDjCommandName(value: unknown): value is DjCommandName {
  return typeof value === "string" && (DJ_COMMAND_NAMES as readonly string[]).includes(value);
}

export function parseDjCommand(value: unknown): DjCommand | null {
  if (!isRecord(value) || value.type !== "command") return null;
  if (typeof value.id !== "string" || !value.id) return null;
  if (!isDjCommandName(value.name)) return null;
  const payload = isRecord(value.payload) ? value.payload : {};
  const enqueuedAt =
    typeof value.enqueuedAt === "number" && Number.isFinite(value.enqueuedAt)
      ? value.enqueuedAt
      : undefined;
  return { type: "command", id: value.id, name: value.name, payload, enqueuedAt };
}

export function parseWireMessage(raw: string): WireMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || typeof value.type !== "string") return null;
    if (value.type === "command") return parseDjCommand(value);
    if (value.type === "hello") {
      if (value.role === "daemon" && typeof value.secret === "string") {
        return { type: "hello", role: "daemon", secret: value.secret };
      }
      if (value.role === "remote" && typeof value.secret === "string") {
        return { type: "hello", role: "remote", secret: value.secret };
      }
      return null;
    }
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
    queueIndex: -1,
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
    lastAck: state.lastAck,
    health: state.health,
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
    lastAck: null,
    health: { cdp: false, tidal: false },
    ...overrides,
  };
}

export function mergeLive(state: DjState, live: DjLive): DjState {
  if (live.version < state.version) return state;
  return {
    ...state,
    version: live.version,
    catalogVersion: live.catalogVersion,
    daemonOnline: live.daemonOnline,
    transport: live.transport,
    nowPlaying: live.nowPlaying,
    pending: live.pending,
    lastError: live.lastError,
    lastAck: live.lastAck,
    health: live.health ?? state.health,
  };
}

export function mergeCatalog(state: DjState, catalog: DjCatalog): DjState {
  if (catalog.catalogVersion < state.catalogVersion) return state;
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
    lastAck: live?.lastAck,
    health: live?.health,
  };
}
