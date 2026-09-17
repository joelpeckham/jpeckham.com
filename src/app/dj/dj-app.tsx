"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  emptyTransport,
  parseWireMessage,
  type DjCommandName,
  type DjPending,
  type DjState,
  type DjTrack,
} from "@/lib/dj/protocol";

const idleState: DjState = {
  version: 0,
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

function IconPrev() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h2.4v14H6V5Zm3.3 7L20 18.8V5.2L9.3 12Z" />
    </svg>
  );
}

function IconNext() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.6 5H18v14h-2.4V5ZM4 5.2v13.6L14.7 12 4 5.2Z" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.2v13.6L19.2 12 8 5.2Z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 5h3.6v14H6.5V5Zm7.4 0h3.6v14h-3.6V5Z" />
    </svg>
  );
}

function IconRestart() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5V2.2L8.2 6 12 9.8V7a5 5 0 1 1-4.6 3.1l-1.8-.8A7 7 0 1 0 12 5Z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.1 3h3.8l.4 2.2a7 7 0 0 1 1.8.8l2-1.1 2.7 2.7-1.1 2a7 7 0 0 1 .8 1.8L23 10.1v3.8l-2.2.4a7 7 0 0 1-.8 1.8l1.1 2-2.7 2.7-2-1.1a7 7 0 0 1-1.8.8l-.4 2.2h-3.8l-.4-2.2a7 7 0 0 1-1.8-.8l-2 1.1-2.7-2.7 1.1-2a7 7 0 0 1-.8-1.8L1 13.9v-3.8l2.2-.4a7 7 0 0 1 .8-1.8l-1.1-2L5.6 3.2l2 1.1a7 7 0 0 1 1.8-.8Zm1.9 6.2A2.8 2.8 0 1 0 15 12a2.8 2.8 0 0 0-3-2.8Z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.2 5.1 12 10.9l5.8-5.8 1.1 1.1L13.1 12l5.8 5.8-1.1 1.1L12 13.1l-5.8 5.8-1.1-1.1L10.9 12 5.1 6.2l1.1-1.1Z" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="dj-spinner" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.2a8.8 8.8 0 1 0 8.8 8.8h-2.2A6.6 6.6 0 1 1 12 5.4V3.2Z" />
    </svg>
  );
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
            <IconClose />
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
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [localPending, setLocalPending] = useState<DjPending | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const versionRef = useRef(0);
  const sentVersionRef = useRef(0);

  const send = useCallback(
    (name: DjCommandName, payload: Record<string, unknown> = {}, pending?: DjPending) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const pendingLabels: Partial<Record<DjCommandName, string>> = {
        playVibe: "Opening playlist",
        playAnthem: "Playing anthem",
        next: "Skipping forward",
        prev: "Skipping back",
        pause: "Pausing",
        resume: "Resuming",
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
  const closePlaylist = useCallback(() => setPlaylistOpen(false), []);

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
          setState(message.snapshot);
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

  const vibes = state.vibes.length > 0 ? state.vibes : fallbackVibes;
  const pending = localPending ?? state.pending ?? null;
  const switching = pending?.action === "playVibe" || pending?.action === "playAnthem";
  const activeVibeId =
    pending?.vibeId ?? selectedVibeId ?? state.transport.vibeId ?? vibes[0]?.id ?? null;
  const activeVibe = vibes.find((vibe) => vibe.id === activeVibeId) ?? null;
  const currentTrackId = state.transport.queue[state.transport.queueIndex];
  const live = socketOpen && state.daemonOnline;
  const title = pending
    ? pending.label
    : state.nowPlaying?.title || "Silence in the quarter";
  const artist = pending
    ? "Waiting on TIDAL…"
    : state.nowPlaying?.artist || "Waiting on the daemon";
  const pill = !socketOpen
    ? "Connecting"
    : !state.daemonOnline
      ? "Daemon dark"
      : pending
        ? "Working"
        : "Live";

  const queueTracks = useMemo(() => {
    if (!activeVibe) return [];
    return activeVibe.tracks;
  }, [activeVibe]);

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
            data-busy={pending ? "true" : "false"}
          />
          {pill}
        </span>
      </header>

      <section
        className="rounded-sm border border-[var(--dj-line)] bg-[var(--dj-panel)] p-4 shadow-[var(--dj-shadow)]"
        aria-busy={pending ? true : undefined}
      >
        <p className="dj-kicker">{pending ? "Working" : "Now playing"}</p>
        <p className="mt-2 font-[family-name:var(--font-dj-display)] text-2xl leading-tight">
          {pending ? (
            <span className="dj-pending-title">
              <IconSpinner />
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
            disabled={!live || Boolean(pending)}
            aria-label="Previous"
            onClick={() => send("prev")}
          >
            <IconPrev />
          </button>
          <button
            type="button"
            className="dj-icon-btn dj-transport-play"
            disabled={!live || Boolean(pending)}
            aria-label={state.transport.playing ? "Pause" : "Play"}
            onClick={() => send(state.transport.playing ? "pause" : "resume")}
          >
            {state.transport.playing ? <IconPause /> : <IconPlay />}
          </button>
          <button
            type="button"
            className="dj-icon-btn"
            disabled={!live || Boolean(pending)}
            aria-label="Next"
            onClick={() => send("next")}
          >
            <IconNext />
          </button>
          <button
            type="button"
            className="dj-icon-btn"
            disabled={!live || !state.transport.vibeId || Boolean(pending)}
            aria-label="Restart vibe"
            onClick={() =>
              state.transport.vibeId &&
              send("playVibe", { vibeId: state.transport.vibeId })
            }
          >
            <IconRestart />
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
                disabled={
                  !live ||
                  vibe.tracks.length === 0 ||
                  (switching && !opening)
                }
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
                  {opening ? <IconSpinner /> : null}
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
            <IconPlus />
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
                disabled={!live || !character.anthem || Boolean(pending)}
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

      <section className="pb-10">
        <div className="dj-section-head">
          <div>
            <h2 className="dj-title text-2xl">
              {activeVibe ? activeVibe.name : "Playlist"}
            </h2>
            <p className="mt-1 text-sm text-[var(--dj-muted)]">
              {activeVibe
                ? `${activeVibe.tracks.length} tracks`
                : "Choose a vibe"}
            </p>
          </div>
          <button
            type="button"
            className="dj-icon-btn"
            aria-label="Edit playlist"
            onClick={() => setPlaylistOpen(true)}
          >
            <IconGear />
          </button>
        </div>
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

      <DjModal
        title={activeVibe ? `${activeVibe.name} playlist` : "Playlist"}
        open={playlistOpen}
        onClose={closePlaylist}
      >
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
          className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!activeVibe || !trackInput.trim()) return;
            send("addTrack", { vibeId: activeVibe.id, input: trackInput.trim() });
            setTrackInput("");
          }}
        >
          <input
            className="dj-field"
            placeholder="Paste a TIDAL/Spotify URL or search"
            value={trackInput}
            onChange={(event) => setTrackInput(event.target.value)}
          />
          <button
            type="button"
            className="dj-ghost"
            disabled={!live || !trackInput.trim()}
            onClick={() =>
              send("search", {
                requestId: crypto.randomUUID(),
                query: trackInput.trim(),
              })
            }
          >
            Search
          </button>
          <button type="submit" className="dj-solid" disabled={!live || !activeVibe}>
            Add
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
                disabled={!live || !activeVibe}
                onAdd={() => {
                  if (!activeVibe) return;
                  send("addTrack", { vibeId: activeVibe.id, track });
                }}
              />
            ))}
          </div>
        ) : null}
        {queueTracks.length === 0 ? (
          <p className="text-[var(--dj-muted)]">
            Empty. Paste a TIDAL link or search from the Mac’s signed-in app.
          </p>
        ) : (
          queueTracks.map((track, index) => (
            <div
              key={track.id}
              className="dj-track"
              data-current={track.id === currentTrackId}
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
                disabled={!live || !activeVibe}
                onClick={() =>
                  activeVibe &&
                  send("removeTrack", { vibeId: activeVibe.id, trackId: track.id })
                }
              >
                Remove
              </button>
            </div>
          ))
        )}
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
