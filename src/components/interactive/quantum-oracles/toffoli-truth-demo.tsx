"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Chip,
  CircuitCaption,
  CircuitMini,
  DemoShell,
  OutcomeBanner,
  Panel,
  type CircuitGate,
  type CircuitWire,
} from "@/components/interactive/quantum-shared";
import { toffoli } from "./model";

const INPUTS: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 1],
  [0, 1, 0],
  [0, 1, 1],
  [1, 0, 0],
  [1, 0, 1],
  [1, 1, 0],
  [1, 1, 1],
];

const WIRES: CircuitWire[] = [
  { id: "c1", label: "c₁" },
  { id: "c2", label: "c₂" },
  { id: "t", label: "|t⟩" },
];

const TOFFOLI_COLUMN: CircuitGate[] = [
  { id: "toffoli", wires: ["c1", "c2", "t"], label: "T" },
];

function BitToggle({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex flex-col items-center gap-1 border-2 border-ink bg-white px-4 py-2 font-mono text-sm transition-colors hover:bg-yellow/30"
    >
      <span className="text-[10px] uppercase tracking-wider text-grey">
        {label}
      </span>
      <span className="text-2xl tabular-nums">{value}</span>
    </button>
  );
}

export function ToffoliTruthDemo() {
  const [c1, setC1] = useState(0);
  const [c2, setC2] = useState(0);
  const [target, setTarget] = useState(0);

  const out = toffoli(c1, c2, target);
  const andBit = c1 & c2;

  const table = useMemo(
    () =>
      INPUTS.map(([a, b, t]) => ({
        c1: a,
        c2: b,
        in: t,
        out: toffoli(a, b, t),
      })),
    [],
  );

  const activeRow = table.find(
    (row) => row.c1 === c1 && row.c2 === c2 && row.in === target,
  );

  return (
    <DemoShell
      title="Toffoli truth table"
      blurb="Toffoli (ccNOT): flip the target iff both controls are 1 — reversible AND when the target starts at 0. Classically a 3-bit primitive; quantumly synthesizable from cNOT plus 1-qubit unitaries."
      accent="red"
    >
      <Panel label="Action on |0⟩ ancilla">
        <p className="font-mono text-sm">
          T|x⟩|y⟩|0⟩ = |x⟩|y⟩|xy⟩ — target holds AND(x, y); controls unchanged.
        </p>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel label="Interactive inputs">
          <div className="flex flex-wrap gap-3">
            <BitToggle label="Control c₁" value={c1} onToggle={() => setC1((v) => 1 - v)} />
            <BitToggle label="Control c₂" value={c2} onToggle={() => setC2((v) => 1 - v)} />
            <BitToggle label="Target t" value={target} onToggle={() => setTarget((v) => 1 - v)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone={andBit ? "ok" : "ink"}>c₁ ∧ c₂ = {andBit}</Chip>
            <Chip tone="warn">t → {out}</Chip>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setTarget(out)}
          >
            Apply Toffoli
          </Button>
        </Panel>

        <Panel label="Circuit">
          <CircuitMini wires={WIRES} columns={[TOFFOLI_COLUMN]} />
          <CircuitCaption>
            ccNOT / Toffoli — controls on c₁, c₂; NOT on target when both are 1.
            Mermin builds the quantum version from cNOT + 1-Qbit unitaries
            (caption only).
          </CircuitCaption>
        </Panel>
      </div>

      <Panel label="Truth table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse font-mono text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left text-[10px] uppercase tracking-wider text-grey">
                <th className="py-2 pr-4">c₁</th>
                <th className="py-2 pr-4">c₂</th>
                <th className="py-2 pr-4">t_in</th>
                <th className="py-2">t_out</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => {
                const active =
                  row.c1 === c1 && row.c2 === c2 && row.in === target;
                return (
                  <tr
                    key={`${row.c1}${row.c2}${row.in}`}
                    className={
                      active
                        ? "bg-yellow/40 border-b border-ink/15"
                        : "border-b border-ink/15"
                    }
                  >
                    <td className="py-1.5 pr-4 tabular-nums">{row.c1}</td>
                    <td className="py-1.5 pr-4 tabular-nums">{row.c2}</td>
                    <td className="py-1.5 pr-4 tabular-nums">{row.in}</td>
                    <td className="py-1.5 tabular-nums font-bold">{row.out}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <OutcomeBanner
        tone={andBit ? "ok" : "warn"}
        title={
          andBit
            ? `Both controls on — target flips (${target} → ${out})`
            : "At least one control off — target unchanged"
        }
        detail={
          activeRow
            ? `Row (${c1}, ${c2}, ${target}) → ${activeRow.out}. Toffoli is reversible AND when the target starts in |0⟩.`
            : "Toggle inputs or apply the gate to walk the table."
        }
      />
    </DemoShell>
  );
}
