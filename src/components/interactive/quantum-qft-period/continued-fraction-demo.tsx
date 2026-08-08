"use client";

import { useMemo, useState } from "react";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { lcm, peakYValues, recoverPeriodFromPeak } from "./math";

const PRESETS = [
  {
    id: "toy",
    label: "Toy (n=6, r=5)",
    n: 6,
    r: 5,
    periodBound: 15,
    defaultY: 13,
    note: "Small register: y/64 ≈ j/5; largest convergent denominator under 15 should be 5.",
  },
  {
    id: "appk1",
    label: "App K Ex.1 (y=11490 → r=77)",
    n: 14,
    r: 77,
    periodBound: 128,
    defaultY: 11490,
    note: "Mermin Appendix K example 1: 11490/2¹⁴ → convergent 54/77.",
  },
  {
    id: "appk2a",
    label: "App K Ex.2a (y=11343 → r₀=13)",
    n: 14,
    r: 78,
    periodBound: 128,
    defaultY: 11343,
    note: "First run of example 2: convergent 9/13. Pair with Ex.2b; lcm(13,6)=78.",
  },
  {
    id: "appk2b",
    label: "App K Ex.2b (y=13653 → r₀=6)",
    n: 14,
    r: 78,
    periodBound: 128,
    defaultY: 13653,
    note: "Second run of example 2: convergent 5/6. Pair with Ex.2a; lcm(13,6)=78.",
  },
] as const;

function peakPicksNear(
  allPeaks: number[],
  y: number,
  defaultY: number,
  limit = 10,
): number[] {
  const scored = allPeaks
    .map((py) => ({ py, d: Math.abs(py - y) }))
    .sort((a, b) => a.d - b.d);
  const near = scored.slice(0, limit).map((s) => s.py);
  return [...new Set([defaultY, y, ...near])].sort((a, b) => a - b);
}

export function ContinuedFractionDemo() {
  const [presetId, setPresetId] =
    useState<(typeof PRESETS)[number]["id"]>("appk1");
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[1];
  const dim = 2 ** preset.n;

  const allPeaks = useMemo(
    () => peakYValues(preset.n, preset.r),
    [preset.n, preset.r],
  );

  const [y, setY] = useState<number>(preset.defaultY);

  const peakChoices = useMemo(
    () => peakPicksNear(allPeaks, y, preset.defaultY),
    [allPeaks, y, preset.defaultY],
  );

  const recovery = useMemo(
    () => recoverPeriodFromPeak(y, preset.n, preset.periodBound),
    [y, preset.n, preset.periodBound],
  );

  const matched = recovery.candidates.filter((q) => preset.r % q === 0);
  const success =
    recovery.bestGuess != null && preset.r % recovery.bestGuess === 0;

  const pairHint =
    preset.id === "appk2a"
      ? `lcm(13, 6) = ${lcm(13, 6)} — switch to Ex.2b for the second divisor.`
      : preset.id === "appk2b"
        ? `lcm(13, 6) = ${lcm(13, 6)} — switch to Ex.2a for the first divisor.`
        : null;

  return (
    <DemoShell
      title="Continued fraction on y/2ⁿ"
      blurb="A measured QFT peak gives a rational y/2ⁿ ≈ j/r. Continued-fraction convergents peel that fraction into candidates r₀ — the largest denominator under the period bound is the usual guess."
      accent="red"
    >
      <Panel label="Scenario">
        <div className="flex flex-wrap gap-3">
          <label className="font-mono text-xs">
            <span className="text-grey">preset</span>
            <select
              className={cn(controlSelect, "ml-2")}
              value={presetId}
              onChange={(e) => {
                const next = PRESETS.find((p) => p.id === e.target.value)!;
                setPresetId(next.id);
                setY(next.defaultY);
              }}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <Chip tone="ink">true r = {preset.r}</Chip>
          <Chip tone="ink">r &lt; {preset.periodBound}</Chip>
        </div>
        <p className="mt-2 font-mono text-[11px] text-grey">{preset.note}</p>
      </Panel>

      <Panel label="Measured peak y">
        <label className="block space-y-2">
          <span className="font-mono text-xs text-grey">
            y = {y} &nbsp;·&nbsp; y/2ⁿ = {(y / dim).toFixed(6)}
          </span>
          <Slider
            min={0}
            max={dim - 1}
            step={1}
            value={y}
            onValueChange={setY}
            accent="ink"
            aria-label="Measured QFT output y"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1">
          {peakChoices.map((py) => (
            <button
              key={py}
              type="button"
              onClick={() => setY(py)}
              className={cn(
                "border-2 border-ink px-2 py-0.5 font-mono text-[10px] tabular-nums",
                y === py ? "bg-blue text-white" : "bg-white hover:bg-paper",
              )}
            >
              y={py}
            </button>
          ))}
        </div>
        <p className="mt-1 font-mono text-[10px] text-grey">
          Quick-picks: peaks near the current y (includes the preset default).
        </p>
      </Panel>

      <Panel label="Continued fraction">
        <p className="font-mono text-sm tabular-nums">
          [{recovery.coeffs.join(", ")}]
        </p>
        <p className="mt-1 font-mono text-[11px] text-grey">
          Euclidean coefficients aᵢ for y/2ⁿ = {y}/{dim}
          {recovery.coeffs[0] === 0
            ? " (leading 0 because y/2ⁿ < 1; Mermin’s inverted form starts at a₀ = ⌊1/x⌋)"
            : ""}
        </p>
      </Panel>

      <Panel label="Convergents j₀/r₀">
        <div className="space-y-1">
          {recovery.convergents.map(({ p, q }, i) => {
            const divides = q >= 2 && preset.r % q === 0;
            const isBest = recovery.bestConvergent?.q === q &&
              recovery.bestConvergent?.p === p;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-baseline justify-between gap-2 border-b border-ink/15 py-1 font-mono text-xs last:border-b-0",
                  divides && "bg-blue/10",
                  isBest && "font-semibold",
                )}
              >
                <span className="text-grey">
                  a₀…a{i}
                  {isBest ? " ← pick" : ""}
                </span>
                <span className="tabular-nums">
                  {p}/{q}
                  {divides ? " ✓ divides r" : ""}
                  {q >= preset.periodBound ? " (over bound)" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      {success ? (
        <OutcomeBanner
          tone="ok"
          title={
            recovery.bestConvergent
              ? `Recovered ${recovery.bestConvergent.p}/${recovery.bestConvergent.q}`
              : `Recovered r₀ = ${recovery.bestGuess}`
          }
          detail={`Largest convergent denominator under ${preset.periodBound} is r₀ = ${recovery.bestGuess}, which divides true period r = ${preset.r}.${pairHint ? ` ${pairHint}` : ""} Candidates: ${recovery.candidates.join(", ") || "none"}.`}
        />
      ) : matched.length > 0 ? (
        <OutcomeBanner
          tone="warn"
          title={`Partial match: r₀ ∈ {${matched.join(", ")}}`}
          detail={`These denominators divide r = ${preset.r}, but the App K pick (largest under ${preset.periodBound}) is r₀ = ${recovery.bestGuess ?? "?"}. Scrub y toward a sharper peak.`}
        />
      ) : (
        <OutcomeBanner
          tone="bad"
          title="No divisor found yet"
          detail={`Best guess r₀ = ${recovery.bestGuess ?? "?"} does not divide r = ${preset.r}. Scrub y toward a sharper peak.`}
        />
      )}
    </DemoShell>
  );
}
