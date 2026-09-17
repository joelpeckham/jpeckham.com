"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import {
  emptyTransport,
  mergeCatalog,
  mergeLive,
  parseWireMessage,
  type DjCommandName,
  type DjPending,
  type DjState,
  type DjTrack,
} from "@/lib/dj/protocol";

const idleState: DjState = {
  version: 0,
  catalogVersion: 0,
  daemonOnline: false,
  vibes: [],
  characters: [],
  transport: emptyTransport(),
  nowPlaying: null,
  search: null,
  pending: null,
};

const fallbackVibes = [
  { id: "noble-quarter", name: "Noble Quarter", hue: "gold", shuffle: true, tracks: [] },
  { id: "tavern", name: "Tavern", hue: "amber", shuffle: true, tracks: [] },
  { id: "streets", name: "Streets", hue: "ash", shuffle: true, tracks: [] },
  { id: "court", name: "Court", hue: "violet", shuffle: true, tracks: [] },
  { id: "tension", name: "Tension", hue: "moss", shuffle: true, tracks: [] },
  { id: "combat", name: "Combat", hue: "blood", shuffle: true, tracks: [] },
  { id: "boss", name: "Boss", hue: "ember", shuffle: true, tracks: [] },
  { id: "sorrow", name: "Sorrow", hue: "blue", shuffle: true, tracks: [] },
  { id: "triumph", name: "Triumph", hue: "gold", shuffle: true, tracks: [] },
  { id: "travel", name: "Travel", hue: "dust", shuffle: true, tracks: [] },
];

function wsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/api/dj/ws/`;
}

function looksLikeTrackLink(value: string) {
  return /https?:\/\//i.test(value) || /(?:listen\.)?tidal\.com|open\.spotify\.com/i.test(value);
}

function DjModal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dj-modal" role="presentation" onClick={onClose}>
      <div
        className="dj-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dj-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dj-modal-head">
          <h2 id="dj-modal-title" className="dj-title text-2xl">
            {title}
          </h2>
          <button type="button" className="dj-icon-btn" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const VolumeSlider = memo(function VolumeSlider({
  remoteVolume,
  disabled,
  onCommit,
}: {
  remoteVolume: number;
  disabled: boolean;
  onCommit: (volume: number) => void;
}) {
  const [value, setValue] = useState(remoteVolume);
  const valueRef = useRef(remoteVolume);
  const draggingRef = useRef(false);
  const lastSentRef = useRef(remoteVolume);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (draggingRef.current) return;
    valueRef.current = remoteVolume;
    lastSentRef.current = remoteVolume;
    setValue(remoteVolume);
  }, [remoteVolume]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const flush = useCallback(
    (next: number) => {
      if (next === lastSentRef.current) return;
      lastSentRef.current = next;
      onCommit(next);
    },
    [onCommit],
  );

  return (
    <label className="mt-4 block text-sm text-[var(--dj-muted)]">
      Volume
      <input
        className="dj-range mt-2"
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onPointerDown={() => {
          draggingRef.current = true;
        }}
        onPointerUp={() => {
          draggingRef.current = false;
          if (timerRef.current) window.clearTimeout(timerRef.current);
          flush(valueRef.current);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        onChange={(event) => {
          const next = Number(event.target.value);
          valueRef.current = next;
          setValue(next);
          if (timerRef.current) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => flush(next), 240);
        }}
      />
    </label>
  );
});

export function DjApp() {
  const [state, setState] = useState<DjState>(idleState);
  const [socketOpen, setSocketOpen] = useState(false);
  const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null);
  const [trackInput, setTrackInput] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterInput, setCharacterInput] = useState("");
  const [anthemOpen, setAnthemOpen] = useState(false);
  const [playlistBusy, setPlaylistBusy] = useState<string | null>(null);
  const [localPending, setLocalPending] = useState<DjPending | null>(null);
  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const versionRef = useRef(0);
  const sentVersionRef = useRef(0);
  const catalogWaitRef = useRef(0);
  const editVersionRef = useRef(0);

  const send = useCallback(
    (name: DjCommandName, payload: Record<string, unknown> = {}, pending?: DjPending) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const pendingLabels: Partial<Record<DjCommandName, string>> = {
        playVibe: "Opening playlist",
        playAnthem: "Playing anthem",
      };
      const nextPending =
        pending ??
        (pendingLabels[name]
          ? {
              action: name as NonNullable<DjPending["action"]>,
              label: pendingLabels[name]!,
              vibeId: typeof payload.vibeId === "string" ? payload.vibeId : undefined,
            }
          : null);
      if (nextPending) {
        sentVersionRef.current = versionRef.current;
        setLocalPending(nextPending);
      }
      if (name === "pause") setOptimisticPlaying(false);
      if (name === "resume") setOptimisticPlaying(true);
      ws.send(
        JSON.stringify({
          type: "command",
          id: crypto.randomUUID(),
          name,
          payload,
        }),
      );
    },
    [],
  );

  const commitVolume = useCallback(
    (volume: number) => {
      send("setVolume", { volume });
    },
    [send],
  );
  const closeAnthem = useCallback(() => setAnthemOpen(false), []);

  useEffect(() => {
    let cancelled = false;
    let retry = 800;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        retry = 800;
        setSocketOpen(true);
        ws.send(JSON.stringify({ type: "hello", role: "remote" }));
      });

      ws.addEventListener("message", (event) => {
        const message = parseWireMessage(String(event.data));
        if (!message) return;
        if (message.type === "ready") {
          if (message.snapshot) {
            setState({
              ...message.snapshot,
              daemonOnline: message.daemonOnline,
              catalogVersion: message.snapshot.catalogVersion ?? 0,
            });
          } else {
            setState((current) => ({
              ...current,
              daemonOnline: message.daemonOnline,
            }));
          }
          return;
        }
        if (message.type === "snapshot") {
          setState({
            ...message.snapshot,
            catalogVersion: message.snapshot.catalogVersion ?? 0,
          });
        }
        if (message.type === "live") {
          setState((current) => mergeLive(current, message.live));
        }
        if (message.type === "catalog") {
          setState((current) => mergeCatalog(current, message.catalog));
        }
      });

      ws.addEventListener("close", () => {
        setSocketOpen(false);
        if (cancelled) return;
        window.setTimeout(connect, retry);
        retry = Math.min(retry * 2, 8000);
      });
    };

    connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
    };
  }, []);

  versionRef.current = state.version;

  useEffect(() => {
    if (!localPending) return;
    if (state.pending) return;
    if (state.version > sentVersionRef.current) {
      setLocalPending(null);
    }
  }, [localPending, state.pending, state.version]);

  useEffect(() => {
    if (!localPending) return;
    const timer = window.setTimeout(() => setLocalPending(null), 45000);
    return () => window.clearTimeout(timer);
  }, [localPending]);

  useEffect(() => {
    if (optimisticPlaying === null) return;
    if (state.transport.playing === optimisticPlaying) {
      setOptimisticPlaying(null);
    }
  }, [optimisticPlaying, state.transport.playing]);

  useEffect(() => {
    if (!playlistBusy) return;
    const catalogDone = state.catalogVersion > catalogWaitRef.current;
    const failed = Boolean(state.lastError) && state.version > editVersionRef.current;
    if (catalogDone || failed) setPlaylistBusy(null);
  }, [playlistBusy, state.catalogVersion, state.lastError, state.version]);

  useEffect(() => {
    if (!playlistBusy) return;
    const timer = window.setTimeout(() => setPlaylistBusy(null), 20000);
    return () => window.clearTimeout(timer);
  }, [playlistBusy]);

  const vibes = state.vibes.length > 0 ? state.vibes : fallbackVibes;
  const pending = localPending ?? state.pending ?? null;
  const switching = pending?.action === "playVibe" || pending?.action === "playAnthem";
  const activeVibeId =
    pending?.vibeId ?? selectedVibeId ?? state.transport.vibeId ?? vibes[0]?.id ?? null;
  const activeVibe = vibes.find((vibe) => vibe.id === activeVibeId) ?? null;
  const currentTrackId = state.transport.queue[state.transport.queueIndex];
  const live = socketOpen && state.daemonOnline;
  const playing = optimisticPlaying ?? state.transport.playing;
  const title = switching
    ? pending?.label || "Opening playlist"
    : state.nowPlaying?.title || "Silence in the quarter";
  const artist = switching
    ? "Waiting on TIDAL…"
    : state.nowPlaying?.artist || "Waiting on the daemon";
  const pill = !socketOpen
    ? "Connecting"
    : !state.daemonOnline
      ? "Daemon dark"
      : switching
        ? "Working"
        : "Live";

  const queueTracks = activeVibe?.tracks ?? [];
  const beginPlaylistEdit = (label: string) => {
    catalogWaitRef.current = state.catalogVersion;
    editVersionRef.current = state.version;
    setPlaylistBusy(label);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-5 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="dj-kicker">The Fall of Asperabad</p>
          <h1 className="dj-title mt-2 text-4xl sm:text-5xl">Noble Quarter DJ</h1>
        </div>
        <span className="dj-pill" aria-live="polite">
          <span
            className="dj-dot"
            data-on={live ? "true" : "false"}
            data-busy={switching ? "true" : "false"}
          />
          {pill}
        </span>
      </header>

      <section
        className="rounded-sm border border-[var(--dj-line)] bg-[var(--dj-panel)] p-4 shadow-[var(--dj-shadow)]"
        aria-busy={switching ? true : undefined}
      >
        <p className="dj-kicker">{switching ? "Working" : "Now playing"}</p>
        <p className="mt-2 font-[family-name:var(--font-dj-display)] text-2xl leading-tight">
          {switching ? (
            <span className="dj-pending-title">
              <LoaderCircle className="dj-spinner" aria-hidden="true" />
              {title}
            </span>
          ) : (
            title
          )}
        </p>
        <p className="mt-1 text-[var(--dj-muted)]">{artist}</p>
        {state.lastError ? (
          <p className="mt-2 text-sm text-[var(--dj-blood-2)]">{state.lastError}</p>
        ) : null}

        <div className="dj-transport mt-4">
          <button
            type="button"
            className="dj-icon-btn"
            disabled={!live}
            aria-label="Previous"
            onClick={() => send("prev")}
          >
            <SkipBack aria-hidden="true" />
          </button>
          <button
            type="button"
            className="dj-icon-btn dj-transport-play"
            disabled={!live}
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => send(playing ? "pause" : "resume")}
          >
            {playing ? (
              <Pause aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="dj-icon-btn"
            disabled={!live}
            aria-label="Next"
            onClick={() => send("next")}
          >
            <SkipForward aria-hidden="true" />
          </button>
          <button
            type="button"
            className="dj-icon-btn"
            disabled={!live || !state.transport.vibeId || switching}
            aria-label="Restart vibe"
            onClick={() =>
              state.transport.vibeId &&
              send("playVibe", { vibeId: state.transport.vibeId })
            }
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>

        <VolumeSlider
          remoteVolume={state.transport.volume}
          disabled={!live}
          onCommit={commitVolume}
        />
      </section>

      <section>
        <div className="dj-section-head">
          <h2 className="dj-title text-2xl">Vibes</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {vibes.map((vibe) => {
            const active = state.transport.vibeId === vibe.id;
            const opening = pending?.action === "playVibe" && pending.vibeId === vibe.id;
            return (
              <button
                key={vibe.id}
                type="button"
                className="dj-vibe"
                data-hue={vibe.hue}
                data-active={active ? "true" : "false"}
                data-pending={opening ? "true" : "false"}
                disabled={!live || (switching && !opening)}
                onClick={() => {
                  setSelectedVibeId(vibe.id);
                  send("playVibe", { vibeId: vibe.id }, {
                    action: "playVibe",
                    vibeId: vibe.id,
                    label: `Opening ${vibe.name}`,
                  });
                }}
              >
                <span className="dj-kicker">
                  {opening ? "Opening…" : `${vibe.tracks.length} tracks`}
                </span>
                <span className="mt-1 flex items-center gap-2 font-[family-name:var(--font-dj-display)] text-xl">
                  {opening ? <LoaderCircle className="dj-spinner" aria-hidden="true" /> : null}
                  {vibe.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="dj-section-head">
          <h2 className="dj-title text-2xl">Anthems</h2>
          <button
            type="button"
            className="dj-icon-btn"
            aria-label="Add anthem"
            onClick={() => setAnthemOpen(true)}
          >
            <Plus aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.characters.length === 0 ? (
            <p className="text-[var(--dj-muted)]">No characters yet.</p>
          ) : (
            state.characters.map((character) => (
              <button
                key={character.id}
                type="button"
                className="dj-solid"
                disabled={!live || !character.anthem || switching}
                onClick={() =>
                  send(
                    "playAnthem",
                    { characterId: character.id },
                    {
                      action: "playAnthem",
                      label: `Playing ${character.name}`,
                    },
                  )
                }
              >
                {character.name}
              </button>
            ))
          )}
        </div>
      </section>

      <section className="dj-playlist pb-10">
        <div className="dj-section-head">
          <div>
            <h2 className="dj-title text-2xl">
              {activeVibe ? `${activeVibe.name}` : "Playlist"}
            </h2>
            <p className="mt-1 text-sm text-[var(--dj-muted)]">
              {playlistBusy
                ? playlistBusy
                : activeVibe
                  ? `${activeVibe.tracks.length} tracks on TIDAL`
                  : "Choose a vibe"}
            </p>
          </div>
          <button
            type="button"
            className="dj-ghost"
            disabled={!live || !activeVibe}
            onClick={() => {
              if (!activeVibeId) return;
              send("refreshVibe", { vibeId: activeVibeId });
              beginPlaylistEdit("Refreshing TIDAL…");
            }}
          >
            Refresh
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {vibes.map((vibe) => (
            <button
              key={vibe.id}
              type="button"
              className="dj-ghost"
              data-active={vibe.id === activeVibeId ? "true" : "false"}
              onClick={() => setSelectedVibeId(vibe.id)}
            >
              {vibe.name}
            </button>
          ))}
        </div>

        <form
          className="dj-playlist-actions"
          onSubmit={(event) => {
            event.preventDefault();
            if (!activeVibe || !trackInput.trim() || !live) return;
            const value = trackInput.trim();
            if (looksLikeTrackLink(value)) {
              send("addTrack", { vibeId: activeVibe.id, input: value });
              beginPlaylistEdit("Adding to TIDAL…");
              setTrackInput("");
              return;
            }
            send("search", {
              requestId: crypto.randomUUID(),
              query: value,
            });
          }}
        >
          <input
            className="dj-field"
            placeholder="Search TIDAL or paste a link"
            value={trackInput}
            onChange={(event) => setTrackInput(event.target.value)}
          />
          <button
            type="submit"
            className="dj-solid"
            disabled={!live || !activeVibe || !trackInput.trim()}
          >
            {looksLikeTrackLink(trackInput) ? "Add" : "Search"}
          </button>
        </form>

        {state.search?.status === "searching" ? (
          <p className="mb-3 text-[var(--dj-muted)]">Searching TIDAL…</p>
        ) : null}
        {state.search?.results?.length ? (
          <div className="mb-4">
            {state.search.results.map((track) => (
              <SearchRow
                key={track.id}
                track={track}
                disabled={!live || !activeVibe || Boolean(playlistBusy)}
                onAdd={() => {
                  if (!activeVibe) return;
                  send("addTrack", { vibeId: activeVibe.id, track });
                  beginPlaylistEdit(`Adding ${track.title}…`);
                }}
              />
            ))}
          </div>
        ) : null}

        {queueTracks.length === 0 ? (
          <p className="text-[var(--dj-muted)]">
            Empty on TIDAL. Search above or add tracks in the TIDAL app.
          </p>
        ) : (
          queueTracks.map((track, index) => (
            <div
              key={`${track.tidalId ?? track.id}-${index}`}
              className="dj-track"
              data-current={
                track.id === currentTrackId ||
                Boolean(state.nowPlaying?.title && track.title === state.nowPlaying.title)
              }
            >
              <div>
                <p>
                  <span className="mr-2 text-[var(--dj-muted)]">{index + 1}.</span>
                  {track.title}
                </p>
                <p className="text-sm text-[var(--dj-muted)]">{track.artist}</p>
              </div>
              <button
                type="button"
                className="dj-ghost"
                disabled={!live || !activeVibe || Boolean(playlistBusy)}
                onClick={() => {
                  if (!activeVibe) return;
                  send("removeTrack", {
                    vibeId: activeVibe.id,
                    trackId: track.id,
                    tidalId: track.tidalId,
                    index,
                  });
                  beginPlaylistEdit("Removing from TIDAL…");
                }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </section>

      <DjModal title="Add anthem" open={anthemOpen} onClose={closeAnthem}>
        {state.characters.length > 0 ? (
          <div className="mb-4">
            {state.characters.map((character) => (
              <div key={character.id} className="dj-track">
                <div>
                  <p>{character.name}</p>
                  <p className="text-sm text-[var(--dj-muted)]">
                    {character.anthem?.title ?? "No anthem yet"}
                  </p>
                </div>
                <button
                  type="button"
                  className="dj-ghost"
                  disabled={!live}
                  onClick={() => send("removeCharacter", { characterId: character.id })}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!characterName.trim()) return;
            send("addCharacter", {
              name: characterName.trim(),
              input: characterInput.trim(),
            });
            setCharacterName("");
            setCharacterInput("");
          }}
        >
          <input
            className="dj-field"
            placeholder="Character name"
            value={characterName}
            onChange={(event) => setCharacterName(event.target.value)}
          />
          <input
            className="dj-field"
            placeholder="Anthem: TIDAL or Spotify URL"
            value={characterInput}
            onChange={(event) => setCharacterInput(event.target.value)}
          />
          <button type="submit" className="dj-solid" disabled={!live || !characterName.trim()}>
            Add
          </button>
        </form>
      </DjModal>

    </div>
  );
}

function SearchRow({
  track,
  disabled,
  onAdd,
}: {
  track: DjTrack;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="dj-track">
      <div>
        <p>{track.title}</p>
        <p className="text-sm text-[var(--dj-muted)]">{track.artist}</p>
      </div>
      <button type="button" className="dj-ghost" disabled={disabled} onClick={onAdd}>
        Add
      </button>
    </div>
  );
}
