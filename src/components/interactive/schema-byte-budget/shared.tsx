"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ColumnEstimate } from "./budget";

export const SEGMENT_COLORS = [
  "bg-blue",
  "bg-red",
  "bg-yellow",
  "bg-ink",
  "bg-blue/70",
  "bg-red/70",
  "bg-yellow/80",
  "bg-ink/70",
] as const;

export const controlSelect =
  "border-2 border-ink bg-white px-2 py-1 font-mono text-sm focus-visible:outline-none";

export const controlInput =
  "min-w-0 w-full border-2 border-ink bg-white px-2 py-1 font-mono text-sm focus-visible:outline-none";

export function Chip({
  children,
  tone = "ink",
}: {
  children: ReactNode;
  tone?: "ink" | "ok" | "warn" | "bad";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border-2 border-ink px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
        tone === "ok" && "bg-blue text-white",
        tone === "warn" && "bg-yellow text-ink",
        tone === "bad" && "bg-red text-white",
        tone === "ink" && "bg-paper text-ink",
      )}
    >
      {children}
    </span>
  );
}

/** Big verdict banner — the “so what?” of a tradeoff. */
export function OutcomeBanner({
  tone,
  title,
  detail,
}: {
  tone: "ok" | "warn" | "bad";
  title: string;
  detail: string;
}) {
  return (
    <div
      className={cn(
        "border-2 border-ink p-3 transition-colors duration-200",
        tone === "ok" && "bg-blue text-white",
        tone === "warn" && "bg-yellow text-ink",
        tone === "bad" && "bg-red text-white",
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-80">
        Outcome
      </p>
      <p className="mt-1 font-display text-xl leading-none tracking-tight sm:text-2xl">
        {title}
      </p>
      <p
        className={cn(
          "mt-1.5 text-sm",
          tone === "warn" ? "text-ink/80" : "opacity-90",
        )}
      >
        {detail}
      </p>
    </div>
  );
}

export function TradeoffRow({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "ok" | "warn" | "bad";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/15 py-1.5 font-mono text-xs last:border-b-0">
      <span className="text-grey">{label}</span>
      <span
        className={cn(
          "text-right font-bold tabular-nums",
          tone === "ok" && "text-blue",
          tone === "warn" && "text-ink",
          tone === "bad" && "text-red",
          tone === "ink" && "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function Panel({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-2 border-ink bg-white p-3", className)}>
      {label ? (
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function DemoShell({
  title,
  blurb,
  children,
  accent = "blue",
}: {
  title: string;
  blurb?: string;
  children: ReactNode;
  accent?: "blue" | "red" | "yellow" | "ink";
}) {
  return (
    <Card accent={accent} className="not-prose my-8">
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey">
            Interactive
          </p>
          <h3 className="font-display text-2xl leading-none tracking-tight sm:text-3xl">
            {title}
          </h3>
          {blurb ? (
            <p className="mt-1 max-w-xl text-sm text-grey">{blurb}</p>
          ) : null}
        </div>
        {children}
      </div>
    </Card>
  );
}

export function ByteStrip({
  columns,
  nullBitmapBytes = 0,
  selectedId,
  onSelect,
  softLimit,
}: {
  columns: ColumnEstimate[];
  nullBitmapBytes?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  softLimit?: number;
}) {
  const total =
    columns.reduce((sum, c) => sum + c.bytes, 0) + nullBitmapBytes;
  const maxBar = Math.max(total, 64);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Byte strip
        </p>
        <p className="font-mono text-sm tabular-nums">
          ~{total.toLocaleString()} B
          {softLimit != null ? (
            <span className="text-grey">
              {" "}
              / {softLimit.toLocaleString()} B shared limit
            </span>
          ) : null}
        </p>
      </div>

      <div
        className="flex h-12 w-full overflow-hidden border-2 border-ink bg-paper"
        role="img"
        aria-label={`Approximate layout uses ${total} bytes`}
      >
        {columns.map((col, index) => {
          const widthPct = Math.max(
            (col.bytes / maxBar) * 100,
            col.bytes > 0 ? 1.2 : 0,
          );
          const selected = selectedId === col.columnId;
          const className = cn(
            "relative h-full min-w-[3px] border-r border-ink/30 transition-opacity",
            SEGMENT_COLORS[index % SEGMENT_COLORS.length],
            selected ? "opacity-100" : "opacity-85 hover:opacity-100",
          );
          const style = {
            flexGrow: col.bytes,
            flexBasis: 0,
            width: `${widthPct}%`,
            backgroundImage: col.offPage
              ? "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 6px)"
              : undefined,
          } as const;

          if (onSelect) {
            return (
              <button
                key={col.columnId}
                type="button"
                title={`${col.name}: ${col.bytes}B`}
                onClick={() => onSelect(col.columnId)}
                className={className}
                style={style}
              />
            );
          }

          return (
            <div
              key={col.columnId}
              title={`${col.name}: ${col.bytes}B`}
              className={className}
              style={style}
            />
          );
        })}
        {nullBitmapBytes > 0 ? (
          <div
            className="h-full border-l border-ink/20 bg-paper"
            style={{ flexGrow: nullBitmapBytes, flexBasis: 0 }}
            title={`Null bitmap: ${nullBitmapBytes}B`}
          />
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {columns.map((col, index) => (
          <span
            key={col.columnId}
            className={cn(
              "inline-flex items-center gap-1.5 border border-ink/40 bg-white px-1.5 py-0.5 font-mono text-[10px]",
              selectedId === col.columnId && "border-2 border-ink",
            )}
          >
            <span
              className={cn(
                "size-2.5 shrink-0",
                SEGMENT_COLORS[index % SEGMENT_COLORS.length],
              )}
            />
            {col.name}
            <span className="tabular-nums text-grey">{col.bytes}B</span>
          </span>
        ))}
      </div>
    </div>
  );
}
