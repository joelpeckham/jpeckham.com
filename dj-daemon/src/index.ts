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
  saveState,
  shuffleIds,
} from "./store";
import {
  ensureTidalWithCdp,
  pausePlayback,
  playTidalTrack,
  readPlayerBar,
  resumePlayback,
  searchTidal,
  setVolume,
} from "./tidal";
import { parseTidalUrl, resolveTrackInput } from "./resolve";

loadDaemonEnv();

const secret = requiredEnv("DJ_DAEMON_SECRET");
let state: DjState = loadState();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let socket: WebSocket | null = null;
let playingSince = 0;
let lastObservedTitle = "";
let reconnectDelay = 1000;

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
  const resolved = await resolveTrackInput(query, {
    title: track.title,
    artist: track.artist,
  });
  if (resolved.tidalId) {
    track.tidalId = resolved.tidalId;
    track.tidalUrl = resolved.tidalUrl ?? track.tidalUrl;
    if (resolved.title) track.title = resolved.title;
    if (resolved.artist) track.artist = resolved.artist;
  }
  return track;
}

async function playResolved(track: DjTrack): Promise<boolean> {
  const ready = await ensureResolved(track);
  if (!ready.tidalId) {
    state.lastError = `Could not find “${track.title}” on TIDAL`;
    return false;
  }
  state.lastError = undefined;
  const started = await playTidalTrack(ready.tidalId);
  if (started) {
    playingSince = Date.now();
    lastObservedTitle = ready.title;
    state.nowPlaying = {
      title: ready.title,
      artist: ready.artist,
      isPlaying: true,
    };
    state.transport.playing = true;
  } else {
    state.lastError = `TIDAL did not start “${ready.title}”`;
  }
  return started;
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

async function playQueueIndex(index: number) {
  const { queue } = state.transport;
  if (queue.length === 0) return;
  const nextIndex = ((index % queue.length) + queue.length) % queue.length;
  state.transport.queueIndex = nextIndex;
  const track = currentQueuedTrack();
  if (!track) return;
  await playResolved(track);
}

async function advance(delta: number) {
  if (state.transport.oneshot) {
    const { resumeVibeId, resumeQueue, resumeIndex } = state.transport.oneshot;
    state.transport.oneshot = null;
    if (resumeVibeId) {
      state.transport.vibeId = resumeVibeId;
      state.transport.queue = resumeQueue;
      await playQueueIndex(resumeIndex);
    }
    return;
  }
  if (state.transport.queue.length === 0) return;
  await playQueueIndex(state.transport.queueIndex + delta);
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
      await playQueueIndex(0);
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
      await playResolved(character.anthem);
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
      if (!resumed && currentQueuedTrack()) {
        await playResolved(currentQueuedTrack()!);
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
      const volume = Number(payload.volume);
      state.transport.volume = volume;
      await setVolume(volume);
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
        const resolved = await resolveTrackInput(input);
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
      const hits = await searchTidal(query);
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

    const watching = state.transport.playing || Boolean(state.transport.oneshot);
    if (watching && Date.now() - playingSince > 8000) {
      const expected = state.transport.oneshot
        ? state.characters.find((c) => c.id === state.transport.oneshot?.characterId)
            ?.anthem?.title
        : currentQueuedTrack()?.title;
      if (
        expected &&
        title &&
        lastObservedTitle &&
        title !== lastObservedTitle &&
        !title.toLowerCase().includes(expected.slice(0, 12).toLowerCase())
      ) {
        lastObservedTitle = title;
        await advance(1);
        return;
      }
      if (!info.isPlaying && Date.now() - playingSince > 12000) {
        await advance(1);
        return;
      }
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
    state.daemonOnline = true;
    publish();
    console.error("Daemon connected");
  });

  ws.on("message", (data) => {
    const message = parseWireMessage(data.toString());
    if (!message) return;
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
