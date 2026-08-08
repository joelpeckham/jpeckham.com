"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import {
  COPRIME_CHOICES,
  factorFromPeriod,
  gcd,
  modPow,
  order,
} from "./math";

const STAGES = [
  "Pick a coprime a",
  "Find period r",
  "Extract factors",
  "Verify p · q = N",
] as const;

/** Tiny-N walkthrough: pick a → period → gcd factors → check product. */
export function EndToEndDemo() {
  const [N, setN] = useState(15);
  const [a, setA] = useState(7);
  const [stage, setStage] = useState(0);

  const choices = COPRIME_CHOICES[N] ?? [];

  const r = useMemo(() => order(a, N), [a, N]);
  const result = useMemo(
    () => (r != null ? factorFromPeriod(a, r, N) : null),
    [a, r, N],
  );

  const x = r != null && r % 2 === 0 ? modPow(a, r / 2, N) : null;

  function selectN(next: number) {
    setN(next);
    const first = COPRIME_CHOICES[next]?.[0] ?? 2;
    setA(first);
    setStage(0);
  }

  function selectA(next: number) {
    setA(next);
    setStage(0);
  }

  const verified =
    result?.ok &&
    result.factor1 != null &&
    result.factor2 != null &&
    result.factor1 * result.factor2 === N;

  const outcome =
    stage >= 3 && result
      ? verified
        ? {
            tone: "ok" as const,
            title: `${N} = ${result.factor1} × ${result.factor2}`,
            detail: `Period r = ${r} for a = ${a} gave x = ${x}; Euclid split confirmed.`,
          }
        : {
            tone: "bad" as const,
            title: "Run again with another a",
            detail:
              result.reason === "r odd"
                ? `r = ${r} is odd — retry with a different base.`
                : result.reason === "a^{r/2} ≡ -1"
                  ? `a^{r/2} ≡ −1 (mod ${N}), so gcd(x + 1, N) = N. Pick another coprime a.`
                  : "This a did not yield nontrivial factors.",
          }
      : null;

  return (
    <DemoShell
      title="End-to-end on small N"
      blurb="Walk the classical post-processing after (hypothetical) quantum period finding. Period search is computed classically here as a stand-in."
      accent="red"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.08em] text-grey">
          N
        </label>
        <select
          className={controlSelect}
          value={N}
          onChange={(e) => selectN(Number(e.target.value))}
        >
          <option value={15}>15 = 3 × 5</option>
          <option value={21}>21 = 3 × 7</option>
        </select>
        <label className="font-mono text-[10px] uppercase tracking-[0.08em] text-grey">
          a
        </label>
        <select
          className={controlSelect}
          value={a}
          onChange={(e) => selectA(Number(e.target.value))}
        >
          {choices.map((c) => (
            <option key={c} value={c}>
              {c} (gcd={gcd(c, N)})
            </option>
          ))}
        </select>
        <Chip tone="ink">gcd(a, N) = 1</Chip>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STAGES.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStage(i)}
            className={cn(
              "border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
              stage === i
                ? "bg-ink text-paper"
                : i < stage
                  ? "bg-blue/15 text-blue"
                  : "bg-white hover:bg-paper",
            )}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {stage === 0 ? (
        <Panel label="Step 1 — random coprime base">
          <p className="text-sm">
            Choose a with 1 &lt; a &lt; N and gcd(a, N) = 1. Here a ={" "}
            <span className="font-mono font-bold tabular-nums">{a}</span> and
            gcd({a}, {N}) = {gcd(a, N)}. If that gcd were p or q you would already
            have factored N.
          </p>
        </Panel>
      ) : null}

      {stage === 1 ? (
        <Panel label="Step 2 — period finding (classical stand-in)">
          <p className="font-mono text-sm tabular-nums">
            Smallest r &gt; 0 with {a}
            <sup>r</sup> ≡ 1 (mod {N}) is{" "}
            <span className="font-bold text-blue">{r ?? "…"}</span>
          </p>
          <p className="mt-2 text-xs text-grey">
            On a real machine, the quantum subroutine estimates this r; we compute
            it exactly for these toy N.
          </p>
        </Panel>
      ) : null}

      {stage === 2 && r != null ? (
        <Panel label="Step 3 — Mermin §3.10">
          <div className="space-y-1 font-mono text-sm tabular-nums">
            <p>
              r = {r} {r % 2 === 0 ? "(even ✓)" : "(odd ✗)"}
            </p>
            {r % 2 === 0 && x != null && result ? (
              <>
                <p>
                  x = {a}
                  <sup>{r / 2}</sup> mod {N} = {x}
                  {x === N - 1 ? " ≡ −1 ✗" : ""}
                </p>
                <p>
                  gcd(x − 1, N) = {result.gMinus}, gcd(x + 1, N) = {result.gPlus}
                </p>
                {result.ok ? (
                  <p className="text-blue">
                    Nontrivial factors: {result.factor1} and {result.factor2}
                  </p>
                ) : (
                  <p className="text-red">
                    {result.reason === "a^{r/2} ≡ -1"
                      ? "Abort: x ≡ −1 gives gcd(x + 1, N) = N."
                      : "Abort: no nontrivial split."}
                  </p>
                )}
              </>
            ) : (
              <p className="text-red">Cannot halve r — try another a.</p>
            )}
          </div>
        </Panel>
      ) : null}

      {stage === 3 && result ? (
        <Panel label="Step 4 — verify">
          {result.ok && result.factor1 != null && result.factor2 != null ? (
            <div className="flex flex-wrap items-center gap-2 font-mono text-sm tabular-nums">
              <span>
                {result.factor1} × {result.factor2} ={" "}
                {result.factor1 * result.factor2}
              </span>
              {verified ? (
                <Chip tone="ok">matches N</Chip>
              ) : (
                <Chip tone="bad">mismatch</Chip>
              )}
            </div>
          ) : (
            <p className="text-sm text-grey">
              No factors to verify — the post-processing step failed ({result.reason}
              ).
            </p>
          )}
        </Panel>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={stage === 0}
          onClick={() => setStage((s) => Math.max(0, s - 1))}
          className={cn(
            "border-2 border-ink px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
            stage === 0 ? "cursor-not-allowed opacity-40" : "hover:bg-paper",
          )}
        >
          Back
        </button>
        <button
          type="button"
          disabled={stage >= STAGES.length - 1}
          onClick={() => setStage((s) => Math.min(STAGES.length - 1, s + 1))}
          className={cn(
            "border-2 border-ink px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
            stage >= STAGES.length - 1
              ? "cursor-not-allowed opacity-40"
              : "bg-ink text-paper hover:bg-ink/90",
          )}
        >
          Next step
        </button>
      </div>

      {outcome ? <OutcomeBanner {...outcome} /> : null}
    </DemoShell>
  );
}
