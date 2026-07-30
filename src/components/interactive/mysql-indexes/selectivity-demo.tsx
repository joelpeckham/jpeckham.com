"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GUESS_PRESETS,
  GUESS_QUESTIONS,
  TILE_ROW_SCALE,
  dealGuessBoard,
  evaluateGuessOrder,
  guessOrderKey,
  tileMatchesQuestion,
  type GuessAttr,
  type GuessRun,
  type TicketTile,
} from "./model";
import { Chip, DemoShell, OutcomeBanner } from "./shared";

const BOARD = dealGuessBoard(48);

const ORG_TONE: Record<number, string> = {
  42: "bg-blue",
  11: "bg-red",
  17: "bg-yellow",
  23: "bg-ink",
  31: "bg-blue/60",
  55: "bg-red/60",
  67: "bg-yellow/70",
  89: "bg-ink/50",
};

const STATUS_GLYPH: Record<TicketTile["status"], string> = {
  open: "○",
  pending: "◐",
  resolved: "●",
};

type ScoreEntry = {
  key: string;
  peeks: number;
  survivors: number;
};

type PlayPhase =
  | { kind: "idle" }
  | { kind: "regroup"; stage: number }
  | { kind: "sweep"; stage: number }
  | { kind: "peek"; stage: number; cursor: number }
  | { kind: "done" };

function attrValue(tile: TicketTile, attr: GuessAttr): string | number {
  if (attr === "org") return tile.org;
  if (attr === "status") return tile.status;
  return tile.assignee;
}

function sortByAttr(tiles: TicketTile[], attr: GuessAttr): TicketTile[] {
  return [...tiles].sort((a, b) => {
    const av = String(attrValue(a, attr));
    const bv = String(attrValue(b, attr));
    if (av < bv) return -1;
    if (av > bv) return 1;
    return a.id - b.id;
  });
}

function formatRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function SelectivityDemo() {
  const [order, setOrder] = useState<GuessAttr[]>([
    ...GUESS_PRESETS[0].order,
  ]);
  const [presetId, setPresetId] = useState(GUESS_PRESETS[0].id);
  const [phase, setPhase] = useState<PlayPhase>({ kind: "idle" });
  const [aliveIds, setAliveIds] = useState<Set<number>>(
    () => new Set(BOARD.map((t) => t.id)),
  );
  const [displayOrder, setDisplayOrder] = useState<TicketTile[]>(BOARD);
  const [peeksShown, setPeeksShown] = useState(0);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [lastRun, setLastRun] = useState<GuessRun | null>(null);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  const run = useMemo(() => evaluateGuessOrder(BOARD, order), [order]);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  const resetBoard = useCallback(() => {
    clearTimers();
    setPhase({ kind: "idle" });
    setAliveIds(new Set(BOARD.map((t) => t.id)));
    setDisplayOrder(BOARD);
    setPeeksShown(0);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  function applyPreset(id: string) {
    const preset = GUESS_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setOrder([...preset.order]);
    resetBoard();
  }

  function schedule(fn: () => void, ms: number) {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }

  function play() {
    clearTimers();
    const evaluated = evaluateGuessOrder(BOARD, order);
    setLastRun(evaluated);
    setAliveIds(new Set(BOARD.map((t) => t.id)));
    setPeeksShown(0);

    // Precompute who is alive entering each stage (sync; timers only animate).
    const aliveEntering: Set<number>[] = [];
    let cursorAlive = new Set(BOARD.map((t) => t.id));
    for (const s of evaluated.stages) {
      aliveEntering.push(new Set(cursorAlive));
      cursorAlive = new Set(
        [...cursorAlive].filter((id) => {
          const tile = BOARD.find((t) => t.id === id);
          return tile ? tileMatchesQuestion(tile, s.attr) : false;
        }),
      );
    }

    let peekTotal = 0;
    let delay = 0;

    for (let stage = 0; stage < evaluated.stages.length; stage++) {
      const s = evaluated.stages[stage];
      const attr = s.attr;
      const entering = aliveEntering[stage];
      const after = new Set(
        [...entering].filter((id) => {
          const tile = BOARD.find((t) => t.id === id);
          return tile ? tileMatchesQuestion(tile, attr) : false;
        }),
      );

      if (s.indexJump) {
        schedule(() => {
          setPhase({ kind: "regroup", stage });
          setDisplayOrder(sortByAttr(BOARD, attr));
        }, delay);
        delay += 500;

        schedule(() => {
          setPhase({ kind: "sweep", stage });
          setAliveIds(after);
        }, delay);
        delay += 700;
      } else {
        const standing = sortByAttr(
          BOARD.filter((t) => entering.has(t.id)),
          attr,
        );
        schedule(() => {
          setDisplayOrder([
            ...standing,
            ...BOARD.filter((t) => !entering.has(t.id)),
          ]);
          setPhase({ kind: "peek", stage, cursor: -1 });
        }, delay);
        delay += 200;

        for (let i = 0; i < standing.length; i++) {
          const tile = standing[i];
          const tDelay = delay + i * 70;
          schedule(() => {
            setPhase({ kind: "peek", stage, cursor: i });
            peekTotal += 1;
            setPeeksShown(peekTotal);
            if (!tileMatchesQuestion(tile, attr)) {
              setAliveIds((prev) => {
                const next = new Set(prev);
                next.delete(tile.id);
                return next;
              });
            }
          }, tDelay);
        }
        delay += standing.length * 70 + 300;

        schedule(() => {
          setAliveIds(after);
        }, delay);
        delay += 100;
      }
    }

    schedule(() => {
      setPhase({ kind: "done" });
      setPeeksShown(evaluated.totalPeeks);
      setAliveIds(
        new Set(
          BOARD.filter((t) =>
            evaluated.order.every((a) => tileMatchesQuestion(t, a)),
          ).map((t) => t.id),
        ),
      );
      const key = guessOrderKey(evaluated.order);
      setScores((prev) => {
        if (prev.some((e) => e.key === key)) return prev;
        return [
          ...prev,
          {
            key,
            peeks: evaluated.totalPeeks,
            survivors: evaluated.survivors,
          },
        ];
      });
    }, delay);
  }

  const playing = phase.kind !== "idle" && phase.kind !== "done";
  const done = phase.kind === "done";

  const outcome = done && lastRun
    ? lastRun.totalPeeks > 20
      ? {
          tone: "bad" as const,
          title: "Same answer. Different bill.",
          detail: `${lastRun.survivors} tiles left, but you spent ${lastRun.totalPeeks} peeks. A weak first question makes every later check walk a huge crowd.`,
        }
      : {
          tone: "ok" as const,
          title: "Same answer. Different bill.",
          detail: `${lastRun.survivors} tiles left after only ${lastRun.totalPeeks} peeks. The first question got a free index jump. Later filters walked a small crowd.`,
        }
    : null;

  const regroupAttr =
    phase.kind === "regroup" || phase.kind === "sweep"
      ? order[phase.stage]
      : phase.kind === "peek"
        ? order[phase.stage]
        : null;

  return (
    <DemoShell
      title="Guess Who: question order"
      blurb="Same three questions. Same survivors. Drag the order, hit Play. Peeks are the score."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        {GUESS_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant={presetId === preset.id ? "ink" : "outline"}
            onClick={() => applyPreset(preset.id)}
            disabled={playing}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Question order · drag to reorder
        </p>
        <div className="flex flex-wrap gap-2">
          {order.map((attr, i) => {
            const q = GUESS_QUESTIONS.find((x) => x.attr === attr);
            const active =
              (phase.kind === "regroup" ||
                phase.kind === "sweep" ||
                phase.kind === "peek") &&
              phase.stage === i;
            return (
              <div
                key={`${attr}-${i}`}
                draggable={!playing}
                onDragStart={() => {
                  dragFrom.current = i;
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(i);
                }}
                onDragLeave={() => setDragOver((d) => (d === i ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragFrom.current;
                  if (from == null || from === i) return;
                  setPresetId("custom");
                  setOrder((prev) => {
                    const next = [...prev];
                    const [item] = next.splice(from, 1);
                    next.splice(i, 0, item);
                    return next;
                  });
                  resetBoard();
                  dragFrom.current = null;
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  dragFrom.current = null;
                  setDragOver(null);
                }}
                className={cn(
                  "cursor-grab border-2 border-ink px-3 py-2 font-mono text-xs active:cursor-grabbing",
                  active ? "bg-blue text-white" : "bg-white text-ink",
                  i === 0 && !active && "bg-yellow/40",
                  dragOver === i && "ring-2 ring-red ring-offset-1",
                  playing && "cursor-default opacity-90",
                )}
              >
                <span className="mr-1 opacity-50">{i + 1}</span>
                <span className="font-bold">{q?.short ?? attr}</span>
                {i === 0 ? (
                  <span className="ml-2 text-[9px] uppercase tracking-[0.08em] opacity-70">
                    free jump
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ink"
          onClick={play}
          disabled={playing}
        >
          {playing ? "Playing…" : done ? "Play again" : "Play"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={resetBoard}
          disabled={playing}
        >
          Reset
        </Button>
        <div className="ml-auto flex items-baseline gap-3 font-mono text-xs">
          <span className="text-grey uppercase tracking-[0.1em] text-[10px]">
            Peeks
          </span>
          <span className="text-lg font-bold tabular-nums">{peeksShown}</span>
          <span className="text-grey">
            / {run.totalPeeks} expected
          </span>
        </div>
      </div>

      {outcome ? <OutcomeBanner {...outcome} /> : null}

      <div className="border-2 border-ink bg-white p-2">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 font-mono text-[10px]">
          <span className="uppercase tracking-[0.1em] text-grey">
            {regroupAttr
              ? phase.kind === "sweep"
                ? `Index jump · ${GUESS_QUESTIONS.find((q) => q.attr === regroupAttr)?.label}`
                : phase.kind === "peek"
                  ? `Walking survivors · ${GUESS_QUESTIONS.find((q) => q.attr === regroupAttr)?.label}`
                  : `Regroup by ${regroupAttr}`
              : "Board · 48 tickets"}
          </span>
          <span className="tabular-nums text-ink">
            {aliveIds.size} standing
          </span>
        </div>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}
          role="img"
          aria-label={`${aliveIds.size} of 48 tiles still standing`}
        >
          {displayOrder.map((tile, displayIdx) => {
            const alive = aliveIds.has(tile.id);
            const standingCount =
              phase.kind === "peek"
                ? (lastRun?.stages[phase.stage]?.before ?? 0)
                : 0;
            const isCursor =
              phase.kind === "peek" &&
              displayIdx < standingCount &&
              displayIdx === phase.cursor;

            return (
              <div
                key={tile.id}
                className={cn(
                  "relative aspect-[3/4] border border-ink/30 p-0.5 transition-all duration-200",
                  alive ? "bg-paper opacity-100" : "bg-ink/5 opacity-35",
                  isCursor && "ring-2 ring-red ring-offset-1 opacity-100",
                  phase.kind === "sweep" && alive && "bg-blue/20",
                )}
              >
                <div
                  className={cn(
                    "h-1.5 w-full",
                    ORG_TONE[tile.org] ?? "bg-ink/40",
                  )}
                  title={`org ${tile.org}`}
                />
                <div className="flex h-[calc(100%-0.375rem)] flex-col items-center justify-center gap-0.5 font-mono text-[9px] leading-none">
                  <span aria-hidden>{STATUS_GLYPH[tile.status]}</span>
                  <span className="font-bold tabular-nums">{tile.assignee}</span>
                </div>
                {!alive ? (
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink/40"
                    aria-hidden
                  >
                    ×
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip tone="ink">color = org</Chip>
        <Chip tone="ink">glyph = status</Chip>
        <Chip tone="ink">number = assignee</Chip>
        <Chip tone="warn">1st question = free index jump</Chip>
      </div>

      {scores.length > 0 ? (
        <div className="border-2 border-ink bg-white">
          <div className="border-b-2 border-ink px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            Scoreboard
          </div>
          <ul className="divide-y divide-ink/10 font-mono text-xs">
            {[...scores]
              .sort((a, b) => a.peeks - b.peeks)
              .map((entry) => (
                <li
                  key={entry.key}
                  className="flex items-baseline justify-between gap-3 px-3 py-1.5"
                >
                  <span>{entry.key}</span>
                  <span className="tabular-nums font-bold">
                    {entry.peeks} peeks
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <p className="font-mono text-[10px] text-grey">
        Each tile ≈ {formatRows(TILE_ROW_SCALE)} rows on a{" "}
        {formatRows(BOARD.length * TILE_ROW_SCALE)}-row table. This is a toy
        board, not histograms.
      </p>
    </DemoShell>
  );
}
