import WebSocket from "ws";
import {
  parseWireMessage,
  type DjCommand,
  type DjState,
  type DjTrack,
} from "@/lib/dj/protocol";
import { loadDaemonEnv, requiredEnv, wsUrl } from "./env";
import {
  bump,
  createTrack,
  findTrack,
  findVibe,
  loadState,
  newId,
  persistResolvedIds,
  saveState,
  shuffleIds,
} from "./store";
import {
  ensureTidalWithCdp,
  pausePlayback,
  playTidalPlaylist,
  readPlayerBar,
  resumePlayback,
  skipPlayback,
  setVolume,
} from "./tidal";
import { searchTracksApi, syncAnthemPlaylist, syncVibePlaylist } from "./tidal-api";
import { parseTidalUrl, resolveTrackInput } from "./resolve";

loadDaemonEnv();

const secret = requiredEnv("DJ_DAEMON_SECRET");
let state: DjState = loadState();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let volumeTimer: ReturnType<typeof setTimeout> | null = null;
let socket: WebSocket | null = null;
let playingSince = 0;
let lastObservedTitle = "";
let reconnectDelay = 1000;
let busy = false;

function persistSoon() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    saveState(state);
  }, 250);
}

function publish() {
  bump(state);
  persistSoon();
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "snapshot", snapshot: state }));
  }
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

function currentQueuedTrack(): DjTrack | undefined {
  const id = state.transport.queue[state.transport.queueIndex];
  return id ? findTrack(state, id) : undefined;
}

function buildQueue(vibeId: string): string[] {
  const vibe = findVibe(state, vibeId);
  if (!vibe) return [];
  const ids = vibe.tracks.map((track) => track.id);
  return vibe.shuffle ? shuffleIds(ids) : ids;
}

async function playVibePlaylist(vibeId: string, startIndex = 0) {
  const vibe = findVibe(state, vibeId);
  if (!vibe) return;
  busy = true;
  try {
    for (const track of vibe.tracks) {
      if (!track.tidalId) await ensureResolved(track);
    }
    const ordered = state.transport.queue
      .map((id) => findTrack(state, id))
      .filter((track): track is DjTrack => Boolean(track?.tidalId));
    if (ordered.length === 0) {
      state.lastError = `Could not match ${vibe.name} on TIDAL`;
      return;
    }
    const playlistId = await syncVibePlaylist(
      vibe.name,
      ordered.map((track) => track.tidalId!),
      vibe.tidalPlaylistId,
    );
    vibe.tidalPlaylistId = playlistId;
    const started = await playTidalPlaylist(
      playlistId,
      startIndex,
      ordered[Math.min(startIndex, ordered.length - 1)]?.tidalId,
    );
    if (!started) {
      state.lastError = `TIDAL did not start ${vibe.name}`;
      return;
    }
    state.lastError = undefined;
    playingSince = Date.now();
    const current = ordered[Math.min(startIndex, ordered.length - 1)];
    lastObservedTitle = current?.title ?? "";
    state.nowPlaying = current
      ? { title: current.title, artist: current.artist, isPlaying: true }
      : state.nowPlaying;
    state.transport.playing = true;
  } finally {
    busy = false;
  }
}

async function advance(delta: number) {
  if (state.transport.oneshot) {
    const { resumeVibeId, resumeQueue, resumeIndex } = state.transport.oneshot;
    state.transport.oneshot = null;
    if (resumeVibeId) {
      state.transport.vibeId = resumeVibeId;
      state.transport.queue = resumeQueue;
      state.transport.queueIndex = resumeIndex;
      await playVibePlaylist(resumeVibeId, resumeIndex);
    }
    return;
  }
  if (state.transport.queue.length === 0) return;
  const skipped = await skipPlayback(delta > 0 ? "next" : "prev");
  if (!skipped) {
    state.lastError = delta > 0 ? "Could not skip forward" : "Could not skip back";
    return;
  }
  state.transport.queueIndex =
    (state.transport.queueIndex + delta + state.transport.queue.length) %
    state.transport.queue.length;
  playingSince = Date.now();
  const current = currentQueuedTrack();
  if (current) {
    lastObservedTitle = current.title;
    state.nowPlaying = {
      title: current.title,
      artist: current.artist,
      isPlaying: true,
    };
  }
}

async function handleCommand(command: DjCommand) {
  const { name, payload } = command;
  try {
    if (name === "playVibe") {
      const vibeId = String(payload.vibeId ?? "");
      const vibe = findVibe(state, vibeId);
      if (!vibe) throw new Error("Unknown vibe");
      if (vibe.tracks.length === 0) {
        state.lastError = `${vibe.name} has no tracks yet`;
        state.transport.vibeId = vibeId;
        return;
      }
      state.transport.oneshot = null;
      state.transport.vibeId = vibeId;
      state.transport.queue = buildQueue(vibeId);
      state.transport.queueIndex = 0;
      await playVibePlaylist(vibeId, 0);
      return;
    }

    if (name === "playAnthem") {
      const characterId = String(payload.characterId ?? "");
      const character = state.characters.find((item) => item.id === characterId);
      if (!character?.anthem) throw new Error("Character has no anthem");
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
      const started = await playTidalPlaylist(playlistId, 0, anthem.tidalId);
      if (started) {
        playingSince = Date.now();
        lastObservedTitle = anthem.title;
        state.nowPlaying = {
          title: anthem.title,
          artist: anthem.artist,
          isPlaying: true,
        };
        state.transport.playing = true;
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
        await playVibePlaylist(state.transport.vibeId, state.transport.queueIndex);
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
      if (!vibe) throw new Error("Unknown vibe");
      vibe.shuffle = Boolean(payload.shuffle);
      return;
    }

    if (name === "addTrack") {
      const vibe = findVibe(state, String(payload.vibeId ?? ""));
      if (!vibe) throw new Error("Unknown vibe");
      const input = String(payload.input ?? payload.url ?? payload.query ?? "");
      const existing = payload.track as DjTrack | undefined;
      let track: DjTrack;
      if (existing?.title) {
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
        state.lastError = `Could not add “${input}” — paste a TIDAL URL or search again`;
        return;
      }
      vibe.tracks.push(track);
      if (state.transport.vibeId === vibe.id) {
        state.transport.queue = buildQueue(vibe.id);
      }
      return;
    }

    if (name === "removeTrack") {
      const vibe = findVibe(state, String(payload.vibeId ?? ""));
      if (!vibe) throw new Error("Unknown vibe");
      const trackId = String(payload.trackId ?? "");
      vibe.tracks = vibe.tracks.filter((track) => track.id !== trackId);
      state.transport.queue = state.transport.queue.filter((id) => id !== trackId);
      if (state.transport.queueIndex >= state.transport.queue.length) {
        state.transport.queueIndex = 0;
      }
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
      return;
    }

    if (name === "removeCharacter") {
      const characterId = String(payload.characterId ?? "");
      state.characters = state.characters.filter((item) => item.id !== characterId);
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
      publish();
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
    publish();
  }
}

async function pollNowPlaying() {
  if (busy) return;
  try {
    const info = await readPlayerBar();
    const title = info.title ?? state.nowPlaying?.title ?? "";
    const artist = info.artist ?? state.nowPlaying?.artist ?? "";
    const changed =
      info.isPlaying !== (state.nowPlaying?.isPlaying ?? false) ||
      title !== (state.nowPlaying?.title ?? "");
    state.nowPlaying = {
      title,
      artist,
      isPlaying: info.isPlaying,
    };
    state.transport.playing = info.isPlaying;

    const queueTracks = state.transport.queue
      .map((id) => findTrack(state, id))
      .filter((track): track is DjTrack => Boolean(track));
    const matchIndex = queueTracks.findIndex(
      (track) =>
        (track.tidalId && info.tidalId === track.tidalId) ||
        titlesMatch(title, track.title),
    );
    if (matchIndex >= 0) {
      state.transport.queueIndex = matchIndex;
      lastObservedTitle = title;
      if (changed) publish();
      return;
    }

    const watching = Boolean(state.transport.vibeId) && Date.now() - playingSince > 10000;
    if (watching && title && lastObservedTitle && title !== lastObservedTitle) {
      lastObservedTitle = title;
      if (state.transport.vibeId) {
        await playVibePlaylist(state.transport.vibeId, state.transport.queueIndex);
      }
      return;
    }
    if (changed) publish();
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
      publish();
      console.error("Daemon connected");
      return;
    }
    if (message.type === "command") {
      void handleCommand(message);
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
  setInterval(() => {
    void pollNowPlaying();
  }, 2500);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
