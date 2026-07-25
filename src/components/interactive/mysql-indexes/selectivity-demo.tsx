"use client";

import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { estimateSelectivity } from "./model";
import { DemoShell, OutcomeBanner, TradeoffRow } from "./shared";

function formatRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
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

  const maxBar = estimate.tableRows;
  const bars = [
    {
      label: "status alone",
      rows: estimate.statusAloneRows,
      tone: estimate.statusTone,
    },
    {
      label: orgScoped ? "org → status" : "status (no org)",
      rows: estimate.orgThenStatusRows,
      tone: estimate.scopedTone,
    },
    {
      label: orgScoped ? "org → status → assignee" : "status → assignee",
      rows: estimate.orgStatusAssigneeRows,
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
      blurb="Toy row counts. Low-cardinality columns look heroic until you remember the table has millions of rows."
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

      <div className="space-y-2 border-2 border-ink bg-white p-3">
        {bars.map((bar) => (
          <div key={bar.label}>
            <div className="mb-1 flex justify-between font-mono text-[11px]">
              <span>{bar.label}</span>
              <span className="tabular-nums font-bold">
                ~{formatRows(bar.rows)}
              </span>
            </div>
            <div className="h-3 border border-ink/40 bg-paper">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  bar.tone === "ok" && "bg-blue",
                  bar.tone === "warn" && "bg-yellow",
                  bar.tone === "bad" && "bg-red",
                )}
                style={{
                  width: `${Math.max(2, (bar.rows / maxBar) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
        <TradeoffRow
          label="Table size (toy)"
          value={formatRows(estimate.tableRows)}
        />
      </div>
    </DemoShell>
  );
}
