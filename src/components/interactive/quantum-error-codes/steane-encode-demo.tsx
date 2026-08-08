"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Chip,
  CircuitCaption,
  CircuitMini,
  DemoShell,
  Panel,
} from "@/components/interactive/quantum-shared";
import { steaneEncodeCircuit } from "./model";

export function SteaneEncodeDemo() {
  const circuit = useMemo(() => steaneEncodeCircuit(), []);
  const maxStep = circuit.stageLabels.length - 1;
  const [step, setStep] = useState(0);

  const done = step >= maxStep;
  const activeColumn =
    step > 0 && step <= circuit.columns.length ? step - 1 : null;
  const label = circuit.stageLabels[Math.min(step, maxStep)]!;

  return (
    <DemoShell
      title="7-Qbit encode sketch"
      blurb="Stages of Mermin Fig. 5.10: data on q₃, controlled X₄X₅, H on q₀–q₂, then controlled multi-NOTs that build (1+M₂)(1+M₁)(1+M₀)|0⟩₇."
      accent="yellow"
    >
      <Panel label="Encoding circuit (sketch)">
        <CircuitMini
          wires={circuit.wires}
          columns={circuit.columns}
          activeColumn={activeColumn}
        />
        <CircuitCaption>
          Wires numbered 6→0 as in the book. Each ⊕ column is one controlled
          multi-NOT (control = filled dot). Not every book wire decoration is
          redrawn — the stage labels match §5.8.
        </CircuitCaption>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={done ? "ok" : "warn"}>{label}</Chip>
        <Button
          type="button"
          size="sm"
          variant="blue"
          disabled={done}
          onClick={() => setStep((s) => Math.min(s + 1, maxStep))}
        >
          Step
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setStep(0)}>
          Reset
        </Button>
      </div>

      {done ? (
        <p className="border-2 border-ink bg-paper px-3 py-2 font-mono text-xs text-grey">
          When |ψ⟩ = |0⟩ the encoder prepares |0̄⟩. When |ψ⟩ = |1⟩, the early
          X₄X₅ (plus the data bit on q₃) yields |1̄⟩ = X̄|0̄⟩ after the M
          blocks. See Mermin §5.8 for the algebra.
        </p>
      ) : null}
    </DemoShell>
  );
}
