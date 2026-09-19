import WebSocket from "ws";
import {
  catalogFromState,
  liveFromState,
  parseWireMessage,
  type DjCommand,
  type DjHealth,
  type DjState,
  type DjTrack,
} from "@/lib/dj/protocol";
import { finalizeCommandError, oneshotResumeDecision } from "@/lib/dj/policy";
import { assertDistinctSecrets, loadDaemonEnv, requiredEnv, wsUrl } from "./env";
import {
  bump,
  bumpCatalog,
  createTrack,
  findTrack,
  findVibe,
  loadState,
  newId,
  reconcileTracks,
  saveState,
  vibeSignature,
} from "./store";
import {
  ensureTidalWithCdp,
  isCdpAvailable,
  pausePlayback,
  playTidalPlaylist,
  readPlayerBar,
  resumePlayback,
  skipPlayback,
  setVolume,
  waitForPlayerChange,
  waitForPlayingState,
  type PlayerBarInfo,
} from "./tidal";
import { loadVibePlaylist, syncAnthemPlaylist } from "./tidal-api";
import { resolveTrackInput } from "./resolve";

loadDaemonEnv();
assertDistinctSecrets();

const secret = requiredEnv("DJ_DAEMON_SECRET");
let state: DjState = loadState();
state.health = { cdp: true, tidal: true };
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let volumeTimer: ReturnType<typeof setTimeout> | null = null;
let socket: WebSocket | null = null;
let reconnectDelay = 1000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectGen = 0;
let navigating = false;
let commandTail: Promise<void> = Promise.resolve();
let catalogDirty = false;
const playlistEtags = new Map<string, string>();
let unknownPullTimer: ReturnType<typeof setTimeout> | null = null;
let lastUnknownTidalId: string | null = null;
let unknownPullTries = 0;
let lastPongAt = 0;
let seenCommandIds = new Set<string>();
let oneshotArmedAt = 0;
let oneshotMismatchCount = 0;
let oneshotStoppedCount = 0;
let oneshotResumeQueued = false;

function persistSoon() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    saveState(state);
  }, 250);
}

function flushPersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  saveState(state);
}

function sendDaemon(payload: unknown) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function setHealth(next: Partial<DjHealth>): boolean {
  const cdp = next.cdp ?? state.health?.cdp ?? false;
  const tidal = next.tidal ?? state.health?.tidal ?? false;
  const changed = cdp !== state.health?.cdp || tidal !== state.health?.tidal;
  state.health = { cdp, tidal };
  return changed;
}

function resetOneshotWatch() {
  oneshotArmedAt = Date.now();
  oneshotMismatchCount = 0;
  oneshotStoppedCount = 0;
  oneshotResumeQueued = false;
}

function cancelUnknownPull() {
  if (unknownPullTimer) {
    clearTimeout(unknownPullTimer);
    unknownPullTimer = null;
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

function findTrackInVibe(vibeId: string | null, tidalId: string | null) {
  if (!vibeId || !tidalId) return null;
  const vibe = findVibe(state, vibeId);
  if (!vibe) return null;
  const matchIndex = vibe.tracks.findIndex((track) => track.tidalId === tidalId);
  if (matchIndex < 0) return null;
  return { vibe, matchIndex };
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

  const oneshot = state.transport.oneshot;
  if (oneshot) {
    const decision = oneshotResumeDecision({
      oneshotTidalId: oneshot.tidalId,
      infoTidalId: info.tidalId,
      isPlaying: info.isPlaying,
      now: Date.now(),
      armedAt: oneshotArmedAt,
      mismatchCount: oneshotMismatchCount,
      stoppedCount: oneshotStoppedCount,
    });
    oneshotMismatchCount = decision.mismatchCount;
    oneshotStoppedCount = decision.stoppedCount;
    if (decision.resume && !oneshotResumeQueued) {
      oneshotResumeQueued = true;
      enqueue(async () => {
        try {
          await resumeFromOneshot();
          publishLive();
        } finally {
          oneshotResumeQueued = false;
        }
      });
    }
    return;
  }
  if (!info.tidalId) return;

  const current = findTrackInVibe(state.transport.vibeId, info.tidalId);
  if (current) {
    lastUnknownTidalId = null;
    unknownPullTries = 0;
    state.transport.queue = current.vibe.tracks.map((track) => track.id);
    state.transport.queueIndex = current.matchIndex;
  }
}

function scheduleUnknownTrackPull(tidalId: string) {
  if (state.transport.oneshot) return;
  if (lastUnknownTidalId === tidalId && unknownPullTries >= 4) return;
  if (lastUnknownTidalId === tidalId && unknownPullTimer) return;
  if (lastUnknownTidalId !== tidalId) {
    lastUnknownTidalId = tidalId;
    unknownPullTries = 0;
  }
  if (unknownPullTimer) clearTimeout(unknownPullTimer);
  unknownPullTimer = setTimeout(() => {
    unknownPullTimer = null;
    unknownPullTries += 1;
    void refreshAllVibes({ clearEtags: unknownPullTries === 1 })
      .then(async (changed) => {
        applyNowPlaying(await readPlayerBar());
        if (findTrackInVibe(state.transport.vibeId, tidalId) || findTrackInCatalog(tidalId)) {
          lastUnknownTidalId = null;
          unknownPullTries = 0;
        } else {
          playlistEtags.delete(state.transport.vibeId ?? "");
        }
        if (changed) publishCatalog();
        else publishLive();
      })
      .catch((error) => {
        console.error("unknown-track playlist pull failed", error);
      });
  }, 1000);
}

function findTrackInCatalog(tidalId: string | null) {
  if (!tidalId) return null;
  if (state.transport.vibeId) {
    const current = findTrackInVibe(state.transport.vibeId, tidalId);
    if (current) return current;
  }
  for (const vibe of state.vibes) {
    const matchIndex = vibe.tracks.findIndex((track) => track.tidalId === tidalId);
    if (matchIndex >= 0) return { vibe, matchIndex };
  }
  return null;
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

async function refreshAllVibes(options?: { clearEtags?: boolean }) {
  if (options?.clearEtags) playlistEtags.clear();
  const results = await Promise.all(
    state.vibes.map(async (vibe) => {
      try {
        return await refreshVibeFromTidal(vibe);
      } catch (error) {
        console.error(`playlist pull failed for ${vibe.name}`, error);
        if (setHealth({ tidal: false })) publishLive();
        return false;
      }
    }),
  );
  if (results.some(Boolean)) setHealth({ tidal: true });
  return results.some(Boolean);
}

async function playVibePlaylist(vibeId: string) {
  const vibe = findVibe(state, vibeId);
  if (!vibe) return;
  navigating = true;
  try {
    try {
      await refreshVibeFromTidal(vibe);
    } catch (error) {
      console.error(`playlist refresh failed for ${vibe.name}`, error);
      if (!vibe.tidalPlaylistId || vibe.tracks.length === 0) throw error;
    }
    if (!vibe.tidalPlaylistId || vibe.tracks.length === 0) {
      state.lastError = `${vibe.name} has no tracks on TIDAL yet`;
      return;
    }
    const allowed = vibe.tracks
      .map((track) => track.tidalId)
      .filter((id): id is string => Boolean(id));
    const started = await playTidalPlaylist(vibe.tidalPlaylistId, undefined, allowed);
    if (!started) {
      state.lastError = `TIDAL did not start ${vibe.name}`;
      return;
    }
    state.lastError = undefined;
    state.transport.vibeId = vibeId;
    state.transport.queue = vibe.tracks.map((track) => track.id);
    state.transport.queueIndex = -1;
    applyNowPlaying(await readPlayerBar());
    state.transport.playing = true;
  } finally {
    navigating = false;
  }
}

async function resumeFromOneshot() {
  const oneshot = state.transport.oneshot;
  if (!oneshot) return;
  if (oneshot.resumeVibeId) {
    const vibe = findVibe(state, oneshot.resumeVibeId);
    if (vibe) {
      state.transport.queue =
        oneshot.resumeQueue.length > 0
          ? oneshot.resumeQueue
          : vibe.tracks.map((track) => track.id);
      state.transport.queueIndex = oneshot.resumeIndex;
    }
    const trackId = state.transport.queue[oneshot.resumeIndex];
    const track = trackId ? findTrack(state, trackId) : undefined;
    if (vibe?.tidalPlaylistId && track?.tidalId) {
      state.transport.oneshot = null;
      state.transport.vibeId = oneshot.resumeVibeId;
      navigating = true;
      try {
        const started = await playTidalPlaylist(vibe.tidalPlaylistId, track.tidalId);
        if (started) {
          applyNowPlaying(await readPlayerBar());
          return;
        }
      } finally {
        navigating = false;
      }
    }
    state.transport.oneshot = null;
    await playVibePlaylist(oneshot.resumeVibeId);
    return;
  }
  state.transport.oneshot = null;
  const previous = await readPlayerBar();
  const skipped = await skipPlayback("next");
  if (skipped) applyNowPlaying(await readPlayerBar());
  else applyNowPlaying(await waitForPlayerChange(previous, 5000));
}

function playerChanged(previous: PlayerBarInfo, next: PlayerBarInfo) {
  return Boolean(
    (next.tidalId && next.tidalId !== previous.tidalId) ||
      (next.title && previous.title && next.title !== previous.title),
  );
}

async function advance(delta: number) {
  if (state.transport.oneshot) {
    await resumeFromOneshot();
    return;
  }
  const previous = await readPlayerBar();
  const skipped = await skipPlayback(delta > 0 ? "next" : "prev");
  const after = await readPlayerBar();
  if (playerChanged(previous, after)) {
    applyNowPlaying(after);
    return;
  }
  if (!skipped) {
    state.lastError = delta > 0 ? "Could not skip forward" : "Could not skip back";
  }
}

async function runCommand(command: DjCommand) {
  const { name, payload } = command;
  catalogDirty = false;
  state.lastError = undefined;
  try {
    if (name === "playVibe") {
      const vibeId = String(payload.vibeId ?? "");
      const vibe = findVibe(state, vibeId);
      if (!vibe) throw new Error("Unknown vibe");
      state.transport.oneshot = null;
      resetOneshotWatch();
      state.pending = {
        action: "playVibe",
        vibeId,
        label: `Opening ${vibe.name}`,
        commandId: command.id,
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
        commandId: command.id,
      };
      publishLive();
      cancelUnknownPull();
      const resume = {
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
        if (!started) {
          state.lastError = `Could not play ${character.name}`;
          return;
        }
        state.transport.oneshot = { ...resume, tidalId: anthem.tidalId };
        resetOneshotWatch();
        state.nowPlaying = {
          title: anthem.title,
          artist: anthem.artist,
          isPlaying: true,
          tidalId: anthem.tidalId,
        };
        state.transport.playing = true;
      } finally {
        navigating = false;
      }
      return;
    }

    if (name === "pause") {
      await pausePlayback();
      const info = await waitForPlayingState(false, 4000);
      state.transport.playing = info.isPlaying;
      if (state.nowPlaying) state.nowPlaying.isPlaying = info.isPlaying;
      if (info.isPlaying) state.lastError = "Could not pause";
      return;
    }

    if (name === "resume") {
      const current = await readPlayerBar();
      if (current.isPlaying) {
        state.transport.playing = true;
        if (state.nowPlaying) state.nowPlaying.isPlaying = true;
        return;
      }
      await resumePlayback();
      let after = await waitForPlayingState(true, 2500);
      if (after.isPlaying) {
        state.transport.playing = true;
        if (state.nowPlaying) state.nowPlaying.isPlaying = true;
        return;
      }
      await resumePlayback();
      after = await waitForPlayingState(true, 2500);
      if (after.isPlaying) {
        state.transport.playing = true;
        if (state.nowPlaying) state.nowPlaying.isPlaying = true;
        return;
      }
      state.lastError = "Could not resume";
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
        enqueue(async () => {
          await setVolume(state.transport.volume);
        });
      }, 180);
      return;
    }

    if (name === "refreshVibe") {
      const vibe = findVibe(state, String(payload.vibeId ?? ""));
      if (!vibe) throw new Error("Unknown vibe");
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
        if (!resolved.tidalId && !resolved.title) {
          throw new Error("Could not resolve that anthem");
        }
        anthem = createTrack({
          title: resolved.title ?? name,
          artist: resolved.artist ?? "Unknown",
          tidalId: resolved.tidalId,
          tidalUrl: resolved.tidalUrl,
          spotifyUrl: resolved.spotifyUrl,
        });
      }
      state.characters.push({ id: newId("chr"), name, anthem });
      markCatalog();
      return;
    }

    if (name === "removeCharacter") {
      const characterId = String(payload.characterId ?? "");
      state.characters = state.characters.filter((item) => item.id !== characterId);
      if (state.transport.oneshot?.characterId === characterId) {
        state.transport.oneshot = null;
      }
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
        if (!resolved.tidalId && !resolved.title) {
          throw new Error("Could not resolve that anthem");
        }
        character.anthem = createTrack({
          title: resolved.title ?? character.name,
          artist: resolved.artist ?? "Unknown",
          tidalId: resolved.tidalId,
          tidalUrl: resolved.tidalUrl,
          spotifyUrl: resolved.spotifyUrl,
        });
      }
      markCatalog();
      return;
    }
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error);
    console.error("dj command failed", name, state.lastError);
  } finally {
    state.pending = null;
    state.lastAck = {
      id: command.id,
      ok: !state.lastError,
      error: state.lastError,
    };
    sendDaemon({
      type: "ack",
      id: command.id,
      ok: !state.lastError,
      error: state.lastError,
    });
    if (catalogDirty) publishCatalog();
    else publishLive();
  }
}

async function handleCommand(command: DjCommand) {
  if (seenCommandIds.has(command.id)) return;
  seenCommandIds.add(command.id);
  if (seenCommandIds.size > 200) {
    seenCommandIds = new Set([...seenCommandIds].slice(-80));
  }
  await runCommand(command);
  state.lastError = finalizeCommandError(state.lastError, false);
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
    const previousTidalId = state.nowPlaying?.tidalId;
    const skipError = state.lastError?.startsWith("Could not skip");
    applyNowPlaying(info);
    if (skipError && info.tidalId && info.tidalId !== previousTidalId) {
      state.lastError = undefined;
    }
    if (
      info.tidalId &&
      !state.transport.oneshot &&
      !findTrackInVibe(state.transport.vibeId, info.tidalId)
    ) {
      scheduleUnknownTrackPull(info.tidalId);
    }
    const healthChanged = setHealth({ cdp: true, tidal: true });
    if (
      changed ||
      healthChanged ||
      skipError !== Boolean(state.lastError?.startsWith("Could not skip")) ||
      state.transport.queueIndex !== previousIndex ||
      state.transport.vibeId !== previousVibeId
    ) {
      publishLive();
    }
  } catch (error) {
    console.error("now playing poll failed", error);
    const cdp = await isCdpAvailable();
    const healthChanged = setHealth({ cdp, tidal: false });
    if (healthChanged) publishLive();
    if (!cdp) {
      state.daemonOnline = true;
      publishLive();
      try {
        await ensureTidalWithCdp();
        setHealth({ cdp: true, tidal: true });
        publishLive();
      } catch (relaunchError) {
        console.error("TIDAL relaunch failed", relaunchError);
      }
    }
  }
}

function enqueue(work: () => Promise<void>) {
  commandTail = commandTail.then(work).catch((error) => {
    console.error("dj command queue failed", error);
  });
}

function connect() {
  const gen = ++connectGen;
  if (socket) {
    try {
      socket.terminate();
    } catch {
      // ignore
    }
  }
  const url = wsUrl();
  console.error(`Connecting to ${url}`);
  const ws = new WebSocket(url);
  socket = ws;

  ws.on("open", () => {
    if (connectGen !== gen) return;
    reconnectDelay = 1000;
    lastPongAt = Date.now();
    ws.send(JSON.stringify({ type: "hello", role: "daemon", secret }));
    console.error("Daemon hello sent");
  });

  ws.on("message", (data) => {
    if (connectGen !== gen) return;
    const message = parseWireMessage(data.toString());
    if (!message) return;
    if (message.type === "pong") {
      lastPongAt = Date.now();
      return;
    }
    if (message.type === "ready") {
      lastPongAt = Date.now();
      state.daemonOnline = true;
      if (message.snapshot) {
        state.version = Math.max(state.version, message.snapshot.version);
        state.catalogVersion = Math.max(
          state.catalogVersion,
          message.snapshot.catalogVersion,
        );
      }
      publishCatalog();
      console.error("Daemon connected");
      return;
    }
    if (message.type === "command") {
      lastPongAt = Date.now();
      enqueue(() => handleCommand(message));
    }
    if (message.type === "error") {
      console.error("relay error:", message.message);
    }
  });

  ws.on("close", () => {
    if (connectGen !== gen) return;
    console.error("Relay closed; reconnecting...");
    scheduleReconnect();
  });

  ws.on("error", (error) => {
    console.error("Relay socket error", error.message);
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  if (socket) {
    try {
      socket.terminate();
    } catch {
      // ignore
    }
  }
  socket = null;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 15000);
}

function shutdown() {
  flushPersist();
  process.exit(0);
}

async function main() {
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
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
    enqueue(() => pollNowPlaying());
  }, 500);
  setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      sendDaemon({ type: "ping" });
      if (lastPongAt && Date.now() - lastPongAt > 15000) {
        console.error("Relay ping timeout; reconnecting...");
        scheduleReconnect();
      }
    }
  }, 5000);
  setInterval(() => {
    enqueue(async () => {
      const changed = await refreshAllVibes();
      if (changed) publishCatalog();
    });
  }, 15_000);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
