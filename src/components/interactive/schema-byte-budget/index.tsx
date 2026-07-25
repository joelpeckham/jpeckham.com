"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  COLUMN_PALETTE,
  PRESET_LABELS,
  ROW_BYTE_SOFT_LIMIT,
  addColumn,
  applyMoneyMode,
  createPreset,
  cycleIntegerWidth,
  estimateRow,
  moneyModeOf,
  removeColumn,
  updateColumn,
  type Charset,
  type PresetId,
  type SchemaColumn,
} from "./budget";

const SEGMENT_COLORS = [
  "bg-blue",
  "bg-red",
  "bg-yellow",
  "bg-ink",
  "bg-blue/70",
  "bg-red/70",
  "bg-yellow/80",
  "bg-ink/70",
] as const;

const controlSelect =
  "border-2 border-ink bg-white px-2 py-1 font-mono text-sm focus-visible:outline-none";

const controlInput =
  "min-w-0 w-full border-2 border-ink bg-white px-2 py-1 font-mono text-sm focus-visible:outline-none";

function Chip({
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

function ColumnEditor({
  column,
  selected,
  onSelect,
  onChange,
  onRemove,
}: {
  column: SchemaColumn;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<SchemaColumn>) => void;
  onRemove: () => void;
}) {
  const moneyMode = moneyModeOf(column);

  return (
    <li
      className={cn(
        "border-2 border-ink bg-white",
        selected && "ring-2 ring-blue ring-offset-2 ring-offset-paper",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate font-mono text-sm font-bold">
            {column.name}
          </span>
          <span className="block truncate font-mono text-[11px] text-grey">
            {column.kind === "integer"
              ? `${(column.intWidth ?? "int").toUpperCase()}${column.unsigned ? " UNSIGNED" : ""}`
              : column.kind === "varchar"
                ? `VARCHAR(${column.length ?? 255})`
                : column.kind === "decimal"
                  ? `DECIMAL(${column.precision ?? 12},${column.scale ?? 2})`
                  : column.kind.replace("_", " ").toUpperCase()}
            {column.nullable ? " · NULL" : " · NOT NULL"}
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-grey">
          edit
        </span>
      </button>

      {selected ? (
        <div className="space-y-3 border-t-2 border-ink bg-paper/60 px-3 py-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-grey">
              Name
            </span>
            <input
              className={controlInput}
              value={column.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </label>

          <label className="flex items-center gap-2 font-mono text-sm">
            <input
              type="checkbox"
              checked={column.nullable}
              onChange={(e) => onChange({ nullable: e.target.checked })}
              className="size-4 accent-[var(--ink)]"
            />
            Nullable
          </label>

          {column.kind === "integer" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({
                    intWidth: cycleIntegerWidth(column.intWidth ?? "int"),
                  })
                }
              >
                Width: {(column.intWidth ?? "int").toUpperCase()}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={column.unsigned ? "blue" : "outline"}
                onClick={() => onChange({ unsigned: !column.unsigned })}
              >
                {column.unsigned ? "UNSIGNED" : "Signed"}
              </Button>
            </div>
          ) : null}

          {moneyMode ? (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["double", "DOUBLE"],
                  ["decimal", "DECIMAL"],
                  ["cents", "CENTS"],
                ] as const
              ).map(([mode, label]) => (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={moneyMode === mode ? "blue" : "outline"}
                  onClick={() => onChange(applyMoneyMode(column, mode))}
                >
                  {label}
                </Button>
              ))}
            </div>
          ) : null}

          {column.kind === "varchar" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 font-mono text-xs">
                <span className="uppercase tracking-[0.1em] text-grey">
                  Length
                </span>
                <span className="tabular-nums">{column.length ?? 255}</span>
              </div>
              <Slider
                accent="blue"
                min={1}
                max={4000}
                step={1}
                value={column.length ?? 255}
                onValueChange={(value) => onChange({ length: value })}
              />
              <div className="flex flex-wrap gap-2">
                {(["utf8mb4", "utf8mb3"] as Charset[]).map((cs) => (
                  <Button
                    key={cs}
                    type="button"
                    size="sm"
                    variant={(column.charset ?? "utf8mb4") === cs ? "blue" : "outline"}
                    onClick={() => onChange({ charset: cs })}
                  >
                    {cs}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {column.kind === "char" ? (
            <div className="flex flex-wrap gap-2">
              {(["utf8mb4", "utf8mb3"] as Charset[]).map((cs) => (
                <Button
                  key={cs}
                  type="button"
                  size="sm"
                  variant={(column.charset ?? "utf8mb4") === cs ? "blue" : "outline"}
                  onClick={() => onChange({ charset: cs })}
                >
                  {cs}
                </Button>
              ))}
            </div>
          ) : null}

          {column.kind === "datetime" || column.kind === "timestamp" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={column.kind === "datetime" ? "blue" : "outline"}
                onClick={() => onChange({ kind: "datetime" })}
              >
                DATETIME
              </Button>
              <Button
                type="button"
                size="sm"
                variant={column.kind === "timestamp" ? "yellow" : "outline"}
                onClick={() => onChange({ kind: "timestamp" })}
              >
                TIMESTAMP
              </Button>
            </div>
          ) : null}

          <Button type="button" size="sm" variant="red" onClick={onRemove}>
            Remove
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function SchemaByteBudget() {
  const [columns, setColumns] = useState<SchemaColumn[]>(() =>
    createPreset("orm-bad"),
  );
  const [activePreset, setActivePreset] = useState<PresetId | null>("orm-bad");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emojiSample, setEmojiSample] = useState("hi 😀");

  const estimate = useMemo(() => estimateRow(columns), [columns]);
  const selectedEstimate =
    estimate.columns.find((c) => c.columnId === selectedId) ?? null;

  const maxBar = Math.max(estimate.totalOnPageBytes, 64);
  const emojiTruncates =
    estimate.utf8mb3Risk && /[\u{10000}-\u{10FFFF}]/u.test(emojiSample);

  const loadPreset = (id: PresetId) => {
    const next = createPreset(id);
    setColumns(next);
    setActivePreset(id);
    setSelectedId(next[0]?.id ?? null);
  };

  const patchColumn = (id: string, patch: Partial<SchemaColumn>) => {
    setActivePreset(null);
    setColumns((prev) => updateColumn(prev, id, patch));
  };

  return (
    <Card accent="blue" className="not-prose my-8">
      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey">
              Interactive
            </p>
            <h2 className="font-display text-2xl leading-none tracking-tight sm:text-3xl">
              Schema byte budget
            </h2>
            <p className="mt-1 max-w-xl text-sm text-grey">
              Illustrative InnoDB DYNAMIC worst-case layout — not a substitute for{" "}
              <code className="font-mono text-ink">INFORMATION_SCHEMA</code>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRESET_LABELS) as PresetId[]).map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={activePreset === id ? "ink" : "outline"}
                onClick={() => loadPreset(id)}
              >
                {PRESET_LABELS[id]}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
                Columns
              </p>
              <select
                className={controlSelect}
                defaultValue=""
                aria-label="Add column"
                onChange={(e) => {
                  const item = COLUMN_PALETTE.find((p) => p.id === e.target.value);
                  e.target.value = "";
                  if (!item) return;
                  const next = item.factory();
                  setActivePreset(null);
                  setColumns((prev) => addColumn(prev, next));
                  setSelectedId(next.id);
                }}
              >
                <option value="" disabled>
                  Add column…
                </option>
                {COLUMN_PALETTE.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {columns.map((column) => (
                <ColumnEditor
                  key={column.id}
                  column={column}
                  selected={selectedId === column.id}
                  onSelect={() =>
                    setSelectedId((prev) =>
                      prev === column.id ? null : column.id,
                    )
                  }
                  onChange={(patch) => patchColumn(column.id, patch)}
                  onRemove={() => {
                    setActivePreset(null);
                    setColumns((prev) => removeColumn(prev, column.id));
                    setSelectedId((prev) => (prev === column.id ? null : prev));
                  }}
                />
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
                  Row byte strip
                </p>
                <p className="font-mono text-sm tabular-nums">
                  ~{estimate.totalOnPageBytes.toLocaleString()} B
                  <span className="text-grey">
                    {" "}
                    / {ROW_BYTE_SOFT_LIMIT.toLocaleString()} shared limit
                  </span>
                </p>
              </div>

              <div
                className="flex h-14 w-full overflow-hidden border-2 border-ink bg-paper"
                role="img"
                aria-label={`Approximate row uses ${estimate.totalOnPageBytes} bytes`}
              >
                {estimate.columns.map((col, index) => {
                  const widthPct = Math.max(
                    (col.bytes / maxBar) * 100,
                    col.bytes > 0 ? 1.2 : 0,
                  );
                  return (
                    <button
                      key={col.columnId}
                      type="button"
                      title={`${col.name}: ${col.bytes}B`}
                      onClick={() => setSelectedId(col.columnId)}
                      className={cn(
                        "relative h-full min-w-[3px] border-r border-ink/30 transition-opacity",
                        SEGMENT_COLORS[index % SEGMENT_COLORS.length],
                        selectedId === col.columnId
                          ? "opacity-100"
                          : "opacity-85 hover:opacity-100",
                      )}
                      style={{
                        flexGrow: col.bytes,
                        flexBasis: 0,
                        width: `${widthPct}%`,
                        backgroundImage: col.offPage
                          ? "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 6px)"
                          : undefined,
                      }}
                    />
                  );
                })}
                {estimate.nullBitmapBytes > 0 ? (
                  <div
                    className="h-full border-l border-ink/20 bg-paper"
                    style={{ flexGrow: estimate.nullBitmapBytes, flexBasis: 0 }}
                    title={`Null bitmap: ${estimate.nullBitmapBytes}B`}
                  />
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {estimate.columns.map((col, index) => (
                  <button
                    key={col.columnId}
                    type="button"
                    onClick={() => setSelectedId(col.columnId)}
                    className={cn(
                      "inline-flex items-center gap-1.5 border border-ink/40 bg-white px-1.5 py-0.5 font-mono text-[10px]",
                      selectedId === col.columnId && "border-ink border-2",
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
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {estimate.moneyExact === true ? (
                <Chip tone="ok">Money exact</Chip>
              ) : null}
              {estimate.moneyExact === false ? (
                <Chip tone="bad">Money approximate</Chip>
              ) : null}
              {estimate.hasTimestamp ? (
                <Chip tone="warn">TZ converts on read</Chip>
              ) : null}
              {estimate.timestamp2038Risk ? (
                <Chip tone="bad">2038 TIMESTAMP risk</Chip>
              ) : null}
              {estimate.hasDatetimeEvent && !estimate.timestamp2038Risk ? (
                <Chip tone="ok">Event time stable</Chip>
              ) : null}
              {estimate.utf8mb3Risk ? (
                <Chip tone="bad">utf8mb3 truncation risk</Chip>
              ) : null}
              {estimate.nearRowLimit ? (
                <Chip tone="warn">Near row byte budget</Chip>
              ) : null}
              {estimate.nullBitmapBytes > 0 ? (
                <Chip>Null bitmap {estimate.nullBitmapBytes}B</Chip>
              ) : null}
            </div>

            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-grey">
                Sample string (charset check)
              </span>
              <input
                className={controlInput}
                value={emojiSample}
                onChange={(e) => setEmojiSample(e.target.value)}
              />
              <p className="mt-1 font-mono text-xs">
                {emojiTruncates ? (
                  <span className="text-red">
                    Under utf8mb3 this would truncate or error in strict mode.
                  </span>
                ) : (
                  <span className="text-grey">
                    {estimate.utf8mb3Risk
                      ? "No supplementary-plane chars in the sample yet."
                      : "utf8mb4 path — emoji is fine."}
                  </span>
                )}
              </p>
            </label>

            <div className="min-h-[7rem] border-2 border-ink bg-white p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
                Selected column
              </p>
              {selectedEstimate ? (
                <>
                  <p className="mt-1 font-mono text-sm font-bold">
                    {selectedEstimate.name}{" "}
                    <span className="font-normal text-grey">
                      {selectedEstimate.label}
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-xs tabular-nums">
                    ~{selectedEstimate.bytes} bytes
                    {selectedEstimate.offPage ? " · may spill off-page" : ""}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                    {selectedEstimate.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-2 text-sm text-grey">
                  Click a segment or column to see why those bytes are there.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
