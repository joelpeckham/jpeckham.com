import { copyFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  emptyTransport,
  type DjCharacter,
  type DjState,
  type DjTrack,
  type DjVibe,
} from "@/lib/dj/protocol";

const seedPath = resolve(import.meta.dirname, "../data/seed.json");
const statePath = resolve(import.meta.dirname, "../data/state.json");
const stateTmpPath = `${statePath}.tmp`;
const stateBakPath = `${statePath}.bak`;

type SeedFile = {
  vibes: DjVibe[];
  characters?: DjCharacter[];
};

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createTrack(partial: Partial<DjTrack> & { title: string }): DjTrack {
  return {
    id: partial.id ?? newId("trk"),
    title: partial.title,
    artist: partial.artist ?? "Unknown",
    tidalId: partial.tidalId,
    tidalUrl: partial.tidalUrl,
    spotifyUrl: partial.spotifyUrl,
  };
}

function isPlaylistUuid(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f-]{36}$/i.test(value));
}

function readSeed(): SeedFile {
  return JSON.parse(readFileSync(seedPath, "utf8")) as SeedFile;
}

export function reconcileTracks(
  previous: DjTrack[],
  incoming: Array<Partial<DjTrack> & { title: string; tidalId: string }>,
): DjTrack[] {
  const byTidal = new Map<string, DjTrack>();
  for (const track of previous) {
    if (track.tidalId && !byTidal.has(track.tidalId)) {
      byTidal.set(track.tidalId, track);
    }
  }
  return incoming.map((item) => {
    const existing = byTidal.get(item.tidalId);
    if (existing) {
      byTidal.delete(item.tidalId);
      return {
        ...existing,
        title: item.title,
        artist: item.artist ?? existing.artist,
        tidalId: item.tidalId,
        tidalUrl: item.tidalUrl ?? existing.tidalUrl,
      };
    }
    return createTrack(item);
  });
}

function readSavedState(): DjState | undefined {
  for (const path of [statePath, stateBakPath]) {
    try {
      return JSON.parse(readFileSync(path, "utf8")) as DjState;
    } catch {
      // try next
    }
  }
  return undefined;
}

function hydrateFromSeed(saved: DjState | undefined, seed: SeedFile): DjState {
  const savedById = new Map((saved?.vibes ?? []).map((vibe) => [vibe.id, vibe]));
  const vibes = seed.vibes.map((seedVibe) => {
    const current = savedById.get(seedVibe.id);
    const playlistId = isPlaylistUuid(current?.tidalPlaylistId)
      ? current.tidalPlaylistId
      : isPlaylistUuid(seedVibe.tidalPlaylistId)
        ? seedVibe.tidalPlaylistId
        : undefined;
    return {
      id: seedVibe.id,
      name: seedVibe.name,
      hue: seedVibe.hue,
      shuffle: true,
      tidalPlaylistId: playlistId,
      tracks: current?.tracks
        ? current.tracks
        : seedVibe.tracks.map((track) => ({ ...track })),
    };
  });

  return {
    version: saved?.version ?? 1,
    catalogVersion: saved?.catalogVersion ?? 0,
    daemonOnline: true,
    vibes,
    characters: saved?.characters ?? seed.characters ?? [],
    transport: saved?.transport ?? emptyTransport(),
    nowPlaying: saved?.nowPlaying ?? null,
    pending: null,
    lastError: undefined,
    health: saved?.health ?? { cdp: false, tidal: false },
  };
}

export function loadState(): DjState {
  const seed = readSeed();
  return hydrateFromSeed(readSavedState(), seed);
}

export function saveState(state: DjState) {
  mkdirSync(dirname(statePath), { recursive: true });
  const json = JSON.stringify(state, null, 2);
  writeFileSync(stateTmpPath, json);
  try {
    copyFileSync(statePath, stateBakPath);
  } catch {
    // first write
  }
  renameSync(stateTmpPath, statePath);
}

export function persistVibeMeta(_state: DjState) {
  // seed.json stays read-only; playlist ids live in state.json
}

export function bump(state: DjState): DjState {
  state.version += 1;
  state.daemonOnline = true;
  return state;
}

export function bumpCatalog(state: DjState): DjState {
  state.catalogVersion = (state.catalogVersion ?? 0) + 1;
  return bump(state);
}

export function vibeSignature(vibe: DjVibe): string {
  return `${vibe.tidalPlaylistId ?? ""}:${vibe.tracks.map((track) => track.tidalId ?? track.id).join(",")}`;
}

export function findVibe(state: DjState, vibeId: string): DjVibe | undefined {
  return state.vibes.find((vibe) => vibe.id === vibeId);
}

export function findTrack(state: DjState, trackId: string): DjTrack | undefined {
  for (const vibe of state.vibes) {
    const track = vibe.tracks.find((item) => item.id === trackId);
    if (track) return track;
  }
  for (const character of state.characters) {
    if (character.anthem?.id === trackId) return character.anthem;
  }
  return undefined;
}

export { newId };
