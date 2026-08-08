"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  TradeoffRow,
} from "@/components/interactive/quantum-shared";
import { cn } from "@/lib/utils";

type Basis = "Z" | "H";
type Bit = 0 | 1;

type Trial = {
  aliceBasis: Basis;
  aliceBit: Bit;
  bobBasis: Basis;
  bobOutcome: Bit;
  matched: boolean;
  agree: boolean;
  eveBasis: Basis | null;
  eveOutcome: Bit | null;
};

type Stats = {
  total: number;
  matched: number;
  matchedAgree: number;
  matchedDisagree: number;
};

const EMPTY_STATS: Stats = {
  total: 0,
  matched: 0,
  matchedAgree: 0,
  matchedDisagree: 0,
};

function randomBit(): Bit {
  return Math.random() < 0.5 ? 0 : 1;
}

function randomBasis(): Basis {
  return Math.random() < 0.5 ? "Z" : "H";
}

function prepareState(bit: Bit, basis: Basis): [number, number] {
  if (basis === "Z") return bit === 0 ? [1, 0] : [0, 1];
  return bit === 0
    ? [1 / Math.sqrt(2), 1 / Math.sqrt(2)]
    : [1 / Math.sqrt(2), -1 / Math.sqrt(2)];
}

function measureState(state: [number, number], basis: Basis): Bit {
  const [a, b] = state;
  if (basis === "Z") {
    const p0 = a * a;
    const normSq = p0 + b * b;
    if (normSq < 1e-15) return randomBit();
    return Math.random() < p0 / normSq ? 0 : 1;
  }
  const pPlus = Math.pow((a + b) / Math.sqrt(2), 2);
  const pMinus = Math.pow((a - b) / Math.sqrt(2), 2);
  const total = pPlus + pMinus;
  if (total < 1e-15) return randomBit();
  return Math.random() < pPlus / total ? 0 : 1;
}

function eveIntercept(
  state: [number, number],
): { state: [number, number]; basis: Basis; outcome: Bit } {
  const eveBasis = randomBasis();
  const outcome = measureState(state, eveBasis);
  return { state: prepareState(outcome, eveBasis), basis: eveBasis, outcome };
}

function runTrial(eveOn: boolean): Trial {
  const aliceBasis = randomBasis();
  const aliceBit = randomBit();
  const bobBasis = randomBasis();

  let state = prepareState(aliceBit, aliceBasis);
  let eveBasis: Basis | null = null;
  let eveOutcome: Bit | null = null;

  if (eveOn) {
    const eve = eveIntercept(state);
    state = eve.state;
    eveBasis = eve.basis;
    eveOutcome = eve.outcome;
  }

  const bobOutcome = measureState(state, bobBasis);
  const matched = aliceBasis === bobBasis;
  const agree = aliceBit === bobOutcome;

  return {
    aliceBasis,
    aliceBit,
    bobBasis,
    bobOutcome,
    matched,
    agree,
    eveBasis,
    eveOutcome,
  };
}

function basisLabel(b: Basis): string {
  return b === "Z" ? "type Z {|0⟩,|1⟩}" : "type H {|+⟩,|−⟩}";
}

/** Sample BB84 basis match/mismatch trials with optional Eve intercept. */
export function BB84Sampler() {
  const [eveOn, setEveOn] = useState(false);
  const [last, setLast] = useState<Trial | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);

  const accumulate = useCallback((trials: Trial[]) => {
    setLast(trials[trials.length - 1] ?? null);
    setStats((prev) => {
      let next = { ...prev };
      for (const t of trials) {
        next = {
          total: next.total + 1,
          matched: next.matched + (t.matched ? 1 : 0),
          matchedAgree: next.matchedAgree + (t.matched && t.agree ? 1 : 0),
          matchedDisagree:
            next.matchedDisagree + (t.matched && !t.agree ? 1 : 0),
        };
      }
      return next;
    });
  }, []);

  const runOne = () => accumulate([runTrial(eveOn)]);
  const runBatch = () => accumulate(Array.from({ length: 20 }, () => runTrial(eveOn)));
  const reset = () => {
    setLast(null);
    setStats(EMPTY_STATS);
  };

  const toggleEve = () => {
    setEveOn((v) => !v);
    setLast(null);
    setStats(EMPTY_STATS);
  };

  const agreeRate =
    stats.matched > 0
      ? Math.round((stats.matchedAgree / stats.matched) * 100)
      : null;
  const disagreeRate =
    stats.matched > 0
      ? Math.round((stats.matchedDisagree / stats.matched) * 100)
      : null;

  return (
    <DemoShell
      title="BB84 sampler"
      blurb="Alice picks a random type — Z (computational {|0⟩,|1⟩}) or H (Hadamard {|+⟩,|−⟩}) — and a random bit. Bob picks a random type to measure. Matching types sift a key bit; Eve's intercept-resend injects ~25% errors on sifted bits."
      accent="yellow"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="blue" onClick={runOne}>
          Run one photon
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={runBatch}>
          Run 20
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={reset}>
          Reset
        </Button>
        <button
          type="button"
          onClick={toggleEve}
          className={cn(
            "border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
            eveOn ? "bg-red text-white" : "bg-white hover:bg-paper",
          )}
          aria-pressed={eveOn}
        >
          Eve intercepts {eveOn ? "on" : "off"}
        </button>
      </div>

      {last ? (
        <Panel label="Last trial">
          <div className="grid gap-2 font-mono text-xs sm:grid-cols-2">
            <p>
              Alice: {basisLabel(last.aliceBasis)} bit {last.aliceBit}
            </p>
            <p>
              Bob: {basisLabel(last.bobBasis)} read {last.bobOutcome}
            </p>
            {last.eveBasis != null ? (
              <p className="text-red sm:col-span-2">
                Eve: {basisLabel(last.eveBasis)} measured {last.eveOutcome}
              </p>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip tone={last.matched ? "ok" : "warn"}>
              {last.matched ? "types matched" : "type mismatch"}
            </Chip>
            {last.matched ? (
              <Chip tone={last.agree ? "ok" : "bad"}>
                {last.agree ? "bits agree" : "bits disagree"}
              </Chip>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {last ? (
        last.matched ? (
          <OutcomeBanner
            tone={last.agree ? "ok" : "bad"}
            title={last.agree ? "Sifted bit kept" : "Matched but wrong"}
            detail={
              last.agree
                ? `Alice and Bob keep key bit ${last.aliceBit} — types aligned.`
                : eveOn
                  ? "Eve's intercept-resend likely flipped this sifted bit — expect ~25% such errors with Eve over many runs."
                  : "Without Eve, matched-type disagreement is vanishingly rare (floating-point noise only)."
            }
          />
        ) : (
          <OutcomeBanner
            tone="warn"
            title="Discarded (type mismatch)"
            detail="Different measurement types — outcome is random and not used for the key."
          />
        )
      ) : null}

      <Panel label="Accumulated stats">
        <TradeoffRow label="Trials" value={String(stats.total)} />
        <TradeoffRow label="Matched (sifted)" value={String(stats.matched)} />
        <TradeoffRow
          label="Agreement among matched"
          value={agreeRate != null ? `${agreeRate}%` : "—"}
          tone={
            agreeRate == null
              ? "ink"
              : eveOn && disagreeRate != null && disagreeRate >= 15
                ? "bad"
                : "ok"
          }
        />
        {eveOn && stats.matched > 0 ? (
          <TradeoffRow
            label="Disagreement among matched"
            value={`${disagreeRate}%`}
            tone={disagreeRate != null && disagreeRate >= 15 ? "warn" : "ink"}
          />
        ) : null}
        {eveOn ? (
          <p className="mt-2 font-mono text-[10px] text-grey">
            With Eve, expect ~25% errors on sifted bits over many runs.
          </p>
        ) : stats.total > 0 ? (
          <p className="mt-2 font-mono text-[10px] text-grey">
            Without Eve, sifted bits should agree ~100% of the time.
          </p>
        ) : null}
      </Panel>
    </DemoShell>
  );
}
