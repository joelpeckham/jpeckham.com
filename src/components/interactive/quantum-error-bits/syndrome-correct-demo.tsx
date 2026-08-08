"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AmplitudeBar,
  Chip,
  DemoShell,
  KetDisplay,
  OutcomeBanner,
  Panel,
} from "@/components/interactive/quantum-shared";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  type ErrorKind,
  type Syndrome,
  computeSyndrome,
  correct,
  encode,
  errorLabel,
  injectError,
  normalizeMagnitudes,
  physicalAmplitudes,
  prob,
  randomFlipKind,
  syndromeToErrorKind,
} from "./model";

type Step = "encode" | "inject" | "syndrome" | "correct";

const STEPS: { id: Step; label: string }[] = [
  { id: "encode", label: "1 · Encode" },
  { id: "inject", label: "2 · Inject" },
  { id: "syndrome", label: "3 · Syndrome" },
  { id: "correct", label: "4 · Correct" },
];

const ERROR_OPTIONS: { kind: ErrorKind; label: string }[] = [
  { kind: "none", label: "No flip" },
  { kind: "x0", label: "X₀" },
  { kind: "x1", label: "X₁" },
  { kind: "x2", label: "X₂" },
];

function SyndromeLed({
  bit,
  label,
  hint,
  lit,
}: {
  bit: 0 | 1;
  label: string;
  hint: string;
  lit: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex size-14 items-center justify-center border-2 border-ink font-display text-2xl tabular-nums transition-colors duration-300",
          lit ? "bg-red text-white" : "bg-paper text-ink",
        )}
        aria-label={`${label} syndrome bit ${bit}`}
      >
        {bit}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-grey">
        {label}
      </span>
      <span className="max-w-[7rem] text-center font-mono text-[10px] text-grey">
        {hint}
      </span>
    </div>
  );
}

function SyndromeDisplay({
  syndrome,
  revealed,
}: {
  syndrome: Syndrome | null;
  revealed: boolean;
}) {
  const s = revealed && syndrome != null ? syndrome : ([0, 0] as Syndrome);
  return (
    <div className="flex items-start justify-center gap-6">
      <SyndromeLed
        bit={s[0]}
        label="s₁"
        hint="parity q₂⊕q₁"
        lit={revealed && s[0] === 1}
      />
      <SyndromeLed
        bit={s[1]}
        label="s₀"
        hint="parity q₁⊕q₀"
        lit={revealed && s[1] === 1}
      />
    </div>
  );
}

/** Full encode → inject → syndrome → correct flow with stabilizer lights. */
export function SyndromeCorrectDemo() {
  const [aMag, setAMag] = useState(0.6);
  const [bMag, setBMag] = useState(0.8);
  const [errorKind, setErrorKind] = useState<ErrorKind>("x1");
  const [step, setStep] = useState<Step>("encode");
  const [syndrome, setSyndrome] = useState<Syndrome | null>(null);

  const logical = useMemo(
    () => normalizeMagnitudes(aMag, bMag),
    [aMag, bMag],
  );

  const injected = useMemo(() => {
    const encoded = encode(logical.alpha, logical.beta);
    return injectError(encoded, errorKind);
  }, [logical, errorKind]);

  const state = useMemo(() => {
    if (step === "encode") {
      return encode(logical.alpha, logical.beta);
    }
    if (step === "correct") {
      return correct(injected);
    }
    return injected;
  }, [logical, injected, step]);

  const amps = useMemo(() => physicalAmplitudes(state), [state]);
  const revealed = step === "syndrome" || step === "correct";
  const measuredSyndrome = revealed
    ? (syndrome ?? computeSyndrome(injected))
    : null;

  const inferredError =
    measuredSyndrome != null ? syndromeToErrorKind(measuredSyndrome) : null;

  function resetFlow() {
    setStep("encode");
    setSyndrome(null);
  }

  function advance() {
    if (step === "encode") {
      setStep("inject");
      return;
    }
    if (step === "inject") {
      setSyndrome(computeSyndrome(injected));
      setStep("syndrome");
      return;
    }
    if (step === "syndrome") {
      setStep("correct");
    }
  }

  function runAll() {
    setSyndrome(computeSyndrome(injected));
    setStep("correct");
  }

  const p0 = prob(logical.alpha);
  const p1 = prob(logical.beta);
  const canEdit = step === "encode";

  return (
    <DemoShell
      title="Syndrome lights"
      blurb="Parity checks ask whether qubits agree, not what value they share. The two-bit answer is the syndrome — an error fingerprint. Correct from that alone; α and β stay unknown."
      accent="yellow"
    >
      <Panel label="Logical input">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="font-mono text-xs text-grey">|α|</span>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={aMag}
              onValueChange={setAMag}
              accent="blue"
              disabled={!canEdit}
              aria-label="Magnitude of alpha"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-xs text-grey">|β|</span>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={bMag}
              onValueChange={setBMag}
              accent="red"
              disabled={!canEdit}
              aria-label="Magnitude of beta"
            />
          </label>
        </div>
      </Panel>

      <Panel label="Error to inject">
        <div className="flex flex-wrap gap-2">
          {ERROR_OPTIONS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              disabled={!canEdit}
              onClick={() => setErrorKind(kind)}
              className={cn(
                "border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] disabled:opacity-45",
                errorKind === kind
                  ? "bg-ink text-paper"
                  : "bg-white text-ink hover:bg-paper",
              )}
            >
              {label}
            </button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEdit}
            onClick={() => setErrorKind(randomFlipKind())}
          >
            Random flip
          </Button>
        </div>
      </Panel>

      <div className="flex flex-wrap gap-2">
        {STEPS.map(({ id, label }) => (
          <Chip
            key={id}
            tone={
              step === id
                ? "warn"
                : STEPS.findIndex((s) => s.id === id) <
                    STEPS.findIndex((s) => s.id === step)
                  ? "ok"
                  : "ink"
            }
          >
            {label}
          </Chip>
        ))}
      </div>

      <Panel label="Syndrome (parity fingerprint)">
        <SyndromeDisplay syndrome={measuredSyndrome} revealed={revealed} />
        {measuredSyndrome != null ? (
          <p className="mt-4 text-center font-mono text-sm">
            s = {measuredSyndrome[0]}
            {measuredSyndrome[1]} →{" "}
            {inferredError === "none"
              ? "no flip (do nothing)"
              : `apply ${errorLabel(inferredError!)}`}
          </p>
        ) : (
          <p className="mt-4 text-center font-mono text-[11px] text-grey">
            Advance to step 3 to measure the two parity checks on ancillas
          </p>
        )}
      </Panel>

      <Panel label="Physical state">
        <AmplitudeBar
          entries={amps}
          highlight={step === "correct" ? "000" : undefined}
        />
        {step === "correct" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <KetDisplay label="000" tone="blue" size="sm" />
            <KetDisplay label="111" tone="red" size="sm" />
            <span className="font-mono text-[11px] text-grey">codeword restored</span>
          </div>
        ) : null}
      </Panel>

      <div className="flex flex-wrap gap-2">
        {step !== "correct" ? (
          <Button type="button" variant="ink" size="sm" onClick={advance}>
            {step === "syndrome" ? "Apply correction" : "Next step"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="blue"
          size="sm"
          onClick={runAll}
          disabled={step === "correct"}
        >
          Correct in one shot
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={resetFlow}>
          Reset
        </Button>
      </div>

      {step === "correct" ? (
        <OutcomeBanner
          tone="ok"
          title="Logical state preserved"
          detail={`Correction removed ${errorLabel(errorKind)} using only the syndrome ${measuredSyndrome?.[0]}${measuredSyndrome?.[1]}. Amplitudes unchanged: |α|² = ${(p0 * 100).toFixed(1)}%, |β|² = ${(p1 * 100).toFixed(1)}%. We never measured α or β.`}
        />
      ) : null}
    </DemoShell>
  );
}
