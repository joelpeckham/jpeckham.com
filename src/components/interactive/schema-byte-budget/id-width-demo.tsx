"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  estimateColumn,
  idStrategyEstimate,
  jsonNumberRoundTrip,
  type IdStrategy,
} from "./budget";
import {
  ByteStrip,
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  TradeoffRow,
} from "./shared";

const STRATEGIES: { id: IdStrategy; label: string }[] = [
  { id: "int-pk", label: "INT PK" },
  { id: "bigint-pk", label: "BIGINT PK" },
  { id: "ulid-pk", label: "ULID as PK" },
  { id: "bigint-plus-public", label: "BIGINT + public_id" },
];

/** Past Number.MAX_SAFE_INTEGER — rounds if shipped as a JSON number. */
const BIG_ID = BigInt("9007199254740993");
const SAFE_INT_ID = BigInt(42);
const SAMPLE_ULID = "01JEXAMPLE000000000000ULID";

function publicUrl(strategy: IdStrategy): string {
  switch (strategy) {
    case "int-pk":
      return "/orders/42";
    case "bigint-pk":
      return `/orders/${BIG_ID.toString()}`;
    case "ulid-pk":
    case "bigint-plus-public":
      return `/orders/${SAMPLE_ULID}`;
  }
}

export function IdWidthDemo() {
  const [strategy, setStrategy] = useState<IdStrategy>("bigint-plus-public");
  const [secondaryIndexes, setSecondaryIndexes] = useState(3);

  const estimate = useMemo(() => idStrategyEstimate(strategy), [strategy]);
  const columns = useMemo(
    () => estimate.columns.map((c) => estimateColumn(c)),
    [estimate],
  );

  const indexTax = estimate.clusteredKeyBytes * secondaryIndexes;
  const url = publicUrl(strategy);
  const scavengerHunt = strategy === "int-pk" || strategy === "bigint-pk";

  const roundTrip = useMemo(() => {
    if (strategy === "bigint-pk") return jsonNumberRoundTrip(BIG_ID);
    if (strategy === "int-pk") return jsonNumberRoundTrip(SAFE_INT_ID);
    return null;
  }, [strategy]);

  const outcome =
    strategy === "bigint-plus-public"
      ? {
          tone: "ok" as const,
          title: "Boring joins, opaque URLs",
          detail:
            "Clustered key stays skinny; the API only ever sees a string. This is the day-one pick I’d defend.",
        }
      : strategy === "ulid-pk"
        ? {
            tone: "warn" as const,
            title: "Nice public id, fat clustered key",
            detail: `Every secondary index copies ~${estimate.clusteredKeyBytes}B of ULID. Fine for small tables, loud at scale.`,
          }
        : strategy === "bigint-pk"
          ? {
              tone: "bad" as const,
              title: "JSON just rounded your id",
              detail:
                "The number in React is no longer the number in MySQL. Your support ticket writes itself.",
            }
          : {
              tone: "warn" as const,
              title: "Guessable URLs, tight ceiling",
              detail:
                "Great for internal tables. Terrible for /orders/41, /orders/42 scavenger hunts, and signed INT tops out ~2.1B.",
            };

  return (
    <DemoShell
      title="ID width picker"
      blurb="Watch the URL, the JSON round-trip, and the secondary-index tax change with each strategy."
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

      <OutcomeBanner {...outcome} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel label="Public URL">
          <p
            className={cn(
              "break-all font-mono text-sm font-bold",
              scavengerHunt ? "text-red" : "text-ink",
            )}
          >
            {url}
          </p>
          <p className="mt-2 text-xs text-grey">
            {scavengerHunt
              ? "Sequential ids in URLs = free enumeration."
              : "Opaque string; clients never see the clustered integer."}
          </p>
        </Panel>

        <Panel label="JSON → JavaScript Number">
          {roundTrip ? (
            <div className="space-y-1 font-mono text-xs">
              <TradeoffRow label="MySQL id" value={roundTrip.mysqlId} />
              <TradeoffRow
                label="After JSON number"
                value={roundTrip.afterJson}
                tone={roundTrip.corrupted ? "bad" : "ok"}
              />
              {roundTrip.corrupted ? (
                <p className="pt-1 text-xs text-red">
                  Silently rounded, off by{" "}
                  {(
                    BigInt(roundTrip.afterJson) - BigInt(roundTrip.mysqlId)
                  ).toString()}
                  .
                </p>
              ) : (
                <p className="pt-1 text-xs text-grey">
                  Still inside Number.MAX_SAFE_INTEGER (for now).
                </p>
              )}
            </div>
          ) : (
            <p className="font-mono text-xs text-grey">
              API ships a string (<code className="text-ink">{SAMPLE_ULID}</code>
              ). Number never touches it, so the trap never fires.
            </p>
          )}
        </Panel>
      </div>

      <ByteStrip columns={columns} />

      <label className="block">
        <span className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-grey">
          <span>Secondary indexes copying the PK</span>
          <span className="tabular-nums text-ink">{secondaryIndexes}</span>
        </span>
        <Slider
          accent="red"
          min={0}
          max={8}
          step={1}
          value={secondaryIndexes}
          onValueChange={setSecondaryIndexes}
        />
      </label>

      <Panel label="Tradeoff scorecard">
        <TradeoffRow
          label="Clustered key"
          value={`~${estimate.clusteredKeyBytes}B`}
        />
        <TradeoffRow
          label="Copied into secondary indexes"
          value={`~${indexTax.toLocaleString()}B`}
          tone={indexTax > 200 ? "bad" : indexTax > 40 ? "warn" : "ok"}
        />
        <TradeoffRow
          label="URL guessability"
          value={scavengerHunt ? "Easy scavenger hunt" : "Opaque"}
          tone={scavengerHunt ? "bad" : "ok"}
        />
        <TradeoffRow
          label="Frontend precision"
          value={
            estimate.jsPrecisionRisk
              ? "Can silently round"
              : "Safe as string / small int"
          }
          tone={estimate.jsPrecisionRisk ? "bad" : "ok"}
        />
      </Panel>

      <div className="flex flex-wrap gap-2">
        {strategy === "bigint-plus-public" ? (
          <Chip tone="ok">Recommended for public APIs</Chip>
        ) : null}
        {estimate.jsPrecisionRisk ? (
          <Chip tone="bad">JS Number precision risk</Chip>
        ) : (
          <Chip tone="ok">API-safe</Chip>
        )}
      </div>
    </DemoShell>
  );
}
