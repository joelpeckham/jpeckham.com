"use client";

import { useMemo, useState } from "react";
import {
  AmplitudeBar,
  CircuitCaption,
  CircuitMini,
  Chip,
  DemoShell,
  KetDisplay,
  Panel,
} from "@/components/interactive/quantum-shared";
import { Slider } from "@/components/ui/slider";
import {
  ENCODE_COLUMNS,
  ENCODE_WIRES,
  encode,
  normalizeMagnitudes,
  physicalAmplitudes,
  prob,
} from "./model";

function fmtCoeff(re: number): string {
  return re.toFixed(2);
}

/** Encode α|0⟩+β|1⟩ into α|000⟩+β|111⟩ with two CNOTs. */
export function EncodeDemo() {
  const [aMag, setAMag] = useState(0.6);
  const [bMag, setBMag] = useState(0.8);

  const state = useMemo(
    () => normalizeMagnitudes(aMag, bMag),
    [aMag, bMag],
  );
  const encoded = useMemo(() => encode(state.alpha, state.beta), [state]);
  const amps = useMemo(() => physicalAmplitudes(encoded), [encoded]);

  const p0 = prob(state.alpha);
  const p1 = prob(state.beta);

  return (
    <DemoShell
      title="Encode a logical qubit"
      blurb="A codeword is a legal encoded state. Here |0̄⟩ = |000⟩ and |1̄⟩ = |111⟩. Two CNOTs copy the data qubit onto its neighbors without measuring α or β."
      accent="blue"
    >
      <Panel label="Logical amplitudes">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="font-mono text-xs text-grey">|α| (weight on |0⟩)</span>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={aMag}
              onValueChange={setAMag}
              accent="blue"
              aria-label="Magnitude of alpha"
            />
            <span className="font-mono text-sm tabular-nums">{aMag.toFixed(2)}</span>
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-xs text-grey">|β| (weight on |1⟩)</span>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={bMag}
              onValueChange={setBMag}
              accent="red"
              aria-label="Magnitude of beta"
            />
            <span className="font-mono text-sm tabular-nums">{bMag.toFixed(2)}</span>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone="ok">normalized · phases = 0 for clarity</Chip>
          <span className="font-mono text-[11px] text-grey tabular-nums">
            |α|² = {(p0 * 100).toFixed(1)}% · |β|² = {(p1 * 100).toFixed(1)}%
          </span>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="Before encode">
          <p className="font-mono text-sm">
            |ψ⟩ = {fmtCoeff(state.alpha.re)}|0⟩ + {fmtCoeff(state.beta.re)}|1⟩
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <KetDisplay label="0" tone="blue" />
            <span className="font-mono text-xs text-grey">and</span>
            <KetDisplay label="1" tone="red" />
          </div>
        </Panel>

        <Panel label="After encode (codeword)">
          <p className="font-mono text-sm">
            {fmtCoeff(encoded.alpha.re)}|000⟩ + {fmtCoeff(encoded.beta.re)}|111⟩
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <KetDisplay label="000" tone="blue" />
            <span className="font-mono text-xs text-grey">and</span>
            <KetDisplay label="111" tone="red" />
          </div>
        </Panel>
      </div>

      <Panel label="Physical amplitudes (q₂ q₁ q₀)">
        <AmplitudeBar entries={amps} highlight="000" />
      </Panel>

      <Panel label="Encoding circuit">
        <CircuitMini wires={ENCODE_WIRES} columns={ENCODE_COLUMNS} />
        <CircuitCaption>
          |ψ⟩ lives on q₀. CNOT(q₀→q₁) then CNOT(q₀→q₂) spreads |0⟩→|000⟩, |1⟩→|111⟩.
        </CircuitCaption>
      </Panel>
    </DemoShell>
  );
}
