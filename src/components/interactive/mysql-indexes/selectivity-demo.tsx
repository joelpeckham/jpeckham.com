"use client";

import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { estimateSelectivity } from "./model";
import { DemoShell, OutcomeBanner } from "./shared";

const DOT_COUNT = 2000;

function formatRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/** Deterministic lit mask: first `lit` dots of DOT_COUNT light up. */
function litCountFor(rows: number, tableRows: number): number {
  const fraction = rows / tableRows;
  return Math.max(1, Math.min(DOT_COUNT, Math.round(fraction * DOT_COUNT)));
}

function Haystack({
  lit,
  tone,
  label,
  rowsLabel,
}: {
  lit: number;
  tone: "ok" | "warn" | "bad";
  label: string;
  rowsLabel: string;
}) {
  return (
    <div className="border-2 border-ink bg-white p-2">
      <div className="mb-1.5 flex items-baseline justify-between gap-2 font-mono text-[10px]">
        <span className="uppercase tracking-[0.1em] text-grey">{label}</span>
        <span className="font-bold tabular-nums">~{rowsLabel}</span>
      </div>
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: "repeat(50, minmax(0, 1fr))",
        }}
        role="img"
        aria-label={`${lit} of ${DOT_COUNT} dots lit`}
      >
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <div
            key={i}
            className={cn(
              "aspect-square",
              i < lit
                ? tone === "bad"
                  ? "bg-red"
                  : tone === "warn"
                    ? "bg-yellow"
                    : "bg-blue"
                : "bg-ink/10",
            )}
            style={{
              // Sweep: delay scales with column so lit region appears left→right
              transitionProperty: "background-color",
              transitionDuration: "280ms",
              transitionDelay: `${(i % 50) * 4}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SelectivityDemo() {
  const [statusDistinct, setStatusDistinct] = useState(3);
  const [assigneeDistinct, setAssigneeDistinct] = useState(40);
  const [orgCount, setOrgCount] = useState(200);
  const [orgScoped, setOrgScoped] = useState(true);

  const estimate = useMemo(
    () =>
      estimateSelectivity({
        orgCount,
        statusDistinct,
        assigneeDistinct,
        orgScoped,
      }),
    [orgCount, statusDistinct, assigneeDistinct, orgScoped],
  );

  const haystacks = [
    {
      label: "status alone",
      rows: estimate.statusAloneRows,
      lit: litCountFor(estimate.statusAloneRows, estimate.tableRows),
      tone: estimate.statusTone,
    },
    {
      label: "assignee alone",
      rows: estimate.assigneeAloneRows,
      lit: litCountFor(estimate.assigneeAloneRows, estimate.tableRows),
      tone:
        estimate.assigneeAloneRows > estimate.tableRows * 0.1
          ? ("warn" as const)
          : ("ok" as const),
    },
    {
      label: orgScoped ? "org → status" : "status (no org)",
      rows: estimate.orgThenStatusRows,
      lit: litCountFor(estimate.orgThenStatusRows, estimate.tableRows),
      tone: estimate.scopedTone,
    },
    {
      label: orgScoped ? "org → status → assignee" : "status → assignee",
      rows: estimate.orgStatusAssigneeRows,
      lit: litCountFor(estimate.orgStatusAssigneeRows, estimate.tableRows),
      tone: "ok" as const,
    },
  ];

  const outcome =
    !orgScoped || estimate.statusTone === "bad"
      ? {
          tone: "bad" as const,
          title: "status alone is a blunt instrument",
          detail: `~${formatRows(estimate.statusAloneRows)} rows share a status value on a ${formatRows(estimate.tableRows)}-row table. Scope the tenant first.`,
        }
      : {
          tone: "ok" as const,
          title: "Tenant scope shrinks the haystack",
          detail: `Inside one org (~${formatRows(estimate.scopedRows)} rows), status then assignee gets you near ${formatRows(estimate.orgStatusAssigneeRows)} candidates.`,
        };

  return (
    <DemoShell
      title="Selectivity scrubber"
      blurb="Each grid is the same 2,000-dot haystack. Lit dots ≈ fraction of the table a predicate still matches."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={orgScoped ? "ink" : "outline"}
          onClick={() => setOrgScoped(true)}
        >
          Org-scoped
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!orgScoped ? "ink" : "outline"}
          onClick={() => setOrgScoped(false)}
        >
          Whole table
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            <span>status distinct values</span>
            <span className="tabular-nums text-ink">{statusDistinct}</span>
          </div>
          <Slider
            min={2}
            max={12}
            step={1}
            value={statusDistinct}
            onValueChange={setStatusDistinct}
            accent="red"
          />
        </div>
        <div>
          <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            <span>assignee distinct (per scope)</span>
            <span className="tabular-nums text-ink">{assigneeDistinct}</span>
          </div>
          <Slider
            min={5}
            max={200}
            step={5}
            value={assigneeDistinct}
            onValueChange={setAssigneeDistinct}
            accent="blue"
          />
        </div>
        <div>
          <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            <span>orgs in the SaaS</span>
            <span className="tabular-nums text-ink">{orgCount}</span>
          </div>
          <Slider
            min={10}
            max={2000}
            step={10}
            value={orgCount}
            onValueChange={setOrgCount}
            accent="ink"
          />
        </div>
      </div>

      <OutcomeBanner {...outcome} />

      <div className="grid gap-2 sm:grid-cols-2">
        {haystacks.map((h) => (
          <Haystack
            key={h.label}
            lit={h.lit}
            tone={h.tone}
            label={h.label}
            rowsLabel={formatRows(h.rows)}
          />
        ))}
      </div>
      <p className="font-mono text-[10px] text-grey">
        Toy uniform cardinality on a {formatRows(estimate.tableRows)}-row table
        — not histograms.
      </p>
    </DemoShell>
  );
}
