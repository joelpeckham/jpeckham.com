"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Chip,
  CircuitCaption,
  CircuitMini,
  DemoShell,
  OutcomeBanner,
  Panel,
  controlSelect,
  type CircuitGate,
  type CircuitWire,
} from "@/components/interactive/quantum-shared";
import {
  bitsToString,
  bvSolve,
  classicalBvQueryCount,
  randomBitVec,
  type BitVec,
} from "./model";

const N_OPTIONS = [3, 4, 5] as const;

function buildBvCircuit(n: number): {
  wires: CircuitWire[];
  columns: CircuitGate[][];
} {
  const wires = Array.from({ length: n }, (_, i) => ({
    id: `q${i}`,
    label: `q${i}`,
  }));
  const allIds = wires.map((w) => w.id);
  const columns: CircuitGate[][] = [
    allIds.map((id) => ({ id: `h0-${id}`, wires: [id], label: "H" })),
    [
      {
        id: "oracle",
        wires: allIds,
        label: "U_f",
        kind: "oracle" as const,
      },
    ],
    allIds.map((id) => ({ id: `h1-${id}`, wires: [id], label: "H" })),
    allIds.map((id) => ({
      id: `m-${id}`,
      wires: [id],
      label: "M",
      kind: "measure" as const,
    })),
  ];
  return { wires, columns };
}

export function BvGuesserDemo() {
  const [n, setN] = useState<number>(4);
  const [secret, setSecret] = useState<BitVec>(() => randomBitVec(4));
  const [quantumResult, setQuantumResult] = useState<BitVec | null>(null);
  const [activeColumn, setActiveColumn] = useState<number | null>(null);

  const circuit = useMemo(() => buildBvCircuit(n), [n]);
  const classicalQueries = classicalBvQueryCount(n);
  const secretLabel = bitsToString(secret);

  const resetSecret = useCallback(() => {
    setSecret(randomBitVec(n));
    setQuantumResult(null);
    setActiveColumn(null);
  }, [n]);

  const handleNChange = (next: number) => {
    setN(next);
    setSecret(randomBitVec(next));
    setQuantumResult(null);
    setActiveColumn(null);
  };

  const runBv = () => {
    setActiveColumn(0);
    setQuantumResult(null);
    const steps = [0, 1, 2, 3];
    steps.forEach((col, i) => {
      window.setTimeout(() => {
        setActiveColumn(col);
        if (col === 3) {
          setQuantumResult(bvSolve(secret));
        }
      }, i * 450);
    });
    window.setTimeout(() => setActiveColumn(null), steps.length * 450 + 300);
  };

  const revealed = quantumResult != null;

  return (
    <DemoShell
      title="Bernstein–Vazirani secret guesser"
      blurb="Black-box oracle: f(x) = a · x (parity of selected bits of x). One quantum pass Hⁿ → U_f → Hⁿ reveals every bit of a; classically you need n basis queries."
      accent="blue"
    >
      <Panel label="Oracle definition">
        <p className="font-mono text-sm">
          f(x) = a · x = a₀x₀ ⊕ a₁x₁ ⊕ … ⊕ aₙ₋₁xₙ₋₁{" "}
          <span className="text-grey">(mod 2)</span>
        </p>
        <p className="mt-2 text-sm text-grey">
          Hidden string a picks which bits of x to XOR together. Each classical
          query returns that single parity bit; the quantum protocol reads all
          of a at once.
        </p>
      </Panel>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-mono text-xs text-grey">
          Register size n
          <select
            className={controlSelect}
            value={n}
            onChange={(e) => handleNChange(Number(e.target.value))}
          >
            {N_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v} qubits
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="outline" size="sm" onClick={resetSecret}>
          New secret
        </Button>
        <Button type="button" variant="blue" size="sm" onClick={runBv}>
          Run BV once
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip tone="ink">Secret {revealed ? secretLabel : "????"}</Chip>
        <Chip tone="warn">Classical cost: {classicalQueries} queries</Chip>
        <Chip tone="ok">Quantum cost: 1 query</Chip>
      </div>

      <Panel label="BV circuit">
        <CircuitMini
          wires={circuit.wires}
          columns={circuit.columns}
          activeColumn={activeColumn}
        />
        <CircuitCaption>
          Input wires only (output parked in |−⟩ off-screen): Hⁿ — U_f — Hⁿ —
          measure → read a.
        </CircuitCaption>
      </Panel>

      {quantumResult ? (
        <OutcomeBanner
          tone="ok"
          title={`a = ${bitsToString(quantumResult)}`}
          detail={`Measured all ${n} bits in one shot. Classically, querying e₀…eₙ₋₁ (standard basis strings) takes ${classicalQueries} separate oracle calls.`}
        />
      ) : (
        <OutcomeBanner
          tone="warn"
          title="Secret hidden"
          detail={`Run BV once to collapse the input register onto |a⟩ after the final Hadamard layer.`}
        />
      )}
    </DemoShell>
  );
}
