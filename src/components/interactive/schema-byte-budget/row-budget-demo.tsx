"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PRESET_LABELS,
  ROW_BYTE_SOFT_LIMIT,
  createPreset,
  estimateRow,
  pagesForLimit,
  rowsPerPage,
  type PresetId,
} from "./budget";
import {
  ByteStrip,
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  TradeoffRow,
} from "./shared";

const LIST_LIMIT = 50;

const PRESET_BLURBS: Record<PresetId, string> = {
  "orm-bad": "Generate-and-walk-away vibes: float money, utf8mb3, fat VARCHARs.",
  "marketplace-good": "Exact money, DATETIME events, utf8mb4, product-sized text.",
  "wide-soup": "Five VARCHAR(2000)s “just in case.” List endpoints cry.",
};

export function RowBudgetDemo() {
  const [preset, setPreset] = useState<PresetId>("orm-bad");
  const columns = useMemo(() => createPreset(preset), [preset]);
  const estimate = useMemo(() => estimateRow(columns), [columns]);

  const rpp = rowsPerPage(estimate.totalOnPageBytes);
  const pages = pagesForLimit(estimate.totalOnPageBytes, LIST_LIMIT);
  const fillPct = Math.min(
    100,
    (estimate.totalOnPageBytes / ROW_BYTE_SOFT_LIMIT) * 100,
  );

  const outcome = (() => {
    if (preset === "wide-soup" || estimate.nearRowLimit) {
      return {
        tone: "bad" as const,
        title: `~${rpp} rows/page — list endpoint tax`,
        detail: `Fetching ${LIST_LIMIT} rows touches ~${pages} pages. Wide declarations starve the buffer pool for the same answer.`,
      };
    }
    if (preset === "orm-bad") {
      return {
        tone: "warn" as const,
        title: "Correctness chips are already red",
        detail: `~${rpp} rows/page looks survivable until float money, TIMESTAMP, and utf8mb3 show up in production.`,
      };
    }
    return {
      tone: "ok" as const,
      title: `~${rpp} rows/page, chips green`,
      detail: `${LIST_LIMIT} listings ≈ ${pages} page${pages === 1 ? "" : "s"}. Dense rows + honest types — this is the strip you want in review.`,
    };
  })();

  const tileCount = Math.min(rpp, 48);

  return (
    <DemoShell
      title="Schema byte budget"
      blurb="Stack every choice onto one row. Watch how many fit on a page — and how many pages a list endpoint must touch."
    >
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PRESET_LABELS) as PresetId[]).map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={preset === id ? "ink" : "outline"}
            onClick={() => setPreset(id)}
          >
            {PRESET_LABELS[id]}
          </Button>
        ))}
      </div>

      <p className="text-sm text-grey">{PRESET_BLURBS[preset]}</p>

      <OutcomeBanner {...outcome} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel label={`One 16KB page (~${rpp} rows)`}>
          <div className="grid grid-cols-8 gap-1 sm:grid-cols-12">
            {Array.from({ length: tileCount }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "aspect-square border border-ink/30 transition-colors duration-200",
                  estimate.nearRowLimit
                    ? "bg-red"
                    : preset === "orm-bad"
                      ? "bg-yellow"
                      : "bg-blue",
                )}
                style={{
                  // Wider rows → chunkier tiles (fewer fit).
                  opacity: 0.55 + (i % 5) * 0.08,
                }}
              />
            ))}
          </div>
          {rpp > tileCount ? (
            <p className="mt-2 font-mono text-[10px] text-grey">
              Showing {tileCount} of ~{rpp}
            </p>
          ) : null}
        </Panel>

        <Panel label={`List endpoint: LIMIT ${LIST_LIMIT}`}>
          <TradeoffRow
            label="Row budget"
            value={`~${estimate.totalOnPageBytes.toLocaleString()}B`}
            tone={estimate.nearRowLimit ? "bad" : "ink"}
          />
          <TradeoffRow
            label="Rows / page"
            value={`~${rpp}`}
            tone={rpp < 5 ? "bad" : rpp < 20 ? "warn" : "ok"}
          />
          <TradeoffRow
            label="Pages touched"
            value={`~${pages}`}
            tone={pages > 10 ? "bad" : pages > 3 ? "warn" : "ok"}
          />
          <div className="mt-3 flex flex-wrap gap-1">
            {Array.from({ length: Math.min(pages, 24) }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "h-8 w-6 border-2 border-ink",
                  pages > 10 ? "bg-red" : pages > 3 ? "bg-yellow" : "bg-blue",
                )}
                title={`page ${i + 1}`}
              />
            ))}
            {pages > 24 ? (
              <span className="self-center font-mono text-[10px] text-grey">
                +{pages - 24}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-grey">
            Fewer denser pages → happier buffer pool for the same API response.
          </p>
        </Panel>
      </div>

      <Panel label="Shared row-size ceiling">
        <div className="relative h-8 overflow-hidden border-2 border-ink bg-paper">
          <div
            className={cn(
              "h-full transition-[width] duration-300",
              estimate.nearRowLimit ? "bg-red" : "bg-ink",
            )}
            style={{ width: `${Math.max(fillPct, 1)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold tabular-nums mix-blend-difference text-white">
            {estimate.totalOnPageBytes.toLocaleString()} /{" "}
            {ROW_BYTE_SOFT_LIMIT.toLocaleString()} B
          </span>
        </div>
      </Panel>

      <ByteStrip
        columns={estimate.columns}
        nullBitmapBytes={estimate.nullBitmapBytes}
        softLimit={ROW_BYTE_SOFT_LIMIT}
      />

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
      </div>
    </DemoShell>
  );
}

/** @deprecated Use RowBudgetDemo — kept so old imports keep working. */
export const SchemaByteBudget = RowBudgetDemo;
