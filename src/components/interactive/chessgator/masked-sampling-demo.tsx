"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PLAYTIME_TEMPERATURE,
  PLAYTIME_TOP_P,
  SAMPLE_CANDIDATES,
  SAMPLE_POSITION_LABEL,
  applyLegalMask,
  candidateLogits,
  candidateMask,
  histogramFromLogits,
  sampleFromLogits,
  stableSoftmax,
} from "./model";
import { Chip, DemoShell, OutcomeBanner, Panel } from "./shared";

const DRAWS = 100;

export function MaskedSamplingDemo() {
  const [temperature, setTemperature] = useState(PLAYTIME_TEMPERATURE);
  const [topP, setTopP] = useState(PLAYTIME_TOP_P);
  const [maskOn, setMaskOn] = useState(true);
  const [counts, setCounts] = useState<number[] | null>(null);
  const [lastSan, setLastSan] = useState<string | null>(null);

  const logits = useMemo(() => candidateLogits(), []);
  const mask = useMemo(() => candidateMask(), []);
  const working = useMemo(
    () => (maskOn ? applyLegalMask(logits, mask) : Float64Array.from(logits)),
    [logits, mask, maskOn],
  );

  const scaled = useMemo(() => {
    if (temperature <= 0) return working;
    const out = new Float64Array(working.length);
    for (let i = 0; i < working.length; i++) {
      const v = working[i]!;
      out[i] = Number.isFinite(v) ? v / temperature : v;
    }
    return out;
  }, [working, temperature]);

  const probs = useMemo(() => stableSoftmax(scaled), [scaled]);
  const maxProb = Math.max(...probs, 0.001);

  function drawOnce() {
    const idx = sampleFromLogits(working, { temperature, topP });
    setLastSan(SAMPLE_CANDIDATES[idx]!.san);
  }

  function drawMany() {
    setCounts(histogramFromLogits(working, { temperature, topP }, DRAWS));
    const idx = sampleFromLogits(working, { temperature, topP });
    setLastSan(SAMPLE_CANDIDATES[idx]!.san);
  }

  const illegalMass = SAMPLE_CANDIDATES.reduce((sum, c, i) => {
    return c.legal ? sum : sum + Number(probs[i]);
  }, 0);

  return (
    <DemoShell
      title="Mask, then sample"
      blurb={`${SAMPLE_POSITION_LABEL}. Illegal vocab slots get −∞ before softmax. Temperature 0 is the parity mode: argmax, every time.`}
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={maskOn ? "ink" : "outline"}
          onClick={() => {
            setMaskOn(true);
            setCounts(null);
          }}
        >
          Legal mask on
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!maskOn ? "red" : "outline"}
          onClick={() => {
            setMaskOn(false);
            setCounts(null);
          }}
        >
          Mask off
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setTemperature(0);
            setTopP(1);
            setCounts(null);
          }}
        >
          Parity (T=0)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setTemperature(PLAYTIME_TEMPERATURE);
            setTopP(PLAYTIME_TOP_P);
            setCounts(null);
          }}
        >
          Playtime
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            <span>Temperature</span>
            <span className="tabular-nums text-ink">{temperature.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={1.6}
            step={0.05}
            value={temperature}
            onChange={(e) => {
              setTemperature(Number(e.target.value));
              setCounts(null);
            }}
            className="w-full accent-ink"
            aria-label="Temperature"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            <span>Top-p</span>
            <span className="tabular-nums text-ink">{topP.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={topP}
            onChange={(e) => {
              setTopP(Number(e.target.value));
              setCounts(null);
            }}
            className="w-full accent-ink"
            aria-label="Top-p"
          />
        </label>
      </div>

      <Panel label="Policy over a vocab slice">
        <ul className="space-y-1.5">
          {SAMPLE_CANDIDATES.map((c, i) => {
            const p = Number(probs[i]);
            const maskedOut = maskOn && !c.legal;
            const count = counts?.[i] ?? 0;
            return (
              <li key={c.uci} className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2">
                <span
                  className={cn(
                    "font-mono text-xs",
                    maskedOut ? "text-red line-through" : "text-ink",
                  )}
                >
                  {c.san}
                </span>
                <div className="h-3 border border-ink/30 bg-paper">
                  <div
                    className={cn(
                      "h-full",
                      maskedOut ? "bg-red/40" : "bg-blue",
                    )}
                    style={{ width: `${(p / maxProb) * 100}%` }}
                  />
                </div>
                <span className="text-right font-mono text-[10px] tabular-nums text-grey">
                  {maskedOut
                    ? "−∞"
                    : counts
                      ? `${count}×`
                      : `${Math.round(p * 100)}%`}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ink" onClick={drawOnce}>
          Sample once
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={drawMany}>
          Sample {DRAWS}×
        </Button>
        {lastSan ? <Chip tone="ok">Drew {lastSan}</Chip> : null}
        {!maskOn && illegalMass > 0.01 ? (
          <Chip tone="bad">{Math.round(illegalMass * 100)}% illegal mass</Chip>
        ) : (
          <Chip tone="ok">Illegal mass 0%</Chip>
        )}
      </div>

      {temperature <= 0 ? (
        <OutcomeBanner
          tone="ok"
          title="Argmax"
          detail="Temperature 0 skips softmax. The same legal move wins every draw, which is how the browser net is checked against the Python reference."
        />
      ) : null}
    </DemoShell>
  );
}
