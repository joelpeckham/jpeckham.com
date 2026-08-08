"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Chip,
  DemoShell,
  KetDisplay,
  Panel,
} from "@/components/interactive/quantum-shared";

type Basis = "0" | "1";

const VECTORS: Record<Basis, [number, number]> = {
  "0": [1, 0],
  "1": [0, 1],
};

function inner(a: [number, number], b: [number, number]): number {
  return a[0] * b[0] + a[1] * b[1];
}

/** Pick |0⟩ or |1⟩ and read off column components + orthogonality. */
export function BasisPickerDemo() {
  const [chosen, setChosen] = useState<Basis>("0");
  const [showOther, setShowOther] = useState(false);

  const vec = VECTORS[chosen];
  const other: Basis = chosen === "0" ? "1" : "0";
  const otherVec = VECTORS[other];
  const selfInner = inner(vec, vec);
  const crossInner = inner(VECTORS["0"], VECTORS["1"]);

  return (
    <DemoShell
      title="Pick a basis vector"
      blurb="|0⟩ and |1⟩ are the computational-basis axes: each is a unit column, and they overlap at zero. Click one to see its components."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        {(["0", "1"] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setChosen(b)}
            className={cn(
              "border-2 border-ink transition-colors",
              chosen === b ? "ring-2 ring-ink ring-offset-2" : "hover:bg-paper",
            )}
            aria-pressed={chosen === b}
          >
            <KetDisplay label={b} tone={chosen === b ? "blue" : "ink"} />
          </button>
        ))}
      </div>

      <Panel label="Column vector">
        <div className="flex flex-wrap items-center gap-3">
          <KetDisplay label={chosen} tone="blue" />
          <span className="font-mono text-sm tabular-nums">
            = [{vec[0]}, {vec[1]}]<sup>T</sup>
          </span>
        </div>
      </Panel>

      <Panel label="Inner products">
        <div className="space-y-1 font-mono text-sm tabular-nums">
          <p>
            ⟨{chosen}|{chosen}⟩ = {selfInner.toFixed(0)}
          </p>
          {showOther ? (
            <>
              <p>
                ⟨{other}|{other}⟩ = {inner(otherVec, otherVec).toFixed(0)}
              </p>
              <p>
                ⟨0|1⟩ = {crossInner.toFixed(0)}
              </p>
            </>
          ) : (
            <p className="text-grey">
              ⟨0|1⟩ = 0. Toggle below to compare both basis kets.
            </p>
          )}
        </div>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowOther((v) => !v)}
          className={cn(
            "border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
            showOther ? "bg-ink text-paper" : "bg-white text-ink hover:bg-paper",
          )}
        >
          {showOther ? "hide other basis" : "also show other"}
        </button>
        <Chip tone="ok">unit + zero overlap</Chip>
      </div>
    </DemoShell>
  );
}
