"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  emptyTransport,
  parseWireMessage,
  type DjCommandName,
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
};

const fallbackVibes = [
  { id: "noble-quarter", name: "Noble Quarter", hue: "gold", shuffle: true, tracks: [] },
  { id: "tavern", name: "Tavern", hue: "amber", shuffle: true, tracks: [] },
  { id: "streets", name: "Streets", hue: "ash", shuffle: true, tracks: [] },
  { id: "court", name: "Court", hue: "violet", shuffle: true, tracks: [] },
  { id: "tension", name: "Tension", hue: "moss", shuffle: true, tracks: [] },
  { id: "combat", name: "Combat", hue: "blood", shuffle: true, tracks: [] },
  { id: "boss", name: "Boss", hue: "ember", shuffle: false, tracks: [] },
  { id: "sorrow", name: "Sorrow", hue: "blue", shuffle: true, tracks: [] },
  { id: "triumph", name: "Triumph", hue: "gold", shuffle: true, tracks: [] },
  { id: "travel", name: "Travel", hue: "dust", shuffle: true, tracks: [] },
];

function wsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/api/dj/ws/`;
}

export function DjApp() {
  const [state, setState] = useState<DjState>(idleState);
  const [socketOpen, setSocketOpen] = useState(false);
  const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null);
  const [trackInput, setTrackInput] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterInput, setCharacterInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const send = useCallback((name: DjCommandName, payload: Record<string, unknown> = {}) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "command",
        id: crypto.randomUUID(),
        name,
        payload,
      }),
    );
  }, []);

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
          if (message.snapshot) setState(message.snapshot);
          else {
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

  const vibes = state.vibes.length > 0 ? state.vibes : fallbackVibes;
  const activeVibeId = selectedVibeId ?? state.transport.vibeId ?? vibes[0]?.id ?? null;
  const activeVibe = vibes.find((vibe) => vibe.id === activeVibeId) ?? null;
  const currentTrackId = state.transport.queue[state.transport.queueIndex];
  const live = socketOpen && state.daemonOnline;
  const title = state.nowPlaying?.title || "Silence in the quarter";
  const artist = state.nowPlaying?.artist || "Waiting on the daemon";

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
          <span className="dj-dot" data-on={live ? "true" : "false"} />
          {live ? "Live" : socketOpen ? "Daemon dark" : "Connecting"}
        </span>
      </header>

      <section className="rounded-sm border border-[var(--dj-line)] bg-[var(--dj-panel)] p-4 shadow-[var(--dj-shadow)]">
        <p className="dj-kicker">Now playing</p>
        <p className="mt-2 font-[family-name:var(--font-dj-display)] text-2xl leading-tight">
          {title}
        </p>
        <p className="mt-1 text-[var(--dj-muted)]">{artist}</p>
        {state.lastError ? (
          <p className="mt-2 text-sm text-[var(--dj-blood-2)]">{state.lastError}</p>
        ) : null}

        <div className="dj-transport mt-4 grid grid-cols-4 gap-2">
          <button type="button" disabled={!live} onClick={() => send("prev")}>
            Prev
          </button>
          <button
            type="button"
            disabled={!live}
            onClick={() => send(state.transport.playing ? "pause" : "resume")}
          >
            {state.transport.playing ? "Pause" : "Play"}
          </button>
          <button type="button" disabled={!live} onClick={() => send("next")}>
            Next
          </button>
          <button
            type="button"
            disabled={!live || !state.transport.vibeId}
            onClick={() =>
              state.transport.vibeId &&
              send("playVibe", { vibeId: state.transport.vibeId })
            }
          >
            Restart
          </button>
        </div>

        <label className="mt-4 block text-sm text-[var(--dj-muted)]">
          Volume
          <input
            className="dj-range mt-2"
            type="range"
            min={0}
            max={100}
            value={state.transport.volume}
            disabled={!live}
            onChange={(event) =>
              send("setVolume", { volume: Number(event.target.value) })
            }
          />
        </label>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="dj-title text-2xl">Vibes</h2>
          <p className="text-sm text-[var(--dj-muted)]">Tap what the table feels</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {vibes.map((vibe) => {
            const active = state.transport.vibeId === vibe.id;
            return (
              <button
                key={vibe.id}
                type="button"
                className="dj-vibe"
                data-hue={vibe.hue}
                data-active={active ? "true" : "false"}
                disabled={!live || vibe.tracks.length === 0}
                onClick={() => {
                  setSelectedVibeId(vibe.id);
                  send("playVibe", { vibeId: vibe.id });
                }}
              >
                <span className="dj-kicker">{vibe.tracks.length} tracks</span>
                <span className="mt-1 block font-[family-name:var(--font-dj-display)] text-xl">
                  {vibe.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="dj-title text-2xl">Anthems</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.characters.length === 0 ? (
            <p className="text-[var(--dj-muted)]">No characters yet. Add one below.</p>
          ) : (
            state.characters.map((character) => (
              <div key={character.id} className="flex items-center gap-1">
                <button
                  type="button"
                  className="dj-solid"
                  disabled={!live || !character.anthem}
                  onClick={() => send("playAnthem", { characterId: character.id })}
                >
                  {character.name}
                </button>
                <button
                  type="button"
                  className="dj-ghost"
                  aria-label={`Remove ${character.name}`}
                  disabled={!live}
                  onClick={() => send("removeCharacter", { characterId: character.id })}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
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
          <button type="submit" className="dj-ghost" disabled={!live}>
            Add
          </button>
        </form>
      </section>

      <section className="pb-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="dj-title text-2xl">
            {activeVibe ? `${activeVibe.name} playlist` : "Playlist"}
          </h2>
          {activeVibe ? (
            <label className="text-sm text-[var(--dj-muted)]">
              <input
                type="checkbox"
                className="mr-2 accent-[var(--dj-gold)]"
                checked={activeVibe.shuffle}
                disabled={!live}
                onChange={(event) =>
                  send("setShuffle", {
                    vibeId: activeVibe.id,
                    shuffle: event.target.checked,
                  })
                }
              />
              Shuffle
            </label>
          ) : null}
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
      </section>
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
