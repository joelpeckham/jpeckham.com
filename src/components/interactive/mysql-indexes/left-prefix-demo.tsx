"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_INDEX_COLS,
  PREFIX_PRESETS,
  evaluateLeftPrefix,
  moveCol,
  predicateSqlLines,
  type PredOp,
  type PredicateMap,
  type TicketCol,
} from "./model";
import { Chip, DemoShell, OutcomeBanner } from "./shared";

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

  const verdict = useMemo(
    () => evaluateLeftPrefix(indexCols, predicates),
    [indexCols, predicates],
  );

  const sqlLines = useMemo(
    () => predicateSqlLines(indexCols, predicates),
    [indexCols, predicates],
  );

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

  function reorder(index: number, direction: -1 | 1) {
    setPresetId("custom");
    setIndexCols((cols) => moveCol(cols, index, direction));
  }

  return (
    <DemoShell
      title="Left-prefix matcher"
      blurb="Reorder the index. Tap predicates. See which left prefix actually walks."
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
          <span className="text-grey">KEY idx_demo </span>({indexCols.join(", ")}
          )
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
          Index column order
        </p>
        <div className="flex flex-wrap gap-2">
          {indexCols.map((col, i) => {
            const lit = verdict.usableIndexes.includes(i);
            return (
              <div
                key={`${col}-${i}`}
                className={cn(
                  "flex items-center gap-1 border-2 border-ink px-2 py-1 font-mono text-xs transition-colors",
                  lit ? "bg-blue text-white" : "bg-white text-ink",
                )}
              >
                <span className="opacity-60">{i + 1}.</span>
                <span className="font-bold">{col}</span>
                <button
                  type="button"
                  className="ml-1 opacity-70 hover:opacity-100"
                  aria-label={`Move ${col} left`}
                  onClick={() => reorder(i, -1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="opacity-70 hover:opacity-100"
                  aria-label={`Move ${col} right`}
                  onClick={() => reorder(i, 1)}
                >
                  →
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Predicates (tap to cycle)
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
                <span className="font-bold">
                  {op ? OP_LABEL[op] : "off"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip tone="ok">blue = used in walk</Chip>
          <Chip tone="warn">yellow = predicate frozen</Chip>
        </div>
      </div>

      <OutcomeBanner
        tone={verdict.tone}
        title={verdict.title}
        detail={verdict.reason}
      />
    </DemoShell>
  );
}
