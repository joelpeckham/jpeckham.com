"use client";

import { useState } from "react";
import {
  AmplitudeBar,
  Chip,
  DemoShell,
  KetDisplay,
  Panel,
} from "@/components/interactive/quantum-shared";
import { Slider } from "@/components/ui/slider";

function normSq(a0: number, a1: number): number {
  return a0 * a0 + a1 * a1;
}

/** Inner product ⟨φ|ψ⟩ and Born probability |⟨φ|ψ⟩|² with real amplitudes. */
export function InnerProductDemo() {
  // Defaults: |ψ⟩ = (3/5, 4/5), |φ⟩ = |0⟩ — both unit.
  const [psi0, setPsi0] = useState(0.6);
  const [psi1, setPsi1] = useState(0.8);
  const [phi0, setPhi0] = useState(1);
  const [phi1, setPhi1] = useState(0);

  const psiNorm = normSq(psi0, psi1);
  const phiNorm = normSq(phi0, phi1);
  const psiUnit = Math.abs(psiNorm - 1) < 1e-3;
  const phiUnit = Math.abs(phiNorm - 1) < 1e-3;
  const bothUnit = psiUnit && phiUnit;
  const inner = phi0 * psi0 + phi1 * psi1;
  const overlapSq = inner * inner;

  const sliders = [
    { label: "ψ₀", value: psi0, set: setPsi0, accent: "blue" as const },
    { label: "ψ₁", value: psi1, set: setPsi1, accent: "blue" as const },
    { label: "φ₀", value: phi0, set: setPhi0, accent: "red" as const },
    { label: "φ₁", value: phi1, set: setPhi1, accent: "red" as const },
  ] as const;

  return (
    <DemoShell
      title="Inner product → probability"
      blurb="Two kets |ψ⟩ and |φ⟩ with real amplitudes. ⟨φ|ψ⟩ = φ₀ψ₀ + φ₁ψ₁ (full rule conjugates the bra). When both are unit vectors, |⟨φ|ψ⟩|² is the overlap probability."
      accent="red"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel label="|ψ⟩ amplitudes">
          <div className="mb-2 flex items-center gap-2">
            <KetDisplay label="ψ" tone="blue" />
            <span className="font-mono text-xs text-grey">state</span>
          </div>
          {sliders.slice(0, 2).map((s) => (
            <label key={s.label} className="mb-2 block space-y-1 last:mb-0">
              <span className="font-mono text-xs text-grey">{s.label}</span>
              <Slider
                min={-1}
                max={1}
                step={0.01}
                value={s.value}
                onValueChange={s.set}
                accent={s.accent}
                aria-label={s.label}
              />
              <span className="font-mono text-sm tabular-nums">{s.value.toFixed(2)}</span>
            </label>
          ))}
        </Panel>

        <Panel label="|φ⟩ amplitudes">
          <div className="mb-2 flex items-center gap-2">
            <KetDisplay label="φ" tone="red" />
            <span className="font-mono text-xs text-grey">direction to check</span>
          </div>
          {sliders.slice(2).map((s) => (
            <label key={s.label} className="mb-2 block space-y-1 last:mb-0">
              <span className="font-mono text-xs text-grey">{s.label}</span>
              <Slider
                min={-1}
                max={1}
                step={0.01}
                value={s.value}
                onValueChange={s.set}
                accent={s.accent}
                aria-label={s.label}
              />
              <span className="font-mono text-sm tabular-nums">{s.value.toFixed(2)}</span>
            </label>
          ))}
        </Panel>
      </div>

      <Panel label="Overlap">
        <p className="font-mono text-sm tabular-nums">
          ⟨φ|ψ⟩ = {phi0.toFixed(2)}·{psi0.toFixed(2)} + {phi1.toFixed(2)}·
          {psi1.toFixed(2)} = {inner.toFixed(4)}
        </p>
        <p className="mt-2 font-mono text-sm tabular-nums">
          |⟨φ|ψ⟩|² = {overlapSq.toFixed(4)}
          {bothUnit ? (
            <span className="ml-2 text-grey">
              (probability of finding φ when the state is ψ)
            </span>
          ) : (
            <span className="ml-2 text-grey">
              (overlap squared; normalize both kets before reading this as a probability)
            </span>
          )}
        </p>
      </Panel>

      {psiUnit ? (
        <Panel label="|ψ⟩ slot weights">
          <AmplitudeBar
            entries={[
              { label: "0", re: psi0, im: 0 },
              { label: "1", re: psi1, im: 0 },
            ]}
          />
        </Panel>
      ) : (
        <Panel label="|ψ⟩ slot weights">
          <p className="font-mono text-[11px] text-grey">
            Bars need a unit |ψ⟩. Current ⟨ψ|ψ⟩ = {psiNorm.toFixed(3)}.
          </p>
        </Panel>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={psiUnit ? "ok" : "warn"}>
          |ψ⟩ norm² = {psiNorm.toFixed(3)}
          {psiUnit ? ": normalized" : ": not normalized"}
        </Chip>
        <Chip tone={phiUnit ? "ok" : "warn"}>
          |φ⟩ norm² = {phiNorm.toFixed(3)}
          {phiUnit ? ": normalized" : ": not normalized"}
        </Chip>
      </div>
    </DemoShell>
  );
}
