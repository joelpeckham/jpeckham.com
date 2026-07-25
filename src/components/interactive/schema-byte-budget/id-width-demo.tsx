"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PageGrid,
  makePageSlots,
  rowsPerPage as sharedRowsPerPage,
} from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import { idStrategyEstimate, type IdStrategy } from "./budget";
import { DemoShell } from "./shared";

const STRATEGIES: { id: IdStrategy; label: string }[] = [
  { id: "int-pk", label: "INT" },
  { id: "bigint-pk", label: "BIGINT" },
  { id: "ulid-pk", label: "ULID PK" },
  { id: "bigint-plus-public", label: "BIGINT + public_id" },
];

const SAMPLE_ULID = "01JEXAMPLE000000000000ULID";
/** Fixed payload beside the key — keeps the page-reflow story honest. */
const PAYLOAD_BYTES = 48;
const PAGE_SLOTS = 24;

function publicUrl(strategy: IdStrategy): string {
  switch (strategy) {
    case "int-pk":
      return "/orders/42";
    case "bigint-pk":
      return "/orders/9007199254740993";
    case "ulid-pk":
    case "bigint-plus-public":
      return `/orders/${SAMPLE_ULID}`;
  }
}

/**
 * Choosing an ID strategy reflows rows on a 16KB page.
 * Key column literally widens; rows-per-page drops.
 */
export function IdWidthDemo() {
  const [strategy, setStrategy] = useState<IdStrategy>("bigint-plus-public");
  const estimate = useMemo(() => idStrategyEstimate(strategy), [strategy]);

  // Clustered key width drives packing; public_id sits in the row payload.
  const keyBytes = estimate.clusteredKeyBytes;
  const rowBytes =
    strategy === "bigint-plus-public"
      ? keyBytes + 26 * 4 + PAYLOAD_BYTES
      : keyBytes + PAYLOAD_BYTES;
  const rpp = sharedRowsPerPage(rowBytes);
  const filled = Math.min(PAGE_SLOTS, rpp);
  const slots = useMemo(
    () => makePageSlots(PAGE_SLOTS, filled),
    [filled],
  );

  const url = publicUrl(strategy);
  const scavengerHunt = strategy === "int-pk" || strategy === "bigint-pk";
  const keyWidthPct = Math.min(100, (keyBytes / 104) * 100);

  return (
    <DemoShell
      title="ID width"
      blurb="Pick a key shape. Watch the clustered column widen and rows-per-page fall."
    >
      <div className="flex flex-wrap gap-2">
        {STRATEGIES.map(({ id, label }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={strategy === id ? "ink" : "outline"}
            onClick={() => setStrategy(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <p
        className={cn(
          "break-all border-2 border-ink bg-white px-3 py-2 font-mono text-sm font-bold",
          scavengerHunt ? "text-red" : "text-ink",
        )}
      >
        {url}
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
        <div className="border-2 border-ink bg-white p-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            Clustered key
          </p>
          <div className="flex h-12 w-full items-stretch border-2 border-ink">
            <div
              className={cn(
                "flex items-center justify-center font-mono text-[10px] text-white transition-all duration-300",
                keyBytes >= 26 ? "bg-red" : keyBytes > 8 ? "bg-yellow text-ink" : "bg-blue",
              )}
              style={{ width: `${Math.max(12, keyWidthPct)}%` }}
            >
              {keyBytes}B
            </div>
            <div className="flex flex-1 items-center justify-center bg-paper font-mono text-[10px] text-grey">
              + payload
            </div>
          </div>
          <p className="mt-2 font-mono text-[11px] tabular-nums text-ink">
            ~{rowBytes}B / row · {rpp} rows / 16KB page
          </p>
        </div>

        <PageGrid
          slots={slots}
          cols={6}
          label="16KB leaf"
          tone={rpp < 40 ? "bad" : rpp < 80 ? "warn" : "ok"}
          caption={`${filled} of ${PAGE_SLOTS} slots shown · denser = fewer pages`}
        />
      </div>
    </DemoShell>
  );
}
