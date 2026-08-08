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
  OutcomeBanner,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import {
  FN_IDS,
  ONE_BIT_FUNCTIONS,
  type FnId,
  garbageScenario,
  threeQubitAmplitudes,
} from "./model";

const WIRES = [
  { id: "input", label: "|x⟩" },
  { id: "output", label: "|y⟩" },
  { id: "workspace", label: "|w⟩" },
];

const V_COLUMNS = [
  [{ id: "v", wires: ["input", "workspace"], label: "V_f", kind: "oracle" as const }],
];

const CM_COLUMNS = [
  [{ id: "cm", wires: ["workspace", "output"], label: "C_m" }],
];

const VDAG_COLUMNS = [
  [{ id: "vdag", wires: ["input", "workspace"], label: "V†", kind: "oracle" as const }],
];

/**
 * Why W_f = V† C_m V must uncompute workspace Qbits (Mermin §2.3).
 */
export function GarbageCleanupDemo() {
  const [fnId, setFnId] = useState<FnId>("f1");
  const [cleaned, setCleaned] = useState(false);

  const scenario = useMemo(() => garbageScenario(fnId), [fnId]);
  const fn = scenario.fn;
  const state = cleaned ? scenario.clean : scenario.dirty;
  const amps = threeQubitAmplitudes(state);

  return (
    <DemoShell
      title="Garbage cleanup"
      blurb="Start from (|0⟩+|1⟩)/√2 on the input. V_f writes f(x) into workspace; C_m XORs that into the output. Skip V† and the registers share entanglement with junk. Apply V† and workspace returns to |0⟩ so the net map is U_f."
      accent="red"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 font-mono text-xs">
          <span className="text-grey">Function</span>
          <select
            className={controlSelect}
            value={fnId}
            onChange={(e) => {
              setFnId(e.target.value as FnId);
              setCleaned(false);
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={!cleaned ? "red" : "outline"}
            onClick={() => setCleaned(false)}
          >
            Dirty (skip V†)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={cleaned ? "blue" : "outline"}
            onClick={() => setCleaned(true)}
          >
            Cleaned (apply V†)
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel label="V_f — compute into workspace">
          <CircuitMini wires={WIRES} columns={V_COLUMNS} activeColumn={0} />
          <CircuitCaption>
            |x⟩|w⟩ → |x⟩|w ⊕ f(x)⟩ (output untouched).
          </CircuitCaption>
        </Panel>
        <Panel label="C_m — XOR into output">
          <CircuitMini wires={WIRES} columns={CM_COLUMNS} activeColumn={0} />
          <CircuitCaption>y → y ⊕ w, copying f(x) onto the output wire.</CircuitCaption>
        </Panel>
        <Panel label="V† — uncompute workspace">
          <CircuitMini
            wires={WIRES}
            columns={VDAG_COLUMNS}
            activeColumn={cleaned ? 0 : null}
          />
          <CircuitCaption>Same as V_f here (self-inverse); restores |w⟩=|0⟩.</CircuitCaption>
        </Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel label="Input + output">
          {!cleaned && scenario.dirtyEntangled ? (
            <p className="font-mono text-sm text-red">
              Entangled with workspace — no state of their own
            </p>
          ) : (
            <p className="font-mono text-sm">
              Joint state |Ψ⟩<sub>io</sub> exists
              {fn.constant ? " (constant f: scratch ignored x)" : ""}
            </p>
          )}
        </Panel>
        <Panel label="Workspace">
          {cleaned && scenario.workspaceClean ? (
            <KetDisplay label="0" tone="yellow" />
          ) : !cleaned && scenario.dirtyEntangled ? (
            <p className="font-mono text-sm text-red">Junk / entangled</p>
          ) : (
            <KetDisplay
              label={fn.f(0) === fn.f(1) ? String(fn.f(0)) : "f(x)"}
              tone="yellow"
            />
          )}
        </Panel>
        <Panel label="Kind">
          <Chip tone={fn.constant ? "ok" : "warn"}>
            {fn.constant ? "constant" : "balanced"}
          </Chip>
        </Panel>
      </div>

      {!cleaned ? (
        scenario.dirtyEntangled ? (
          <OutcomeBanner
            tone="bad"
            title="Registers entangled with workspace"
            detail="After V_f and C_m without V†, input/output share amplitudes with scratch. You cannot treat the pair as U_f acting alone — Deutsch's analysis needs the cleaned product form."
          />
        ) : (
          <OutcomeBanner
            tone="warn"
            title="Constant f: scratch did not depend on x"
            detail="Here f(0)=f(1), so workspace holds the same bit for every x and the registers still factor. Real subroutines usually leave x-dependent intermediates anyway — that is the garbage V† is for."
          />
        )
      ) : (
        <OutcomeBanner
          tone={scenario.cleanSeparable && scenario.workspaceClean ? "ok" : "bad"}
          title={
            scenario.cleanSeparable && scenario.workspaceClean
              ? "Product form restored"
              : "Cleanup failed"
          }
          detail={
            scenario.cleanSeparable && scenario.workspaceClean
              ? `Workspace is |0⟩, disentangled. Net map on the registers is U_f: |x⟩|y⟩ → |x⟩|y ⊕ f(x)⟩ with f = ${fn.label}.`
              : "V† did not restore a clean U_f ⊗ |0⟩_w state."
          }
        />
      )}

      <Panel label={`Full state amplitudes — ${cleaned ? "after V†" : "after V_f C_m"}`}>
        <AmplitudeBar entries={amps} />
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Chip tone="ink">W_f = V† C_m V_f</Chip>
        <Chip tone={cleaned ? "ok" : "bad"}>
          {cleaned ? "V† applied" : "V† skipped"}
        </Chip>
        <span className="font-mono text-xs text-grey">
          Input prep H|0⟩; {fn.label}: f(0)={fn.f(0)}, f(1)={fn.f(1)}
        </span>
      </div>
    </DemoShell>
  );
}
