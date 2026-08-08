"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AmplitudeBar,
  Chip,
  CircuitCaption,
  CircuitMini,
  DemoShell,
  KetDisplay,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import {
  FN_IDS,
  ONE_BIT_FUNCTIONS,
  type Bit,
  type FnId,
  truthTable,
  ufStep,
  stateToAmplitudes,
} from "./model";

const WIRES = [
  { id: "input", label: "|x⟩" },
  { id: "output", label: "|y⟩" },
];

const UF_COLUMNS = [
  [{ id: "uf", wires: ["input", "output"], label: "U_f", kind: "oracle" as const }],
];

/**
 * Step through U_f on 1+1 Qbits: |x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩.
 */
export function UfStepperDemo() {
  const [fnId, setFnId] = useState<FnId>("f0");
  const [input, setInput] = useState<Bit>(0);
  const [output, setOutput] = useState<Bit>(0);
  const [stepped, setStepped] = useState(false);

  const fn = ONE_BIT_FUNCTIONS[fnId];
  const step = useMemo(() => ufStep(fn, input, output), [fn, input, output]);
  const table = useMemo(() => truthTable(fn), [fn]);

  return (
    <DemoShell
      title="U_f black-box stepper"
      blurb="The oracle U_f is a reversible black box: it keeps the input register |x⟩ and XORs f(x) into the output register |y⟩. Pick f and a basis pair, then step once."
      accent="yellow"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 font-mono text-xs">
          <span className="text-grey">Function</span>
          <select
            className={controlSelect}
            value={fnId}
            onChange={(e) => {
              setFnId(e.target.value as FnId);
              setStepped(false);
            }}
          >
            {FN_IDS.map((id) => {
              const f = ONE_BIT_FUNCTIONS[id];
              return (
                <option key={id} value={id}>
                  {f.label} — {f.name}
                </option>
              );
            })}
          </select>
        </label>
        <label className="space-y-1 font-mono text-xs">
          <span className="text-grey">|x⟩</span>
          <select
            className={controlSelect}
            value={input}
            onChange={(e) => {
              setInput(Number(e.target.value) as Bit);
              setStepped(false);
            }}
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
          </select>
        </label>
        <label className="space-y-1 font-mono text-xs">
          <span className="text-grey">|y⟩</span>
          <select
            className={controlSelect}
            value={output}
            onChange={(e) => {
              setOutput(Number(e.target.value) as Bit);
              setStepped(false);
            }}
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          variant={stepped ? "outline" : "ink"}
          onClick={() => setStepped(true)}
        >
          Apply U_f
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setStepped(false)}
        >
          Reset
        </Button>
      </div>

      <Panel label="Circuit">
        <CircuitMini
          wires={WIRES}
          columns={UF_COLUMNS}
          activeColumn={stepped ? 0 : null}
        />
        <CircuitCaption>
          Two registers: input |x⟩ (unchanged) and output |y⟩ → |y ⊕ f(x)⟩.
        </CircuitCaption>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel label="Before U_f">
          <div className="flex flex-wrap items-center gap-2">
            <KetDisplay label={step.beforeLabel} tone="blue" />
            <Chip tone={fn.constant ? "ok" : "warn"}>
              {fn.constant ? "constant" : "balanced"}
            </Chip>
          </div>
          <div className="mt-3">
            <AmplitudeBar
              entries={stateToAmplitudes(step.before)}
              highlight={step.beforeLabel}
            />
          </div>
        </Panel>

        <Panel label={stepped ? "After U_f" : "After U_f (step to reveal)"}>
          {stepped ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <KetDisplay label={step.afterLabel} tone="red" />
                <span className="font-mono text-xs text-grey">
                  y → y ⊕ f(x) = {output} ⊕ {fn.f(input)} = {output ^ fn.f(input)}
                </span>
              </div>
              <div className="mt-3">
                <AmplitudeBar
                  entries={stateToAmplitudes(step.after)}
                  highlight={step.afterLabel}
                />
              </div>
            </>
          ) : (
            <p className="font-mono text-sm text-grey">
              Press Apply U_f to send |{input}
              {output}⟩ through the oracle (x stays put; y flips iff f(x)=1).
            </p>
          )}
        </Panel>
      </div>

      <Panel label={`Truth table — ${fn.label} (${fn.name})`}>
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="border-b-2 border-ink/20 text-left text-[10px] uppercase tracking-[0.12em] text-grey">
              <th className="pb-2 pr-4">x</th>
              <th className="pb-2">f(x)</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.x} className="border-b border-ink/10 last:border-b-0">
                <td className="py-1.5 pr-4 tabular-nums">{row.x}</td>
                <td className="py-1.5 tabular-nums">{row.fx}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </DemoShell>
  );
}
