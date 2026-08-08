"use client";

import { useMemo, useState } from "react";
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

type Message = "00" | "01" | "10" | "11";

const INV_SQRT2 = 1 / Math.sqrt(2);

const ENCODE_GATE: Record<Message, string> = {
  "00": "I",
  "01": "X",
  "10": "Z",
  "11": "ZX",
};

const ENCODED_AMPS: Record<Message, AmplitudeEntry[]> = {
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

const WIRES = [
  { id: "alice", label: "Alice" },
  { id: "bob", label: "Bob" },
] as const;

/** Dense coding: two classical bits via one shared e-bit and local gates. */
export function DenseCodingDemo() {
  const [message, setMessage] = useState<Message>("00");

  const gate = ENCODE_GATE[message];
  const encoded = ENCODED_AMPS[message];
  const decoded: AmplitudeEntry[] = useMemo(
    () => [
      { label: "00", re: message === "00" ? 1 : 0, im: 0 },
      { label: "01", re: message === "01" ? 1 : 0, im: 0 },
      { label: "10", re: message === "10" ? 1 : 0, im: 0 },
      { label: "11", re: message === "11" ? 1 : 0, im: 0 },
    ],
    [message],
  );

  const columns = useMemo(
    () => [
      [{ id: "enc", wires: ["alice"], label: gate }],
      [{ id: "cx", wires: ["alice", "bob"], label: "⊕" }],
      [{ id: "h", wires: ["alice"], label: "H" }],
      [
        { id: "ma", wires: ["alice"], label: "M", kind: "measure" as const },
        { id: "mb", wires: ["bob"], label: "M", kind: "measure" as const },
      ],
    ],
    [gate],
  );

  return (
    <DemoShell
      title="Dense coding"
      blurb="Dense coding sends two classical bits using one transmitted Qbit — possible only because Alice and Bob already share a Bell pair (an e-bit). Alice encodes locally; Bob decodes with CNOT + H."
      accent="red"
    >
      <Panel label="Classical message xy">
        <div className="flex flex-wrap gap-2">
          {(["00", "01", "10", "11"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMessage(m)}
              className={cn(
                "border-2 border-ink px-3 py-1 font-mono text-sm tabular-nums transition-colors",
                message === m ? "bg-red text-white" : "bg-white hover:bg-paper",
              )}
              aria-pressed={message === m}
            >
              {m}
            </button>
          ))}
        </div>
      </Panel>

      <Panel label="Protocol circuit">
        <CircuitMini wires={[...WIRES]} columns={columns} activeColumn={null} />
        <CircuitCaption>
          Shared |ψ₀₀⟩ → Alice encode ({gate}) → send Alice&apos;s Qbit → Bob CNOT + H → measure both
        </CircuitCaption>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel label="After Alice encodes (entangled)">
          <AmplitudeBar entries={encoded} />
        </Panel>
        <Panel label="After Bob decodes (pre-measure)">
          <AmplitudeBar entries={decoded} highlight={message} />
          <div className="mt-3">
            <Chip tone="ok">Bob reads: {message}</Chip>
          </div>
        </Panel>
      </div>

      <Panel label="Shared Bell resource">
        <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
          <KetDisplay label="ψ₀₀" tone="blue" size="sm" />
          <span>= 1/√2 (|00⟩ + |11⟩)</span>
        </div>
      </Panel>
    </DemoShell>
  );
}
