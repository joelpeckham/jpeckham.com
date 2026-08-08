"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AmplitudeBar,
  Chip,
  DemoShell,
  Panel,
} from "@/components/interactive/quantum-shared";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  type ErrorKind,
  ERROR_SUPPORT,
  encode,
  errorLabel,
  injectError,
  normalizeMagnitudes,
  physicalAmplitudes,
  randomFlipKind,
} from "./model";

const FLIP_OPTIONS: { kind: ErrorKind; label: string }[] = [
  { kind: "none", label: "No flip" },
  { kind: "x0", label: "X₀ (q₀)" },
  { kind: "x1", label: "X₁ (q₁)" },
  { kind: "x2", label: "X₂ (q₂)" },
];

/** Start from an encoded state and inject a single bit-flip error. */
export function InjectFlipDemo() {
  const [aMag, setAMag] = useState(0.6);
  const [bMag, setBMag] = useState(0.8);
  const [errorKind, setErrorKind] = useState<ErrorKind>("none");

  const encoded = useMemo(() => {
    const logical = normalizeMagnitudes(aMag, bMag);
    return encode(logical.alpha, logical.beta);
  }, [aMag, bMag]);

  const state = useMemo(
    () => injectError(encoded, errorKind),
    [encoded, errorKind],
  );
  const amps = useMemo(() => physicalAmplitudes(state), [state]);
  const support = ERROR_SUPPORT[errorKind];

  return (
    <DemoShell
      title="Inject a bit flip"
      blurb="A bit flip is a stray X gate: it swaps |0⟩↔|1⟩ on one physical qubit. The logical superposition survives — only which basis states carry α and β change."
      accent="red"
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
              onValueChange={(v) => {
                setAMag(v);
                setErrorKind("none");
              }}
              accent="blue"
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
              onValueChange={(v) => {
                setBMag(v);
                setErrorKind("none");
              }}
              accent="red"
              aria-label="Magnitude of beta"
            />
          </label>
        </div>
      </Panel>

      <Panel label="Pick an error">
        <div className="flex flex-wrap gap-2">
          {FLIP_OPTIONS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => setErrorKind(kind)}
              className={cn(
                "border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
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
            variant="yellow"
            size="sm"
            onClick={() => setErrorKind(randomFlipKind())}
          >
            Random flip
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone={errorKind === "none" ? "ok" : "bad"}>
            {errorKind === "none" ? "clean codeword" : `error: ${errorLabel(errorKind)}`}
          </Chip>
          <span className="font-mono text-[11px] text-grey">
            α on |{support.alpha}⟩, β on |{support.beta}⟩
          </span>
        </div>
      </Panel>

      <Panel label="Physical amplitudes">
        <AmplitudeBar entries={amps} highlight={support.alpha} />
      </Panel>
    </DemoShell>
  );
}
