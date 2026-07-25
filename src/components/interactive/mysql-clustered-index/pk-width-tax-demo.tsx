"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  pkWidthBytes,
  secondaryLuggageBytes,
  type PkShape,
} from "./model";
import { DemoShell, OutcomeBanner } from "./shared";

const SHAPES: { id: PkShape; label: string }[] = [
  { id: "bigint", label: "BIGINT" },
  { id: "uuid-v7", label: "UUIDv7" },
  { id: "uuid-v4-char36", label: "CHAR(36)" },
  { id: "composite-tenant", label: "tenant+id" },
];

export function PkWidthTaxDemo() {
  const [shape, setShape] = useState<PkShape>("bigint");
  const [secondaryCount, setSecondaryCount] = useState(3);

  const luggage = useMemo(
    () =>
      secondaryLuggageBytes({
        pkShape: shape,
        secondaryCount,
        indexedColBytesPerSecondary: 8,
      }),
    [shape, secondaryCount],
  );

  const maxBar = Math.max(luggage.perSecondaryBytes, 44);
  const outcome =
    shape === "bigint"
      ? {
          tone: "ok" as const,
          title: "Skinny PK, skinny secondaries",
          detail: `Each secondary entry hauls ~${luggage.perSecondaryBytes}B (idx + ${luggage.pkBytes}B PK).`,
        }
      : shape === "uuid-v4-char36"
        ? {
            tone: "bad" as const,
            title: "36-byte luggage on every index",
            detail: `~${luggage.perSecondaryBytes}B per secondary entry × ${secondaryCount} indexes, before multiplying by row count.`,
          }
        : {
            tone: "warn" as const,
            title: "Wider key, still workable",
            detail: `${luggage.pkBytes}B of PK copied into each of ${secondaryCount} secondaries.`,
          };

  return (
    <DemoShell
      title="Secondary luggage"
      blurb="InnoDB copies the primary key into every secondary entry. Fat PKs multiply."
      accent="blue"
    >
      <div className="flex flex-wrap gap-2">
        {SHAPES.map(({ id, label }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={shape === id ? "ink" : "outline"}
            onClick={() => setShape(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          <span>Secondary indexes</span>
          <span className="tabular-nums text-ink">{secondaryCount}</span>
        </div>
        <Slider
          min={1}
          max={8}
          step={1}
          value={secondaryCount}
          onValueChange={setSecondaryCount}
          accent="blue"
        />
      </div>

      <OutcomeBanner {...outcome} />

      <div className="border-2 border-ink bg-white p-3">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          One secondary entry (toy)
        </p>
        <div className="flex h-9 w-full overflow-hidden border-2 border-ink">
          <div
            className="flex items-center justify-center bg-ink font-mono text-[10px] text-white"
            style={{ width: `${(8 / maxBar) * 100}%` }}
          >
            idx
          </div>
          <div
            className={cn(
              "flex items-center justify-center font-mono text-[10px]",
              shape === "bigint"
                ? "bg-blue text-white"
                : shape === "uuid-v4-char36"
                  ? "bg-red text-white"
                  : "bg-yellow text-ink",
            )}
            style={{ width: `${(luggage.pkBytes / maxBar) * 100}%` }}
          >
            PK {pkWidthBytes(shape)}B
          </div>
        </div>
        <p className="mt-2 font-mono text-[10px] text-grey">
          × {secondaryCount} secondaries × row count in production.
        </p>
      </div>
    </DemoShell>
  );
}
