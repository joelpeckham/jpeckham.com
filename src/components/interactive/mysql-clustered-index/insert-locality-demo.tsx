"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PageGrid,
  StepPlayer,
  makePageSlots,
} from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import { insertLocality, insertSequence, type InsertShape } from "./model";
import { DemoShell } from "./shared";

const SHAPES: { id: InsertShape; label: string }[] = [
  { id: "bigint-ai", label: "BIGINT" },
  { id: "uuid-v7", label: "UUIDv7" },
  { id: "uuid-v4", label: "UUIDv4" },
];

const PAGE_COUNT = 6;
const SLOTS = 6;

/**
 * Watch inserts land on leaf pages. Sequential keys hug the hot end;
 * random UUIDs spray and split. Auto-plays on scroll into view.
 */
export function InsertLocalityDemo() {
  const [shape, setShape] = useState<InsertShape>("bigint-ai");
  const [step, setStep] = useState(-1);
  const [manual, setManual] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  const locality = useMemo(() => insertLocality(shape), [shape]);
  const sequence = useMemo(() => insertSequence(shape), [shape]);

  useEffect(() => {
    setStep(-1);
    setManual(false);
  }, [shape]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Idle auto-loop when in view and user hasn't touched controls.
  useEffect(() => {
    if (!inView || manual) return;
    if (sequence.length === 0) return;

    const id = window.setInterval(() => {
      setStep((prev) => {
        if (prev >= sequence.length - 1) return -1;
        return prev + 1;
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [inView, manual, sequence.length]);

  const { pages, landing, splitPage, shoveFrom } = useMemo(() => {
    const counts = Array.from({ length: PAGE_COUNT }, () => 0);
    let landingPage = -1;
    let landingSlot = -1;
    let split = -1;
    let shove = -1;

    const end = step < 0 ? -1 : step;
    for (let i = 0; i <= end && i < sequence.length; i++) {
      const { pageIndex, causesSplit } = sequence[i];
      if (causesSplit) {
        split = pageIndex;
        shove = pageIndex;
        // Dramatic split: half stay, rest "shoved" — leave a gap then refill.
        counts[pageIndex] = Math.min(SLOTS, Math.floor(SLOTS / 2) + 1);
        // Spill into next page if available.
        const next = Math.min(PAGE_COUNT - 1, pageIndex + 1);
        if (next !== pageIndex) {
          counts[next] = Math.min(SLOTS, counts[next] + 1);
        }
      } else {
        counts[pageIndex] = Math.min(SLOTS, counts[pageIndex] + 1);
      }
      landingPage = pageIndex;
      landingSlot = counts[pageIndex] - 1;
      if (i < end) {
        split = -1;
        shove = -1;
      }
    }

    const pages = counts.map((filled, pageIndex) =>
      makePageSlots(SLOTS, filled, {
        landingIndex:
          pageIndex === landingPage && step >= 0 ? landingSlot : undefined,
      }),
    );

    return {
      pages,
      landing: landingPage,
      splitPage: split,
      shoveFrom: shove,
    };
  }, [sequence, step]);

  const insertsDone = step < 0 ? 0 : step + 1;
  const caption =
    step < 0
      ? "Watch inserts land, or take the controls."
      : sequence[step]?.causesSplit
        ? `Insert #${insertsDone} → page ${landing} — split!`
        : `Insert #${insertsDone} → page ${landing}`;

  return (
    <div ref={rootRef}>
      <DemoShell
        title="Insert locality"
        blurb="Sequential keys hug the hot end. Random UUIDs spray and split."
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
          onStepChange={(s) => {
            setManual(true);
            setStep(s);
          }}
          intervalMs={200}
          caption={caption}
          stopAtEnd={false}
        />

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {pages.map((slots, page) => (
            <div
              key={page}
              className={cn(
                "transition-transform duration-200",
                shoveFrom === page && "translate-x-1 scale-105",
                splitPage === page && "z-10",
              )}
            >
              <PageGrid
                slots={slots}
                cols={2}
                label={`p${page}`}
                tone={locality.tone === "bad" ? "bad" : "ok"}
                splitFlash={splitPage === page}
              />
            </div>
          ))}
        </div>
        <p className="font-mono text-[10px] text-grey">
          {locality.title}
          {step >= 0 ? ` · ${insertsDone}/${sequence.length}` : ""}
        </p>
      </DemoShell>
    </div>
  );
}
