"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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
} from "@/lib/dj/protocol";

const idleState: DjState = {
  version: 0,
  catalogVersion: 0,
  daemonOnline: false,
  vibes: [],
  characters: [],
  transport: emptyTransport(),
  nowPlaying: null,
  pending: null,
};

const PIN_KEY = "dj-remote-secret";

function wsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/api/dj/ws/`;
}

function readStoredPin(): string {
  if (typeof window === "undefined") return "";
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const fromHash = new URLSearchParams(hash).get("k");
  if (fromHash) {
    sessionStorage.setItem(PIN_KEY, fromHash);
    window.history.replaceState({}, "", window.location.pathname);
    return fromHash;
  }
  return sessionStorage.getItem(PIN_KEY) ?? "";
}

function DjModal({
  title,
  open,
  onClose,
  portalRoot,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  portalRoot: HTMLElement | null;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const [box, setBox] = useState({
    top: 0,
    left: 0,
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight,
  });

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const vv = window.visualViewport;
      setBox({
        top: vv?.offsetTop ?? 0,
        left: vv?.offsetLeft ?? 0,
        width: vv?.width ?? window.innerWidth,
        height: vv?.height ?? window.innerHeight,
      });
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousBody = document.body.style.overflow;
    const previousHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstField = panel?.querySelector<HTMLElement>("input, textarea, select");
    (firstField ?? focusable?.[0])?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousBody;
      document.documentElement.style.overflow = previousHtml;
    };
  }, [open]);

  const host = portalRoot ?? (typeof document === "undefined" ? null : document.body);
  if (!open || !host) return null;

  return createPortal(
    <div
      className="dj-modal"
      role="presentation"
      style={{
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      }}
      onClick={() => closeRef.current()}
    >
      <div
        ref={panelRef}
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
    </div>,
    host,
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
  const inputRef = useRef<HTMLInputElement>(null);

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

  const endDrag = (input: HTMLInputElement | null, commit: boolean) => {
    draggingRef.current = false;
    const pointerId = input?.dataset.pointerId;
    if (input && pointerId) {
      try {
        input.releasePointerCapture(Number(pointerId));
      } catch {
        // ignore
      }
      delete input.dataset.pointerId;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (commit) flush(valueRef.current);
    else {
      valueRef.current = remoteVolume;
      lastSentRef.current = remoteVolume;
      setValue(remoteVolume);
    }
  };

  useEffect(() => {
    if (disabled) draggingRef.current = false;
  }, [disabled]);

  return (
    <label className="mt-4 block text-sm text-[var(--dj-muted)]">
      System volume
      <input
        ref={inputRef}
        className="dj-range mt-2"
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onPointerDown={(event) => {
          draggingRef.current = true;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.dataset.pointerId = String(event.pointerId);
          } catch {
            // iOS Safari may reject capture on range inputs
          }
        }}
        onPointerUp={(event) => endDrag(event.currentTarget, true)}
        onPointerCancel={(event) => endDrag(event.currentTarget, false)}
        onLostPointerCapture={(event) => {
          if (draggingRef.current) endDrag(event.currentTarget, true);
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
  const [pin, setPin] = useState("");
  const [pinReady, setPinReady] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [state, setState] = useState<DjState>(idleState);
  const [socketOpen, setSocketOpen] = useState(false);
  const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [characterInput, setCharacterInput] = useState("");
  const [characterBusy, setCharacterBusy] = useState(false);
  const [anthemOpen, setAnthemOpen] = useState(false);
  const [playlistBusy, setPlaylistBusy] = useState<string | null>(null);
  const [localPending, setLocalPending] = useState<DjPending | null>(null);
  const [optimisticPlaying, setOptimisticPlaying] = useState<boolean | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);
  const catalogWaitRef = useRef(0);
  const pendingById = useRef(new Map<string, "play" | "character" | "playlist" | "transport">());
  const playInFlight = useRef(false);
  const transportBusyRef = useRef(false);
  const characterCommandId = useRef<string | null>(null);
  const playlistCommandId = useRef<string | null>(null);
  const [transportBusy, setTransportBusy] = useState(false);

  useEffect(() => {
    setPin(readStoredPin());
    setPinReady(true);
  }, []);

  const unlock = (value: string) => {
    const next = value.trim();
    if (!next) return;
    sessionStorage.setItem(PIN_KEY, next);
    setUnauthorized(false);
    setSessionError(null);
    setPin(next);
  };

  const clearLocalWork = useCallback(() => {
    playInFlight.current = false;
    transportBusyRef.current = false;
    pendingById.current.clear();
    characterCommandId.current = null;
    playlistCommandId.current = null;
    setLocalPending(null);
    setOptimisticPlaying(null);
    setCharacterBusy(false);
    setPlaylistBusy(null);
    setTransportBusy(false);
  }, []);

  const applyAck = useCallback((ack: { id: string; ok: boolean }) => {
    const kind = pendingById.current.get(ack.id);
    if (!kind) return;
    pendingById.current.delete(ack.id);
    if (kind === "play") {
      playInFlight.current = false;
      setLocalPending(null);
    }
    if (kind === "character" && characterCommandId.current === ack.id) {
      characterCommandId.current = null;
      setCharacterBusy(false);
      if (ack.ok) {
        setCharacterName("");
        setCharacterInput("");
      }
    }
    if (kind === "playlist" && playlistCommandId.current === ack.id) {
      playlistCommandId.current = null;
      setPlaylistBusy(null);
    }
    if (kind === "transport") {
      transportBusyRef.current = false;
      setTransportBusy(false);
      setOptimisticPlaying(null);
    }
  }, []);

  const send = useCallback(
    (name: DjCommandName, payload: Record<string, unknown> = {}, pending?: DjPending) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        setSessionError("Not connected");
        return null;
      }
      if ((name === "playVibe" || name === "playAnthem") && playInFlight.current) {
        return null;
      }
      if ((name === "next" || name === "prev") && transportBusyRef.current) {
        return null;
      }
      const id = crypto.randomUUID();
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
              commandId: id,
            }
          : null);
      if (nextPending) setLocalPending({ ...nextPending, commandId: id });
      if (name === "pause") setOptimisticPlaying(false);
      if (name === "resume") setOptimisticPlaying(true);
      if (name === "playVibe" || name === "playAnthem") {
        pendingById.current.set(id, "play");
        playInFlight.current = true;
      } else if (name === "addCharacter") {
        pendingById.current.set(id, "character");
        characterCommandId.current = id;
      } else if (name === "refreshVibe") {
        pendingById.current.set(id, "playlist");
        playlistCommandId.current = id;
      } else if (name === "next" || name === "prev" || name === "pause" || name === "resume") {
        pendingById.current.set(id, "transport");
        if (name === "next" || name === "prev") {
          transportBusyRef.current = true;
          setTransportBusy(true);
        }
      }
      ws.send(JSON.stringify({ type: "command", id, name, payload }));
      return id;
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
    if (!pinReady || !pin || unauthorized) return;
    let cancelled = false;
    let rejected = false;
    let retry = 800;
    let timer = 0;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        retry = 800;
        setSocketOpen(true);
        setSessionError(null);
        ws.send(JSON.stringify({ type: "hello", role: "remote", secret: pin }));
      });

      ws.addEventListener("message", (event) => {
        const message = parseWireMessage(String(event.data));
        if (!message) return;
        if (message.type === "error") {
          if (message.code === "unauthorized") {
            rejected = true;
            sessionStorage.removeItem(PIN_KEY);
            setUnauthorized(true);
            setPin("");
            setSocketOpen(false);
            ws.close();
            return;
          }
          setSessionError(message.message);
          clearLocalWork();
          return;
        }
        if (message.type === "ack") {
          applyAck(message);
          if (message.ok) setSessionError(null);
          return;
        }
        if (message.type === "ready") {
          clearLocalWork();
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
          if (message.live.lastAck) applyAck(message.live.lastAck);
          if (message.live.lastAck?.ok) setSessionError(null);
        }
        if (message.type === "catalog") {
          setState((current) => mergeCatalog(current, message.catalog));
        }
      });

      ws.addEventListener("close", () => {
        if (wsRef.current !== ws) return;
        setSocketOpen(false);
        clearLocalWork();
        if (cancelled || rejected) return;
        timer = window.setTimeout(connect, retry);
        retry = Math.min(retry * 2, 8000);
      });
    };

    connect();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      wsRef.current?.close();
    };
  }, [pin, pinReady, unauthorized, applyAck, clearLocalWork]);

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
    const timer = window.setTimeout(() => setOptimisticPlaying(null), 8000);
    return () => window.clearTimeout(timer);
  }, [optimisticPlaying, state.transport.playing]);

  useEffect(() => {
    if (!playlistBusy || !playlistCommandId.current) return;
    const catalogDone = state.catalogVersion > catalogWaitRef.current;
    const failed =
      state.lastAck?.id === playlistCommandId.current && state.lastAck.ok === false;
    if (catalogDone || failed) {
      playlistCommandId.current = null;
      setPlaylistBusy(null);
    }
  }, [playlistBusy, state.catalogVersion, state.lastAck]);

  useEffect(() => {
    if (!characterBusy) return;
    const timer = window.setTimeout(() => {
      characterCommandId.current = null;
      setCharacterBusy(false);
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [characterBusy]);

  useEffect(() => {
    if (!playlistBusy) return;
    const timer = window.setTimeout(() => setPlaylistBusy(null), 20000);
    return () => window.clearTimeout(timer);
  }, [playlistBusy]);

  const catalogReady = state.vibes.length > 0;
  const vibes = state.vibes;
  const pending = localPending ?? state.pending ?? null;
  const switching = pending?.action === "playVibe" || pending?.action === "playAnthem";
  const oneshot = state.transport.oneshot;
  const oneshotCharacter = oneshot
    ? state.characters.find((item) => item.id === oneshot.characterId)
    : null;
  const resumeVibe = oneshot?.resumeVibeId
    ? vibes.find((vibe) => vibe.id === oneshot.resumeVibeId)
    : null;
  const activeVibeId = selectedVibeId ?? state.transport.vibeId ?? vibes[0]?.id ?? null;
  const activeVibe = vibes.find((vibe) => vibe.id === activeVibeId) ?? null;
  const currentTrackId = state.transport.queue[state.transport.queueIndex];
  const health = state.health;
  const tidalDark = Boolean(health && (!health.cdp || !health.tidal));
  const live = socketOpen && state.daemonOnline && !tidalDark;
  const playing = optimisticPlaying ?? state.transport.playing;
  const canResume = Boolean(
    playing || state.transport.vibeId || oneshot || state.nowPlaying,
  );
  const visibleError =
    state.lastError && state.lastError !== dismissedError ? state.lastError : null;
  const title = switching
    ? pending?.label || "Opening playlist"
    : oneshot
      ? state.nowPlaying?.title || oneshotCharacter?.anthem?.title || "Anthem"
      : !playing && state.nowPlaying
        ? state.nowPlaying.title
        : state.nowPlaying?.title || "Silence in the quarter";
  const artist = switching
    ? "Waiting on TIDAL…"
    : oneshot
      ? oneshotCharacter
        ? `${oneshotCharacter.name} · anthem`
        : "Anthem"
      : !socketOpen
        ? "Connecting"
        : !state.daemonOnline
          ? "Relay is dark"
          : tidalDark
            ? "TIDAL is dark"
            : !state.nowPlaying
              ? "Nothing queued"
              : !playing
                ? "Paused"
                : state.nowPlaying.artist;
  const pill = unauthorized
    ? "Unauthorized"
    : !socketOpen
      ? "Connecting"
      : !state.daemonOnline
        ? "Relay dark"
        : tidalDark
          ? "TIDAL dark"
          : oneshot
            ? "Anthem"
            : switching
              ? "Working"
              : "Live";

  const queueTracks = activeVibe?.tracks ?? [];
  const beginPlaylistEdit = (label: string) => {
    catalogWaitRef.current = state.catalogVersion;
    setPlaylistBusy(label);
  };

  if (!pinReady) {
    return <div className="mx-auto min-h-dvh max-w-3xl px-4 py-5" />;
  }

  if (!pin || unauthorized) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-8">
        <p className="dj-kicker">The Fall of Asperabad</p>
        <h1 className="dj-title text-4xl">Table PIN</h1>
        <p className="text-[var(--dj-muted)]">
          {unauthorized
            ? "That PIN was rejected."
            : "This remote is locked to the table."}
        </p>
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            unlock(pinDraft);
          }}
        >
          <label className="text-sm text-[var(--dj-muted)]" htmlFor="dj-pin">
            PIN
          </label>
          <input
            id="dj-pin"
            className="dj-field"
            type="password"
            autoComplete="current-password"
            value={pinDraft}
            onChange={(event) => setPinDraft(event.target.value)}
          />
          <button type="submit" className="dj-solid" disabled={!pinDraft.trim()}>
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      ref={setPortalRoot}
      className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-5 sm:px-6"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="dj-kicker">The Fall of Asperabad</p>
          <h1 className="dj-title mt-2 text-4xl sm:text-5xl">Noble Quarter DJ</h1>
        </div>
        <span className="dj-pill" aria-live="polite">
          <span
            className="dj-dot"
            data-on={live ? "true" : "false"}
            data-busy={switching || Boolean(oneshot) ? "true" : "false"}
          />
          {pill}
        </span>
      </header>

      <section
        className="rounded-sm border border-[var(--dj-line)] bg-[var(--dj-panel)] p-4 shadow-[var(--dj-shadow)]"
        aria-busy={switching ? true : undefined}
      >
        <p className="dj-kicker">
          {switching ? "Working" : oneshot ? "Anthem" : playing ? "Now playing" : "Paused"}
        </p>
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
        {sessionError ? (
          <p className="mt-2 text-sm text-[var(--dj-blood-2)]" aria-live="assertive">
            {sessionError}
          </p>
        ) : null}
        {visibleError ? (
          <p className="mt-2 flex items-start justify-between gap-3 text-sm text-[var(--dj-blood-2)]" aria-live="assertive">
            <span>{visibleError}</span>
            <button
              type="button"
              className="dj-ghost"
              onClick={() => setDismissedError(state.lastError ?? null)}
            >
              Dismiss
            </button>
          </p>
        ) : null}

        <div className="dj-transport mt-4">
          <button
            type="button"
            className="dj-icon-btn"
            disabled={!live || switching || transportBusy}
            aria-label={oneshot && resumeVibe ? `Back to ${resumeVibe.name}` : "Previous"}
            onClick={() => send("prev")}
          >
            <SkipBack aria-hidden="true" />
          </button>
          <button
            type="button"
            className="dj-icon-btn dj-transport-play"
            disabled={!live || switching || (!playing && !canResume)}
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => send(playing ? "pause" : "resume")}
          >
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="dj-icon-btn"
            disabled={!live || switching || transportBusy}
            aria-label={oneshot && resumeVibe ? `Back to ${resumeVibe.name}` : "Next"}
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
        {oneshot && resumeVibe ? (
          <p className="mt-3 text-sm text-[var(--dj-muted)]">
            Skip returns to {resumeVibe.name}.
          </p>
        ) : null}

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
        {!catalogReady ? (
          <p className="text-[var(--dj-muted)]">
            {state.daemonOnline
              ? "Daemon has not published a catalog"
              : "Loading catalog…"}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {vibes.map((vibe) => {
              const active = !oneshot && state.transport.vibeId === vibe.id;
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
                    send(
                      "playVibe",
                      { vibeId: vibe.id },
                      {
                        action: "playVibe",
                        vibeId: vibe.id,
                        label: `Opening ${vibe.name}`,
                      },
                    );
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
        )}
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
            state.characters.map((character) =>
              character.anthem ? (
                <button
                  key={character.id}
                  type="button"
                  className="dj-solid"
                  disabled={!live || switching}
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
              ) : (
                <span key={character.id} className="dj-ghost">
                  {character.name} · no anthem
                </span>
              ),
            )
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
                : oneshot
                  ? "Anthem is interrupting this vibe"
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
              const id = send("refreshVibe", { vibeId: activeVibeId });
              if (id) beginPlaylistEdit("Refreshing TIDAL…");
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

        {queueTracks.length === 0 ? (
          <p className="text-[var(--dj-muted)]">
            {catalogReady ? "Empty on TIDAL." : "Loading catalog…"}
          </p>
        ) : (
          queueTracks.map((track, index) => (
            <div
              key={`${track.id}-${index}`}
              className="dj-track"
              data-current={
                !oneshot &&
                ((track.tidalId && track.tidalId === state.nowPlaying?.tidalId) ||
                  track.id === currentTrackId)
                  ? "true"
                  : undefined
              }
            >
              <div>
                <p>
                  <span className="mr-2 text-[var(--dj-muted)]">{index + 1}.</span>
                  {track.title}
                </p>
                <p className="text-sm text-[var(--dj-muted)]">{track.artist}</p>
              </div>
            </div>
          ))
        )}
      </section>

      <DjModal
        title="Add anthem"
        open={anthemOpen}
        onClose={closeAnthem}
        portalRoot={portalRoot}
      >
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
            if (!characterName.trim() || characterBusy) return;
            setCharacterBusy(true);
            const id = send("addCharacter", {
              name: characterName.trim(),
              input: characterInput.trim(),
            });
            if (!id) setCharacterBusy(false);
          }}
        >
          <label className="text-sm text-[var(--dj-muted)]" htmlFor="dj-character-name">
            Character name
          </label>
          <input
            id="dj-character-name"
            className="dj-field"
            value={characterName}
            onChange={(event) => setCharacterName(event.target.value)}
          />
          <label className="text-sm text-[var(--dj-muted)]" htmlFor="dj-character-url">
            Anthem URL
          </label>
          <input
            id="dj-character-url"
            className="dj-field"
            placeholder="TIDAL or Spotify URL"
            value={characterInput}
            onChange={(event) => setCharacterInput(event.target.value)}
          />
          {characterBusy ? (
            <p className="text-sm text-[var(--dj-muted)]">Adding…</p>
          ) : null}
          <button
            type="submit"
            className="dj-solid"
            disabled={!live || !characterName.trim() || characterBusy}
          >
            Add
          </button>
        </form>
      </DjModal>
    </div>
  );
}
