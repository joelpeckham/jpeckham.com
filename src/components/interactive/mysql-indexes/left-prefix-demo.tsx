"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_INDEX_COLS,
  PREFIX_PRESETS,
  buildPhoneBookScene,
  evaluateLeftPrefix,
  predicateSqlLines,
  reorderCol,
  type PhoneBookGroup,
  type PhoneBookHighlight,
  type PredOp,
  type PredicateMap,
  type TicketCol,
} from "./model";
import { Chip, DemoShell } from "./shared";

const OP_CYCLE: (PredOp | null)[] = [null, "eq", "gt"];

const OP_LABEL: Record<PredOp, string> = {
  eq: "know it (=)",
  gt: "range (>)",
};

function nextOp(current: PredOp | undefined): PredOp | null {
  const idx = OP_CYCLE.indexOf(current ?? null);
  return OP_CYCLE[(idx + 1) % OP_CYCLE.length] ?? null;
}

function rowLit(
  id: number,
  highlight: PhoneBookHighlight,
): "walk" | "match" | "off" {
  if (highlight.kind === "contiguous") {
    return highlight.rowIds.includes(id) ? "walk" : "off";
  }
  if (highlight.kind === "scattered") {
    return highlight.rowIds.includes(id) ? "match" : "off";
  }
  if (highlight.kind === "interleaved") {
    if (highlight.matchRowIds.includes(id)) return "match";
    if (highlight.walkRowIds.includes(id)) return "walk";
    return "off";
  }
  return "off";
}

function NestedGroups({
  groups,
  highlight,
  depth = 0,
}: {
  groups: PhoneBookGroup[];
  highlight: PhoneBookHighlight;
  depth?: number;
}): ReactNode {
  if (groups.length === 0) return null;

  // Leaf level: render rows when children are empty
  return (
    <div className={cn(depth > 0 && "ml-2 border-l-2 border-ink/20 pl-2")}>
      {groups.map((group) => {
        const isLeaf = group.children.length === 0;
        const litRows = group.rows.filter(
          (r) => rowLit(r.id, highlight) !== "off",
        );
        const groupLit =
          litRows.length > 0 && litRows.length === group.rows.length
            ? "full"
            : litRows.length > 0
              ? "partial"
              : "none";

        return (
          <div key={`${group.col}-${group.value}-${depth}`} className="mb-1">
            <div
              className={cn(
                "mb-0.5 inline-flex items-center gap-1.5 border border-ink/30 px-1.5 py-0.5 font-mono text-[10px]",
                groupLit === "full" && "border-blue bg-blue/15",
                groupLit === "partial" && "border-yellow bg-yellow/30",
                groupLit === "none" && "bg-paper text-grey",
              )}
            >
              <span className="uppercase tracking-[0.08em] opacity-60">
                {group.col}
              </span>
              <span className="font-bold text-ink">{group.value}</span>
              <span className="opacity-40">×{group.rows.length}</span>
            </div>

            {isLeaf ? (
              <div className="ml-1 space-y-px">
                {group.rows.map((row) => {
                  const lit = rowLit(row.id, highlight);
                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "grid grid-cols-[1fr_auto] gap-2 px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                        lit === "walk" && "bg-blue/20 text-ink",
                        lit === "match" && "bg-yellow text-ink",
                        lit === "off" && "text-ink/50",
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {row.parts.map((part, pi) => (
                          <span key={`${part}-${pi}`}>
                            {pi > 0 ? (
                              <span className="mx-1 opacity-30">·</span>
                            ) : null}
                            {part}
                          </span>
                        ))}
                      </span>
                      <span className="tabular-nums opacity-50">{row.id}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <NestedGroups
                groups={group.children}
                highlight={highlight}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
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

  const scene = useMemo(
    () => buildPhoneBookScene(indexCols, predicates, verdict),
    [indexCols, predicates, verdict],
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

  return (
    <DemoShell
      title="Nested phone book"
      blurb="A composite is groups inside groups. Drag the key order. Tap know it / range / off."
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
          Index order · drag to reorder (re-nests the book)
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
                <span className="font-bold">
                  {op ? OP_LABEL[op] : "don't know"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip tone="ok">blue = used in walk</Chip>
          <Chip tone="warn">yellow = frozen / match</Chip>
        </div>
      </div>

      <div className="border-2 border-ink bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink px-3 py-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            Sorted phone book
          </p>
          <p
            className={cn(
              "font-mono text-[10px] font-bold uppercase tracking-[0.08em]",
              scene.highlight.kind === "contiguous" && "text-blue",
              scene.highlight.kind === "scattered" && "text-red",
              scene.highlight.kind === "interleaved" && "text-ink",
              scene.highlight.kind === "none" && "text-grey",
            )}
          >
            {scene.badge}
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          <NestedGroups groups={scene.groups} highlight={scene.highlight} />
        </div>
      </div>

      <p className="font-mono text-[10px] text-grey">
        {verdict.title}: {verdict.reason}
      </p>
    </DemoShell>
  );
}
