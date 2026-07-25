"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StepPlayer } from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import { strategyStory, type IndexStrategy } from "./model";
import { Chip, DemoShell, OutcomeBanner } from "./shared";

const SINGLES = ["org_id", "status", "assignee_id"] as const;
const COMPOSITE = ["org_id", "status", "assignee_id", "updated_at"] as const;

const WHERE_SQL =
  "org_id = ? AND status = 'open' AND assignee_id = ? ORDER BY updated_at DESC";

/** Staged path lengths: singles = 3 scans + merge + sort + bounce; composite = walk + bounce. */
const SINGLES_STEPS = 6;
const COMPOSITE_STEPS = 3;

export function CompositeVsSinglesDemo() {
  const [strategy, setStrategy] = useState<IndexStrategy>("singles");
  const [step, setStep] = useState(-1);
  const story = useMemo(() => strategyStory(strategy), [strategy]);
  const stepCount = strategy === "singles" ? SINGLES_STEPS : COMPOSITE_STEPS;

  useEffect(() => {
    setStep(-1);
  }, [strategy]);

  const singlesLabels = [
    "scan KEY (org_id)",
    "scan KEY (status)",
    "scan KEY (assignee_id)",
    "∩ Index Merge intersect",
    "filesort for ORDER BY?",
    "bounce to clustered leaf",
  ];
  const compositeLabels = [
    "one range walk on composite",
    "rows near ORDER BY order",
    "bounce to clustered leaf",
  ];
  const labels = strategy === "singles" ? singlesLabels : compositeLabels;

  const caption =
    step < 0
      ? "Play the cartoon plan for this WHERE"
      : labels[step] ?? "";

  return (
    <DemoShell
      title="Composite vs three singles"
      blurb="Same inbox WHERE. Two indexing strategies. Watch the plan stage — and the write tax."
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

      <div className="border-2 border-ink bg-ink px-3 py-2 font-mono text-[11px] leading-relaxed text-paper sm:text-xs">
        <span className="text-grey">WHERE </span>
        {WHERE_SQL}
      </div>

      <StepPlayer
        stepCount={stepCount}
        step={step}
        onStepChange={setStep}
        intervalMs={480}
        caption={caption}
      />

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
                    step >= i ? "bg-yellow" : "bg-paper opacity-50",
                  )}
                >
                  KEY ({col})
                </div>
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "border-2 border-ink px-2 py-3 font-mono text-xs transition-colors duration-300",
                step >= 0 ? "bg-blue text-white" : "bg-paper text-ink/50",
              )}
            >
              KEY ({COMPOSITE.join(", ")})
            </div>
          )}
          <div className="mt-3 border-2 border-ink bg-paper px-2 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
              Write tax
            </p>
            <p className="mt-1 font-display text-xl leading-none">
              1 INSERT → {story.insertWriteCount} index writes
            </p>
            <p className="mt-1 font-mono text-[10px] text-grey">
              {story.writeTax}
            </p>
          </div>
        </div>

        <div className="border-2 border-ink bg-white p-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            Cartoon access path
          </p>
          <ol className="space-y-1.5">
            {labels.map((label, i) => {
              const active = step === i;
              const done = step > i;
              return (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-2 border-2 border-ink px-2 py-1.5 font-mono text-[11px] transition-colors duration-200",
                    active && "bg-ink text-white",
                    done && !active && "bg-blue/20",
                    !active && !done && "bg-paper opacity-40",
                  )}
                >
                  <span className="opacity-60">{i + 1}.</span>
                  {label}
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {strategy === "singles" ? (
              <>
                <Chip tone="warn">∩ merge</Chip>
                <Chip tone="warn">filesort?</Chip>
                <Chip tone="bad">bounce</Chip>
              </>
            ) : (
              <>
                <Chip tone="ok">one range</Chip>
                <Chip tone="ok">near ORDER BY</Chip>
                <Chip tone="ink">bounce</Chip>
              </>
            )}
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
