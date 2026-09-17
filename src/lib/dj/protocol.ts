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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return null;
  }
  return value;
}

export function parseDjOneshot(value: unknown): DjOneshot | null {
  if (!isRecord(value)) return null;
  if (typeof value.characterId !== "string" || typeof value.tidalId !== "string") {
    return null;
  }
  if (value.resumeVibeId !== null && typeof value.resumeVibeId !== "string") {
    return null;
  }
  const resumeQueue = parseStringArray(value.resumeQueue);
  if (!resumeQueue || !isFiniteNumber(value.resumeIndex)) return null;
  return {
    characterId: value.characterId,
    tidalId: value.tidalId,
    resumeVibeId: value.resumeVibeId,
    resumeQueue,
    resumeIndex: value.resumeIndex,
  };
}

export function parseDjTransport(value: unknown): DjTransport | null {
  if (!isRecord(value) || typeof value.playing !== "boolean") return null;
  if (value.vibeId !== null && typeof value.vibeId !== "string") return null;
  const queue = parseStringArray(value.queue);
  if (!queue || !isFiniteNumber(value.queueIndex) || !isFiniteNumber(value.volume)) {
    return null;
  }
  let oneshot: DjOneshot | null = null;
  if (value.oneshot != null) {
    oneshot = parseDjOneshot(value.oneshot);
    if (!oneshot) return null;
  }
  return {
    playing: value.playing,
    vibeId: value.vibeId,
    queue,
    queueIndex: value.queueIndex,
    volume: value.volume,
    oneshot,
  };
}

export function parseDjNowPlaying(value: unknown): DjNowPlaying | null {
  if (value == null) return null;
  if (!isRecord(value) || typeof value.title !== "string" || typeof value.artist !== "string") {
    return null;
  }
  if (typeof value.isPlaying !== "boolean") return null;
  return {
    title: value.title,
    artist: value.artist,
    isPlaying: value.isPlaying,
    tidalId: typeof value.tidalId === "string" ? value.tidalId : undefined,
  };
}

export function parseDjAck(value: unknown): DjAck | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.ok !== "boolean") {
    return null;
  }
  return {
    id: value.id,
    ok: value.ok,
    error: typeof value.error === "string" ? value.error : undefined,
  };
}

export function parseDjHealth(value: unknown): DjHealth | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.cdp !== "boolean" || typeof value.tidal !== "boolean") return undefined;
  return { cdp: value.cdp, tidal: value.tidal };
}

export function parseDjPending(value: unknown): DjPending | null | undefined {
  if (value == null) return null;
  if (!isRecord(value) || typeof value.action !== "string" || typeof value.label !== "string") {
    return undefined;
  }
  return {
    action: value.action as DjPending["action"],
    label: value.label,
    vibeId: typeof value.vibeId === "string" ? value.vibeId : undefined,
    commandId: typeof value.commandId === "string" ? value.commandId : undefined,
  };
}

export function parseDjLive(value: unknown): DjLive | null {
  if (!isRecord(value) || !isFiniteNumber(value.version) || !isFiniteNumber(value.catalogVersion)) {
    return null;
  }
  if (typeof value.daemonOnline !== "boolean") return null;
  const transport = parseDjTransport(value.transport);
  if (!transport) return null;
  const pending = parseDjPending(value.pending);
  if (pending === undefined) return null;
  return {
    version: value.version,
    catalogVersion: value.catalogVersion,
    daemonOnline: value.daemonOnline,
    transport,
    nowPlaying: parseDjNowPlaying(value.nowPlaying),
    pending,
    lastError: typeof value.lastError === "string" ? value.lastError : undefined,
    lastAck: value.lastAck == null ? null : parseDjAck(value.lastAck),
    health: parseDjHealth(value.health),
  };
}

function parseTrackList(value: unknown): DjTrack[] | null {
  if (!Array.isArray(value)) return null;
  const tracks: DjTrack[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.title !== "string") {
      return null;
    }
    tracks.push({
      id: item.id,
      title: item.title,
      artist: typeof item.artist === "string" ? item.artist : "Unknown",
      tidalId: typeof item.tidalId === "string" ? item.tidalId : undefined,
      tidalUrl: typeof item.tidalUrl === "string" ? item.tidalUrl : undefined,
      spotifyUrl: typeof item.spotifyUrl === "string" ? item.spotifyUrl : undefined,
    });
  }
  return tracks;
}

export function parseDjCatalog(value: unknown): DjCatalog | null {
  if (!isRecord(value) || !isFiniteNumber(value.catalogVersion)) return null;
  if (!Array.isArray(value.vibes) || !Array.isArray(value.characters)) return null;
  const vibes: DjVibe[] = [];
  for (const item of value.vibes) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string") {
      return null;
    }
    const tracks = parseTrackList(item.tracks);
    if (!tracks) return null;
    vibes.push({
      id: item.id,
      name: item.name,
      hue: typeof item.hue === "string" ? item.hue : "gold",
      shuffle: Boolean(item.shuffle),
      tracks,
      tidalPlaylistId:
        typeof item.tidalPlaylistId === "string" ? item.tidalPlaylistId : undefined,
    });
  }
  const characters: DjCharacter[] = [];
  for (const item of value.characters) {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string") {
      return null;
    }
    let anthem: DjTrack | undefined;
    if (item.anthem != null) {
      const tracks = parseTrackList([item.anthem]);
      if (!tracks?.[0]) return null;
      anthem = tracks[0];
    }
    characters.push({ id: item.id, name: item.name, anthem });
  }
  return { catalogVersion: value.catalogVersion, vibes, characters };
}

export function parseDjState(value: unknown): DjState | null {
  if (!isRecord(value)) return null;
  const live = parseDjLive({
    ...value,
    version: value.version,
    catalogVersion: value.catalogVersion ?? 0,
    daemonOnline: value.daemonOnline ?? false,
  });
  const catalog = parseDjCatalog({
    catalogVersion: value.catalogVersion ?? 0,
    vibes: value.vibes ?? [],
    characters: value.characters ?? [],
  });
  if (!live || !catalog) return null;
  return {
    ...live,
    vibes: catalog.vibes,
    characters: catalog.characters,
  };
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
    if (value.type === "ping") return { type: "ping" };
    if (value.type === "pong") return { type: "pong" };
    if (value.type === "error") {
      if (typeof value.message !== "string") return null;
      return {
        type: "error",
        message: value.message,
        code: typeof value.code === "string" ? value.code : undefined,
      };
    }
    if (value.type === "ack") {
      if (typeof value.id !== "string" || typeof value.ok !== "boolean") return null;
      return {
        type: "ack",
        id: value.id,
        ok: value.ok,
        error: typeof value.error === "string" ? value.error : undefined,
      };
    }
    if (value.type === "live") {
      const live = parseDjLive(value.live);
      return live ? { type: "live", live } : null;
    }
    if (value.type === "catalog") {
      const catalog = parseDjCatalog(value.catalog);
      return catalog ? { type: "catalog", catalog } : null;
    }
    if (value.type === "snapshot") {
      const snapshot = parseDjState(value.snapshot);
      return snapshot ? { type: "snapshot", snapshot } : null;
    }
    if (value.type === "ready") {
      if (typeof value.daemonOnline !== "boolean") return null;
      const snapshot =
        value.snapshot == null ? null : parseDjState(value.snapshot);
      return { type: "ready", daemonOnline: value.daemonOnline, snapshot };
    }
    return null;
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
  const catalogVersion = Math.max(state.catalogVersion, live.catalogVersion);
  if (live.version <= state.version) {
    return catalogVersion === state.catalogVersion ? state : { ...state, catalogVersion };
  }
  return {
    ...state,
    version: live.version,
    catalogVersion,
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
  if (catalog.catalogVersion <= state.catalogVersion) return state;
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
    catalogVersion: Math.max(live?.catalogVersion ?? 0, catalog?.catalogVersion ?? 0),
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
