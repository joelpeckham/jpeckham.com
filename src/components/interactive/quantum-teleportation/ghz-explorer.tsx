"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Chip,
  DemoShell,
  Panel,
} from "@/components/interactive/quantum-shared";
import {
  type Basis,
  detectGhzCase,
  expectedGhzParity,
  outcomeParity,
  sampleGhzOutcome,
} from "./model";

/** Display left→right as Q₂ · Q₁ · Q₀ (Mermin’s numbering). */
const QUBIT_ORDER = [
  { label: "Q₂", index: 0 as const },
  { label: "Q₁", index: 1 as const },
  { label: "Q₀", index: 2 as const },
] as const;

const PARADOX_EQUATIONS = [
  { id: "eq1", label: "All Z", expr: "v₂ ⊕ v₁ ⊕ v₀ = 0", parity: 0 },
  { id: "eq2", label: "H on 2&1", expr: "h₂ ⊕ h₁ ⊕ v₀ = 1", parity: 1 },
  { id: "eq3", label: "H on 2&0", expr: "h₂ ⊕ v₁ ⊕ h₀ = 1", parity: 1 },
  { id: "eq4", label: "H on 1&0", expr: "v₂ ⊕ h₁ ⊕ h₀ = 1", parity: 1 },
] as const;

function formatOutcome(outcome: [number, number, number]): string {
  return outcome.join("");
}

function formatSettings(settings: [Basis, Basis, Basis]): string {
  return settings.map((s) => (s === "Z" ? "Z" : "H")).join(" · ");
}

export function GhzExplorer() {
  const [settings, setSettings] = useState<[Basis, Basis, Basis]>([
    "Z",
    "Z",
    "Z",
  ]);
  const [sample, setSample] = useState<[number, number, number] | null>(null);
  const [view, setView] = useState<"sample" | "paradox">("sample");

  const caseId = detectGhzCase(settings);
  const expected = expectedGhzParity(caseId);

  const explanation = useMemo(() => {
    if (caseId === "all-z") {
      return "Computational-basis outcomes always have even parity — this GHZ state only has support on |000⟩, |011⟩, |101⟩, |110⟩.";
    }
    if (caseId === "other") {
      return "Not one of Mermin’s four paradox settings — correlations still follow quantum mechanics, but the predetermined-value contradiction is sharper on the textbook four.";
    }
    return "One of the three “odd parity” settings. Quantum outcomes obey the XOR rule for the circuit you ran. No single scorecard of hidden Z and H bits can satisfy all four settings at once.";
  }, [caseId]);

  function toggleQubit(index: 0 | 1 | 2) {
    setSettings((prev) => {
      const next = [...prev] as [Basis, Basis, Basis];
      next[index] = next[index] === "Z" ? "H" : "Z";
      return next;
    });
    setSample(null);
  }

  function handleSample() {
    setSample(sampleGhzOutcome(settings));
  }

  const parityVal = sample ? outcomeParity(sample) : null;

  return (
    <DemoShell
      title="GHZ correlation explorer"
      blurb="|Ψ⟩ = ½(|000⟩ − |110⟩ − |011⟩ − |101⟩). Pick Z or H-then-Z per qubit, sample an outcome, or open the paradox checklist."
      accent="red"
    >
      <div className="flex flex-wrap gap-2">
        {(["sample", "paradox"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
              view === v ? "bg-ink text-paper" : "bg-white text-ink hover:bg-paper",
            )}
          >
            {v === "sample" ? "Sample outcomes" : "Paradox checklist"}
          </button>
        ))}
      </div>

      {view === "sample" ? (
        <>
          <Panel label="Measurement settings (Q₂ · Q₁ · Q₀)">
            <div className="flex flex-wrap gap-3">
              {QUBIT_ORDER.map(({ label, index }) => {
                const basis = settings[index];
                return (
                  <div key={label} className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] text-grey">{label}</span>
                    <button
                      type="button"
                      onClick={() => toggleQubit(index)}
                      className={cn(
                        "border-2 border-ink px-3 py-2 font-mono text-xs uppercase",
                        basis === "Z" ? "bg-blue text-white" : "bg-yellow text-ink",
                      )}
                    >
                      {basis === "Z" ? "Z (computational)" : "H then Z"}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-grey">
              <span>Settings: {formatSettings(settings)}</span>
              {caseId !== "other" ? (
                <Chip tone="ok">textbook case</Chip>
              ) : (
                <Chip tone="warn">non-paradox combo</Chip>
              )}
            </div>
            <p className="mt-2 text-sm text-grey">
              “H then Z” means apply Hadamard, then measure in the computational basis — Mermin’s
              xᴴ outcomes.
            </p>
          </Panel>

          <Panel label="Sample">
            <button
              type="button"
              onClick={handleSample}
              className="border-2 border-ink bg-ink px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-paper hover:bg-ink/90"
            >
              Sample
            </button>

            {sample ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-grey">outcome</span>
                  <Chip tone="ok">{formatOutcome(sample)}</Chip>
                  <span className="font-mono text-xs text-grey">
                    (bits for Q₂Q₁Q₀ in the chosen settings)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-grey">parity XOR</span>
                  <Chip tone={expected !== null && parityVal === expected ? "ok" : "warn"}>
                    {parityVal}
                  </Chip>
                  {expected !== null ? (
                    <span className="font-mono text-[11px] text-grey">
                      expected {expected} for this setting
                    </span>
                  ) : null}
                </div>
                <p className="text-sm">{explanation}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-grey">Press Sample to draw one outcome.</p>
            )}
          </Panel>

          <Panel label="Why predetermined bits fail">
            <p className="text-sm">
              Suppose each qubit carried fixed answers vᵢ (for Z) and hᵢ (for H-then-Z) that would
              show up no matter what the others did. XOR the three odd-parity equations and you get
              v₂⊕v₁⊕v₀ = 1. The all-Z equation demands the same XOR equal 0. Local predetermined
              values cannot satisfy both.
            </p>
          </Panel>
        </>
      ) : (
        <Panel label="Paradox checklist">
          <p className="mb-3 font-mono text-[11px] text-grey">
            Hidden bits: v₀,v₁,v₂ (Z outcomes), h₀,h₁,h₂ (H-then-Z outcomes). XOR the three odd
            equations:
          </p>
          <ul className="space-y-2">
            {PARADOX_EQUATIONS.map((eq) => (
              <li
                key={eq.id}
                className={cn(
                  "border-2 border-ink px-3 py-2 font-mono text-sm",
                  eq.parity === 0 ? "bg-blue/10" : "bg-yellow/30",
                )}
              >
                <span className="text-[10px] uppercase text-grey">{eq.label}</span>
                <p>{eq.expr}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-2 border-ink bg-red p-3 text-white">
            <p className="font-mono text-[10px] uppercase opacity-80">XOR inconsistency</p>
            <p className="mt-1 font-mono text-sm">
              (h₂⊕h₁⊕v₀) ⊕ (h₂⊕v₁⊕h₀) ⊕ (v₂⊕h₁⊕h₀) = 1 ⊕ 1 ⊕ 1 = 1
            </p>
            <p className="mt-1 font-mono text-sm">
              LHS simplifies to v₂ ⊕ v₁ ⊕ v₀ — but all-Z says that equals 0. Contradiction.
            </p>
          </div>
        </Panel>
      )}
    </DemoShell>
  );
}
