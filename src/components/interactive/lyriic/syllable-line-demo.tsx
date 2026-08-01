"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { demoSyllableCount, tokenizeLine } from "./model";
import { Chip, DemoShell, controlInput } from "./shared";

const PRESETS = [
  "I could write a song tonight",
  "beautiful memories forever",
  "fire and desire in the rain",
] as const;

/**
 * Cold-open toy: type a line, watch per-word syllable chips and a total.
 * This is the itch lyriic scratches — without the dictionary UI chrome.
 */
export function SyllableLineDemo() {
  const [line, setLine] = useState<string>(PRESETS[0]);
  const tokens = useMemo(() => tokenizeLine(line), [line]);
  const counts = useMemo(
    () => tokens.map((w) => ({ word: w, n: demoSyllableCount(w) })),
    [tokens],
  );
  const total = counts.reduce((sum, c) => sum + c.n, 0);

  return (
    <DemoShell
      title="Syllable scratchpad"
      blurb="Type a line. Watch the count climb. This is the part that used to kill the mood."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setLine(p)}
            className={cn(
              "border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
              line === p ? "bg-ink text-paper" : "bg-white text-ink hover:bg-paper",
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={line}
        onChange={(e) => setLine(e.target.value)}
        className={controlInput}
        aria-label="Lyric line"
        spellCheck={false}
      />

      <div className="flex flex-wrap items-end gap-2">
        {counts.length === 0 ? (
          <p className="font-mono text-sm text-grey">Type some words…</p>
        ) : (
          counts.map((c, i) => (
            <div
              key={`${c.word}-${i}`}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center border-2 border-ink font-mono text-sm font-bold tabular-nums transition-colors",
                  c.n >= 4
                    ? "bg-red text-white"
                    : c.n === 3
                      ? "bg-yellow text-ink"
                      : "bg-blue text-white",
                )}
              >
                {c.n}
              </span>
              <span className="max-w-[5.5rem] truncate font-mono text-[11px]">
                {c.word}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={total === 10 ? "ok" : total > 12 ? "warn" : "ink"}>
          line total {total}
        </Chip>
        <p className="font-mono text-[11px] text-grey">
          Demo counts only — lyriic uses a fused IPA dictionary plus overrides.
        </p>
      </div>
    </DemoShell>
  );
}
