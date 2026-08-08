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
  FACTORING_PRESETS,
  euclideanSteps,
  factorFromPeriod,
  gcd,
  modPow,
} from "./math";

function modLabel(n: number, N: number): string {
  const v = ((n % N) + N) % N;
  if (v === N - 1) return "−1";
  return String(v);
}

function EuclideanTable({
  title,
  a,
  b,
}: {
  title: string;
  a: number;
  b: number;
}) {
  const steps = useMemo(() => euclideanSteps(a, b), [a, b]);
  const result = gcd(a, b);

  return (
    <Panel label={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b-2 border-ink/20 text-left text-grey">
              <th className="py-1 pr-3 font-normal uppercase tracking-[0.08em]">
                f
              </th>
              <th className="py-1 pr-3 font-normal uppercase tracking-[0.08em]">
                c
              </th>
              <th className="py-1 pr-3 font-normal uppercase tracking-[0.08em]">
                q
              </th>
              <th className="py-1 font-normal uppercase tracking-[0.08em]">
                rem
              </th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-ink/10 tabular-nums",
                  i === steps.length - 1 && "font-bold",
                )}
              >
                <td className="py-1 pr-3">{s.f}</td>
                <td className="py-1 pr-3">{s.c}</td>
                <td className="py-1 pr-3">{s.q}</td>
                <td className="py-1">{s.rem}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-xs tabular-nums">
        gcd({a}, {b}) = <span className="font-bold text-blue">{result}</span>
      </p>
    </Panel>
  );
}

/** Step through x = a^{r/2} and Euclidean gcd extraction. */
export function GcdFactorDemo() {
  const [presetId, setPresetId] = useState(FACTORING_PRESETS[0].id);
  const preset = FACTORING_PRESETS.find((p) => p.id === presetId)!;
  const { N, a, r } = preset;
  const even = r % 2 === 0;

  const x = even ? modPow(a, r / 2, N) : null;
  const result = factorFromPeriod(a, r, N);
  const xm1 = x != null ? x - 1 : null;
  const xp1 = x != null ? x + 1 : null;

  const outcome = result.ok
    ? {
        tone: "ok" as const,
        title: `${result.factor1} × ${result.factor2} = ${N}`,
        detail: `gcd(${x} − 1, ${N}) = ${result.gMinus} and gcd(${x} + 1, ${N}) = ${result.gPlus} — the two prime factors.`,
      }
    : {
        tone: "bad" as const,
        title: "Factoring aborts",
        detail:
          result.reason === "r odd"
            ? `Period r = ${r} is odd, so there is no integer exponent r/2. Sample another a.`
            : result.reason === "a^{r/2} ≡ -1"
              ? `x = a^{r/2} ≡ ${modLabel(x!, N)} (mod ${N}), so gcd(x + 1, N) = ${result.gPlus} = N — a trivial factor, no split.`
              : `gcd(x ± 1, N) returned only trivial factors for x = ${x}.`,
      };

  return (
    <DemoShell
      title="GCD factor extraction"
      blurb="Given even period r, set x = a^{r/2} mod N. Euclid’s algorithm (Appendix J: keep replacing the larger number by the remainder) peels p and q out of gcd(x ± 1, N)."
      accent="blue"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="font-mono text-[10px] uppercase tracking-[0.08em] text-grey">
          Preset
        </label>
        <select
          className={controlSelect}
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
        >
          {FACTORING_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <Chip tone={preset.kind === "success" ? "ok" : "bad"}>
          {preset.kind === "success" ? "success path" : "fail path"}
        </Chip>
      </div>

      <Panel label="Step 1 — halve the exponent">
        {even && x != null ? (
          <p className="font-mono text-sm tabular-nums">
            x = {a}<sup>{r / 2}</sup> mod {N} ={" "}
            <span className="font-bold text-blue">{x}</span>
            {x === N - 1 ? " ≡ −1" : ""}
          </p>
        ) : (
          <p className="font-mono text-sm text-red">
            r = {r} is odd — skip the half-exponent step and pick another a.
          </p>
        )}
      </Panel>

      {even && x != null && xm1 != null && xp1 != null ? (
        <>
          <Panel label="Step 2 — zero product mod N">
            <div className="space-y-1 font-mono text-sm tabular-nums">
              <p>
                a<sup>r</sup> ≡ 1 (mod {N}) ⟹ x<sup>2</sup> ≡ 1 (mod {N})
              </p>
              <p>
                (x − 1)(x + 1) ≡ 0 (mod {N}) — here ({x} − 1)({x} + 1) = {xm1} ·{" "}
                {xp1}
              </p>
            </div>
          </Panel>

          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-grey">
            Euclid steps — f = larger, c = smaller, rem = f − q·c; last nonzero c is
            the gcd
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <EuclideanTable
              title={`gcd(x − 1, N) = gcd(${xm1}, ${N})`}
              a={xm1}
              b={N}
            />
            <EuclideanTable
              title={`gcd(x + 1, N) = gcd(${xp1}, ${N})`}
              a={xp1}
              b={N}
            />
          </div>
        </>
      ) : null}

      <OutcomeBanner {...outcome} />
    </DemoShell>
  );
}
