"use client";

import { useMemo, useState } from "react";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import { gcd, groupGN, powerLadder } from "./math";

const N_OPTIONS = [15, 21, 33, 35] as const;

export function OrderFindingDemo() {
  const [N, setN] = useState<(typeof N_OPTIONS)[number]>(15);
  const members = useMemo(() => groupGN(N), [N]);
  const [a, setA] = useState(2);

  const safeA = members.includes(a) ? a : (members[0] ?? 1);
  const ladder = useMemo(() => powerLadder(safeA, N), [safeA, N]);
  const r = ladder[ladder.length - 1] === 1 ? ladder.length : null;

  return (
    <DemoShell
      title="Order-finding toy"
      blurb="Start at a, keep multiplying by a mod N. The first time you hit 1, the exponent is the order r — also the period of f(x) = aˣ mod N."
      accent="yellow"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Modulus N
          <select
            className={controlSelect}
            value={N}
            onChange={(e) => {
              const next = Number(e.target.value) as (typeof N_OPTIONS)[number];
              setN(next);
              const g = groupGN(next);
              setA(g[0] ?? 1);
            }}
          >
            {N_OPTIONS.map((n) => (
              <option key={n} value={n}>
                N = {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Base a ∈ G<sub>N</sub>
          <select
            className={controlSelect}
            value={safeA}
            onChange={(e) => setA(Number(e.target.value))}
          >
            {members.map((m) => (
              <option key={m} value={m}>
                a = {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Panel label={`Powers of ${safeA} mod ${N}`}>
        <div className="flex flex-wrap gap-2">
          {ladder.map((val, i) => {
            const k = i + 1;
            const hit = val === 1;
            return (
              <div
                key={k}
                className="flex flex-col items-center gap-1 border-2 border-ink px-2 py-1"
              >
                <span className="font-mono text-[10px] text-grey">
                  a<sup>{k}</sup>
                </span>
                <Chip tone={hit ? "ok" : "ink"}>{val}</Chip>
              </div>
            );
          })}
        </div>
      </Panel>

      <p className="font-mono text-xs text-grey">
        G<sub>N</sub> = {"{"}numbers &lt; N with gcd = 1{"}"} has {members.length}{" "}
        elements. gcd({safeA}, {N}) = {gcd(safeA, N)}.
      </p>

      {r != null ? (
        <OutcomeBanner
          tone="ok"
          title={`Order r = ${r}`}
          detail={`${safeA}^${r} ≡ 1 (mod ${N}), and no smaller positive exponent works. This r is what Shor’s period finder aims at.`}
        />
      ) : (
        <OutcomeBanner
          tone="warn"
          title="No return within cap"
          detail="Toy search stopped before hitting 1."
        />
      )}
    </DemoShell>
  );
}
