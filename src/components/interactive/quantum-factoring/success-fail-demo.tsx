"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
} from "@/components/interactive/quantum-shared";
import {
  FACTORING_PRESETS,
  factorFromPeriod,
  modPow,
  order,
  type FactoringPreset,
} from "./math";

function kindChip(kind: FactoringPreset["kind"]) {
  switch (kind) {
    case "success":
      return <Chip tone="ok">success</Chip>;
    case "fail-odd-r":
      return <Chip tone="warn">r odd</Chip>;
    case "fail-minus-one":
      return <Chip tone="bad">x ≡ −1</Chip>;
  }
}

function modMinusOneLabel(x: number, N: number): boolean {
  return x === N - 1;
}

/** Compare success vs abort cases for the period → factor step. */
export function SuccessFailDemo() {
  const [presetId, setPresetId] = useState(FACTORING_PRESETS[0].id);
  const preset = FACTORING_PRESETS.find((p) => p.id === presetId)!;

  const analysis = useMemo(() => {
    const { N, a, r } = preset;
    const trueOrder = order(a, N);
    const x = r % 2 === 0 ? modPow(a, r / 2, N) : null;
    const result = factorFromPeriod(a, r, N);

    return { trueOrder, x, result };
  }, [preset]);

  const { trueOrder, x, result } = analysis;

  const checks = [
    {
      label: "r is even",
      pass: rEven(preset.r),
      detail: `r = ${preset.r}`,
    },
    {
      label: "a^{r/2} ≢ −1 (mod N)",
      pass: x != null && !modMinusOneLabel(x, preset.N),
      detail:
        x == null
          ? "skipped (r odd)"
          : `x = ${x}${modMinusOneLabel(x, preset.N) ? " ≡ −1" : ""}`,
    },
    {
      label: "gcd(x ± 1, N) nontrivial",
      pass: result.ok,
      detail: result.ok
        ? `${result.gMinus} and ${result.gPlus}`
        : result.reason === "a^{r/2} ≡ -1"
          ? `gcd(x+1,N) = ${result.gPlus} = N (trivial)`
          : result.reason,
    },
  ] as const;

  const outcome = result.ok
    ? {
        tone: "ok" as const,
        title: "Factoring succeeds",
        detail: `${preset.a}^${preset.r} ≡ 1 (mod ${preset.N}) yields factors ${result.factor1} and ${result.factor2}.`,
      }
    : {
        tone: preset.kind === "fail-odd-r" ? ("warn" as const) : ("bad" as const),
        title:
          preset.kind === "fail-odd-r"
            ? "Abort: r is odd"
            : preset.kind === "fail-minus-one"
              ? "Abort: x ≡ −1"
              : "Abort: trivial gcd",
        detail:
          preset.kind === "fail-odd-r"
            ? "r/2 is not an integer, so you cannot form x = a^{r/2}. Throw this a away and sample again."
            : preset.kind === "fail-minus-one"
              ? `a^{r/2} ≡ −1 means x + 1 ≡ 0 (mod N), so gcd(x + 1, N) = N. No split — sample again.`
              : "This base/period pair does not expose nontrivial factors.",
      };

  return (
    <DemoShell
      title="When period factoring works"
      blurb="Two luck checks before Euclid can split N: r even, and a^{r/2} ≢ −1. Appendix M says a random a in G_N passes both at least half the time."
      accent="yellow"
    >
      <Panel label="Cases">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b-2 border-ink/20 text-left text-grey">
                <th className="py-1 pr-3 font-normal uppercase tracking-[0.08em]">
                  Case
                </th>
                <th className="py-1 pr-3 font-normal uppercase tracking-[0.08em]">
                  N, a, r
                </th>
                <th className="py-1 font-normal uppercase tracking-[0.08em]">
                  Outcome
                </th>
              </tr>
            </thead>
            <tbody>
              {FACTORING_PRESETS.map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    "cursor-pointer border-b border-ink/10 transition-colors hover:bg-paper",
                    p.id === presetId && "bg-blue/10",
                  )}
                  onClick={() => setPresetId(p.id)}
                >
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => setPresetId(p.id)}
                    >
                      {p.label}
                    </button>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {p.N}, {p.a}, {p.r}
                  </td>
                  <td className="py-2">{kindChip(p.kind)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel label="Gate checks">
        <ul className="space-y-2">
          {checks.map((c) => (
            <li
              key={c.label}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2 last:border-b-0"
            >
              <span className="font-mono text-sm">{c.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-grey">{c.detail}</span>
                <Chip tone={c.pass ? "ok" : "bad"}>{c.pass ? "pass" : "fail"}</Chip>
              </div>
            </li>
          ))}
        </ul>
        {trueOrder != null && trueOrder !== preset.r ? (
          <p className="mt-2 font-mono text-xs text-red">
            Preset r = {preset.r} disagrees with true order {trueOrder} — data bug.
          </p>
        ) : trueOrder != null ? (
          <p className="mt-2 font-mono text-xs text-grey">
            Multiplicative order of {preset.a} mod {preset.N} = {trueOrder}.
          </p>
        ) : null}
      </Panel>

      <OutcomeBanner {...outcome} />
    </DemoShell>
  );
}

function rEven(r: number): boolean {
  return r % 2 === 0;
}
