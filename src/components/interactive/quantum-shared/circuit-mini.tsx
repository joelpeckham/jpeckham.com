"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CircuitWire = {
  id: string;
  label: string;
};

export type CircuitGate = {
  id: string;
  /** Wire ids this gate spans (control first for controlled gates). */
  wires: string[];
  label: string;
  kind?: "gate" | "measure" | "oracle";
};

/** Tiny abstract circuit: wires as rows, gates as boxes on a column grid. */
export function CircuitMini({
  wires,
  columns,
  activeColumn,
}: {
  wires: CircuitWire[];
  /** Each column is a list of gates in that time step. */
  columns: CircuitGate[][];
  activeColumn?: number | null;
}) {
  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid min-w-full gap-x-3 gap-y-3"
        style={{
          gridTemplateColumns: `auto repeat(${Math.max(columns.length, 1)}, minmax(3.5rem, 1fr))`,
        }}
      >
        {wires.map((wire, row) => (
          <WireRow
            key={wire.id}
            wire={wire}
            row={row}
            columns={columns}
            activeColumn={activeColumn}
          />
        ))}
      </div>
    </div>
  );
}

function WireRow({
  wire,
  row,
  columns,
  activeColumn,
}: {
  wire: CircuitWire;
  row: number;
  columns: CircuitGate[][];
  activeColumn?: number | null;
}) {
  return (
    <>
      <span className="flex items-center font-mono text-xs text-grey">
        {wire.label}
      </span>
      {columns.map((col, colIndex) => {
        const gate = col.find((g) => g.wires.includes(wire.id));
        const isActive = activeColumn === colIndex;
        return (
          <div
            key={`${wire.id}-${colIndex}`}
            className={cn(
              "relative flex h-10 items-center justify-center border-b-2 border-ink/30",
              isActive && "bg-yellow/40",
            )}
          >
            {gate ? (
              <GateBox gate={gate} isControl={gate.wires[0] === wire.id && gate.wires.length > 1} />
            ) : (
              <span className="block h-0.5 w-full bg-ink/40" aria-hidden />
            )}
            {row === 0 ? null : null}
          </div>
        );
      })}
    </>
  );
}

function GateBox({
  gate,
  isControl,
}: {
  gate: CircuitGate;
  isControl: boolean;
}) {
  if (isControl && gate.wires.length > 1) {
    return (
      <span
        className="inline-flex size-3 rounded-full border-2 border-ink bg-ink"
        title={`control ${gate.label}`}
        aria-label={`control for ${gate.label}`}
      />
    );
  }

  const kind = gate.kind ?? "gate";
  return (
    <span
      className={cn(
        "inline-flex min-w-[2.25rem] items-center justify-center border-2 border-ink px-1.5 py-1 font-mono text-[10px] uppercase tracking-wide",
        kind === "measure" && "bg-red text-white",
        kind === "oracle" && "bg-yellow text-ink",
        kind === "gate" && "bg-white text-ink",
      )}
    >
      {gate.label}
    </span>
  );
}

export function CircuitCaption({ children }: { children: ReactNode }) {
  return <p className="mt-2 font-mono text-[10px] text-grey">{children}</p>;
}
