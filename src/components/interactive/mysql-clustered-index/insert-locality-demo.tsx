"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { insertLocality, type InsertShape } from "./model";
import { DemoShell, OutcomeBanner } from "./shared";

const SHAPES: { id: InsertShape; label: string }[] = [
  { id: "bigint-ai", label: "BIGINT" },
  { id: "uuid-v7", label: "UUIDv7" },
  { id: "uuid-v4", label: "UUIDv4" },
];

export function InsertLocalityDemo() {
  const [shape, setShape] = useState<InsertShape>("bigint-ai");
  const locality = useMemo(() => insertLocality(shape), [shape]);

  return (
    <DemoShell
      title="Insert locality"
      blurb="Toggle the PK shape. Sequential keys hug the hot end; random UUIDs paint the tree."
      accent="ink"
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

      <OutcomeBanner
        tone={locality.tone}
        title={locality.title}
        detail={locality.detail}
      />

      <div className="grid grid-cols-6 gap-1.5 border-2 border-ink bg-white p-3">
        {locality.pageFills.map((fill, page) => (
          <div key={page} className="space-y-1">
            <div className="relative h-14 overflow-hidden border-2 border-ink bg-paper">
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 transition-all duration-200",
                  locality.tone === "bad" ? "bg-red" : "bg-blue",
                )}
                style={{ height: `${fill * 100}%` }}
              />
            </div>
            <p className="text-center font-mono text-[9px] text-grey">
              p{page}
            </p>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] text-grey">
        Toy leaf fills (illustrative), not real InnoDB page math.
      </p>
    </DemoShell>
  );
}
