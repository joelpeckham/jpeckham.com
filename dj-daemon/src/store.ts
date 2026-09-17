import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export function getSeedTracks(vibeId: string): DjTrack[] {
  const seedVibe = readSeed().vibes.find((item) => item.id === vibeId);
  return seedVibe?.tracks.map((track) => ({ ...track })) ?? [];
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
      tracks:
        current?.tracks && current.tracks.length > 0
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
    search: null,
    pending: null,
    lastError: undefined,
  };
}

export function loadState(): DjState {
  const seed = readSeed();
  try {
    const saved = JSON.parse(readFileSync(statePath, "utf8")) as DjState;
    return hydrateFromSeed(saved, seed);
  } catch {
    return hydrateFromSeed(undefined, seed);
  }
}

export function saveState(state: DjState) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export function persistVibeMeta(state: DjState) {
  const seed = readSeed();
  let changed = false;
  for (const vibe of state.vibes) {
    const seedVibe = seed.vibes.find((item) => item.id === vibe.id);
    if (!seedVibe) continue;
    if (vibe.tidalPlaylistId && seedVibe.tidalPlaylistId !== vibe.tidalPlaylistId) {
      seedVibe.tidalPlaylistId = vibe.tidalPlaylistId;
      changed = true;
    }
  }
  if (changed) writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
}

export function persistResolvedIds(state: DjState) {
  const seed = readSeed();
  let changed = false;
  for (const vibe of state.vibes) {
    const seedVibe = seed.vibes.find((item) => item.id === vibe.id);
    if (!seedVibe) continue;
    if (vibe.tidalPlaylistId && seedVibe.tidalPlaylistId !== vibe.tidalPlaylistId) {
      seedVibe.tidalPlaylistId = vibe.tidalPlaylistId;
      changed = true;
    }
    for (const track of vibe.tracks) {
      const seedTrack = seedVibe.tracks.find((item) => item.id === track.id);
      if (!seedTrack || !track.tidalId) continue;
      if (seedTrack.tidalId !== track.tidalId) {
        seedTrack.tidalId = track.tidalId;
        seedTrack.tidalUrl = track.tidalUrl;
        changed = true;
      }
    }
  }
  if (changed) writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
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

export function shuffleIds(ids: string[]): string[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export { newId };
