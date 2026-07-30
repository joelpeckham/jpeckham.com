"use client";

import { cn } from "@/lib/utils";

export type PageSlot = {
  /** Whether a row occupies this slot. */
  filled: boolean;
  /** Highlight the slot as the most recent landing. */
  landing?: boolean;
  /** Soft highlight for "would touch" / selected rows. */
  active?: boolean;
};

type PageGridProps = {
  /** Slots in row-major order. */
  slots: PageSlot[];
  cols?: number;
  label?: string;
  /** Flash the whole page (e.g. split event). */
  splitFlash?: boolean;
  /** Tone for filled slots. */
  tone?: "ok" | "warn" | "bad";
  className?: string;
  caption?: string;
};

/**
 * One 16KB-ish leaf page as a tile grid of row slots.
 * Supports landing highlights and a split-flash state.
 */
export function PageGrid({
  slots,
  cols = 4,
  label,
  splitFlash = false,
  tone = "ok",
  className,
  caption,
}: PageGridProps) {
  const filledCount = slots.filter((s) => s.filled).length;

  return (
    <div
      className={cn(
        "border-2 border-ink bg-white p-2 transition-colors duration-150",
        splitFlash && "bg-red text-white",
        className,
      )}
    >
      {label ? (
        <p
          className={cn(
            "mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em]",
            splitFlash ? "text-white/80" : "text-grey",
          )}
        >
          {label}
        </p>
      ) : null}

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {slots.map((slot, i) => (
          <div
            key={i}
            className={cn(
              "aspect-square border border-ink/40 transition-all duration-200",
              !slot.filled && !splitFlash && "bg-paper",
              !slot.filled && splitFlash && "bg-white/20",
              slot.filled &&
                !slot.landing &&
                !slot.active &&
                !splitFlash &&
                tone === "ok" &&
                "bg-blue",
              slot.filled &&
                !slot.landing &&
                !slot.active &&
                !splitFlash &&
                tone === "warn" &&
                "bg-yellow",
              slot.filled &&
                !slot.landing &&
                !slot.active &&
                !splitFlash &&
                tone === "bad" &&
                "bg-red",
              slot.filled && splitFlash && "bg-white",
              slot.landing && !splitFlash && "scale-110 bg-ink",
              slot.active && !slot.landing && !splitFlash && "bg-blue ring-2 ring-ink",
            )}
            title={slot.filled ? `row ${i + 1}` : "empty"}
          />
        ))}
      </div>

      {caption ? (
        <p
          className={cn(
            "mt-1.5 font-mono text-[10px]",
            splitFlash ? "text-white/90" : "text-grey",
          )}
        >
          {caption}
        </p>
      ) : (
        <p
          className={cn(
            "mt-1.5 font-mono text-[10px] tabular-nums",
            splitFlash ? "text-white/90" : "text-grey",
          )}
        >
          {splitFlash
            ? "Page split!"
            : `${filledCount}/${slots.length} slots`}
        </p>
      )}
    </div>
  );
}

/** Build empty slots, then mark the first `filled` as occupied. */
export function makePageSlots(
  capacity: number,
  filled: number,
  options?: { landingIndex?: number; activeIndexes?: number[] },
): PageSlot[] {
  const active = new Set(options?.activeIndexes ?? []);
  return Array.from({ length: capacity }, (_, i) => ({
    filled: i < filled,
    landing: options?.landingIndex === i,
    active: active.has(i),
  }));
}

/**
 * Rough rows-per-16KB-page from bytes/row (teaching toy).
 * Leaves ~1KB for page headers / directory.
 */
export function rowsPerPage(bytesPerRow: number, pageBytes = 16_384): number {
  const usable = pageBytes - 1024;
  return Math.max(1, Math.floor(usable / Math.max(1, bytesPerRow)));
}

/** Pages touched to satisfy LIMIT n at a given rows/page. */
export function pagesForLimit(limit: number, rowsPerPg: number): number {
  return Math.max(1, Math.ceil(limit / Math.max(1, rowsPerPg)));
}
