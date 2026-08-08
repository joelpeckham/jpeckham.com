"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AmplitudeBar,
  Chip,
  DemoShell,
  KetDisplay,
  OutcomeBanner,
  Panel,
  controlInput,
} from "@/components/interactive/quantum-shared";
import {
  BASIS_1,
  pct,
  prob,
  qubitFromMagnitudes,
  sampleFromProbs,
} from "./model";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function BornSamplerDemo() {
  const [mag0, setMag0] = useState(0.7);
  const [counts, setCounts] = useState<[number, number]>([0, 0]);
  const [lastOutcome, setLastOutcome] = useState<0 | 1 | null>(null);

  const mag1 = Math.sqrt(Math.max(0, 1 - mag0 * mag0));
  const amplitudes = useMemo(
    () => qubitFromMagnitudes(mag0, mag1),
    [mag0, mag1],
  );
  const p0 = prob(amplitudes[0]!);
  const p1 = prob(amplitudes[1]!);
  const total = counts[0] + counts[1];

  const entries = useMemo(
    () =>
      BASIS_1.map((label, i) => ({
        label,
        re: amplitudes[i]!.re,
        im: amplitudes[i]!.im,
      })),
    [amplitudes],
  );

  function setMagnitude(next: number) {
    setMag0(clamp01(next));
    // Changing the state invalidates the old histogram.
    setCounts([0, 0]);
    setLastOutcome(null);
  }

  function sampleOnce() {
    const outcome = sampleFromProbs([p0, p1]) as 0 | 1;
    setLastOutcome(outcome);
    setCounts((c) => {
      const next: [number, number] = [...c];
      next[outcome] += 1;
      return next;
    });
  }

  function sampleMany(n: number) {
    let c0 = 0;
    let c1 = 0;
    for (let i = 0; i < n; i++) {
      const o = sampleFromProbs([p0, p1]) as 0 | 1;
      if (o === 0) c0 += 1;
      else c1 += 1;
    }
    setCounts((prev) => [prev[0] + c0, prev[1] + c1]);
    setLastOutcome(null);
  }

  function resetHistogram() {
    setCounts([0, 0]);
    setLastOutcome(null);
  }

  const freq0 = total > 0 ? counts[0] / total : null;
  const converging =
    total >= 20 &&
    freq0 != null &&
    Math.abs(freq0 - p0) < 0.12;

  return (
    <DemoShell
      title="Born-rule coin flip"
      blurb="Amplitudes set odds via |α|². Sample outcomes and watch frequencies crawl toward those probabilities."
      accent="blue"
    >
      <Panel label="Amplitudes (real, normalized)">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block font-mono text-xs">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-grey">
              |α₀| (then P(0)=|α₀|²)
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={mag0}
              onChange={(e) => setMagnitude(Number(e.target.value))}
              className="w-full accent-ink"
            />
            <span className="mt-1 block tabular-nums">
              |α₀|={mag0.toFixed(2)} → P(0)={pct(p0)}
            </span>
          </label>
          <label className="block font-mono text-xs">
            <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-grey">
              |α₁| (derived so probs sum to 1)
            </span>
            <input
              type="text"
              readOnly
              value={`${mag1.toFixed(3)} → P(1)=${pct(p1)}`}
              className={cn(controlInput, "bg-paper text-grey")}
            />
          </label>
        </div>
        <div className="mt-3">
          <AmplitudeBar
            entries={entries}
            highlight={lastOutcome != null ? String(lastOutcome) : null}
          />
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="ink" onClick={sampleOnce}>
          Sample once
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => sampleMany(100)}>
          Sample 100×
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={resetHistogram}>
          Reset histogram
        </Button>
        {lastOutcome != null ? (
          <div className="ml-auto flex items-center gap-2 font-mono text-xs">
            <span className="text-grey uppercase tracking-[0.1em] text-[10px]">
              Last
            </span>
            <KetDisplay label={String(lastOutcome)} tone="red" />
          </div>
        ) : null}
      </div>

      <Panel label="Outcome histogram">
        <div className="space-y-2">
          {BASIS_1.map((label, i) => {
            const count = counts[i]!;
            const target = i === 0 ? p0 : p1;
            const freq = total > 0 ? count / total : 0;
            const widthPct = total > 0 ? (count / Math.max(...counts, 1)) * 100 : 0;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="w-14 shrink-0 font-mono text-xs">|{label}⟩</span>
                <div className="h-6 flex-1 border-2 border-ink bg-paper">
                  <div
                    className="h-full bg-blue transition-all duration-300"
                    style={{ width: `${Math.max(widthPct, count > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right font-mono text-[10px] tabular-nums text-grey">
                  {count}
                  {total > 0 ? ` · ${pct(freq)}` : ""}
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-[10px] tabular-nums">
                  → {pct(target)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 font-mono text-[10px] text-grey">
          {total} samples
          {total > 0
            ? ` · observed P(|0⟩)=${pct(freq0!)} vs Born ${pct(p0)}`
            : " · run samples to compare frequencies to |α|²"}
        </p>
      </Panel>

      {converging ? (
        <OutcomeBanner
          tone="ok"
          title="Frequencies track |α|²"
          detail={`After ${total} samples, |0⟩ landed near ${pct(freq0!)} (target ${pct(p0)}). The Born rule is a long-run frequency law.`}
        />
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <Chip tone="ink">P(|0⟩) = |α₀|²</Chip>
        <Chip tone="ink">P(|1⟩) = |α₁|²</Chip>
      </div>
    </DemoShell>
  );
}
