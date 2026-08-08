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
  formatDotEquation,
  randomBitVec,
  simonRank,
  simonSampleY,
  solveSimonFromYs,
  type BitVec,
} from "./model";

const N_OPTIONS = [3, 4] as const;

function buildSimonCircuit(n: number): {
  wires: CircuitWire[];
  columns: CircuitGate[][];
} {
  const inputWires = Array.from({ length: n }, (_, i) => ({
    id: `in${i}`,
    label: `x${i}`,
  }));
  const outWire = { id: "out", label: "f(x)" };
  const wires = [...inputWires, outWire];
  const inIds = inputWires.map((w) => w.id);

  const columns: CircuitGate[][] = [
    inIds.map((id) => ({ id: `h-${id}`, wires: [id], label: "H" })),
    [
      {
        id: "uf",
        wires: [...inIds, outWire.id],
        label: "U_f",
        kind: "oracle" as const,
      },
    ],
    [{ id: "meas-out", wires: [outWire.id], label: "M", kind: "measure" as const }],
    inIds.map((id) => ({ id: `h2-${id}`, wires: [id], label: "H" })),
    inIds.map((id) => ({
      id: `m-${id}`,
      wires: [id],
      label: "M",
      kind: "measure" as const,
    })),
  ];

  return { wires, columns };
}

export function SimonPeriodDemo() {
  const [n, setN] = useState<number>(3);
  const [period, setPeriod] = useState<BitVec>(() => randomBitVec(3, true));
  const [samples, setSamples] = useState<BitVec[]>([]);

  const circuit = useMemo(() => buildSimonCircuit(n), [n]);
  const rank = simonRank(samples);
  const needed = n - 1;
  const solved = rank >= needed ? solveSimonFromYs(samples, n) : null;
  const periodRevealed =
    solved != null && solved.join("") === period.join("");

  const reset = useCallback(() => {
    setPeriod(randomBitVec(n, true));
    setSamples([]);
  }, [n]);

  const handleNChange = (next: number) => {
    setN(next);
    setPeriod(randomBitVec(next, true));
    setSamples([]);
  };

  const sampleEquation = () => {
    const y = simonSampleY(period);
    const key = y.join("");
    setSamples((prev) => {
      if (prev.some((row) => row.join("") === key)) return prev;
      return [...prev, y];
    });
  };

  return (
    <DemoShell
      title="Simon period finder"
      blurb="Oracle f repeats every XOR-step a (period mod 2): f(x) = f(x ⊕ a). Each run yields one linear constraint y · a = 0 on the unknown bits of a; n − 1 independent constraints pin a down."
      accent="yellow"
    >
      <Panel label="Promise">
        <p className="font-mono text-sm">
          ∃ a ≠ 0 : f(x) = f(x ⊕ a) for all x
        </p>
        <p className="mt-2 text-sm text-grey">
          Period under XOR, not ordinary +. After Hⁿ, U_f, and measuring the
          output, the input is (|x⟩ + |x ⊕ a⟩)/√2. A final Hⁿ yields a random y
          whose 1-bits mark which bits of a must XOR to 0.
        </p>
      </Panel>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-mono text-xs text-grey">
          Input register n
          <select
            className={controlSelect}
            value={n}
            onChange={(e) => handleNChange(Number(e.target.value))}
          >
            {N_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v} bits
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          New period
        </Button>
        <Button type="button" variant="yellow" size="sm" onClick={sampleEquation}>
          Sample equation
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip tone="ink">
          Period a {periodRevealed ? bitsToString(period) : "????"}
        </Chip>
        <Chip tone={rank >= needed ? "ok" : "warn"}>
          Independent equations: {rank} / {needed}
        </Chip>
      </div>

      <Panel label="Simon circuit (schematic)">
        <CircuitMini wires={circuit.wires} columns={circuit.columns} />
        <CircuitCaption>
          Superposition → U_f → measure output → Hⁿ on input → measure y with
          y · a = 0.
        </CircuitCaption>
      </Panel>

      <Panel label="Collected constraints on a">
        {samples.length === 0 ? (
          <p className="text-sm text-grey">
            Press &ldquo;Sample equation&rdquo; to draw a parity constraint on
            a.
          </p>
        ) : (
          <ul className="space-y-2 font-mono text-sm">
            {samples.map((y, i) => (
              <li
                key={`${y.join("")}-${i}`}
                className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-2 last:border-b-0"
              >
                <span className="text-grey">#{i + 1}</span>
                <Chip tone="ink">y = {bitsToString(y)}</Chip>
                <span className="text-grey">{formatDotEquation(y)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {periodRevealed ? (
        <OutcomeBanner
          tone="ok"
          title={`a = ${bitsToString(period)}`}
          detail={`${rank} independent constraints; the only nonzero bit string still allowed is a.`}
        />
      ) : rank >= needed && solved ? (
        <OutcomeBanner
          tone="warn"
          title={`Candidate a = ${bitsToString(solved)}`}
          detail="Enough independent constraints — compare to the hidden period."
        />
      ) : (
        <OutcomeBanner
          tone="warn"
          title={`Need ${needed - rank} more independent constraint${needed - rank === 1 ? "" : "s"}`}
          detail={`Each sample is one equation on a's bits. Rank ${needed} (mod-2) leaves only {0, a}.`}
        />
      )}
    </DemoShell>
  );
}
