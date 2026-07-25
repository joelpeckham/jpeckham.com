"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PageGrid,
  makePageSlots,
  pagesForLimit,
  rowsPerPage,
} from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import {
  TICKET_PROJECT_COLS,
  estimateProjection,
  projectionSelectSql,
  type ProjectionEstimate,
} from "./model";
import { DemoShell, OutcomeBanner, TradeoffRow } from "./shared";

const LIMIT = 50;
const DISPLAY_SLOTS = 24;

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
  const rpp = rowsPerPage(estimate.bytesPerRow);
  const pagesTouched = pagesForLimit(LIMIT, rpp);

  // Side-by-side comparison always shows both modes' page densities.
  const starEst = useMemo(() => estimateProjection("star"), []);
  const listEst = useMemo(() => estimateProjection("list"), []);
  const starRpp = rowsPerPage(starEst.bytesPerRow);
  const listRpp = rowsPerPage(listEst.bytesPerRow);

  const starSlots = makePageSlots(
    DISPLAY_SLOTS,
    Math.min(DISPLAY_SLOTS, starRpp),
  );
  const listSlots = makePageSlots(
    DISPLAY_SLOTS,
    Math.min(DISPLAY_SLOTS, listRpp),
  );

  return (
    <DemoShell
      title="Projection width meter"
      blurb="WHERE finds the rows. The SELECT list decides how fat each page is — and how many pages LIMIT 50 touches."
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
        <div>
          <span className="text-grey">LIMIT </span>
          {LIMIT}
        </div>
      </div>

      <OutcomeBanner
        tone={estimate.tone}
        title={estimate.title}
        detail={`${estimate.detail} Toy: ~${rpp} rows/16KB page → ~${pagesTouched} pages for LIMIT ${LIMIT}.`}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <PageGrid
          slots={starSlots}
          cols={6}
          label="SELECT * page"
          tone="bad"
          caption={`~${starRpp} rows/page · ${pagesForLimit(LIMIT, starRpp)} pages for LIMIT ${LIMIT}`}
          className={cn(mode !== "star" && "opacity-50")}
        />
        <PageGrid
          slots={listSlots}
          cols={6}
          label="Card columns page"
          tone="ok"
          caption={`~${listRpp} rows/page · ${pagesForLimit(LIMIT, listRpp)} pages for LIMIT ${LIMIT}`}
          className={cn(mode !== "list" && "opacity-50")}
        />
      </div>

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
            label="Approx bytes / row"
            value={estimate.bytesPerRow.toLocaleString()}
            tone={estimate.tone === "bad" ? "bad" : "ok"}
          />
          <TradeoffRow
            label="Rows / 16KB page (toy)"
            value={String(rpp)}
            tone={estimate.tone === "bad" ? "bad" : "ok"}
          />
          <TradeoffRow
            label={`Pages for LIMIT ${LIMIT}`}
            value={String(pagesTouched)}
            tone={pagesTouched > 5 ? "bad" : "ok"}
          />
        </div>
      </div>
    </DemoShell>
  );
}
