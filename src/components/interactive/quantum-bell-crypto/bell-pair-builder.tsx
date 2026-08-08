"use client";

import { useMemo, useState } from "react";
import { AutoLoop } from "@/components/interactive/mysql-shared";
import {
  AmplitudeBar,
  type AmplitudeEntry,
  Chip,
  CircuitCaption,
  CircuitMini,
  DemoShell,
  KetDisplay,
  Panel,
} from "@/components/interactive/quantum-shared";
import { cn } from "@/lib/utils";

type Bit = 0 | 1;
type BellKey = `${Bit}${Bit}`;

const INV_SQRT2 = 1 / Math.sqrt(2);

const BELL_AMPS: Record<BellKey, AmplitudeEntry[]> = {
  "00": [
    { label: "00", re: INV_SQRT2, im: 0 },
    { label: "01", re: 0, im: 0 },
    { label: "10", re: 0, im: 0 },
    { label: "11", re: INV_SQRT2, im: 0 },
  ],
  "01": [
    { label: "00", re: 0, im: 0 },
    { label: "01", re: INV_SQRT2, im: 0 },
    { label: "10", re: INV_SQRT2, im: 0 },
    { label: "11", re: 0, im: 0 },
  ],
  "10": [
    { label: "00", re: INV_SQRT2, im: 0 },
    { label: "01", re: 0, im: 0 },
    { label: "10", re: 0, im: 0 },
    { label: "11", re: -INV_SQRT2, im: 0 },
  ],
  "11": [
    { label: "00", re: 0, im: 0 },
    { label: "01", re: INV_SQRT2, im: 0 },
    { label: "10", re: -INV_SQRT2, im: 0 },
    { label: "11", re: 0, im: 0 },
  ],
};

const BELL_FORMULA: Record<BellKey, string> = {
  "00": "1/√2 (|00⟩ + |11⟩)",
  "01": "1/√2 (|01⟩ + |10⟩)",
  "10": "1/√2 (|00⟩ − |11⟩)",
  "11": "1/√2 (|01⟩ − |10⟩)",
};

const WIRES = [
  { id: "q1", label: "q₁" },
  { id: "q0", label: "q₀" },
] as const;

const CIRCUIT_COLUMNS = [
  [{ id: "h", wires: ["q1"], label: "H" }],
  [{ id: "cx", wires: ["q1", "q0"], label: "⊕" }],
];

function fmtGatePower(base: string, exp: Bit): string {
  return exp === 0 ? "" : exp === 1 ? base : `${base}²`;
}

/** Build a Bell pair from computational input |xy⟩ via H₁ then CNOT₁₀. */
export function BellPairBuilder() {
  const [x, setX] = useState<Bit>(0);
  const [y, setY] = useState<Bit>(0);
  const key: BellKey = `${x}${y}`;

  const amps = BELL_AMPS[key];
  const rewrite = useMemo(() => {
    const zPart = fmtGatePower("Z₁", x);
    const xPart = fmtGatePower("X₀", y);
    const ops = [zPart, xPart].filter(Boolean).join(" ");
    return ops.length > 0 ? `${ops} |ψ₀₀⟩` : "|ψ₀₀⟩";
  }, [x, y]);

  return (
    <DemoShell
      title="Bell-pair builder"
      blurb="A Bell state is one of four maximally entangled two-Qbit states that form an orthonormal basis. Entanglement means the joint state cannot be written as a product |a⟩|b⟩. Pick |xy⟩, apply H₁ then CNOT₁₀, and get |ψ_xy⟩."
      accent="blue"
    >
      <Panel label="Input |xy⟩">
        <div className="flex flex-wrap items-center gap-4">
          <BitToggle label="x (q₁)" value={x} onChange={setX} />
          <BitToggle label="y (q₀)" value={y} onChange={setY} />
          <KetDisplay label={key} tone="yellow" />
        </div>
      </Panel>

      <Panel label="Circuit C₁₀ H₁">
        <AutoLoop durationMs={1800} frameCount={3} endHoldMs={700}>
          {({ frame }) => (
            <>
              <CircuitMini
                wires={[...WIRES]}
                columns={CIRCUIT_COLUMNS}
                activeColumn={frame < 2 ? frame : null}
              />
              <CircuitCaption>
                {frame === 0
                  ? "Step 1 — superpose q₁ with H"
                  : frame === 1
                    ? "Step 2 — entangle with CNOT"
                    : "Done — Bell state |ψ_xy⟩"}
              </CircuitCaption>
            </>
          )}
        </AutoLoop>
      </Panel>

      <Panel label="Output |ψ_xy⟩">
        <div className="flex flex-wrap items-center gap-3">
          <KetDisplay label={`ψ_${key}`} tone="blue" />
          <span className="font-mono text-sm tabular-nums">{BELL_FORMULA[key]}</span>
        </div>
        <p className="mt-2 font-mono text-xs text-grey">
          Same state as {rewrite}
        </p>
        <div className="mt-3">
          <AmplitudeBar entries={amps} />
        </div>
        <div className="mt-3">
          <Chip tone="ok">max entanglement — two Qbits, one shared state</Chip>
        </div>
      </Panel>
    </DemoShell>
  );
}

function BitToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Bit;
  onChange: (b: Bit) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-grey">
        {label}
      </span>
      <div className="flex gap-1">
        {([0, 1] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChange(b)}
            className={cn(
              "border-2 border-ink px-3 py-1 font-mono text-sm tabular-nums transition-colors",
              value === b ? "bg-blue text-white" : "bg-white hover:bg-paper",
            )}
            aria-pressed={value === b}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}
