"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
} from "@/components/interactive/quantum-shared";
import {
  basisLabel,
  defaultMarkedSet,
  initialAmplitudes,
  optimalIterations,
  probability,
  probabilityOfMarked,
  qubitCount,
  runGrover,
  sampleBasisOutcome,
  toAmplitudeEntries,
} from "./model";

const N = 16;
const n = qubitCount(N);

/** Local bars: AmplitudeBar only accepts one highlight; we need all marked red. */
function MarkedAmplitudeBar({
  entries,
  markedLabels,
  measuredLabel,
}: {
  entries: { label: string; re: number; im: number }[];
  markedLabels: readonly string[];
  measuredLabel?: string | null;
}) {
  const marked = new Set(markedLabels);
  const probs = entries.map((e) => ({
    ...e,
    p: probability(e),
  }));
  const maxP = Math.max(...probs.map((e) => e.p), 1e-9);

  return (
    <div className="space-y-2" role="img" aria-label="Amplitude probabilities">
      {probs.map((e) => {
        const isMeasured = measuredLabel != null && e.label === measuredLabel;
        const isMarked = marked.has(e.label);
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
                  isMeasured || isMarked ? "bg-red" : "bg-blue",
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

export function MultiMarkDemo() {
  const [markedCount, setMarkedCount] = useState(1);
  const [iterations, setIterations] = useState(0);
  const [measured, setMeasured] = useState<number | null>(null);

  const marked = defaultMarkedSet(markedCount, N);
  const markedSet = new Set(marked);
  const optimal = optimalIterations(N, markedCount);
  const amplitudes = runGrover(initialAmplitudes(N), marked, iterations);
  const markedProb = probabilityOfMarked(amplitudes, marked);
  const entries = toAmplitudeEntries(amplitudes, n);
  const highlightLabels = marked.map((i) => basisLabel(i, n));

  function reset() {
    setIterations(0);
    setMeasured(null);
  }

  function runOptimal() {
    setIterations(optimal);
    setMeasured(null);
  }

  function step() {
    setIterations((k) => Math.min(k + 1, optimal + 1));
    setMeasured(null);
  }

  function measure() {
    setMeasured(sampleBasisOutcome(amplitudes));
  }

  const atTarget = iterations >= optimal;
  const hitMarked = measured != null && markedSet.has(measured);

  return (
    <DemoShell
      title="Several marked items"
      blurb="m solutions shrink the Grover angle: sin θ = √(m/N). Fewer iterations reach the marked subspace."
      accent="red"
    >
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={markedCount === m ? "ink" : "outline"}
            onClick={() => {
              setMarkedCount(m);
              reset();
            }}
          >
            m = {m}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        <Chip tone="ink">
          marked: {highlightLabels.map((l) => `|${l}⟩`).join(", ")}
        </Chip>
        <Chip tone={iterations === optimal ? "ok" : "warn"}>
          k = {iterations} / {optimal}
        </Chip>
        <span className="text-grey">
          optimal ≈ ⌊(π/4)√(N/m)⌋ = ⌊
          {((Math.PI / 4) * Math.sqrt(N / markedCount)).toFixed(2)}⌋
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ink" onClick={step}>
          Step
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={runOptimal}>
          Run optimal
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={measure}>
          Measure
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>

      {measured != null ? (
        <OutcomeBanner
          tone={hitMarked ? "ok" : "warn"}
          title={`Measured |${basisLabel(measured, n)}⟩`}
          detail={
            hitMarked
              ? `Hit the marked set (${(markedProb * 100).toFixed(1)}% total). Outcome is random among basis states by |amp|².`
              : `Missed — unmarked outcome. Marked set only held ${(markedProb * 100).toFixed(1)}%. Run more iterations (or try again).`
          }
        />
      ) : atTarget ? (
        <OutcomeBanner
          tone="warn"
          title={`${(markedProb * 100).toFixed(1)}% on ${markedCount} marked states`}
          detail="Measure samples the full basis by Born’s rule. At the optimal k you almost always land on a marked ket."
        />
      ) : null}

      <Panel label="Amplitudes after k iterations · red = marked">
        <MarkedAmplitudeBar
          entries={entries}
          markedLabels={highlightLabels}
          measuredLabel={measured != null ? basisLabel(measured, n) : null}
        />
      </Panel>

      <p className="font-mono text-[10px] text-grey">
        Compare m = 1 vs m = 4: optimal drops from {optimalIterations(N, 1)} to{" "}
        {optimalIterations(N, 4)} iterations at N = 16.
      </p>
    </DemoShell>
  );
}
