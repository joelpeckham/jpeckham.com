"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AmplitudeBar,
  Chip,
  CircuitCaption,
  CircuitMini,
  DemoShell,
  KetDisplay,
  OutcomeBanner,
  Panel,
  type CircuitGate,
} from "@/components/interactive/quantum-shared";
import {
  applyH,
  applyX,
  ket0,
  measureQubit,
  prob,
  shelfState,
  type Complex,
} from "./model";

type Phase =
  | "unknown"
  | "classical"
  | "prepped"
  | "superposition"
  | "final";

const WIRES = [
  { id: "q", label: "q" },
] as const;

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "unknown":
      return "Shelf (unknown — no trusted amplitudes yet)";
    case "classical":
      return "After shelf measure (classical basis state)";
    case "prepped":
      return "Prepared |0⟩";
    case "superposition":
      return "After H";
    case "final":
      return "Second measurement";
  }
}

/** Circuit sketch tracks the teaching loop, not a fake prep-before-measure. */
function circuitColumns(
  phase: Phase,
  firstOutcome: 0 | 1 | null,
  usedShelfMeasure: boolean,
): CircuitGate[][] {
  if (phase === "unknown") {
    return [[{ id: "?", wires: ["q"], label: "?", kind: "oracle" }]];
  }

  const cols: CircuitGate[][] = [];

  if (usedShelfMeasure) {
    cols.push([{ id: "m1", wires: ["q"], label: "M", kind: "measure" }]);
    // Show X once we have cleaned (or are about to) after a |1⟩ shelf bit.
    if (
      firstOutcome === 1 &&
      (phase === "prepped" ||
        phase === "superposition" ||
        phase === "final")
    ) {
      cols.push([{ id: "x", wires: ["q"], label: "X", kind: "gate" }]);
    }
  } else {
    cols.push([{ id: "prep", wires: ["q"], label: "|0⟩", kind: "gate" }]);
  }

  if (phase === "superposition" || phase === "final") {
    cols.push([{ id: "h", wires: ["q"], label: "H", kind: "gate" }]);
  }

  if (phase === "final") {
    cols.push([{ id: "m2", wires: ["q"], label: "M", kind: "measure" }]);
  }

  return cols;
}

export function PrepareMeasureDemo() {
  const [phase, setPhase] = useState<Phase>("unknown");
  const [amplitudes, setAmplitudes] = useState<Complex[]>(() => shelfState());
  const [firstOutcome, setFirstOutcome] = useState<0 | 1 | null>(null);
  const [lastOutcome, setLastOutcome] = useState<0 | 1 | null>(null);
  const [autoX, setAutoX] = useState(true);
  const [known, setKnown] = useState(false);
  const [usedShelfMeasure, setUsedShelfMeasure] = useState(false);

  const entries = useMemo(
    () => [
      { label: "0", re: amplitudes[0]!.re, im: amplitudes[0]!.im },
      { label: "1", re: amplitudes[1]!.re, im: amplitudes[1]!.im },
    ],
    [amplitudes],
  );

  const isClassical =
    known &&
    (prob(amplitudes[0]!) > 0.999 || prob(amplitudes[1]!) > 0.999);
  const isOne = known && prob(amplitudes[1]!) > 0.999;

  function reset() {
    setPhase("unknown");
    setAmplitudes(shelfState());
    setFirstOutcome(null);
    setLastOutcome(null);
    setKnown(false);
    setUsedShelfMeasure(false);
  }

  function prep0() {
    setPhase("prepped");
    setAmplitudes(ket0());
    setLastOutcome(null);
    setKnown(true);
    if (!usedShelfMeasure) {
      setFirstOutcome(null);
    } else if (firstOutcome === 1) {
      // Already cleaned via X path conceptually.
    }
  }

  function flipX() {
    if (!known || phase === "unknown" || phase === "final") return;
    const next = applyX(amplitudes);
    setAmplitudes(next);
    setLastOutcome(null);
    if (prob(next[0]!) > 0.999) {
      setPhase("prepped");
      if (usedShelfMeasure) setFirstOutcome(1);
    } else if (phase === "prepped") {
      setPhase("classical");
    }
  }

  function applyHadamard() {
    if (!known || phase === "unknown" || isOne) return;
    setPhase("superposition");
    setAmplitudes(applyH(amplitudes));
    setLastOutcome(null);
  }

  function measure() {
    const source = phase === "unknown" ? shelfState() : amplitudes;
    const { outcome, collapsed } = measureQubit(source);
    setKnown(true);

    if (phase === "unknown") {
      setUsedShelfMeasure(true);
      setFirstOutcome(outcome);
      // Outcome 0 is already |0⟩. Outcome 1 needs X (auto or manual).
      if (outcome === 0 || autoX) {
        setAmplitudes(outcome === 1 ? applyX(collapsed) : collapsed);
        setPhase("prepped");
        setLastOutcome(null);
      } else {
        setAmplitudes(collapsed);
        setPhase("classical");
        setLastOutcome(outcome);
      }
      return;
    }

    setAmplitudes(collapsed);
    setLastOutcome(outcome);

    if (phase === "superposition") {
      setPhase("final");
    }
  }

  const columns = circuitColumns(phase, firstOutcome, usedShelfMeasure);
  const activeColumn =
    phase === "unknown"
      ? 0
      : phase === "final"
        ? columns.length - 1
        : phase === "superposition"
          ? columns.findIndex((col) => col.some((g) => g.label === "H"))
          : phase === "prepped"
            ? columns.length - 1
            : 0;

  const showBanner =
    phase === "final" && lastOutcome != null
      ? {
          tone: "ok" as const,
          title: "Second measurement is random again",
          detail: `After H, you measured |${lastOutcome}⟩ with P≈50%. Prepare → H → measure is the loop every algorithm repeats.`,
        }
      : phase === "prepped" && lastOutcome == null
        ? {
            tone: "ok" as const,
            title: "Standard input |0⟩ ready",
            detail:
              usedShelfMeasure && firstOutcome === 1
                ? "Shelf measured 1; X flipped it to |0⟩. Apply H, then measure."
                : "Ready at |0⟩. Apply H, then measure.",
          }
        : phase === "classical"
          ? {
              tone: "warn" as const,
              title: "Need |0⟩ before Hadamard",
              detail:
                "Apply X to flip |1⟩ → |0⟩ (or Prep |0⟩), then H and measure.",
            }
          : null;

  return (
    <DemoShell
      title="Prepare → measure loop"
      blurb="Shelf junk has no trusted state. Measure to assign a classical ket, clean to |0⟩, Hadamard, measure again."
      accent="red"
    >
      <Panel label="Circuit sketch">
        <CircuitMini
          wires={[...WIRES]}
          columns={columns}
          activeColumn={activeColumn >= 0 ? activeColumn : null}
        />
        <CircuitCaption>{phaseLabel(phase)}</CircuitCaption>
      </Panel>

      <Panel label="Qubit state">
        {phase === "unknown" && !known ? (
          <p className="font-mono text-xs text-grey">
            Unknown shelf qubit — amplitudes stay off the display until you
            measure (or prep). Sampling uses a fair coin as a stand-in prior,
            then assigns the classical outcome state.
          </p>
        ) : (
          <AmplitudeBar
            entries={entries}
            highlight={
              lastOutcome != null
                ? String(lastOutcome)
                : isClassical && phase !== "superposition"
                  ? prob(amplitudes[0]!) > 0.5
                    ? "0"
                    : "1"
                  : null
            }
          />
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="text-[10px] uppercase tracking-[0.1em] text-grey">
            Readout
          </span>
          {phase === "unknown" && !known ? (
            <Chip tone="warn">unknown</Chip>
          ) : isClassical && lastOutcome == null && phase !== "superposition" ? (
            <KetDisplay
              label={prob(amplitudes[0]!) > 0.5 ? "0" : "1"}
              tone="blue"
            />
          ) : lastOutcome != null ? (
            <KetDisplay label={String(lastOutcome)} tone="red" />
          ) : (
            <Chip tone="ink">superposition</Chip>
          )}
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Reset
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={prep0}>
          Prep |0⟩
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={flipX}
          disabled={!known || phase === "unknown" || phase === "final"}
        >
          Apply X
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={applyHadamard}
          disabled={!known || phase === "unknown" || isOne}
        >
          Apply H
        </Button>
        <Button type="button" size="sm" variant="ink" onClick={measure}>
          Measure
        </Button>
        <label className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-grey">
          <input
            type="checkbox"
            checked={autoX}
            onChange={(e) => setAutoX(e.target.checked)}
            className="size-3.5 border-2 border-ink accent-ink"
          />
          X if |1⟩ (auto-prep)
        </label>
      </div>

      {showBanner ? <OutcomeBanner {...showBanner} /> : null}

      <div className="flex flex-wrap gap-1.5">
        <Chip tone="ink">Measure → classical bit</Chip>
        <Chip tone="warn">H creates 50/50 again</Chip>
      </div>
    </DemoShell>
  );
}
