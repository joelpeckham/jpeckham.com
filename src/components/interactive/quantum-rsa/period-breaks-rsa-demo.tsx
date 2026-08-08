"use client";

import { useMemo, useState } from "react";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import {
  RSA_PRESETS,
  encrypt,
  groupGN,
  modInverse,
  modPow,
  order,
} from "./math";

/**
 * Scrubber: Eve learns the order r of ciphertext b, then recovers a
 * without factoring N (Mermin Table 3.1 / §3.3).
 */
export function PeriodBreaksRsaDemo() {
  const [keyId, setKeyId] = useState(0);
  const key = RSA_PRESETS[keyId] ?? RSA_PRESETS[0];
  const messages = useMemo(() => {
    // Prefer nontrivial plaintexts in G_N (skip 1 — encrypts to itself).
    return groupGN(key.N).filter((a) => a > 1).slice(0, 12);
  }, [key]);
  const [a, setA] = useState(2);
  const safeA = messages.includes(a) ? a : (messages[0] ?? 2);

  const b = encrypt(safeA, key.c, key.N);
  const r = order(b, key.N);
  const [reveal, setReveal] = useState(0); // 0..3 scrubber steps

  const attack = useMemo(() => {
    if (r == null) return null;
    const dPrime = modInverse(key.c, r);
    if (dPrime == null) {
      return { r, dPrime: null as number | null, recovered: null as number | null };
    }
    const recovered = modPow(b, dPrime, key.N);
    return { r, dPrime, recovered };
  }, [r, key, b]);

  const orderA = order(safeA, key.N);

  const steps = [
    {
      title: "Public view",
      detail: `Eve sees N=${key.N}, c=${key.c}, ciphertext b=${b}. She does not know p, q, φ(N)=${key.phi}, or d.`,
    },
    {
      title: "Find period r of b",
      detail:
        r != null
          ? `Period finding returns r=${r} with b^r ≡ 1 (mod N). Same r as order of plaintext a` +
            (orderA != null ? ` (order(a)=${orderA})` : "") +
            "."
          : "Could not find order.",
    },
    {
      title: "Invert c modulo r",
      detail:
        attack?.dPrime != null
          ? `Classically compute d′ with c·d′ ≡ 1 (mod r): d′=${attack.dPrime}. Works because gcd(c, r)=1 when Bob chose c coprime to φ(N).`
          : "No inverse — c shares a factor with r (should not happen for Bob’s c).",
    },
    {
      title: "Decode",
      detail:
        attack?.recovered != null
          ? `a ≡ b^{d′} ≡ ${b}^${attack.dPrime} ≡ ${attack.recovered} (mod ${key.N}). No factors of N required.`
          : "Decode failed.",
    },
  ];

  return (
    <DemoShell
      title="Why the period breaks RSA"
      blurb="Drag the scrubber. Eve never factors N — she only needs the order of the ciphertext in G_N, then inverts c mod that order."
      accent="red"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Toy key
          <select
            className={controlSelect}
            value={keyId}
            onChange={(e) => {
              const next = Number(e.target.value);
              setKeyId(next);
              const k = RSA_PRESETS[next] ?? RSA_PRESETS[0];
              const first = groupGN(k.N).find((x) => x > 1) ?? 2;
              setA(first);
              setReveal(0);
            }}
          >
            {RSA_PRESETS.map((k, i) => (
              <option key={k.N} value={i}>
                N={k.N}, c={k.c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Alice’s message a
          <select
            className={controlSelect}
            value={safeA}
            onChange={(e) => {
              setA(Number(e.target.value));
              setReveal(0);
            }}
          >
            {messages.map((m) => (
              <option key={m} value={m}>
                a = {m} → b = {encrypt(m, key.c, key.N)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip>
          b ≡ a<sup>c</sup> ≡ {b}
        </Chip>
        {r != null ? <Chip tone="warn">order(b) = {r}</Chip> : null}
        <Chip tone="ink">Bob’s d stays secret</Chip>
      </div>

      <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
        Attack step ({reveal + 1} / {steps.length})
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={reveal}
          onChange={(e) => setReveal(Number(e.target.value))}
          className="w-full accent-ink"
        />
      </label>

      <Panel label={steps[reveal]?.title}>
        <p className="text-sm leading-relaxed">{steps[reveal]?.detail}</p>
      </Panel>

      {reveal === 3 && attack?.recovered != null ? (
        <OutcomeBanner
          tone={attack.recovered === safeA ? "ok" : "bad"}
          title={
            attack.recovered === safeA
              ? "Eve recovered the message"
              : "Recovery mismatch"
          }
          detail={`Plaintext a = ${attack.recovered}. Factoring was never required — only period finding plus classical modular inverse.`}
        />
      ) : null}
    </DemoShell>
  );
}
