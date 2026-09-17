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

export function loadState(): DjState {
  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as SeedFile;
  try {
    const saved = JSON.parse(readFileSync(statePath, "utf8")) as DjState;
    return {
      ...saved,
      daemonOnline: true,
      version: saved.version ?? 1,
    };
  } catch {
    return {
      version: 1,
      daemonOnline: true,
      vibes: seed.vibes,
      characters: seed.characters ?? [],
      transport: emptyTransport(),
      nowPlaying: null,
      search: null,
    };
  }
}

export function saveState(state: DjState) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export function bump(state: DjState): DjState {
  state.version += 1;
  state.daemonOnline = true;
  return state;
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
