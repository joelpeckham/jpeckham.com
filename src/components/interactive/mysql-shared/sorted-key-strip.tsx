"use client";

import { cn } from "@/lib/utils";

export type KeyTuple = {
  /** Display parts joined with · in the strip. */
  parts: string[];
  /** Optional row id shown on the right. */
  id?: string | number;
};

export type KeyHighlight =
  | { kind: "contiguous"; start: number; end: number }
  | { kind: "interleaved"; matches: boolean[] }
  | { kind: "none" };

export type PointerMode = "seek" | "scan" | "idle";

type SortedKeyStripProps = {
  keys: KeyTuple[];
  /** Column headers for the key parts. */
  columns?: string[];
  highlight?: KeyHighlight;
  /** Index of the row the pointer currently sits on (−1 = hidden). */
  pointerIndex?: number;
  pointerMode?: PointerMode;
  label?: string;
  className?: string;
  /** Cap visible rows; overflow summarized. */
  maxVisible?: number;
};

/**
 * Phone-book metaphor: a sorted list of composite key tuples.
 * Contiguous highlights = usable B-tree walk; interleaved = range freeze.
 */
export function SortedKeyStrip({
  keys,
  columns,
  highlight = { kind: "none" },
  pointerIndex = -1,
  pointerMode = "idle",
  label = "Sorted keys (toy leaf)",
  className,
  maxVisible = 20,
}: SortedKeyStripProps) {
  const visible = keys.slice(0, maxVisible);
  const overflow = keys.length - visible.length;

  function rowLit(i: number): boolean {
    if (highlight.kind === "contiguous") {
      return i >= highlight.start && i < highlight.end;
    }
    if (highlight.kind === "interleaved") {
      return highlight.matches[i] === true;
    }
    return false;
  }

  const hasPointer = pointerIndex >= 0 && pointerIndex < visible.length;

  return (
    <div className={cn("border-2 border-ink bg-white", className)}>
      <div className="flex items-baseline justify-between gap-2 border-b-2 border-ink px-3 py-1.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          {label}
        </p>
        {pointerMode !== "idle" ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
            {pointerMode === "seek" ? "seek" : "scan every leaf"}
          </p>
        ) : null}
      </div>

      {columns && columns.length > 0 ? (
        <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-ink/20 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-grey">
          <span>{columns.join(" · ")}</span>
          <span>pk</span>
        </div>
      ) : null}

      <div className="relative max-h-64 overflow-y-auto">
        {visible.map((key, i) => {
          const lit = rowLit(i);
          const pointed = hasPointer && i === pointerIndex;
          return (
            <div
              key={`${key.parts.join("-")}-${i}`}
              className={cn(
                "relative grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-ink/10 px-2 py-1 font-mono text-[11px] transition-colors duration-200",
                lit && !pointed && "bg-blue/15",
                lit && pointed && "bg-blue text-white",
                !lit && pointed && "bg-yellow text-ink",
                !lit && !pointed && "bg-white text-ink",
              )}
            >
              <span
                className={cn(
                  "w-4 text-center text-[10px] transition-opacity",
                  pointed ? "opacity-100" : "opacity-0",
                )}
                aria-hidden={!pointed}
              >
                ▶
              </span>
              <span className="min-w-0 truncate">
                {key.parts.map((part, pi) => (
                  <span key={`${part}-${pi}`}>
                    {pi > 0 ? (
                      <span className="mx-1 opacity-40">·</span>
                    ) : null}
                    {part}
                  </span>
                ))}
              </span>
              <span
                className={cn(
                  "tabular-nums opacity-60",
                  pointed && lit && "opacity-90",
                )}
              >
                {key.id ?? i + 1}
              </span>
            </div>
          );
        })}
      </div>

      {overflow > 0 ? (
        <p className="border-t border-ink/20 px-3 py-1 font-mono text-[10px] text-grey">
          +{overflow} more keys…
        </p>
      ) : null}
    </div>
  );
}

/** Build toy sorted keys for a composite (org, status, updated_at)-ish leaf. */
export function buildToySortedKeys(options?: {
  count?: number;
  org?: string;
  statuses?: string[];
  /** When true, status values interleave under the same org+date prefix. */
  interleaveStatus?: boolean;
}): KeyTuple[] {
  const count = options?.count ?? 18;
  const org = options?.org ?? "42";
  const statuses = options?.statuses ?? ["open", "closed", "pending"];
  const keys: KeyTuple[] = [];

  if (options?.interleaveStatus) {
    // Range-freeze picture: same org, dates ascending, status interleaved.
    for (let i = 0; i < count; i++) {
      const day = String(10 + Math.floor(i / statuses.length)).padStart(2, "0");
      const status = statuses[i % statuses.length];
      keys.push({
        parts: [org, `03-${day}`, status],
        id: i + 1,
      });
    }
    return keys;
  }

  // Contiguous runs: group by status then date (matches equality+range walks).
  let id = 1;
  for (const status of statuses) {
    const perStatus = Math.ceil(count / statuses.length);
    for (let i = 0; i < perStatus && keys.length < count; i++) {
      const day = String(10 + i).padStart(2, "0");
      keys.push({
        parts: [org, status, `03-${day}`],
        id: id++,
      });
    }
  }
  return keys;
}
