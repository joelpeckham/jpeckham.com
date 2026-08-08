"use client";

import { useMemo, useState } from "react";
import {
  AmplitudeBar,
  Chip,
  CircuitCaption,
  CircuitMini,
  DemoShell,
  OutcomeBanner,
  Panel,
  controlSelect,
  type AmplitudeEntry,
} from "@/components/interactive/quantum-shared";
import { cn } from "@/lib/utils";
import { modPow } from "./math";

const PRESETS = [
  { a: 2, N: 15, label: "2ˣ mod 15" },
  { a: 7, N: 15, label: "7ˣ mod 15" },
  { a: 3, N: 35, label: "3ˣ mod 35" },
] as const;

const INPUT_BITS = 5;
const INPUT_LEN = 2 ** INPUT_BITS;

export function ModExpAmplitudeDemo() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [f0, setF0] = useState<number | null>(null);

  const { a, N } = PRESETS[presetIdx];

  const values = useMemo(
    () => Array.from({ length: INPUT_LEN }, (_, x) => modPow(a, x, N)),
    [a, N],
  );

  const periodicXs = useMemo(() => {
    if (f0 == null) return [];
    return values
      .map((v, x) => (v === f0 ? x : -1))
      .filter((x) => x >= 0);
  }, [f0, values]);

  const period = periodicXs.length >= 2 ? periodicXs[1] - periodicXs[0] : null;

  const ampEntries: AmplitudeEntry[] = useMemo(() => {
    if (f0 == null) {
      const amp = 1 / Math.sqrt(INPUT_LEN);
      return Array.from({ length: Math.min(INPUT_LEN, 16) }, (_, x) => ({
        label: String(x),
        re: amp,
        im: 0,
      }));
    }
    const amp = periodicXs.length > 0 ? 1 / Math.sqrt(periodicXs.length) : 0;
    return periodicXs.map((x) => ({ label: String(x), re: amp, im: 0 }));
  }, [f0, periodicXs]);

  return (
    <DemoShell
      title="Modular exponentiation collapse"
      blurb="Plain English: one coherent modular-exp writes every f(x). Measuring the output keeps only the inputs that share that value — a toothcomb spaced by the unknown period r."
      accent="yellow"
    >
      <Panel label="Parameters">
        <div className="flex flex-wrap items-center gap-3">
          <label className="font-mono text-xs">
            <span className="text-grey">function</span>
            <select
              className={cn(controlSelect, "ml-2")}
              value={presetIdx}
              onChange={(e) => {
                setPresetIdx(Number(e.target.value));
                setF0(null);
              }}
            >
              {PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="border-2 border-ink bg-white px-3 py-1 font-mono text-xs uppercase tracking-wide hover:bg-paper"
            onClick={() => setF0(null)}
          >
            Reset superposition
          </button>
        </div>
      </Panel>

      <Panel label={`f(x) = ${a}^x mod ${N} for x = 0…${INPUT_LEN - 1}`}>
        <div className="flex flex-wrap gap-1">
          {values.map((v, x) => {
            const hit = f0 != null && v === f0;
            const dimmed = f0 != null && !hit;
            return (
              <button
                key={x}
                type="button"
                title={`x=${x}, f=${v}`}
                onClick={() => setF0(v)}
                className={cn(
                  "min-w-[2.25rem] border-2 border-ink px-1 py-1 font-mono text-[10px] tabular-nums transition-colors",
                  hit && "bg-blue text-white",
                  dimmed && "opacity-30",
                  f0 == null && "bg-white hover:bg-yellow/30",
                )}
              >
                <span className="block text-[8px] text-grey">{x}</span>
                {v}
              </button>
            );
          })}
        </div>
        <p className="mt-2 font-mono text-[11px] text-grey">
          Click a value to measure output f₀ and collapse the input register.
        </p>
      </Panel>

      {f0 != null ? (
        <OutcomeBanner
          tone="ok"
          title={`Measured f₀ = ${f0}`}
          detail={`${periodicXs.length} input values share this output${period != null ? ` · period ≈ ${period}` : ""}.`}
        />
      ) : null}

      <Panel label="Input register amplitudes">
        <AmplitudeBar entries={ampEntries} />
        {f0 != null && periodicXs.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="ok">|x⟩ with equal weight</Chip>
            <Chip tone="ink">x ∈ {periodicXs.join(", ")}</Chip>
          </div>
        ) : (
          <p className="mt-2 font-mono text-[11px] text-grey">
            Uniform over all {INPUT_LEN} basis states before measurement.
          </p>
        )}
      </Panel>

      <Panel label="Circuit sketch">
        <CircuitMini
          wires={[
            { id: "in", label: "|x⟩" },
            { id: "out", label: "|f(x)⟩" },
          ]}
          columns={[
            [{ id: "h", wires: ["in"], label: "H⊗n" }],
            [{ id: "uf", wires: ["in", "out"], label: "Uf", kind: "oracle" }],
            [{ id: "m", wires: ["out"], label: "M", kind: "measure" }],
          ]}
          activeColumn={f0 != null ? 2 : 1}
        />
        <CircuitCaption>
          Hadamard → modular-exp oracle → measure output wire.
        </CircuitCaption>
      </Panel>
    </DemoShell>
  );
}
