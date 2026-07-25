"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Chip, DemoShell, OutcomeBanner } from "./shared";

type Row = {
  id: number;
  order: string;
  discount: string | null;
};

const ROWS: Row[] = [
  { id: 1, order: "ord_a1", discount: "BLACKFRIDAY" },
  { id: 2, order: "ord_a2", discount: "SAVE10" },
  { id: 3, order: "ord_a3", discount: null },
  { id: 4, order: "ord_a4", discount: "BLACKFRIDAY" },
  { id: 5, order: "ord_a5", discount: null },
  { id: 6, order: "ord_a6", discount: "WELCOME" },
];

type FilterMode = "neq" | "neq-or-null" | "is-null";

const FILTERS: { id: FilterMode; label: string; sql: string }[] = [
  {
    id: "neq",
    label: "!= 'X'",
    sql: "WHERE discount_code != 'BLACKFRIDAY'",
  },
  {
    id: "neq-or-null",
    label: "!= OR IS NULL",
    sql: "WHERE discount_code != 'BLACKFRIDAY' OR discount_code IS NULL",
  },
  {
    id: "is-null",
    label: "IS NULL",
    sql: "WHERE discount_code IS NULL",
  },
];

function matches(row: Row, mode: FilterMode): boolean {
  if (mode === "is-null") return row.discount === null;
  if (mode === "neq") {
    // Three-valued: NULL != 'X' is unknown → dropped by WHERE
    if (row.discount === null) return false;
    return row.discount !== "BLACKFRIDAY";
  }
  // neq-or-null
  if (row.discount === null) return true;
  return row.discount !== "BLACKFRIDAY";
}

function truthCell(discount: string | null): {
  label: string;
  tone: "ok" | "warn" | "bad";
} {
  if (discount === null) {
    return { label: "UNKNOWN", tone: "warn" };
  }
  if (discount !== "BLACKFRIDAY") {
    return { label: "TRUE", tone: "ok" };
  }
  return { label: "FALSE", tone: "bad" };
}

export function NullSemanticsDemo() {
  const [mode, setMode] = useState<FilterMode>("neq");
  const filter = FILTERS.find((f) => f.id === mode) ?? FILTERS[0];

  const kept = useMemo(
    () => ROWS.filter((r) => matches(r, mode)),
    [mode],
  );
  const droppedNulls =
    mode === "neq" && ROWS.some((r) => r.discount === null);

  const outcome =
    mode === "neq"
      ? {
          tone: "bad" as const,
          title: "NULL rows silently vanish",
          detail: `WHERE only keeps TRUE. ${ROWS.filter((r) => r.discount === null).length} rows with NULL discount_code are not "not BLACKFRIDAY" — the comparison is UNKNOWN, so they drop.`,
        }
      : mode === "neq-or-null"
        ? {
            tone: "ok" as const,
            title: "Say the NULL case out loud",
            detail:
              "OR discount_code IS NULL keeps the unknown rows when that is what the product means.",
          }
        : {
            tone: "ok" as const,
            title: "IS NULL is the only NULL test",
            detail:
              "= NULL and != NULL never match. Use IS NULL / IS NOT NULL.",
          };

  return (
    <DemoShell
      title="NULL three-valued logic"
      blurb="Tap a filter. Watch which rows survive — and which NULL discount codes disappear."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            type="button"
            size="sm"
            variant={mode === f.id ? "ink" : "outline"}
            onClick={() => setMode(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="border-2 border-ink bg-ink px-3 py-2 font-mono text-[11px] text-paper sm:text-xs">
        <span className="text-grey">SELECT </span>*{" "}
        <span className="text-grey">FROM </span>orders
        <br />
        {filter.sql}
      </div>

      <OutcomeBanner {...outcome} />

      <div className="overflow-x-auto border-2 border-ink bg-white">
        <table className="w-full min-w-[320px] border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b-2 border-ink bg-paper text-left text-[10px] uppercase tracking-[0.1em] text-grey">
              <th className="px-2 py-1.5">order</th>
              <th className="px-2 py-1.5">discount_code</th>
              <th className="px-2 py-1.5">!= &apos;BF&apos;</th>
              <th className="px-2 py-1.5">kept?</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const truth = truthCell(row.discount);
              const keep = matches(row, mode);
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-ink/15 transition-colors duration-200",
                    keep ? "bg-blue/10" : "bg-white opacity-45",
                  )}
                >
                  <td className="px-2 py-1.5">{row.order}</td>
                  <td className="px-2 py-1.5">
                    {row.discount === null ? (
                      <span className="text-grey">NULL</span>
                    ) : (
                      row.discount
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <Chip tone={truth.tone}>{truth.label}</Chip>
                  </td>
                  <td className="px-2 py-1.5 font-bold">
                    {keep ? "yes" : "no"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="font-mono text-[10px] text-grey">
        Kept {kept.length}/{ROWS.length} rows.
        {droppedNulls
          ? " The NULL discount codes are the silent bug report."
          : null}
      </p>
    </DemoShell>
  );
}
