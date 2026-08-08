"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AmplitudeBar,
  DemoShell,
  KetDisplay,
  Panel,
  type AmplitudeEntry,
} from "@/components/interactive/quantum-shared";
import { formatAmp, SignedAmplitudes } from "./signed-amps";

const INV_SQRT2 = 1 / Math.SQRT2;

type GateId = "I" | "X" | "Z" | "H";

type Complex = { re: number; im: number };

const GATES: Record<
  GateId,
  { matrix: [Complex, Complex][]; blurb: string }
> = {
  I: {
    matrix: [
      [{ re: 1, im: 0 }, { re: 0, im: 0 }],
      [{ re: 0, im: 0 }, { re: 1, im: 0 }],
    ],
    blurb: "Identity — leaves the state unchanged.",
  },
  X: {
    matrix: [
      [{ re: 0, im: 0 }, { re: 1, im: 0 }],
      [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    ],
    blurb: "Pauli-X — flips |0⟩ ↔ |1⟩.",
  },
  Z: {
    matrix: [
      [{ re: 1, im: 0 }, { re: 0, im: 0 }],
      [{ re: 0, im: 0 }, { re: -1, im: 0 }],
    ],
    blurb: "Pauli-Z — adds a minus sign to |1⟩.",
  },
  H: {
    matrix: [
      [{ re: INV_SQRT2, im: 0 }, { re: INV_SQRT2, im: 0 }],
      [{ re: INV_SQRT2, im: 0 }, { re: -INV_SQRT2, im: 0 }],
    ],
    blurb: "Hadamard — builds equal superposition from a basis state.",
  },
};

function mul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function applyGateToState(
  gate: [Complex, Complex][],
  state: [Complex, Complex],
): [Complex, Complex] {
  const out: Complex[] = [{ re: 0, im: 0 }, { re: 0, im: 0 }];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      out[row] = add(out[row], mul(gate[row][col], state[col]));
    }
  }
  return [out[0], out[1]];
}

function applyGate(
  gate: [Complex, Complex][],
  state: [Complex, Complex],
): AmplitudeEntry[] {
  const out = applyGateToState(gate, state);
  return [
    { label: "0", re: out[0].re, im: out[0].im },
    { label: "1", re: out[1].re, im: out[1].im },
  ];
}

function basisComplex(bit: 0 | 1): [Complex, Complex] {
  return [
    { re: bit === 0 ? 1 : 0, im: 0 },
    { re: bit === 1 ? 1 : 0, im: 0 },
  ];
}

function toEntries(state: [Complex, Complex]): AmplitudeEntry[] {
  return [
    { label: "0", re: state[0].re, im: state[0].im },
    { label: "1", re: state[1].re, im: state[1].im },
  ];
}

function MatrixDisplay({ gate }: { gate: GateId }) {
  const m = GATES[gate].matrix;
  return (
    <div className="inline-grid grid-cols-2 gap-1 font-mono text-xs">
      {m.flat().map((cell, i) => (
        <span
          key={`${gate}-${i}`}
          className="flex min-w-[3.5rem] items-center justify-center border border-ink/40 bg-paper px-2 py-1 tabular-nums"
        >
          {formatAmp(cell.re, cell.im)}
        </span>
      ))}
    </div>
  );
}

/** Apply single-qubit gates to |0⟩ or |1⟩ and read off amplitudes. */
export function GatePickerDemo() {
  const [input, setInput] = useState<0 | 1>(0);
  const [selected, setSelected] = useState<GateId>("H");
  const [chain, setChain] = useState<GateId[]>([]);
  const [state, setState] = useState<[Complex, Complex]>(() => basisComplex(0));

  const result = useMemo(() => toEntries(state), [state]);

  function resetToBasis(bit: 0 | 1) {
    setChain([]);
    setState(basisComplex(bit));
  }

  function applySelected() {
    setState((s) => applyGateToState(GATES[selected].matrix, s));
    setChain((c) => [...c, selected]);
  }

  const panelLabel = chain.length ? `${chain.join("")}|${input}⟩` : "Amplitudes";

  return (
    <DemoShell
      title="One-Qbit gate picker"
      blurb="Pick a starting ket, chain gates with Apply (each multiplies onto the current state). Bars show probabilities |α|²; the signed α line shows phase and sign."
      accent="blue"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-grey">Start</span>
        <Button
          type="button"
          size="sm"
          variant={input === 0 ? "ink" : "outline"}
          onClick={() => {
            setInput(0);
            resetToBasis(0);
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
            resetToBasis(1);
          }}
        >
          |1⟩
        </Button>
        <KetDisplay label={String(input)} size="sm" tone="blue" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["X", "Z", "H", "I"] as const).map((gate) => (
          <Button
            key={gate}
            type="button"
            size="sm"
            variant={selected === gate ? "blue" : "outline"}
            onClick={() => setSelected(gate)}
          >
            {gate}
          </Button>
        ))}
        <Button type="button" size="sm" variant="ink" onClick={applySelected}>
          Apply {selected}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => resetToBasis(input)}
        >
          Reset
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <Panel label={`${selected} matrix`}>
          <MatrixDisplay gate={selected} />
        </Panel>
        <Panel label={panelLabel}>
          <AmplitudeBar entries={result} />
          <SignedAmplitudes entries={result} />
          <p className="mt-2 font-mono text-[10px] text-grey">
            {GATES[selected].blurb}
          </p>
        </Panel>
      </div>

      {chain.length ? (
        <p
          className={cn(
            "font-mono text-xs",
            chain.includes("X") && "text-ink",
          )}
        >
          {chain.join("")}|{input}⟩ — chain gates to explore identities like
          HXH = Z. Bars hide sign; read α below.
        </p>
      ) : null}
    </DemoShell>
  );
}

export { applyGate, applyGateToState, GATES, type GateId, type Complex };
