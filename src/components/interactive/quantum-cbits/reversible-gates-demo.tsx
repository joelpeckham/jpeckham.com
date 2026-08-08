"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Chip,
  CircuitMini,
  CircuitCaption,
  DemoShell,
  KetDisplay,
  Panel,
} from "@/components/interactive/quantum-shared";

type GateMode = "not" | "cnot";

type NotRow = { input: "0" | "1"; output: "0" | "1" };
type CnotRow = { input: string; output: string; x: "0" | "1"; y: "0" | "1" };

const NOT_ROWS: NotRow[] = [
  { input: "0", output: "1" },
  { input: "1", output: "0" },
];

const CNOT_ROWS: CnotRow[] = [
  { input: "00", output: "00", x: "0", y: "0" },
  { input: "01", output: "01", x: "0", y: "1" },
  { input: "10", output: "11", x: "1", y: "0" },
  { input: "11", output: "10", x: "1", y: "1" },
];

function xor(a: "0" | "1", b: "0" | "1"): "0" | "1" {
  return a === b ? "0" : "1";
}

export function ReversibleGatesDemo() {
  const [mode, setMode] = useState<GateMode>("not");
  const [selectedRow, setSelectedRow] = useState(0);
  const [applyCount, setApplyCount] = useState<0 | 1 | 2>(0);

  const rowCount = mode === "not" ? NOT_ROWS.length : CNOT_ROWS.length;
  const safeRow = selectedRow % rowCount;

  const row = mode === "not" ? NOT_ROWS[safeRow] : CNOT_ROWS[safeRow];
  const current =
    applyCount % 2 === 1 ? row.output : row.input;
  const cnotRow = mode === "cnot" ? (row as CnotRow) : null;

  function switchMode(next: GateMode) {
    setMode(next);
    setSelectedRow(0);
    setApplyCount(0);
  }

  function cycleRow() {
    setSelectedRow((r) => (r + 1) % rowCount);
    setApplyCount(0);
  }

  function applyGate() {
    setApplyCount((c) => (c >= 2 ? 0 : ((c + 1) as 0 | 1 | 2)));
  }

  const chipLabel =
    applyCount === 0
      ? "at input"
      : applyCount === 1
        ? "once applied"
        : "twice applied — back to start";

  return (
    <DemoShell
      title="NOT and cNOT truth tables"
      blurb="NOT flips a bit. cNOT writes XOR (⊕) onto the target. Apply twice → back where you started."
      accent="blue"
    >
      <div className="flex flex-wrap gap-2">
        {(["not", "cnot"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => switchMode(g)}
            className={cn(
              "border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
              mode === g ? "bg-ink text-paper" : "bg-white text-ink hover:bg-paper",
            )}
          >
            {g === "not" ? "NOT (X)" : "cNOT"}
          </button>
        ))}
      </div>

      <Panel label="Circuit">
        {mode === "not" ? (
          <>
            <CircuitMini
              wires={[{ id: "x", label: "|x⟩" }]}
              columns={[[{ id: "x-gate", wires: ["x"], label: "X" }]]}
              activeColumn={applyCount >= 1 ? 0 : null}
            />
            <CircuitCaption>|0⟩ ↔ |1⟩ on one wire</CircuitCaption>
          </>
        ) : (
          <>
            <CircuitMini
              wires={[
                { id: "x", label: "|x⟩ control" },
                { id: "y", label: "|y⟩ target" },
              ]}
              columns={[
                [
                  { id: "cnot", wires: ["x", "y"], label: "X" },
                ],
              ]}
              activeColumn={applyCount >= 1 ? 0 : null}
            />
            <CircuitCaption>C₁₀ |x⟩|y⟩ = |x⟩|y ⊕ x⟩</CircuitCaption>
          </>
        )}
      </Panel>

      <Panel label="Truth table">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b-2 border-ink text-left text-grey">
              <th className="py-1 pr-3">input</th>
              <th className="py-1">output</th>
            </tr>
          </thead>
          <tbody>
            {(mode === "not" ? NOT_ROWS : CNOT_ROWS).map((tableRow, i) => {
              const selected = i === safeRow;
              return (
                <tr
                  key={tableRow.input}
                  className={cn(
                    "cursor-pointer border-b border-ink/15 transition-colors",
                    selected && "bg-yellow/40",
                  )}
                  onClick={() => {
                    setSelectedRow(i);
                    setApplyCount(0);
                  }}
                >
                  <td className="py-1.5 pr-3">
                    {mode === "not" ? (
                      <KetDisplay label={tableRow.input} size="sm" />
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <KetDisplay label={(tableRow as CnotRow).x} size="sm" />
                        <KetDisplay label={(tableRow as CnotRow).y} size="sm" />
                        <span className="text-grey">=</span>
                        <KetDisplay label={tableRow.input} size="sm" tone="blue" />
                      </span>
                    )}
                  </td>
                  <td className="py-1.5">
                    {mode === "not" ? (
                      <KetDisplay label={tableRow.output} size="sm" tone="blue" />
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <KetDisplay
                          label={(tableRow as CnotRow).x}
                          size="sm"
                        />
                        <KetDisplay
                          label={xor((tableRow as CnotRow).y, (tableRow as CnotRow).x)}
                          size="sm"
                          tone="blue"
                        />
                        <span className="text-grey">=</span>
                        <KetDisplay label={tableRow.output} size="sm" tone="blue" />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          type="button"
          onClick={cycleRow}
          className="mt-2 border-2 border-ink bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] hover:bg-paper"
        >
          Next row
        </button>
      </Panel>

      <Panel label="Selected row">
        <div className="flex flex-wrap items-center gap-2">
          {mode === "not" ? (
            <>
              <KetDisplay label={row.input} />
              <span className="font-mono text-sm text-grey">→</span>
              <KetDisplay
                label={current}
                tone={applyCount >= 1 ? "blue" : "ink"}
              />
            </>
          ) : (
            <>
              <KetDisplay label={cnotRow!.x} />
              <KetDisplay label={cnotRow!.y} />
              <span className="font-mono text-sm text-grey">→</span>
              <KetDisplay
                label={current.slice(0, 1)}
                tone={applyCount >= 1 ? "blue" : "ink"}
              />
              <KetDisplay
                label={current.slice(1)}
                tone={applyCount >= 1 ? "blue" : "ink"}
              />
            </>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyGate}
            className={cn(
              "border-2 border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em]",
              applyCount >= 1 ? "bg-yellow text-ink" : "bg-ink text-paper hover:bg-ink/90",
            )}
          >
            {applyCount === 0
              ? "Apply gate"
              : applyCount === 1
                ? "Apply again"
                : "Reset"}
          </button>
          <Chip tone={applyCount >= 1 ? "ok" : "ink"}>{chipLabel}</Chip>
        </div>

        {applyCount === 1 ? (
          <p className="mt-2 font-mono text-[11px] text-grey">
            After one apply:{" "}
            {mode === "not" ? (
              <KetDisplay label={row.output} size="sm" />
            ) : (
              <>
                <KetDisplay label={row.output.slice(0, 1)} size="sm" />
                <KetDisplay label={row.output.slice(1)} size="sm" />
              </>
            )}
            . A second apply returns to{" "}
            {mode === "not" ? (
              <KetDisplay label={row.input} size="sm" />
            ) : (
              <>
                <KetDisplay label={cnotRow!.x} size="sm" />
                <KetDisplay label={cnotRow!.y} size="sm" />
              </>
            )}
            .
          </p>
        ) : applyCount === 2 ? (
          <p className="mt-2 font-mono text-[11px] text-grey">
            Applied twice — same as start. Reversible.
          </p>
        ) : null}
      </Panel>
    </DemoShell>
  );
}
