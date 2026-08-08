"use client";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AmplitudeBar,
  Chip,
  CircuitCaption,
  CircuitMini,
  DemoShell,
  KetDisplay,
  OutcomeBanner,
  Panel,
  type AmplitudeEntry,
  type CircuitGate,
} from "@/components/interactive/quantum-shared";
import {
  CORRECTION,
  MEASURE_KEYS,
  type MeasureKey,
  bobBeforeCorrection,
} from "./model";

type PsiPreset = "0" | "1" | "+" | "-" | "custom";
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const STEPS = [
  "Prepare",
  "Alice cNOT",
  "Alice H",
  "Alice measures",
  "Classical call",
  "Bob correction",
  "Done",
] as const;

const WIRES = [
  { id: "psi", label: "|ψ⟩" },
  { id: "a", label: "A_ent" },
  { id: "b", label: "B" },
] as const;

const PRESETS: { id: PsiPreset; label: string; alpha: number; beta: number }[] = [
  { id: "0", label: "|0⟩", alpha: 1, beta: 0 },
  { id: "1", label: "|1⟩", alpha: 0, beta: 1 },
  { id: "+", label: "|+⟩", alpha: 1 / Math.sqrt(2), beta: 1 / Math.sqrt(2) },
  { id: "-", label: "|−⟩", alpha: 1 / Math.sqrt(2), beta: -1 / Math.sqrt(2) },
];

function toAmplitudeEntries(a0: number, a1: number): AmplitudeEntry[] {
  return [
    { label: "0", re: a0, im: 0 },
    { label: "1", re: a1, im: 0 },
  ];
}

function psiLabel(alpha: number, beta: number): string {
  if (Math.abs(alpha - 1) < 1e-6) return "0";
  if (Math.abs(beta - 1) < 1e-6) return "1";
  if (Math.abs(alpha - beta) < 1e-6 && alpha > 0) return "+";
  if (Math.abs(alpha + beta) < 1e-6 && alpha > 0) return "−";
  return "ψ";
}

function buildColumns(correctionLabel: string): CircuitGate[][] {
  return [
    [],
    [{ id: "cnot", wires: ["psi", "a"], label: "X" }],
    [{ id: "h", wires: ["psi"], label: "H" }],
    [
      { id: "m-psi", wires: ["psi"], label: "M", kind: "measure" },
      { id: "m-a", wires: ["a"], label: "M", kind: "measure" },
    ],
    [{ id: "class", wires: ["b"], label: "2b", kind: "oracle" }],
    [{ id: "corr", wires: ["b"], label: correctionLabel }],
    [],
  ];
}

export function TeleportStepper() {
  const [preset, setPreset] = useState<PsiPreset>("+");
  const [alphaSlider, setAlphaSlider] = useState(0.7);
  const [step, setStep] = useState<Step>(0);
  const [measurement, setMeasurement] = useState<MeasureKey | null>(null);

  const { alpha, beta } = useMemo(() => {
    if (preset === "custom") {
      const a = alphaSlider;
      return { alpha: a, beta: Math.sqrt(Math.max(0, 1 - a * a)) };
    }
    const p = PRESETS.find((x) => x.id === preset)!;
    return { alpha: p.alpha, beta: p.beta };
  }, [alphaSlider, preset]);

  const correction = measurement ? CORRECTION[measurement] : null;

  const columns = useMemo(
    () => buildColumns(correction?.gate ?? "?"),
    [correction?.gate],
  );

  const bobScrambled = useMemo(() => {
    if (!measurement || step < 3) return null;
    return bobBeforeCorrection(alpha, beta, measurement);
  }, [alpha, beta, measurement, step]);

  const originalEntries = useMemo(
    () => toAmplitudeEntries(alpha, beta),
    [alpha, beta],
  );

  const bobEntries = useMemo(
    () => (bobScrambled ? toAmplitudeEntries(bobScrambled[0], bobScrambled[1]) : null),
    [bobScrambled],
  );

  const resetRun = useCallback(() => {
    setStep(0);
    setMeasurement(null);
  }, []);

  const rollMeasurement = useCallback(() => {
    setMeasurement(MEASURE_KEYS[Math.floor(Math.random() * 4)]!);
  }, []);

  function goNext() {
    if (step >= 6) return;
    if (step === 2 && measurement === null) {
      rollMeasurement();
    }
    setStep((s) => (s + 1) as Step);
  }

  function goPrev() {
    if (step <= 0) return;
    const next = (step - 1) as Step;
    if (next < 3) setMeasurement(null);
    setStep(next);
  }

  function selectPreset(id: PsiPreset) {
    setPreset(id);
    resetRun();
  }

  return (
    <DemoShell
      title="Teleportation step player"
      blurb="Shared Bell pair, Alice’s Bell measurement (cNOT + H + measure), two classical bits, Bob’s Pauli. Unknown |ψ⟩ = α|0⟩ + β|1⟩."
      accent="blue"
    >
      <Panel label="Unknown state |ψ⟩">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPreset(p.id)}
              className={cn(
                "border-2 border-ink transition-colors",
                preset === p.id ? "ring-2 ring-ink ring-offset-2" : "hover:bg-paper",
              )}
              aria-pressed={preset === p.id}
            >
              <KetDisplay label={p.id} size="sm" tone={preset === p.id ? "blue" : "ink"} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => selectPreset("custom")}
            className={cn(
              "border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
              preset === "custom" ? "bg-ink text-paper" : "bg-white text-ink hover:bg-paper",
            )}
            aria-pressed={preset === "custom"}
          >
            Custom α
          </button>
        </div>

        {preset === "custom" ? (
          <div className="mt-3 space-y-1">
            <label className="flex items-center gap-3 font-mono text-xs">
              <span className="w-8 text-grey">α</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={alphaSlider}
                onChange={(e) => {
                  setAlphaSlider(Number(e.target.value));
                  resetRun();
                }}
                className="flex-1 accent-ink"
              />
              <span className="w-12 tabular-nums">{alpha.toFixed(2)}</span>
            </label>
            <p className="font-mono text-[11px] text-grey">
              β = √(1 − α²) ≈ {beta.toFixed(3)} (real, positive)
            </p>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <KetDisplay label={psiLabel(alpha, beta)} tone="blue" />
          <span className="font-mono text-xs text-grey">
            α={alpha.toFixed(3)}, β={beta.toFixed(3)}
          </span>
        </div>
        <AmplitudeBar entries={originalEntries} />
      </Panel>

      <Panel label="Circuit (3 wires)">
        <CircuitMini wires={[...WIRES]} columns={columns} activeColumn={step} />
        <CircuitCaption>
          Bell pair |Φ⟩ = (|00⟩+|11⟩)/√2 on A_ent ⊗ B — step {step}: {STEPS[step]}
        </CircuitCaption>
      </Panel>

      <Panel label={STEPS[step]}>
        {step === 0 ? (
          <p className="text-sm">
            Alice holds |ψ⟩; she and Bob share |Φ⟩ on wires A_ent and B. Total state is |ψ⟩|Φ⟩.
            Nobody knows α and β.
          </p>
        ) : null}

        {step === 1 ? (
          <p className="text-sm">
            cNOT with control |ψ⟩ and target A_ent. Alice’s unknown amplitudes are now mixed into
            her half of the Bell pair — still not readable, but ready for a Bell-basis readout.
          </p>
        ) : null}

        {step === 2 ? (
          <p className="text-sm">
            Hadamard on the |ψ⟩ wire. Together with the cNOT, this sets up a measurement that asks
            which of the four Bell states Alice’s two qubits match — without learning α or β.
          </p>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <p className="text-sm">
              Alice measures both of her qubits. Each of 00, 01, 10, 11 occurs with probability ¼.
              That random pair names which Pauli twist landed on Bob.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={rollMeasurement}
                className="border-2 border-ink bg-ink px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-paper hover:bg-ink/90"
              >
                Roll measurement
              </button>
              {MEASURE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMeasurement(key)}
                  className={cn(
                    "border-2 border-ink px-2 py-1 font-mono text-xs tabular-nums",
                    measurement === key ? "bg-ink text-paper" : "bg-white hover:bg-paper",
                  )}
                  aria-pressed={measurement === key}
                >
                  {key}
                </button>
              ))}
            </div>
            {measurement ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="ok">
                    |ψ⟩={measurement[0]}, A_ent={measurement[1]}
                  </Chip>
                  <span className="font-mono text-xs text-grey">
                    → Bob needs {CORRECTION[measurement].gate}
                  </span>
                </div>
                {bobEntries ? (
                  <div>
                    <p className="mb-1 font-mono text-[11px] text-grey">
                      Bob’s Qbit right now (before correction)
                    </p>
                    <AmplitudeBar entries={bobEntries} />
                  </div>
                ) : null}
              </div>
            ) : (
              <Chip tone="warn">pick or roll an outcome</Chip>
            )}
          </div>
        ) : null}

        {step === 4 && measurement ? (
          <div className="space-y-2">
            <p className="text-sm">
              Alice phones the two bits. Bob cannot trust his Qbit as |ψ⟩ until that call arrives —
              no faster-than-light messaging.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="ok">|ψ⟩ bit: {measurement[0]}</Chip>
              <Chip tone="ok">A_ent bit: {measurement[1]}</Chip>
              <span className="font-mono text-xs text-grey">→ Bob</span>
            </div>
          </div>
        ) : null}

        {step === 5 && measurement && correction ? (
          <div className="space-y-3">
            <p className="text-sm">
              Bob applies <strong className="font-mono">{correction.gate}</strong> —{" "}
              {correction.note}. The two bits told him which twist to undo.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="warn">before correction</Chip>
              {bobEntries ? <AmplitudeBar entries={bobEntries} /> : null}
            </div>
          </div>
        ) : null}

        {step === 6 && measurement ? (
          <div className="space-y-3">
            <OutcomeBanner
              tone="ok"
              title="Bob has |ψ⟩"
              detail="The Pauli undoes the random Bell outcome. Amplitudes match Alice’s original unknown state — and Alice’s copies are gone."
            />
            <AmplitudeBar entries={originalEntries} highlight={null} />
            <div className="flex flex-wrap gap-2">
              <Chip tone="ok">match</Chip>
              <span className="font-mono text-xs text-grey">
                original vs Bob after {CORRECTION[measurement].gate}
              </span>
            </div>
          </div>
        ) : null}
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 0}
          className="border-2 border-ink bg-white px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={step === 6 || (step === 3 && !measurement)}
          className="border-2 border-ink bg-ink px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] text-paper hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
        <button
          type="button"
          onClick={resetRun}
          className="border-2 border-ink bg-white px-3 py-1.5 font-mono text-xs uppercase tracking-[0.08em] hover:bg-paper"
        >
          Reset
        </button>
        <Chip tone="ink">
          step {step}/{STEPS.length - 1}
        </Chip>
      </div>
    </DemoShell>
  );
}
