"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Chip,
  DemoShell,
  KetDisplay,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";

const WIDTHS = [2, 3, 4] as const;
type Width = (typeof WIDTHS)[number];

function KetSub({ n, w }: { n: number; w: number }) {
  return (
    <span className="inline-flex items-baseline border-2 border-ink bg-white px-2 py-1 font-mono text-sm tabular-nums">
      |{n}⟩<sub className="ml-0.5 text-[10px] text-grey">{w}</sub>
    </span>
  );
}

function padBits(n: number, w: number): string {
  return n.toString(2).padStart(w, "0");
}

export function IntegerLabelDemo() {
  const [n, setN] = useState(3);
  const [w, setW] = useState<Width>(3);

  const maxValid = (1 << w) - 1;
  const invalid = n > maxValid;
  const bits = invalid ? null : padBits(n, w);
  const rawBinary = n.toString(2);

  const widthComparison = WIDTHS.map((width) => ({
    width,
    bits: n <= (1 << width) - 1 ? padBits(n, width) : null,
    valid: n <= (1 << width) - 1,
  }));

  const ambiguous =
    widthComparison.filter((row) => row.valid).length > 1 &&
    new Set(widthComparison.filter((row) => row.valid).map((row) => row.bits))
      .size > 1;

  return (
    <DemoShell
      title="|3⟩ means what?"
      blurb="The subscript counts Cbits. Same integer, different width → different binary ket."
      accent="red"
    >
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Integer n
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setN((v) => Math.max(0, v - 1))}
              className="border-2 border-ink bg-white px-2 py-1 font-mono text-sm hover:bg-paper"
              aria-label="Decrease n"
            >
              −
            </button>
            <input
              type="range"
              min={0}
              max={7}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className="w-32 accent-ink"
              aria-label="Integer n"
            />
            <button
              type="button"
              onClick={() => setN((v) => Math.min(7, v + 1))}
              className="border-2 border-ink bg-white px-2 py-1 font-mono text-sm hover:bg-paper"
              aria-label="Increase n"
            >
              +
            </button>
            <span className="min-w-[1.5rem] font-mono text-sm font-bold tabular-nums">
              {n}
            </span>
          </div>
        </label>

        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Width w
          <select
            value={w}
            onChange={(e) => setW(Number(e.target.value) as Width)}
            className={controlSelect}
            aria-label="Bit width"
          >
            {WIDTHS.map((width) => (
              <option key={width} value={width}>
                w = {width}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Panel label="Current mapping">
        {invalid ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <KetSub n={n} w={w} />
              <span className="font-mono text-sm text-grey">— no valid ket</span>
            </div>
            <p className="font-mono text-xs text-grey">
              n = {n} needs {rawBinary.length} bits ({rawBinary}₂) but w = {w}{" "}
              allows only 0…{maxValid}.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <KetSub n={n} w={w} />
            <span className="font-mono text-sm text-grey">=</span>
            <KetDisplay label={bits!} tone="blue" />
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          {invalid ? (
            <Chip tone="bad">
              {`n ≥ 2^${w} — invalid for ${w} Cbits`}
            </Chip>
          ) : (
            <Chip tone="ok">valid for w = {w}</Chip>
          )}
          {ambiguous ? (
            <Chip tone="warn">
              same n, different padding across widths
            </Chip>
          ) : null}
        </div>
      </Panel>

      <Panel label="Examples for n = 3">
        <div className="space-y-2 font-mono text-xs">
          {[
            { w: 2, bits: "11" },
            { w: 3, bits: "011" },
            { w: 4, bits: "0011" },
          ].map(({ w: exampleW, bits: exampleBits }) => (
            <div key={exampleW} className="flex flex-wrap items-center gap-2">
              <KetSub n={3} w={exampleW} />
              <span className="text-grey">=</span>
              <KetDisplay label={exampleBits} size="sm" tone="blue" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel label="All widths for your n">
        <div className="space-y-1.5">
          {widthComparison.map((row) => (
            <div
              key={row.width}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 py-1 font-mono text-xs last:border-b-0",
                row.width === w && "bg-yellow/30 -mx-1 px-1",
              )}
            >
              <span className="text-grey">w = {row.width}</span>
              <span className="inline-flex items-center gap-2">
                <KetSub n={n} w={row.width} />
                {row.valid ? (
                  <>
                    <span className="text-grey">=</span>
                    <KetDisplay label={row.bits!} size="sm" tone="blue" />
                  </>
                ) : (
                  <Chip tone="bad">overflow</Chip>
                )}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </DemoShell>
  );
}
