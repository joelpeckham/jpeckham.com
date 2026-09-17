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
  loadState,
  newId,
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
import { loadVibePlaylist, syncAnthemPlaylist } from "./tidal-api";
import { resolveTrackInput } from "./resolve";

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
const playlistEtags = new Map<string, string>();
let unknownPullTimer: ReturnType<typeof setTimeout> | null = null;
let lastUnknownTidalId: string | null = null;
let holdVibeUntil = 0;

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
  }
  return track;
}

function findTrackInCatalog(tidalId: string | null) {
  if (!tidalId) return null;
  for (const vibe of state.vibes) {
    const matchIndex = vibe.tracks.findIndex((track) => track.tidalId === tidalId);
    if (matchIndex >= 0) return { vibe, matchIndex };
  }
  return null;
}

function applyNowPlaying(info: PlayerBarInfo) {
  const title = info.title ?? state.nowPlaying?.title ?? "";
  const artist = info.artist ?? state.nowPlaying?.artist ?? "";
  state.nowPlaying = {
    title,
    artist,
    isPlaying: info.isPlaying,
    tidalId: info.tidalId ?? undefined,
  };
  state.transport.playing = info.isPlaying;

  if (state.transport.oneshot) return;
  if (!info.tidalId) return;

  const match = findTrackInCatalog(info.tidalId);
  if (match) {
    lastUnknownTidalId = null;
    state.transport.vibeId = match.vibe.id;
    state.transport.queue = match.vibe.tracks.map((track) => track.id);
    state.transport.queueIndex = match.matchIndex;
    return;
  }

  if (Date.now() < holdVibeUntil && state.transport.vibeId) return;

  state.transport.vibeId = null;
  state.transport.queue = [];
  state.transport.queueIndex = -1;
}

function scheduleUnknownTrackPull(tidalId: string) {
  if (lastUnknownTidalId === tidalId) return;
  lastUnknownTidalId = tidalId;
  if (unknownPullTimer) clearTimeout(unknownPullTimer);
  unknownPullTimer = setTimeout(() => {
    unknownPullTimer = null;
    playlistEtags.clear();
    void refreshAllVibes()
      .then(async (changed) => {
        applyNowPlaying(await readPlayerBar());
        if (changed) publishCatalog();
        else publishLive();
      })
      .catch((error) => {
        console.error("unknown-track playlist pull failed", error);
      });
  }, 1000);
}

async function refreshVibeFromTidal(
  vibe: NonNullable<ReturnType<typeof findVibe>>,
) {
  const before = vibeSignature(vibe);
  const loaded = await loadVibePlaylist(vibe.name, vibe.tidalPlaylistId, {
    ifNoneMatch: playlistEtags.get(vibe.id),
  });
  if (vibe.tidalPlaylistId !== loaded.uuid) playlistEtags.delete(vibe.id);
  vibe.tidalPlaylistId = loaded.uuid;
  if (loaded.etag) playlistEtags.set(vibe.id, loaded.etag);
  if (loaded.unchanged) return false;
  vibe.tracks = reconcileTracks(vibe.tracks, loaded.tracks);
  const changed = vibeSignature(vibe) !== before;
  if (changed) markCatalog();
  return changed;
}

async function refreshAllVibes() {
  const results = await Promise.all(
    state.vibes.map(async (vibe) => {
      try {
        return await refreshVibeFromTidal(vibe);
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
  await refreshVibeFromTidal(vibe);
  if (!vibe.tidalPlaylistId || vibe.tracks.length === 0) {
    state.lastError = `${vibe.name} has no tracks on TIDAL yet`;
    return;
  }
  state.transport.queue = vibe.tracks.map((track) => track.id);
  holdVibeUntil = Date.now() + 4000;
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
            tidalId: anthem.tidalId,
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
      if (resumed) {
        state.transport.playing = true;
        if (state.nowPlaying) state.nowPlaying.isPlaying = true;
        return;
      }
      if (state.transport.vibeId) {
        await playVibePlaylist(state.transport.vibeId);
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

    if (name === "refreshVibe") {
      const vibe = findVibe(state, String(payload.vibeId ?? ""));
      if (!vibe) throw new Error("Unknown vibe");
      state.lastError = undefined;
      playlistEtags.delete(vibe.id);
      await refreshVibeFromTidal(vibe);
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
      (info.artist ?? "") !== (state.nowPlaying?.artist ?? "") ||
      (info.tidalId ?? undefined) !== state.nowPlaying?.tidalId;
    const previousIndex = state.transport.queueIndex;
    const previousVibeId = state.transport.vibeId;
    applyNowPlaying(info);
    if (
      info.tidalId &&
      !state.transport.oneshot &&
      !findTrackInCatalog(info.tidalId)
    ) {
      scheduleUnknownTrackPull(info.tidalId);
    }
    if (
      changed ||
      state.transport.queueIndex !== previousIndex ||
      state.transport.vibeId !== previousVibeId
    ) {
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
  void refreshAllVibes()
    .then(() => {
      publishCatalog();
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
