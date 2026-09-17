import WebSocket from "ws";
import {
  catalogFromState,
  liveFromState,
  parseWireMessage,
  type DjCommand,
  type DjState,
  type DjTrack,
} from "@/lib/dj/protocol";
import { loadDaemonEnv, requiredEnv, wsUrl } from "./env";
import {
  bump,
  bumpCatalog,
  createTrack,
  findVibe,
  getSeedTracks,
  loadState,
  newId,
  persistResolvedIds,
  persistVibeMeta,
  reconcileTracks,
  saveState,
  vibeSignature,
} from "./store";
import {
  ensureTidalWithCdp,
  pausePlayback,
  playTidalPlaylist,
  readPlayerBar,
  resumePlayback,
  skipPlayback,
  setVolume,
  waitForPlayerChange,
  type PlayerBarInfo,
} from "./tidal";
import {
  addTracks,
  bootstrapIfEmpty,
  loadVibePlaylist,
  removePlaylistItem,
  searchTracksApi,
  syncAnthemPlaylist,
} from "./tidal-api";
import { parseTidalUrl, resolveTrackInput } from "./resolve";

loadDaemonEnv();

const secret = requiredEnv("DJ_DAEMON_SECRET");
let state: DjState = loadState();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let volumeTimer: ReturnType<typeof setTimeout> | null = null;
let socket: WebSocket | null = null;
let reconnectDelay = 1000;
let navigating = false;
let commandTail: Promise<void> = Promise.resolve();
let catalogDirty = false;

function persistSoon() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    saveState(state);
  }, 250);
}

function sendDaemon(payload: unknown) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function publishLive() {
  bump(state);
  persistSoon();
  sendDaemon({ type: "live", live: liveFromState(state) });
}

function publishCatalog() {
  bumpCatalog(state);
  persistSoon();
  persistVibeMeta(state);
  sendDaemon({ type: "catalog", catalog: catalogFromState(state) });
  sendDaemon({ type: "live", live: liveFromState(state) });
  catalogDirty = false;
}

function markCatalog() {
  catalogDirty = true;
}

async function ensureResolved(track: DjTrack): Promise<DjTrack> {
  if (track.tidalId) return track;
  const query = track.spotifyUrl ?? `${track.title} ${track.artist}`;
  const resolved = await resolveTrackInput(
    query,
    {
      title: track.title,
      artist: track.artist,
    },
    { allowNavigate: false },
  );
  if (resolved.tidalId) {
    track.tidalId = resolved.tidalId;
    track.tidalUrl = resolved.tidalUrl ?? track.tidalUrl;
    persistResolvedIds(state);
  }
  return track;
}

function titlesMatch(actual: string, expected: string): boolean {
  if (!actual || !expected) return false;
  const a = actual.toLowerCase();
  const e = expected.toLowerCase();
  return a.includes(e.slice(0, 16)) || e.includes(a.slice(0, 16));
}

function applyNowPlaying(info: PlayerBarInfo) {
  const title = info.title ?? state.nowPlaying?.title ?? "";
  const artist = info.artist ?? state.nowPlaying?.artist ?? "";
  state.nowPlaying = {
    title,
    artist,
    isPlaying: info.isPlaying,
  };
  state.transport.playing = info.isPlaying;

  const vibe = state.transport.vibeId
    ? findVibe(state, state.transport.vibeId)
    : undefined;
  if (!vibe) return;
  const matchIndex = vibe.tracks.findIndex(
    (track) =>
      (track.tidalId && info.tidalId === track.tidalId) ||
      titlesMatch(title, track.title),
  );
  if (matchIndex >= 0) {
    state.transport.queue = vibe.tracks.map((track) => track.id);
    state.transport.queueIndex = matchIndex;
  }
}

async function refreshVibeFromTidal(
  vibe: NonNullable<ReturnType<typeof findVibe>>,
  options?: { bootstrap?: boolean },
) {
  const before = vibeSignature(vibe);
  const loaded = await loadVibePlaylist(vibe.name, vibe.tidalPlaylistId);
  vibe.tidalPlaylistId = loaded.uuid;
  let tracks = loaded.tracks;
  if (options?.bootstrap && tracks.length === 0) {
    const seedIds = getSeedTracks(vibe.id)
      .map((track) => track.tidalId)
      .filter((id): id is string => Boolean(id));
    tracks = await bootstrapIfEmpty(loaded.uuid, seedIds);
  }
  vibe.tracks = reconcileTracks(vibe.tracks, tracks);
  const changed = vibeSignature(vibe) !== before;
  if (changed) markCatalog();
  return changed;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshVibeUntil(
  vibe: NonNullable<ReturnType<typeof findVibe>>,
  done: () => boolean,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await refreshVibeFromTidal(vibe);
    if (done()) return true;
    await sleep(250);
  }
  return done();
}

async function refreshAllVibes(options?: { bootstrap?: boolean }) {
  const results = await Promise.all(
    state.vibes.map(async (vibe) => {
      try {
        return await refreshVibeFromTidal(vibe, options);
      } catch (error) {
        console.error(`playlist pull failed for ${vibe.name}`, error);
        return false;
      }
    }),
  );
  return results.some(Boolean);
}

async function playVibePlaylist(vibeId: string) {
  const vibe = findVibe(state, vibeId);
  if (!vibe) return;
  await refreshVibeFromTidal(vibe, { bootstrap: true });
  if (!vibe.tidalPlaylistId || vibe.tracks.length === 0) {
    state.lastError = `${vibe.name} has no tracks on TIDAL yet`;
    return;
  }
  state.transport.queue = vibe.tracks.map((track) => track.id);
  navigating = true;
  try {
    const started = await playTidalPlaylist(vibe.tidalPlaylistId);
    if (!started) {
      state.lastError = `TIDAL did not start ${vibe.name}`;
      return;
    }
    state.lastError = undefined;
    applyNowPlaying(await readPlayerBar());
    state.transport.playing = true;
  } finally {
    navigating = false;
  }
}

async function advance(delta: number) {
  if (state.transport.oneshot) {
    const { resumeVibeId } = state.transport.oneshot;
    state.transport.oneshot = null;
    if (resumeVibeId) {
      state.transport.vibeId = resumeVibeId;
      await playVibePlaylist(resumeVibeId);
    }
    return;
  }
  const previous = await readPlayerBar();
  const skipped = await skipPlayback(delta > 0 ? "next" : "prev");
  if (!skipped) {
    state.lastError = delta > 0 ? "Could not skip forward" : "Could not skip back";
    return;
  }
  applyNowPlaying(await waitForPlayerChange(previous));
}

async function handleCommand(command: DjCommand) {
  const { name, payload } = command;
  catalogDirty = false;
  try {
    if (name === "playVibe") {
      const vibeId = String(payload.vibeId ?? "");
      const vibe = findVibe(state, vibeId);
      if (!vibe) throw new Error("Unknown vibe");
      state.transport.oneshot = null;
      state.transport.vibeId = vibeId;
      state.lastError = undefined;
      state.pending = {
        action: "playVibe",
        vibeId,
        label: `Opening ${vibe.name}`,
      };
      publishLive();
      await playVibePlaylist(vibeId);
      return;
    }

    if (name === "playAnthem") {
      const characterId = String(payload.characterId ?? "");
      const character = state.characters.find((item) => item.id === characterId);
      if (!character?.anthem) throw new Error("Character has no anthem");
      state.pending = {
        action: "playAnthem",
        label: `Playing ${character.name}`,
      };
      publishLive();
      state.transport.oneshot = {
        characterId,
        resumeVibeId: state.transport.vibeId,
        resumeQueue: [...state.transport.queue],
        resumeIndex: state.transport.queueIndex,
      };
      const anthem = await ensureResolved(character.anthem);
      if (!anthem.tidalId) {
        state.lastError = `Could not find “${anthem.title}” on TIDAL`;
        return;
      }
      const playlistId = await syncAnthemPlaylist(anthem.tidalId);
      navigating = true;
      try {
        const started = await playTidalPlaylist(playlistId, anthem.tidalId);
        if (started) {
          state.nowPlaying = {
            title: anthem.title,
            artist: anthem.artist,
            isPlaying: true,
          };
          state.transport.playing = true;
        }
      } finally {
        navigating = false;
      }
      return;
    }

    if (name === "pause") {
      await pausePlayback();
      state.transport.playing = false;
      if (state.nowPlaying) state.nowPlaying.isPlaying = false;
      return;
    }

    if (name === "resume") {
      const resumed = await resumePlayback();
      if (!resumed && state.transport.vibeId) {
        await playVibePlaylist(state.transport.vibeId);
      } else {
        state.transport.playing = true;
        if (state.nowPlaying) state.nowPlaying.isPlaying = true;
      }
      return;
    }

    if (name === "next") {
      await advance(1);
      return;
    }

    if (name === "prev") {
      await advance(-1);
      return;
    }

    if (name === "setVolume") {
      const volume = Math.max(0, Math.min(100, Math.round(Number(payload.volume))));
      if (!Number.isFinite(volume)) return;
      state.transport.volume = volume;
      if (volumeTimer) clearTimeout(volumeTimer);
      volumeTimer = setTimeout(() => {
        volumeTimer = null;
        void setVolume(state.transport.volume);
      }, 180);
      return;
    }

    if (name === "setShuffle") {
      const vibe = findVibe(state, String(payload.vibeId ?? ""));
      if (vibe) vibe.shuffle = true;
      return;
    }

    if (name === "refreshVibe") {
      const vibe = findVibe(state, String(payload.vibeId ?? ""));
      if (!vibe) throw new Error("Unknown vibe");
      state.lastError = undefined;
      await refreshVibeFromTidal(vibe);
      markCatalog();
      return;
    }

    if (name === "addTrack") {
      const vibe = findVibe(state, String(payload.vibeId ?? ""));
      if (!vibe) throw new Error("Unknown vibe");
      state.lastError = undefined;
      const input = String(payload.input ?? payload.url ?? payload.query ?? "");
      const existing = payload.track as DjTrack | undefined;
      let track: DjTrack;
      if (existing?.tidalId || existing?.title) {
        track = createTrack(existing);
      } else {
        const resolved = await resolveTrackInput(input, undefined, {
          allowNavigate: true,
        });
        const tidal = parseTidalUrl(input);
        track = createTrack({
          title: resolved.title ?? input,
          artist: resolved.artist ?? "Unknown",
          tidalId: resolved.tidalId ?? (tidal?.type === "track" ? tidal.id : undefined),
          tidalUrl: resolved.tidalUrl,
          spotifyUrl: resolved.spotifyUrl,
        });
      }
      if (!track.tidalId) {
        state.lastError = `Could not add “${input || track.title}” — search and pick a result`;
        return;
      }
      const before = vibe.tracks.filter((item) => item.tidalId === track.tidalId).length;
      const loaded = await loadVibePlaylist(vibe.name, vibe.tidalPlaylistId);
      vibe.tidalPlaylistId = loaded.uuid;
      await addTracks(loaded.uuid, [track.tidalId]);
      const appeared = await refreshVibeUntil(
        vibe,
        () => vibe.tracks.filter((item) => item.tidalId === track.tidalId).length > before,
      );
      if (!appeared) {
        state.lastError = `TIDAL did not add “${track.title}”`;
      } else {
        state.lastError = undefined;
      }
      markCatalog();
      return;
    }

    if (name === "removeTrack") {
      const vibe = findVibe(state, String(payload.vibeId ?? ""));
      if (!vibe) throw new Error("Unknown vibe");
      state.lastError = undefined;
      const trackId = String(payload.trackId ?? "");
      const tidalId = String(payload.tidalId ?? "");
      const hintedIndex = Number(payload.index);
      await refreshVibeFromTidal(vibe);
      let index = -1;
      if (
        Number.isInteger(hintedIndex) &&
        hintedIndex >= 0 &&
        hintedIndex < vibe.tracks.length
      ) {
        const hinted = vibe.tracks[hintedIndex];
        if (
          !tidalId ||
          hinted?.tidalId === tidalId ||
          hinted?.id === trackId
        ) {
          index = hintedIndex;
        }
      }
      if (index < 0 && tidalId) {
        index = vibe.tracks.findIndex((track) => track.tidalId === tidalId);
      }
      if (index < 0 && trackId) {
        index = vibe.tracks.findIndex(
          (track) => track.id === trackId || track.tidalId === trackId,
        );
      }
      if (index < 0 || !vibe.tidalPlaylistId) {
        state.lastError = "That track is not on the TIDAL playlist";
        return;
      }
      const removedId = vibe.tracks[index]?.tidalId;
      const before = removedId
        ? vibe.tracks.filter((track) => track.tidalId === removedId).length
        : vibe.tracks.length;
      await removePlaylistItem(vibe.tidalPlaylistId, index);
      await refreshVibeUntil(vibe, () => {
        if (!removedId) return vibe.tracks.length < before;
        return vibe.tracks.filter((track) => track.tidalId === removedId).length < before;
      });
      state.transport.queue = vibe.tracks.map((track) => track.id);
      if (state.transport.queueIndex >= state.transport.queue.length) {
        state.transport.queueIndex = 0;
      }
      state.lastError = undefined;
      markCatalog();
      return;
    }

    if (name === "reorderTracks") {
      const vibe = findVibe(state, String(payload.vibeId ?? ""));
      if (!vibe) throw new Error("Unknown vibe");
      const order = payload.order;
      if (!Array.isArray(order)) throw new Error("order must be an array");
      const ids = order.map(String);
      vibe.tracks = ids
        .map((id) => vibe.tracks.find((track) => track.id === id))
        .filter((track): track is DjTrack => Boolean(track));
      markCatalog();
      return;
    }

    if (name === "addCharacter") {
      const name = String(payload.name ?? "").trim();
      if (!name) throw new Error("Name required");
      const input = String(payload.input ?? payload.url ?? "");
      let anthem: DjTrack | undefined;
      if (input) {
        const resolved = await resolveTrackInput(input);
        if (resolved.title || resolved.tidalId) {
          anthem = createTrack({
            title: resolved.title ?? name,
            artist: resolved.artist ?? "Unknown",
            tidalId: resolved.tidalId,
            tidalUrl: resolved.tidalUrl,
            spotifyUrl: resolved.spotifyUrl,
          });
        }
      }
      state.characters.push({ id: newId("chr"), name, anthem });
      markCatalog();
      return;
    }

    if (name === "removeCharacter") {
      const characterId = String(payload.characterId ?? "");
      state.characters = state.characters.filter((item) => item.id !== characterId);
      markCatalog();
      return;
    }

    if (name === "updateCharacter") {
      const character = state.characters.find(
        (item) => item.id === String(payload.characterId ?? ""),
      );
      if (!character) throw new Error("Unknown character");
      if (typeof payload.name === "string" && payload.name.trim()) {
        character.name = payload.name.trim();
      }
      const input = String(payload.input ?? payload.url ?? "");
      if (input) {
        const resolved = await resolveTrackInput(input);
        if (resolved.title || resolved.tidalId) {
          character.anthem = createTrack({
            title: resolved.title ?? character.name,
            artist: resolved.artist ?? "Unknown",
            tidalId: resolved.tidalId,
            tidalUrl: resolved.tidalUrl,
            spotifyUrl: resolved.spotifyUrl,
          });
        }
      }
      markCatalog();
      return;
    }

    if (name === "search") {
      const requestId = String(payload.requestId ?? command.id);
      const query = String(payload.query ?? "").trim();
      state.search = {
        requestId,
        query,
        status: "searching",
        results: [],
      };
      publishLive();
      const hits = await searchTracksApi(query);
      state.search = {
        requestId,
        query,
        status: "done",
        results: hits.map((hit) =>
          createTrack({
            title: hit.title,
            artist: hit.artist,
            tidalId: hit.tidalId,
            tidalUrl: hit.tidalUrl,
          }),
        ),
      };
      return;
    }
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error);
    console.error("dj command failed", name, state.lastError);
  } finally {
    state.pending = null;
    if (catalogDirty) publishCatalog();
    else publishLive();
  }
}

async function pollNowPlaying() {
  if (navigating) return;
  try {
    const info = await readPlayerBar();
    const changed =
      info.isPlaying !== (state.nowPlaying?.isPlaying ?? false) ||
      (info.title ?? "") !== (state.nowPlaying?.title ?? "") ||
      (info.artist ?? "") !== (state.nowPlaying?.artist ?? "");
    const previousIndex = state.transport.queueIndex;
    applyNowPlaying(info);
    if (changed || state.transport.queueIndex !== previousIndex) {
      publishLive();
    }
  } catch (error) {
    console.error("now playing poll failed", error);
  }
}

function connect() {
  const url = wsUrl();
  console.error(`Connecting to ${url}`);
  const ws = new WebSocket(url);
  socket = ws;

  ws.on("open", () => {
    reconnectDelay = 1000;
    ws.send(JSON.stringify({ type: "hello", role: "daemon", secret }));
    console.error("Daemon hello sent");
  });

  ws.on("message", (data) => {
    const message = parseWireMessage(data.toString());
    if (!message) return;
    if (message.type === "ready") {
      state.daemonOnline = true;
      publishCatalog();
      console.error("Daemon connected");
      return;
    }
    if (message.type === "command") {
      commandTail = commandTail
        .then(() => handleCommand(message))
        .catch((error) => {
          console.error("dj command queue failed", error);
        });
    }
    if (message.type === "error") {
      console.error("relay error:", message.message);
    }
  });

  ws.on("close", () => {
    console.error("Relay closed; reconnecting...");
    scheduleReconnect();
  });

  ws.on("error", (error) => {
    console.error("Relay socket error", error.message);
  });
}

function scheduleReconnect() {
  socket = null;
  setTimeout(connect, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 15000);
}

async function main() {
  await ensureTidalWithCdp();
  try {
    await setVolume(state.transport.volume);
  } catch {
    // volume slider may not be visible yet
  }
  connect();
  void refreshAllVibes({ bootstrap: true })
    .then((changed) => {
      if (changed) publishCatalog();
    })
    .catch((error) => {
      console.error("initial playlist pull failed", error);
    });
  setInterval(() => {
    void pollNowPlaying();
  }, 500);
  setInterval(() => {
    void refreshAllVibes()
      .then((changed) => {
        if (changed) publishCatalog();
      })
      .catch((error) => {
        console.error("playlist refresh failed", error);
      });
  }, 15_000);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
