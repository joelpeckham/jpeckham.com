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

function repairSeededTracks(saved: DjState, seed: SeedFile): DjState {
  for (const seedVibe of seed.vibes) {
    let vibe = saved.vibes.find((item) => item.id === seedVibe.id);
    if (!vibe) {
      saved.vibes.push({
        ...seedVibe,
        tracks: seedVibe.tracks.map((track) => ({ ...track })),
      });
      continue;
    }
    const extras = vibe.tracks.filter(
      (track) => !seedVibe.tracks.some((item) => item.id === track.id),
    );
    const existing = new Map(vibe.tracks.map((track) => [track.id, track]));
    const counts = new Map<string, number>();
    for (const track of [...seedVibe.tracks, ...vibe.tracks]) {
      if (!track.tidalId) continue;
      counts.set(track.tidalId, (counts.get(track.tidalId) ?? 0) + 1);
    }
    vibe.tracks = [
      ...seedVibe.tracks.map((seedTrack) => {
        const current = existing.get(seedTrack.id);
        const candidate = current?.tidalId ?? seedTrack.tidalId;
        const unique = candidate && (counts.get(candidate) ?? 0) <= 1;
        return {
          ...seedTrack,
          tidalId: unique ? candidate : undefined,
          tidalUrl: unique ? current?.tidalUrl ?? seedTrack.tidalUrl : undefined,
        };
      }),
      ...extras,
    ];
    if (vibe.tidalPlaylistId && !/^[0-9a-f-]{36}$/i.test(vibe.tidalPlaylistId)) {
      vibe.tidalPlaylistId = undefined;
    }
  }
  return saved;
}

export function loadState(): DjState {
  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as SeedFile;
  try {
    const saved = JSON.parse(readFileSync(statePath, "utf8")) as DjState;
    return repairSeededTracks(
      {
        ...saved,
        daemonOnline: true,
        version: saved.version ?? 1,
      },
      seed,
    );
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

export function persistResolvedIds(state: DjState) {
  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as SeedFile;
  let changed = false;
  for (const vibe of state.vibes) {
    const seedVibe = seed.vibes.find((item) => item.id === vibe.id);
    if (!seedVibe) continue;
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
