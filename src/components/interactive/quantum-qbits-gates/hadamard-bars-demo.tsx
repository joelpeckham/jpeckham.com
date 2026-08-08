"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AmplitudeBar,
  Chip,
  DemoShell,
  KetDisplay,
  Panel,
  type AmplitudeEntry,
} from "@/components/interactive/quantum-shared";
import { SignedAmplitudes } from "./signed-amps";

const INV_SQRT2 = 1 / Math.SQRT2;

function basisState(bit: 0 | 1): AmplitudeEntry[] {
  return [
    { label: "0", re: bit === 0 ? 1 : 0, im: 0 },
    { label: "1", re: bit === 1 ? 1 : 0, im: 0 },
  ];
}

function hadamardState(bit: 0 | 1): AmplitudeEntry[] {
  if (bit === 0) {
    return [
      { label: "0", re: INV_SQRT2, im: 0 },
      { label: "1", re: INV_SQRT2, im: 0 },
    ];
  }
  return [
    { label: "0", re: INV_SQRT2, im: 0 },
    { label: "1", re: -INV_SQRT2, im: 0 },
  ];
}

/** Hadamard spreads a computational-basis ket into equal superposition. */
export function HadamardBarsDemo() {
  const [input, setInput] = useState<0 | 1>(0);
  const [applied, setApplied] = useState(false);

  const before = useMemo(() => basisState(input), [input]);
  const after = useMemo(() => hadamardState(input), [input]);

  return (
    <DemoShell
      title="Hadamard spreads a bit"
      blurb="H spreads a basis state |0⟩ or |1⟩ into balanced superposition. Bars show |α|²; the signed α line reveals the minus on |1⟩ after H|1⟩."
      accent="blue"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-grey">Input</span>
        <Button
          type="button"
          size="sm"
          variant={input === 0 ? "ink" : "outline"}
          onClick={() => {
            setInput(0);
            setApplied(false);
          }}
        >
          |0⟩
        </Button>
        <Button
          type="button"
          size="sm"
          variant={input === 1 ? "ink" : "outline"}
          onClick={() => {
            setInput(1);
            setApplied(false);
          }}
        >
          |1⟩
        </Button>
        <Button type="button" size="sm" variant="blue" onClick={() => setApplied(true)}>
          Apply H
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="ink">H</Chip>
        <KetDisplay label={`H|${input}⟩`} size="sm" />
        <span className="font-mono text-xs text-grey">=</span>
        {input === 0 ? (
          <span className="font-mono text-sm">
            (1/√2)(<KetDisplay label="0" size="sm" tone="blue" /> +{" "}
            <KetDisplay label="1" size="sm" tone="blue" />)
          </span>
        ) : (
          <span className="font-mono text-sm">
            (1/√2)(<KetDisplay label="0" size="sm" tone="blue" /> −{" "}
            <KetDisplay label="1" size="sm" tone="blue" />)
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel label="Before H">
          <AmplitudeBar entries={before} />
          <SignedAmplitudes entries={before} />
        </Panel>
        <Panel label={applied ? "After H" : "After H (click Apply H)"}>
          <AmplitudeBar entries={applied ? after : before} />
          {applied ? <SignedAmplitudes entries={after} /> : null}
        </Panel>
      </div>

      {applied ? (
        <p className="border-2 border-ink bg-yellow/30 px-3 py-2 font-mono text-xs text-ink">
          Both outcomes show 50% probability. A negative real part on |1⟩ (from H|1⟩)
          does not change |amplitude|² — only the relative phase matters for
          interference later.
        </p>
      ) : null}
    </DemoShell>
  );
}
