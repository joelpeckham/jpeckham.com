"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AmplitudeBar,
  Chip,
  CircuitCaption,
  CircuitMini,
  DemoShell,
  KetDisplay,
  OutcomeBanner,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import { StepPlayer } from "@/components/interactive/mysql-shared/step-player";
import {
  DEUTSCH_STEPS,
  FN_IDS,
  ONE_BIT_FUNCTIONS,
  type FnId,
  deutschProtocol,
  stateToAmplitudes,
} from "./model";

const WIRES = [
  { id: "input", label: "|x⟩" },
  { id: "output", label: "|y⟩" },
];

const DEUTSCH_COLUMNS = [
  [
    { id: "x0", wires: ["input"], label: "X" },
    { id: "x1", wires: ["output"], label: "X" },
  ],
  [
    { id: "h0", wires: ["input"], label: "H" },
    { id: "h1", wires: ["output"], label: "H" },
  ],
  [{ id: "uf", wires: ["input", "output"], label: "U_f", kind: "oracle" as const }],
  [{ id: "h-in", wires: ["input"], label: "H" }],
  [{ id: "m", wires: ["input"], label: "M", kind: "measure" as const }],
];

function randomFnId(): FnId {
  return FN_IDS[Math.floor(Math.random() * FN_IDS.length)]!;
}

/**
 * Deutsch algorithm: one U_f run distinguishes constant vs balanced (Mermin §2.2).
 */
export function DeutschCircuitDemo() {
  const [mode, setMode] = useState<"pick" | "hidden">("pick");
  const [fnId, setFnId] = useState<FnId>("f0");
  const [secretId, setSecretId] = useState<FnId>(() => randomFnId());
  const [step, setStep] = useState(-1);

  const activeFnId = mode === "hidden" ? secretId : fnId;
  const result = useMemo(() => deutschProtocol(activeFnId), [activeFnId]);
  const fn = result.fn;

  const stateIndex = step < 0 ? 0 : Math.min(step, DEUTSCH_STEPS.length - 1);
  const amps = stateToAmplitudes(result.states[stateIndex]!);
  const caption = step < 0 ? "Reset — press Step or Play" : DEUTSCH_STEPS[stateIndex]!.label;
  const measured = step >= DEUTSCH_STEPS.length - 1;
  // steps: 0=init, 1=XX, 2=HH, … ; columns align to gates after init
  const activeColumn =
    step < 1 ? null : Math.min(step - 1, DEUTSCH_COLUMNS.length - 1);

  const reset = useCallback((nextMode: "pick" | "hidden" = mode) => {
    setStep(-1);
    if (nextMode === "hidden") setSecretId(randomFnId());
  }, [mode]);

  return (
    <DemoShell
      title="Deutsch circuit"
      blurb="Prep |0⟩|0⟩, apply X⊗X, H⊗H, U_f, then H on the input register. Mermin (2.22–2.23): input ends in |1⟩ if f(0)=f(1), else |0⟩."
      accent="blue"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "pick" ? "ink" : "outline"}
            onClick={() => {
              setMode("pick");
              reset("pick");
            }}
          >
            Pick f
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "hidden" ? "yellow" : "outline"}
            onClick={() => {
              setMode("hidden");
              reset("hidden");
            }}
          >
            Random hidden f
          </Button>
        </div>

        {mode === "pick" ? (
          <label className="space-y-1 font-mono text-xs">
            <span className="text-grey">Oracle f</span>
            <select
              className={controlSelect}
              value={fnId}
              onChange={(e) => {
                setFnId(e.target.value as FnId);
                setStep(-1);
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
        ) : (
          <Chip tone="warn">
            {measured ? "Oracle revealed below" : "Oracle hidden until measured"}
          </Chip>
        )}
      </div>

      <StepPlayer
        stepCount={DEUTSCH_STEPS.length}
        step={step}
        onStepChange={setStep}
        caption={caption}
        intervalMs={700}
      />

      <Panel label="Circuit">
        <CircuitMini
          wires={WIRES}
          columns={DEUTSCH_COLUMNS}
          activeColumn={activeColumn}
        />
        <CircuitCaption>
          Sandwich U_f with Hadamards; measure input only. Output carries no usable f(0) info.
        </CircuitCaption>
      </Panel>

      <Panel label="Two-Qbit amplitudes">
        <AmplitudeBar entries={amps} />
      </Panel>

      {measured ? (
        <OutcomeBanner
          tone={result.classification === "constant" ? "ok" : "warn"}
          title={
            result.measuredInput === 1
              ? "Measured input |1⟩ → constant"
              : "Measured input |0⟩ → balanced"
          }
          detail={
            mode === "hidden"
              ? `Oracle was ${fn.label} (${fn.name}): f(0)=${fn.f(0)}, f(1)=${fn.f(1)}. ${
                  result.classification === "constant"
                    ? "f(0)=f(1)."
                    : "f(0)≠f(1)."
                }`
              : result.classification === "constant"
                ? `${fn.label} has f(0)=f(1)=${fn.f(0)}.`
                : `${fn.label} has f(0)=${fn.f(0)}, f(1)=${fn.f(1)}.`
          }
        />
      ) : (
        <Panel label="After measurement (run to end)">
          <p className="font-mono text-sm text-grey">
            Step through the protocol. Input register collapses to |1⟩ (constant) or |0⟩
            (balanced).
          </p>
        </Panel>
      )}

      {measured && mode === "hidden" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-grey">Revealed oracle:</span>
          <KetDisplay label={`${fn.label} ${fn.name}`} tone="yellow" />
          <Chip tone={fn.constant ? "ok" : "warn"}>
            {fn.constant ? "constant" : "balanced"}
          </Chip>
        </div>
      ) : null}

      <Button type="button" size="sm" variant="outline" onClick={() => reset()}>
        New run
      </Button>
    </DemoShell>
  );
}
