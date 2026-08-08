"use client";

import { useState } from "react";
import {
  Chip,
  DemoShell,
  Panel,
  TradeoffRow,
} from "@/components/interactive/quantum-shared";
import { cn } from "@/lib/utils";
import { CODE_FAMILIES, type CodeFamily } from "./model";

type ErrorCategory = keyof CodeFamily["catches"];

const ERROR_ROWS: { key: ErrorCategory; label: string; hint: string }[] = [
  { key: "bitFlip", label: "Bit flip (X)", hint: "Wrong computational-basis bit" },
  { key: "phaseFlip", label: "Phase flip (Z)", hint: "Sign flip on |1⟩" },
  { key: "combinedY", label: "Combined (Y)", hint: "Bit and phase together" },
  {
    key: "multiQubit",
    label: "Multi-qubit",
    hint: "Two or more simultaneous Paulis (distance-3 codes: not corrected)",
  },
];

export function CodeFamilyDemo() {
  const [familyId, setFamilyId] = useState(CODE_FAMILIES[2]!.id);
  const family = CODE_FAMILIES.find((f) => f.id === familyId) ?? CODE_FAMILIES[0]!;

  return (
    <DemoShell
      title="Which errors can this code catch?"
      blurb="Illustrative comparison of code families from Mermin §5.2–5.6. All four here have distance 3 for their listed error types — they correct one such error, not two."
      accent="red"
    >
      <Panel label="Code family">
        <div className="flex flex-wrap gap-2">
          {CODE_FAMILIES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFamilyId(f.id)}
              className={cn(
                "border-2 border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-[0.06em] transition-colors",
                familyId === f.id
                  ? "bg-ink text-paper"
                  : "bg-white text-ink hover:bg-paper",
              )}
              aria-pressed={familyId === f.id}
            >
              {f.n}-Qbit
            </button>
          ))}
        </div>
        <p className="mt-2 font-display text-xl tracking-tight">{family.name}</p>
        <p className="mt-1 text-sm text-grey">{family.notes}</p>
      </Panel>

      <Panel label="Error types">
        <ul className="space-y-2">
          {ERROR_ROWS.map((row) => {
            const catches = family.catches[row.key];
            return (
              <li
                key={row.key}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 py-2 last:border-b-0"
              >
                <div>
                  <p className="font-mono text-sm font-bold">{row.label}</p>
                  <p className="font-mono text-[10px] text-grey">{row.hint}</p>
                </div>
                <Chip tone={catches ? "ok" : "bad"}>
                  {catches ? "Catches (1-Qbit)" : "Not corrected"}
                </Chip>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel label="What it corrects">
        <div className="flex flex-wrap gap-1.5">
          {family.corrects.map((c) => (
            <Chip key={c} tone="ink">
              {c}
            </Chip>
          ))}
        </div>
      </Panel>

      <Panel label="Tradeoffs">
        <TradeoffRow label="Physical qubits" value={String(family.n)} />
        <TradeoffRow
          label="Code distance"
          value={`d = ${family.distance} → t = ${Math.floor((family.distance - 1) / 2)}`}
          tone="ink"
        />
        <TradeoffRow
          label="Single-Qbit Pauli errors"
          value={
            family.catches.bitFlip && family.catches.phaseFlip && family.catches.combinedY
              ? "Yes (all X, Y, Z)"
              : family.catches.bitFlip
                ? "X only"
                : "Partial / nested"
          }
          tone={
            family.catches.combinedY ? "ok" : family.catches.bitFlip ? "warn" : "bad"
          }
        />
        <TradeoffRow
          label="Fault-tolerant gates"
          value={family.faultTolerantGates ?? "—"}
          tone={family.id === "7-steane" ? "ok" : "ink"}
        />
      </Panel>
    </DemoShell>
  );
}
