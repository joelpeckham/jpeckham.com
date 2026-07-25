"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TICKET_PROJECT_COLS,
  estimateProjection,
  projectionSelectSql,
  type ProjectionEstimate,
} from "./model";
import { DemoShell, OutcomeBanner, TradeoffRow } from "./shared";

export function ProjectionDemo() {
  const [mode, setMode] = useState<"star" | "list">("star");
  const estimate: ProjectionEstimate = useMemo(
    () => estimateProjection(mode),
    [mode],
  );

  const selected =
    mode === "star"
      ? TICKET_PROJECT_COLS
      : TICKET_PROJECT_COLS.filter((c) => c.listDefault);

  const maxBytes = TICKET_PROJECT_COLS.reduce((s, c) => s + c.bytes, 0);

  return (
    <DemoShell
      title="Projection width meter"
      blurb="WHERE finds the rows. The SELECT list decides how much of each row you drag home."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "star" ? "ink" : "outline"}
          onClick={() => setMode("star")}
        >
          SELECT *
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "list" ? "ink" : "outline"}
          onClick={() => setMode("list")}
        >
          Card columns
        </Button>
      </div>

      <div className="border-2 border-ink bg-ink px-3 py-2 font-mono text-[11px] leading-relaxed text-paper sm:text-xs">
        <div>{projectionSelectSql(mode)}</div>
        <div>
          <span className="text-grey">FROM </span>tickets
        </div>
        <div>
          <span className="text-grey">WHERE </span>org_id = ? AND status =
          &apos;open&apos; AND updated_at &gt;= ?
        </div>
      </div>

      <OutcomeBanner
        tone={estimate.tone}
        title={estimate.title}
        detail={estimate.detail}
      />

      <div className="border-2 border-ink bg-white p-3">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Toy bytes / row
        </p>
        <div className="flex h-10 w-full overflow-hidden border-2 border-ink">
          {selected.map((col) => (
            <div
              key={col.id}
              title={`${col.name}: ${col.bytes}B`}
              className={cn(
                "flex items-center justify-center border-r border-ink/30 font-mono text-[9px] transition-all duration-300",
                col.fat ? "bg-red text-white" : "bg-blue text-white",
              )}
              style={{
                width: `${Math.max(3, (col.bytes / maxBytes) * 100)}%`,
              }}
            >
              {col.bytes >= 40 ? col.name : ""}
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-0.5">
          <TradeoffRow
            label="Columns"
            value={String(estimate.columnCount)}
          />
          <TradeoffRow
            label="Approx bytes / row"
            value={estimate.bytesPerRow.toLocaleString()}
            tone={estimate.tone === "bad" ? "bad" : "ok"}
          />
          <TradeoffRow
            label="Includes body TEXT"
            value={estimate.includesFat ? "yes" : "no"}
            tone={estimate.includesFat ? "bad" : "ok"}
          />
        </div>
      </div>
    </DemoShell>
  );
}
