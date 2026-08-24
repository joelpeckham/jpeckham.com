"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepPlayerProps = {
  /** Total steps in the sequence (e.g. path length). */
  stepCount: number;
  /** Current step index, 0-based. −1 = not started / reset. */
  step: number;
  onStepChange: (step: number) => void;
  /** Auto-advance interval while playing (ms). */
  intervalMs?: number;
  /** Label shown next to controls (e.g. comparison text). */
  caption?: string;
  className?: string;
  /** When true, Play stops at the last step instead of looping. */
  stopAtEnd?: boolean;
};

/**
 * Play / step / reset control bar for staged demo animations.
 * Parent owns `step`; this component drives play timing.
 */
export function StepPlayer({
  stepCount,
  step,
  onStepChange,
  intervalMs = 450,
  caption,
  className,
  stopAtEnd = true,
}: StepPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const stepRef = useRef(step);
  const [prevStep, setPrevStep] = useState(step);

  if (step !== prevStep) {
    setPrevStep(step);
    // Parent (or Reset) moved from a started step back to idle — stop play.
    if (playing && step < 0 && prevStep >= 0) {
      setPlaying(false);
    }
  }

  if (playing && stepCount <= 0) {
    setPlaying(false);
  }

  const atEnd = stepCount > 0 && step >= stepCount - 1;
  const atStart = step < 0;

  const reset = useCallback(() => {
    setPlaying(false);
    onStepChange(-1);
  }, [onStepChange]);

  const stepOnce = useCallback(() => {
    if (stepCount <= 0) return;
    const current = stepRef.current;
    if (current < 0) {
      onStepChange(0);
      return;
    }
    if (current >= stepCount - 1) {
      if (stopAtEnd) {
        setPlaying(false);
        return;
      }
      onStepChange(0);
      return;
    }
    onStepChange(current + 1);
  }, [onStepChange, stepCount, stopAtEnd]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (!playing || stepCount <= 0) return;
    const id = window.setInterval(() => {
      const current = stepRef.current;
      if (current < 0) {
        onStepChange(0);
        return;
      }
      if (current >= stepCount - 1) {
        if (stopAtEnd) {
          setPlaying(false);
          return;
        }
        onStepChange(0);
        return;
      }
      onStepChange(current + 1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, intervalMs, stepCount, onStepChange, stopAtEnd]);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-2 border-ink bg-paper px-2 py-1.5",
        className,
      )}
    >
      <Button
        type="button"
        size="sm"
        variant={playing ? "blue" : "ink"}
        onClick={() => {
          if (playing) {
            setPlaying(false);
            return;
          }
          if (atEnd) onStepChange(-1);
          setPlaying(true);
        }}
        disabled={stepCount <= 0}
      >
        {playing ? "Pause" : "Play"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setPlaying(false);
          stepOnce();
        }}
        disabled={stepCount <= 0 || (atEnd && stopAtEnd)}
      >
        Step
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={reset}
        disabled={atStart && !playing}
      >
        Reset
      </Button>
      <span className="font-mono text-[10px] tabular-nums text-grey">
        {step < 0 ? "—" : `${step + 1}/${stepCount}`}
      </span>
      {caption ? (
        <span className="min-w-0 flex-1 font-mono text-[11px] text-ink">
          {caption}
        </span>
      ) : null}
    </div>
  );
}
