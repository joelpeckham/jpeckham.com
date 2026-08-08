"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Chip,
  DemoShell,
  KetDisplay,
  Panel,
} from "@/components/interactive/quantum-shared";

type Bit = 0 | 1;

/** Left → right: MSB (Cbit 2) … LSB (Cbit 0). */
const BIT_LABELS = ["b2", "b1", "b0"] as const;

function KetSub({ n, w }: { n: number; w: number }) {
  return (
    <span className="inline-flex items-baseline border-2 border-ink bg-white px-2 py-1 font-mono text-sm tabular-nums">
      |{n}⟩<sub className="ml-0.5 text-[10px] text-grey">{w}</sub>
    </span>
  );
}

export function ProductStateDemo() {
  const [bits, setBits] = useState<[Bit, Bit, Bit]>([0, 0, 0]);

  const [b0, b1, b2] = bits;
  const compact = `${b2}${b1}${b0}`;
  const n = (b2 << 2) | (b1 << 1) | b0;

  function toggle(index: 0 | 1 | 2) {
    setBits((prev) => {
      const next = [...prev] as [Bit, Bit, Bit];
      next[index] = prev[index] === 0 ? 1 : 0;
      return next;
    });
  }

  return (
    <DemoShell
      title="Build a product state"
      blurb="Three Cbits, product state: |b₂⟩|b₁⟩|b₀⟩ or |b₂b₁b₀⟩. Rightmost is Cbit 0 (2⁰)."
      accent="yellow"
    >
      <Panel label="Pick each bit">
        <div className="flex flex-wrap gap-4">
          {BIT_LABELS.map((label, i) => {
            const index = (2 - i) as 0 | 1 | 2;
            const value = bits[index];
            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
                  {label}
                </span>
                <div className="flex gap-1">
                  {([0, 1] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setBits((prev) => {
                          const next = [...prev] as [Bit, Bit, Bit];
                          next[index] = v;
                          return next;
                        })
                      }
                      className={cn(
                        "flex size-9 items-center justify-center border-2 border-ink font-mono text-sm font-bold tabular-nums",
                        value === v
                          ? "bg-ink text-paper"
                          : "bg-white text-ink hover:bg-paper",
                      )}
                      aria-pressed={value === v}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-grey underline hover:text-ink"
                >
                  flip
                </button>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel label="Product form">
        <div className="flex flex-wrap items-center gap-2">
          <KetDisplay label={String(b2)} />
          <KetDisplay label={String(b1)} />
          <KetDisplay label={String(b0)} />
          <span className="font-mono text-sm text-grey">=</span>
          <KetDisplay label={compact} tone="blue" />
        </div>
      </Panel>

      <Panel label="Integer label">
        <div className="flex flex-wrap items-center gap-2">
          <KetSub n={n} w={3} />
          <span className="font-mono text-sm text-grey">
            binary {compact}₂ = {n}
          </span>
        </div>
        <p className="mt-2 font-mono text-[11px] text-grey">
          Three Cbits → width 3 → values 0…7. Rightmost Cbit is Cbit 0 (2⁰).
        </p>
      </Panel>

      <Chip tone="ok">product state — fully factorable</Chip>
    </DemoShell>
  );
}
