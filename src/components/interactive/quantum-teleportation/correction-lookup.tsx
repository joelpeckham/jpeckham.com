"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AmplitudeBar,
  Chip,
  DemoShell,
  KetDisplay,
  Panel,
  type AmplitudeEntry,
} from "@/components/interactive/quantum-shared";
import {
  CORRECTION,
  MEASURE_KEYS,
  type MeasureKey,
  bobBeforeCorrection,
} from "./model";

const CASES = MEASURE_KEYS.map((key) => ({
  key,
  ...CORRECTION[key],
}));

function toEntries(a0: number, a1: number): AmplitudeEntry[] {
  return [
    { label: "0", re: a0, im: 0 },
    { label: "1", re: a1, im: 0 },
  ];
}

export function CorrectionLookup() {
  const [bit0, setBit0] = useState<0 | 1>(0);
  const [bit1, setBit1] = useState<0 | 1>(0);
  const [alpha, setAlpha] = useState(0.6);

  const beta = Math.sqrt(Math.max(0, 1 - alpha * alpha));
  const key = `${bit0}${bit1}` as MeasureKey;
  const row = CORRECTION[key];

  const bobEntries = useMemo(
    () => toEntries(...bobBeforeCorrection(alpha, beta, key)),
    [alpha, beta, key],
  );

  const originalEntries = useMemo(
    () => toEntries(alpha, beta),
    [alpha, beta],
  );

  return (
    <DemoShell
      title="Pauli correction lookup"
      blurb="Alice’s two measurement bits name which Pauli twist Bob got. Toggle the bits and compare Bob’s pre-correction amplitudes to α|0⟩ + β|1⟩."
      accent="yellow"
    >
      <Panel label="Alice’s measurement bits">
        <div className="flex flex-wrap items-center gap-4">
          {(
            [
              ["|ψ⟩ wire", bit0, setBit0],
              ["A_ent wire", bit1, setBit1],
            ] as const
          ).map(([id, val, set]) => {
            return (
              <div key={id} className="flex items-center gap-2">
                <span className="font-mono text-xs text-grey">{id}</span>
                {([0, 1] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set(b)}
                    className={cn(
                      "border-2 border-ink px-3 py-1.5 font-mono text-sm tabular-nums",
                      val === b ? "bg-ink text-paper" : "bg-white hover:bg-paper",
                    )}
                    aria-pressed={val === b}
                  >
                    {b}
                  </button>
                ))}
              </div>
            );
          })}
          <Chip tone="ok">{key}</Chip>
        </div>
        <p className="mt-2 font-mono text-[11px] text-grey">
          Bit order is |ψ⟩ then A_ent — same as Mermin’s |xy⟩ after cNOT+H.
        </p>
      </Panel>

      <Panel label="Parameters">
        <label className="flex items-center gap-3 font-mono text-xs">
          <span className="w-8 text-grey">α</span>
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.01}
            value={alpha}
            onChange={(e) => setAlpha(Number(e.target.value))}
            className="flex-1 accent-ink"
          />
          <span className="w-28 tabular-nums text-grey">
            β ≈ {beta.toFixed(3)}
          </span>
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <KetDisplay label="ψ" tone="blue" />
          <span className="font-mono text-xs">= α|0⟩ + β|1⟩</span>
        </div>
      </Panel>

      <Panel label="Bob applies">
        <div className="flex flex-wrap items-center gap-3">
          <span className="border-2 border-ink bg-red px-3 py-2 font-mono text-lg text-white">
            {row.gate}
          </span>
          <Chip tone={row.gate === "I" ? "ok" : "warn"}>{row.note}</Chip>
        </div>
      </Panel>

      <Panel label="Bob’s Qbit before correction">
        <p className="mb-2 font-mono text-sm">{row.bobKet}</p>
        <AmplitudeBar entries={bobEntries} />
        <p className="mt-2 font-mono text-[11px] text-grey">
          After {row.gate}, amplitudes match the original |ψ⟩ below.
        </p>
      </Panel>

      <Panel label="Original |ψ⟩ (target)">
        <AmplitudeBar entries={originalEntries} />
      </Panel>

      <div className="grid gap-2 sm:grid-cols-2">
        {CASES.map((c) => {
          const active = c.key === key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setBit0(Number(c.key[0]) as 0 | 1);
                setBit1(Number(c.key[1]) as 0 | 1);
              }}
              className={cn(
                "border-2 border-ink p-2 text-left transition-colors",
                active ? "bg-yellow/40" : "bg-white hover:bg-paper",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={active ? "ok" : "ink"}>{c.key}</Chip>
                <span className="font-mono text-xs font-bold">{c.gate}</span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-grey">{c.bobKet}</p>
            </button>
          );
        })}
      </div>
    </DemoShell>
  );
}
