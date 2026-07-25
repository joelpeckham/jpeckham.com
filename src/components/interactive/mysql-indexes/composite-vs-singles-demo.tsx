"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { strategyStory, type IndexStrategy } from "./model";
import { Chip, DemoShell, OutcomeBanner } from "./shared";

const SINGLES = ["org_id", "status", "assignee_id"] as const;
const COMPOSITE = ["org_id", "status", "assignee_id", "updated_at"] as const;

export function CompositeVsSinglesDemo() {
  const [strategy, setStrategy] = useState<IndexStrategy>("singles");
  const story = useMemo(() => strategyStory(strategy), [strategy]);

  return (
    <DemoShell
      title="Composite vs three singles"
      blurb="Same inbox WHERE. Two indexing strategies. Watch the cartoon plan change."
      accent="red"
    >
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={strategy === "singles" ? "ink" : "outline"}
          onClick={() => setStrategy("singles")}
        >
          Three singles
        </Button>
        <Button
          type="button"
          size="sm"
          variant={strategy === "composite" ? "ink" : "outline"}
          onClick={() => setStrategy("composite")}
        >
          One composite
        </Button>
      </div>

      <OutcomeBanner
        tone={story.tone}
        title={story.title}
        detail={story.detail}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="border-2 border-ink bg-white p-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            Indexes you pay for
          </p>
          {strategy === "singles" ? (
            <div className="space-y-1.5">
              {SINGLES.map((col, i) => (
                <div
                  key={col}
                  className={cn(
                    "border-2 border-ink px-2 py-1.5 font-mono text-xs transition-all duration-300",
                    "bg-yellow",
                  )}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  KEY ({col})
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-ink bg-blue px-2 py-3 font-mono text-xs text-white transition-colors duration-300">
              KEY ({COMPOSITE.join(", ")})
            </div>
          )}
          <p className="mt-2 font-mono text-[10px] text-grey">{story.writeTax}</p>
        </div>

        <div className="border-2 border-ink bg-white p-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            Cartoon access path
          </p>
          {strategy === "singles" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {SINGLES.map((col) => (
                  <Chip key={col} tone="warn">
                    scan {col}
                  </Chip>
                ))}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="border border-ink bg-paper px-2 py-1">∩ merge</span>
                <span className="opacity-50">→</span>
                <span className="border border-ink bg-paper px-2 py-1">filesort?</span>
                <span className="opacity-50">→</span>
                <span className="border border-ink bg-red px-2 py-1 text-white">
                  bounce
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Chip tone="ok">one range walk</Chip>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="border border-ink bg-blue px-2 py-1 text-white">
                  prefix match
                </span>
                <span className="opacity-50">→</span>
                <span className="border border-ink bg-paper px-2 py-1">
                  near ORDER BY
                </span>
                <span className="opacity-50">→</span>
                <span className="border border-ink bg-ink px-2 py-1 text-white">
                  bounce
                </span>
              </div>
            </div>
          )}
          <p className="mt-3 font-mono text-[11px] font-bold">{story.pathLabel}</p>
        </div>
      </div>
    </DemoShell>
  );
}
