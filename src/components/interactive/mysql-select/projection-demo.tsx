"use client";

import { useMemo } from "react";
import {
  AutoLoop,
  PageGrid,
  makePageSlots,
  pagesForLimit,
  rowsPerPage,
} from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import { estimateProjection } from "./model";
import { DemoShell } from "./shared";

const LIMIT = 50;
const DISPLAY_SLOTS = 24;

/**
 * Looping: two lanes haul pages for LIMIT 50.
 * Narrow columns finish early; SELECT * keeps fetching.
 */
export function ProjectionDemo() {
  const starEst = useMemo(() => estimateProjection("star"), []);
  const listEst = useMemo(() => estimateProjection("list"), []);
  const starRpp = rowsPerPage(starEst.bytesPerRow);
  const listRpp = rowsPerPage(listEst.bytesPerRow);
  const starPages = pagesForLimit(LIMIT, starRpp);
  const listPages = pagesForLimit(LIMIT, listRpp);

  const starSlots = makePageSlots(
    DISPLAY_SLOTS,
    Math.min(DISPLAY_SLOTS, starRpp),
  );
  const listSlots = makePageSlots(
    DISPLAY_SLOTS,
    Math.min(DISPLAY_SLOTS, listRpp),
  );

  const maxPages = Math.max(starPages, listPages, 1);

  return (
    <DemoShell
      title="Projection width"
      blurb="Same LIMIT 50. Fat rows mean more page hauls from disk."
      accent="yellow"
    >
      <AutoLoop durationMs={3600} endHoldMs={800} startHoldMs={200}>
        {({ t }) => {
          // List finishes when t reaches listPages/maxPages; star later.
          const listProgress = Math.min(1, t / (listPages / maxPages));
          const starProgress = Math.min(1, t / (starPages / maxPages));
          const listCount = Math.min(
            listPages,
            Math.floor(listProgress * listPages + 1e-6),
          );
          const starCount = Math.min(
            starPages,
            Math.floor(starProgress * starPages + 1e-6),
          );

          return (
            <div className="grid gap-3 sm:grid-cols-2">
              <HaulLane
                title="SELECT *"
                slots={starSlots}
                tone="bad"
                pagesNeeded={starPages}
                pagesFetched={starCount}
                done={starProgress >= 1}
                rpp={starRpp}
              />
              <HaulLane
                title="Card columns"
                slots={listSlots}
                tone="ok"
                pagesNeeded={listPages}
                pagesFetched={listCount}
                done={listProgress >= 1}
                rpp={listRpp}
              />
            </div>
          );
        }}
      </AutoLoop>
    </DemoShell>
  );
}

function HaulLane({
  title,
  slots,
  tone,
  pagesNeeded,
  pagesFetched,
  done,
  rpp,
}: {
  title: string;
  slots: ReturnType<typeof makePageSlots>;
  tone: "ok" | "bad";
  pagesNeeded: number;
  pagesFetched: number;
  done: boolean;
  rpp: number;
}) {
  return (
    <div
      className={cn(
        "border-2 border-ink p-3 transition-colors",
        done && tone === "ok" && "bg-blue/15",
        done && tone === "bad" && "bg-red/10",
        !done && "bg-white",
      )}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          {title}
        </p>
        <p
          className={cn(
            "font-mono text-xs font-bold tabular-nums",
            tone === "ok" ? "text-blue" : "text-red",
          )}
        >
          {pagesFetched}/{pagesNeeded} pages
        </p>
      </div>

      <PageGrid
        slots={slots}
        cols={6}
        tone={tone}
        caption={`~${rpp} rows/page`}
      />

      <div className="mt-2 flex flex-wrap gap-1">
        {Array.from({ length: pagesNeeded }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-3 w-3 border border-ink transition-colors duration-150",
              i < pagesFetched
                ? tone === "ok"
                  ? "bg-blue"
                  : "bg-red"
                : "bg-paper",
            )}
          />
        ))}
      </div>

      <p className="mt-2 font-display text-lg leading-none">
        {done ? (tone === "ok" ? "Done" : "Still hauling…") : "Fetching…"}
      </p>
    </div>
  );
}
