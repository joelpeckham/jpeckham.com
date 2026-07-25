"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PageGrid,
  StepPlayer,
  makePageSlots,
} from "@/components/interactive/mysql-shared";
import { insertLocality, insertSequence, type InsertShape } from "./model";
import { DemoShell, OutcomeBanner } from "./shared";

const SHAPES: { id: InsertShape; label: string }[] = [
  { id: "bigint-ai", label: "BIGINT" },
  { id: "uuid-v7", label: "UUIDv7" },
  { id: "uuid-v4", label: "UUIDv4" },
];

const PAGE_COUNT = 6;
const SLOTS = 6;

export function InsertLocalityDemo() {
  const [shape, setShape] = useState<InsertShape>("bigint-ai");
  const [step, setStep] = useState(-1);

  const locality = useMemo(() => insertLocality(shape), [shape]);
  const sequence = useMemo(() => insertSequence(shape), [shape]);

  useEffect(() => {
    setStep(-1);
  }, [shape]);

  // Rebuild page fills from inserts up to current step.
  const { pages, landing, splitPage } = useMemo(() => {
    const counts = Array.from({ length: PAGE_COUNT }, () => 0);
    let landingPage = -1;
    let landingSlot = -1;
    let split = -1;

    const end = step < 0 ? -1 : step;
    for (let i = 0; i <= end && i < sequence.length; i++) {
      const { pageIndex, causesSplit } = sequence[i];
      if (causesSplit) {
        split = pageIndex;
        counts[pageIndex] = Math.min(
          SLOTS,
          Math.floor(SLOTS / 2) + 1,
        );
      } else {
        counts[pageIndex] = Math.min(SLOTS, counts[pageIndex] + 1);
      }
      landingPage = pageIndex;
      landingSlot = counts[pageIndex] - 1;
      // Clear split flash after the landing step (only flash on the step that splits).
      if (i < end) split = -1;
    }

    const pages = counts.map((filled, pageIndex) =>
      makePageSlots(SLOTS, filled, {
        landingIndex:
          pageIndex === landingPage && step >= 0 ? landingSlot : undefined,
      }),
    );

    return { pages, landing: landingPage, splitPage: split };
  }, [sequence, step]);

  const insertsDone = step < 0 ? 0 : step + 1;
  const caption =
    step < 0
      ? "Play: watch inserts land on leaf pages"
      : sequence[step]?.causesSplit
        ? `Insert #${insertsDone} → page ${landing} — split!`
        : `Insert #${insertsDone} → page ${landing}`;

  return (
    <DemoShell
      title="Insert locality"
      blurb="Play inserts one at a time. Sequential keys hug the hot end; random UUIDs spray and split."
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

      <StepPlayer
        stepCount={sequence.length}
        step={step}
        onStepChange={setStep}
        intervalMs={220}
        caption={caption}
      />

      <OutcomeBanner
        tone={locality.tone}
        title={locality.title}
        detail={locality.detail}
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {pages.map((slots, page) => (
          <PageGrid
            key={page}
            slots={slots}
            cols={2}
            label={`p${page}`}
            tone={locality.tone === "bad" ? "bad" : "ok"}
            splitFlash={splitPage === page}
          />
        ))}
      </div>
      <p className="font-mono text-[10px] text-grey">
        Toy leaf pages (illustrative), not real InnoDB page math.
        {step < 0
          ? " Press Play to land inserts."
          : ` ${insertsDone}/${sequence.length} inserts shown.`}
      </p>
    </DemoShell>
  );
}
