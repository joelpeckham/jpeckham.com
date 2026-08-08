"use client";

import { useMemo, useState } from "react";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  controlInput,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import {
  RSA_PRESETS,
  decrypt,
  encrypt,
  gcd,
  type RsaKey,
} from "./math";

export function TinyRsaDemo() {
  const [keyId, setKeyId] = useState(0);
  const key: RsaKey = RSA_PRESETS[keyId] ?? RSA_PRESETS[0];
  const [message, setMessage] = useState("2");

  const a = Number.parseInt(message, 10);
  const valid =
    Number.isFinite(a) && a > 0 && a < key.N && gcd(a, key.N) === 1
      ? a
      : null;

  const result = useMemo(() => {
    if (valid == null) return null;
    const b = encrypt(valid, key.c, key.N);
    const recovered = decrypt(b, key.d, key.N);
    return { b, recovered };
  }, [valid, key]);

  const cd = key.c * key.d;

  return (
    <DemoShell
      title="Tiny RSA encrypt / decrypt"
      blurb="Pick toy primes. Encode a message a with public (N, c). Bob’s secret d pulls a back."
      accent="blue"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Key pair
          <select
            className={controlSelect}
            value={keyId}
            onChange={(e) => setKeyId(Number(e.target.value))}
          >
            {RSA_PRESETS.map((k, i) => (
              <option key={k.N} value={i}>
                p={k.p}, q={k.q} → N={k.N}, c={k.c}, d={k.d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Message a ∈ G<sub>N</sub>
          <input
            className={controlInput}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            inputMode="numeric"
            aria-label="Message a"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip>N = pq = {key.N}</Chip>
        <Chip>φ(N) = (p−1)(q−1) = {key.phi}</Chip>
        <Chip tone="ok">
          {key.c}·{key.d} = {cd} ≡ 1 (mod {key.phi})
        </Chip>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel label="Public vs secret">
          <p className="font-mono text-sm">
            Publish N={key.N}, c={key.c}
          </p>
          <p className="mt-1 font-mono text-xs text-grey">
            Keep p={key.p}, q={key.q}, d={key.d} private
          </p>
        </Panel>
        <Panel label="Pipeline">
          {valid == null || result == null ? (
            <p className="font-mono text-sm text-red">
              Pick a with 0 &lt; a &lt; N and gcd(a, N) = 1
            </p>
          ) : (
            <ol className="space-y-1 font-mono text-sm">
              <li>
                b ≡ a<sup>c</sup> ≡ {valid}
                <sup>{key.c}</sup> ≡ {result.b} (mod {key.N})
              </li>
              <li>
                a ≡ b<sup>d</sup> ≡ {result.b}
                <sup>{key.d}</sup> ≡ {result.recovered} (mod {key.N})
              </li>
            </ol>
          )}
        </Panel>
      </div>

      {valid != null && result != null ? (
        <OutcomeBanner
          tone={result.recovered === valid ? "ok" : "bad"}
          title={
            result.recovered === valid
              ? "Round-trip OK"
              : "Decrypt mismatch"
          }
          detail={`Ciphertext b = ${result.b}. Bob recovers a = ${result.recovered}.`}
        />
      ) : null}
    </DemoShell>
  );
}
