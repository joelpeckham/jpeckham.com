"use client";

import { cn } from "@/lib/utils";

export type AmplitudeEntry = {
  label: string;
  /** Complex amplitude as { re, im }. Probability = |amp|². */
  re: number;
  im: number;
};

function prob(re: number, im: number): number {
  return re * re + im * im;
}

/** Horizontal probability bars for computational-basis amplitudes. */
export function AmplitudeBar({
  entries,
  highlight,
}: {
  entries: AmplitudeEntry[];
  highlight?: string | null;
}) {
  const probs = entries.map((e) => ({
    ...e,
    p: prob(e.re, e.im),
  }));
  const maxP = Math.max(...probs.map((e) => e.p), 1e-9);

  return (
    <div className="space-y-2" role="img" aria-label="Amplitude probabilities">
      {probs.map((e) => {
        const selected = highlight === e.label;
        const widthPct = Math.max((e.p / maxP) * 100, e.p > 0 ? 2 : 0);
        return (
          <div key={e.label} className="flex items-center gap-2">
            <span className="w-14 shrink-0 font-mono text-xs tabular-nums">
              |{e.label}⟩
            </span>
            <div className="h-6 flex-1 border-2 border-ink bg-paper">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  selected ? "bg-red" : "bg-blue",
                )}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-[10px] tabular-nums text-grey">
              {(e.p * 100).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
