"use client";

import { useState } from "react";
import {
  Chip,
  DemoShell,
  KetDisplay,
  OutcomeBanner,
  Panel,
} from "@/components/interactive/quantum-shared";
import { cn } from "@/lib/utils";

type Commitment = "YES" | "NO";
type Basis = "Z" | "H";
type Bit = 0 | 1;

function randomBit(): Bit {
  return Math.random() < 0.5 ? 0 : 1;
}

function basisFor(commit: Commitment): Basis {
  return commit === "YES" ? "Z" : "H";
}

function basisLabel(b: Basis): string {
  return b === "Z" ? "computational (Z)" : "Hadamard (H)";
}

/** Intuition for quantum bit commitment — and why entanglement breaks it. */
export function BitCommitmentSketch() {
  const [commit, setCommit] = useState<Commitment>("YES");
  const [cheat, setCheat] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [bit, setBit] = useState<Bit>(() => randomBit());

  const basis = basisFor(commit);

  const outcomeTitle = (() => {
    if (revealed && cheat) return "Alice opens — basis chosen at reveal";
    if (revealed) return "Opened commitment";
    if (cheat) return "Commitment looks honest";
    return "Measurement hides basis";
  })();

  const outcomeDetail = (() => {
    if (revealed && cheat) {
      return `Alice declares ${commit} / bit ${bit}. With entanglement she kept Bell halves and measured in ${basisLabel(basis)} at reveal — she could have opened the other commitment instead by switching basis.`;
    }
    if (revealed) {
      return `Alice opens: ${commit} / bit ${bit}. Bob verifies the random bit matches the declared ${basisLabel(basis)} encoding.`;
    }
    if (cheat) {
      return "Bob holds one half of a Bell pair with no local state of its own. Alice can later measure her halves in Z or H and open as either YES or NO.";
    }
    return "Single-Qbit statistics in a random basis do not reveal whether Alice used Z or H encoding.";
  })();

  const outcomeTone = revealed ? (cheat ? "warn" : "ok") : cheat ? "warn" : "ok";

  return (
    <DemoShell
      title="Bit commitment sketch"
      blurb="Bit commitment means proving you decided a bit now without saying which yet. Alice commits YES (Z basis) or NO (H basis) with a random bit — unless she keeps entanglement in reserve."
      accent="ink"
    >
      <Panel label="Alice commits">
        <div className="flex flex-wrap gap-2">
          {(["YES", "NO"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCommit(c);
                if (!cheat) {
                  setBit(randomBit());
                  setRevealed(false);
                }
              }}
              className={cn(
                "border-2 border-ink px-3 py-1 font-mono text-xs uppercase tracking-[0.08em]",
                commit === c ? "bg-ink text-paper" : "bg-white hover:bg-paper",
              )}
              aria-pressed={commit === c}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-xs text-grey">
          {cheat
            ? "With entanglement, Alice can switch YES/NO even after sending — she picks Z or H measurement at reveal."
            : commit === "YES"
              ? "Random bit encoded in |0⟩, |1⟩ — computational basis."
              : "Random bit encoded in |+⟩, |−⟩ — Hadamard basis."}
        </p>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setCheat((v) => !v);
            setBit(randomBit());
            setRevealed(false);
          }}
          className={cn(
            "border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
            cheat ? "bg-red text-white" : "bg-white hover:bg-paper",
          )}
          aria-pressed={cheat}
        >
          Alice cheats with entanglement
        </button>
        <button
          type="button"
          onClick={() => {
            setRevealed((v) => !v);
            if (!revealed && cheat) setBit(randomBit());
          }}
          className="border-2 border-ink bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] hover:bg-paper"
        >
          {revealed ? "hide reveal" : "reveal commitment"}
        </button>
      </div>

      <Panel label="State sent to Bob">
        {cheat ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
              <KetDisplay label="ψ₀₀" tone="blue" size="sm" />
              <span>= 1/√2 (|00⟩ + |11⟩)</span>
              <Chip tone="bad">entangled half</Chip>
            </div>
            <p className="font-mono text-xs text-grey">
              Bob holds one Qbit of |ψ₀₀⟩ — no definite local |0⟩, |1⟩, |+⟩, or |−⟩ of its own.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
            <Chip tone={basis === "Z" ? "ok" : "warn"}>{basisLabel(basis)}</Chip>
            <KetDisplay
              label={bit === 0 ? (basis === "Z" ? "0" : "+") : basis === "Z" ? "1" : "−"}
              tone="blue"
              size="sm"
            />
          </div>
        )}
      </Panel>

      <OutcomeBanner tone={outcomeTone} title={outcomeTitle} detail={outcomeDetail} />
    </DemoShell>
  );
}
