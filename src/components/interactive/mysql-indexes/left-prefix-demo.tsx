"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SortedKeyStrip,
  type KeyHighlight,
} from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import {
  DEFAULT_INDEX_COLS,
  PREFIX_PRESETS,
  buildLeftPrefixKeyScene,
  evaluateLeftPrefix,
  predicateSqlLines,
  reorderCol,
  type PredOp,
  type PredicateMap,
  type TicketCol,
} from "./model";
import { Chip, DemoShell } from "./shared";

const OP_CYCLE: (PredOp | null)[] = [
  null,
  "eq",
  "gt",
  "in",
  "like_prefix",
  "like_contains",
];

const OP_LABEL: Record<PredOp, string> = {
  eq: "=",
  gt: ">",
  in: "IN",
  like_prefix: "LIKE 'x%'",
  like_contains: "LIKE '%x'",
};

function nextOp(current: PredOp | undefined): PredOp | null {
  const idx = OP_CYCLE.indexOf(current ?? null);
  return OP_CYCLE[(idx + 1) % OP_CYCLE.length] ?? null;
}

export function LeftPrefixDemo() {
  const [indexCols, setIndexCols] = useState<TicketCol[]>([
    ...DEFAULT_INDEX_COLS,
  ]);
  const [predicates, setPredicates] = useState<PredicateMap>({
    org_id: "eq",
    status: "eq",
  });
  const [presetId, setPresetId] = useState("inbox-open");
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const verdict = useMemo(
    () => evaluateLeftPrefix(indexCols, predicates),
    [indexCols, predicates],
  );

  const sqlLines = useMemo(
    () => predicateSqlLines(indexCols, predicates),
    [indexCols, predicates],
  );

  const keyScene = useMemo(
    () => buildLeftPrefixKeyScene(indexCols, predicates, verdict),
    [indexCols, predicates, verdict],
  );

  const highlight: KeyHighlight = useMemo(() => {
    if (keyScene.mode === "none") return { kind: "none" };
    if (keyScene.mode === "interleaved") {
      return { kind: "interleaved", matches: keyScene.matches };
    }
    return {
      kind: "contiguous",
      start: keyScene.walkStart,
      end: keyScene.walkEnd,
    };
  }, [keyScene]);

  function applyPreset(id: string) {
    const preset = PREFIX_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setIndexCols([...preset.indexCols]);
    setPredicates({ ...preset.predicates });
  }

  function cyclePredicate(col: TicketCol) {
    setPresetId("custom");
    setPredicates((prev) => {
      const nextOpValue = nextOp(prev[col]);
      const next = { ...prev };
      if (nextOpValue == null) {
        delete next[col];
      } else {
        next[col] = nextOpValue;
      }
      return next;
    });
  }

  return (
    <DemoShell
      title="Left-prefix matcher"
      blurb="Drag to reorder the index. Tap predicates. Watch the sorted walk."
      accent="blue"
    >
      <div className="flex flex-wrap gap-2">
        {PREFIX_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant={presetId === preset.id ? "ink" : "outline"}
            onClick={() => applyPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="border-2 border-ink bg-ink px-3 py-2 font-mono text-[11px] leading-relaxed text-paper sm:text-xs">
        <div>
          <span className="text-grey">KEY </span>({indexCols.join(", ")})
        </div>
        {sqlLines.length === 0 ? (
          <div className="text-grey">WHERE (no predicates yet)</div>
        ) : (
          sqlLines.map((line, i) => (
            <div key={line}>
              <span className="text-grey">{i === 0 ? "WHERE " : "  AND "}</span>
              {line}
            </div>
          ))
        )}
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Index order · drag to reorder
        </p>
        <div className="flex flex-wrap gap-2">
          {indexCols.map((col, i) => {
            const lit = verdict.usableIndexes.includes(i);
            return (
              <div
                key={`${col}-${i}`}
                draggable
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
                  if (from == null) return;
                  setPresetId("custom");
                  setIndexCols((cols) => reorderCol(cols, from, i));
                  dragFrom.current = null;
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  dragFrom.current = null;
                  setDragOver(null);
                }}
                className={cn(
                  "cursor-grab border-2 border-ink px-3 py-2 font-mono text-xs active:cursor-grabbing",
                  lit ? "bg-blue text-white" : "bg-white text-ink",
                  dragOver === i && "ring-2 ring-red ring-offset-1",
                )}
              >
                <span className="mr-1 opacity-50">{i + 1}</span>
                <span className="font-bold">{col}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Predicates · tap to cycle
        </p>
        <div className="flex flex-wrap gap-2">
          {indexCols.map((col) => {
            const op = predicates[col];
            const frozen = verdict.frozenPredCols.includes(col);
            const used = verdict.usableCols.includes(col);
            return (
              <button
                key={col}
                type="button"
                onClick={() => cyclePredicate(col)}
                className={cn(
                  "border-2 border-ink px-2 py-1.5 text-left font-mono text-xs transition-colors",
                  used && "bg-blue text-white",
                  frozen && "bg-yellow text-ink",
                  !used && !frozen && "bg-paper text-ink",
                )}
              >
                <span className="block text-[10px] uppercase tracking-[0.1em] opacity-70">
                  {col}
                </span>
                <span className="font-bold">{op ? OP_LABEL[op] : "off"}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip tone="ok">blue = used</Chip>
          <Chip tone="warn">yellow = frozen</Chip>
        </div>
      </div>

      <SortedKeyStrip
        keys={keyScene.keys}
        columns={keyScene.columns}
        highlight={highlight}
        label={
          keyScene.mode === "interleaved"
            ? "Interleaved matches — range froze the walk"
            : keyScene.mode === "none"
              ? "No usable walk"
              : "Contiguous left-prefix walk"
        }
      />
    </DemoShell>
  );
}
