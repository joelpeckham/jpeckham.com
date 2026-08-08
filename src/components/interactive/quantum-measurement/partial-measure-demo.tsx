"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AmplitudeBar,
  Chip,
  DemoShell,
  KetDisplay,
  OutcomeBanner,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import {
  BASIS_2,
  TWO_QUBIT_PRESETS,
  partialMeasure,
  pct,
  prob,
  type Complex,
} from "./model";

function presetKind(id: string): "entangled" | "product" {
  return id === "bell" ? "entangled" : "product";
}

export function PartialMeasureDemo() {
  const [presetId, setPresetId] = useState(TWO_QUBIT_PRESETS[0]!.id);
  const [amplitudes, setAmplitudes] = useState<Complex[]>(
    () => TWO_QUBIT_PRESETS[0]!.amplitudes.map((a) => ({ ...a })),
  );
  const [qubitIndex, setQubitIndex] = useState<0 | 1>(0);
  const [lastResult, setLastResult] = useState<ReturnType<
    typeof partialMeasure
  > | null>(null);

  const kind = presetKind(presetId);
  const displayAmplitudes = lastResult?.collapsed4 ?? amplitudes;

  const preProbs = useMemo(() => {
    const state = amplitudes;
    const p0 = [0, 1, 2, 3]
      .filter((i) => {
        const bit = qubitIndex === 0 ? (i >> 1) & 1 : i & 1;
        return bit === 0;
      })
      .reduce((s, i) => s + prob(state[i]!), 0);
    return { p0, p1: 1 - p0 };
  }, [amplitudes, qubitIndex]);

  const entries = useMemo(
    () =>
      BASIS_2.map((label, i) => ({
        label,
        re: displayAmplitudes[i]?.re ?? 0,
        im: displayAmplitudes[i]?.im ?? 0,
      })),
    [displayAmplitudes],
  );

  const remainingEntries = useMemo(() => {
    if (!lastResult) return null;
    return [
      { label: "0", re: lastResult.remaining2[0]!.re, im: lastResult.remaining2[0]!.im },
      { label: "1", re: lastResult.remaining2[1]!.re, im: lastResult.remaining2[1]!.im },
    ];
  }, [lastResult]);

  function applyPreset(id: string) {
    const preset = TWO_QUBIT_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setAmplitudes(preset.amplitudes.map((a) => ({ ...a })));
    setLastResult(null);
  }

  function measure() {
    const result = partialMeasure(amplitudes, qubitIndex);
    setLastResult(result);
  }

  function reset() {
    applyPreset(presetId);
  }

  const otherQubit = qubitIndex === 0 ? 1 : 0;

  return (
    <DemoShell
      title="Partial measurement"
      blurb="Measure one qubit. Product states leave the other unchanged; entangled states pick which leftover state you inherit."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        {TWO_QUBIT_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant={presetId === preset.id ? "ink" : "outline"}
            onClick={() => applyPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <p className="font-mono text-[10px] text-grey">
        {kind === "entangled"
          ? "Entangled (Bell-like): leftover state depends on the bit you roll."
          : "Product state: leftover qubit keeps its own state no matter the outcome."}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="font-mono text-xs">
          <span className="mb-1 block text-[10px] uppercase tracking-[0.1em] text-grey">
            Measure qubit
          </span>
          <select
            value={qubitIndex}
            onChange={(e) => {
              setQubitIndex(Number(e.target.value) as 0 | 1);
              setLastResult(null);
            }}
            className={controlSelect}
          >
            <option value={0}>Qubit 0 (left)</option>
            <option value={1}>Qubit 1 (right)</option>
          </select>
        </label>
        <Button type="button" size="sm" variant="ink" onClick={measure}>
          Measure
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Reset
        </Button>
        {!lastResult ? (
          <span className="font-mono text-[10px] text-grey">
            Pre-measure odds: P(0)={pct(preProbs.p0)}, P(1)={pct(preProbs.p1)}
          </span>
        ) : null}
      </div>

      <Panel label="Two-qubit amplitudes">
        <AmplitudeBar
          entries={entries}
          highlight={
            lastResult
              ? lastResult.survivingLabels.length === 1
                ? lastResult.survivingLabels[0]!
                : null
              : null
          }
        />
        {lastResult ? (
          <p className="mt-2 font-mono text-[10px] text-grey">
            Collapsed to qubit {lastResult.qubitIndex} ={" "}
            <KetDisplay label={String(lastResult.outcome)} size="sm" tone="red" />{" "}
            with P = {pct(lastResult.probability)} · surviving{" "}
            {lastResult.survivingLabels.map((l) => `|${l}⟩`).join(", ")}
          </p>
        ) : (
          <p className="mt-2 font-mono text-[10px] text-grey">
            Pre-measurement superposition over |00⟩, |01⟩, |10⟩, |11⟩.
          </p>
        )}
      </Panel>

      {remainingEntries ? (
        <Panel
          label={`Remaining qubit ${otherQubit} (renormalized)`}
        >
          <AmplitudeBar entries={remainingEntries} />
        </Panel>
      ) : null}

      {lastResult ? (
        <OutcomeBanner
          tone="ok"
          title={
            kind === "entangled"
              ? `Entangled: qubit ${otherQubit} now tracks outcome |${lastResult.outcome}⟩`
              : `Product: qubit ${otherQubit} kept its own state`
          }
          detail={`Born probability ${pct(lastResult.probability)}. Incompatible branches zero out; surviving amplitudes renormalize.`}
        />
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <Chip tone="warn">Measure = project + renormalize</Chip>
        <Chip tone="ink">
          {kind === "entangled"
            ? "Bell: measuring one qubit fixes the other"
            : "Product: leftover ignores the rolled bit"}
        </Chip>
      </div>
    </DemoShell>
  );
}
