"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AmplitudeBar,
  CircuitCaption,
  CircuitMini,
  Chip,
  DemoShell,
  KetDisplay,
  Panel,
  type AmplitudeEntry,
  type CircuitGate,
} from "@/components/interactive/quantum-shared";
import { applyGateToState, GATES, type Complex } from "./gate-picker-demo";
import { SignedAmplitudes } from "./signed-amps";

const WIRE_ID = "q0";
const MAX_STEP = 2;

const CIRCUIT_COLUMNS: CircuitGate[][] = [
  [{ id: "h", wires: [WIRE_ID], label: "H" }],
  [{ id: "x", wires: [WIRE_ID], label: "X" }],
];

function basisState(bit: 0 | 1): [Complex, Complex] {
  return [
    { re: bit === 0 ? 1 : 0, im: 0 },
    { re: bit === 1 ? 1 : 0, im: 0 },
  ];
}

function toEntries(state: [Complex, Complex]): AmplitudeEntry[] {
  return [
    { label: "0", re: state[0].re, im: state[0].im },
    { label: "1", re: state[1].re, im: state[1].im },
  ];
}

function stateAfterSteps(input: 0 | 1, step: number): AmplitudeEntry[] {
  let state = basisState(input);
  if (step >= 1) state = applyGateToState(GATES.H.matrix, state);
  if (step >= 2) state = applyGateToState(GATES.X.matrix, state);
  return toEntries(state);
}

function stepLabel(step: number): string {
  if (step === 0) return "Initial";
  if (step === 1) return "After H (col 0)";
  return "Final (XH|ψ⟩)";
}

/** Step through H then X on one wire; diagram reads left-to-right. */
export function CircuitStepperDemo() {
  const [input, setInput] = useState<0 | 1>(0);
  const [step, setStep] = useState(0);

  const amplitudes = useMemo(() => stateAfterSteps(input, step), [input, step]);
  const activeColumn = step === 1 ? 0 : step === 2 ? 1 : null;
  const atFinal = step >= MAX_STEP;

  return (
    <DemoShell
      title="H then X — step the circuit"
      blurb="Read gates left-to-right on the diagram; matrix multiplication applies right-to-left."
      accent="blue"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-grey">Start</span>
        <Button
          type="button"
          size="sm"
          variant={input === 0 ? "ink" : "outline"}
          onClick={() => {
            setInput(0);
            setStep(0);
          }}
        >
          |0⟩
        </Button>
        <Button
          type="button"
          size="sm"
          variant={input === 1 ? "ink" : "outline"}
          onClick={() => {
            setInput(1);
            setStep(0);
          }}
        >
          |1⟩
        </Button>
      </div>

      <Panel label="Circuit">
        <CircuitMini
          wires={[{ id: WIRE_ID, label: "q" }]}
          columns={CIRCUIT_COLUMNS}
          activeColumn={activeColumn}
        />
        <CircuitCaption>
          Diagram order: H then X (left → right). State update: XH|{input}⟩ — apply
          H first, then X (matrices multiply right-to-left).
        </CircuitCaption>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={atFinal ? "ok" : "warn"}>{stepLabel(step)}</Chip>
        <span className="font-mono text-xs text-grey">
          {step === 0 ? (
            <KetDisplay label={String(input)} size="sm" />
          ) : step === 1 ? (
            <span className="inline-flex items-center gap-0.5">
              H<KetDisplay label={String(input)} size="sm" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5">
              XH<KetDisplay label={String(input)} size="sm" />
            </span>
          )}
        </span>
        <Button
          type="button"
          size="sm"
          variant="blue"
          disabled={atFinal}
          onClick={() => setStep((s) => Math.min(s + 1, MAX_STEP))}
        >
          Step
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setStep(0)}>
          Reset
        </Button>
      </div>

      <Panel label="Amplitudes">
        <AmplitudeBar entries={amplitudes} />
        <SignedAmplitudes entries={amplitudes} />
      </Panel>

      {step >= MAX_STEP ? (
        <p className="border-2 border-ink bg-paper px-3 py-2 font-mono text-xs text-grey">
          Starting from |{input}⟩, H builds superposition; X swaps the amplitudes.
          Probabilities can match even when the circuit changed the state — compare
          real parts and phases, not just bar heights.
        </p>
      ) : null}
    </DemoShell>
  );
}
