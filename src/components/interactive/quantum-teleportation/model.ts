/** Teleportation + GHZ math (Mermin §§6.5–6.6). */

export type MeasureKey = "00" | "01" | "10" | "11";
export type Basis = "Z" | "H";
export type TextbookCase = "all-z" | "hh-z" | "h-zh" | "z-hh" | "other";

export const MEASURE_KEYS: MeasureKey[] = ["00", "01", "10", "11"];

/** Alice bits (ψ, A_ent) → Bob’s Pauli. Order matches Mermin (6.24)–(6.25). */
export const CORRECTION: Record<
  MeasureKey,
  { gate: string; bobKet: string; note: string }
> = {
  "00": { gate: "I", bobKet: "α|0⟩+β|1⟩", note: "already |ψ⟩" },
  "01": { gate: "X", bobKet: "α|1⟩+β|0⟩", note: "needs X" },
  "10": { gate: "Z", bobKet: "α|0⟩−β|1⟩", note: "needs Z" },
  "11": { gate: "ZX", bobKet: "α|1⟩−β|0⟩", note: "needs ZX" },
};

/** Bob’s amplitudes before the Pauli named by Alice’s two bits. */
export function bobBeforeCorrection(
  alpha: number,
  beta: number,
  key: MeasureKey,
): [number, number] {
  switch (key) {
    case "00":
      return [alpha, beta];
    case "01":
      return [beta, alpha];
    case "10":
      return [alpha, -beta];
    case "11":
      return [-beta, alpha];
  }
}

/** Apply Bob’s correction; returns |ψ⟩ = α|0⟩+β|1⟩ (global phase stripped for 11). */
export function applyCorrection(
  a0: number,
  a1: number,
  key: MeasureKey,
): [number, number] {
  switch (key) {
    case "00":
      return [a0, a1];
    case "01":
      // X
      return [a1, a0];
    case "10":
      // Z
      return [a0, -a1];
    case "11": {
      // ZX = Z∘X: X then Z
      const afterX: [number, number] = [a1, a0];
      return [afterX[0], -afterX[1]];
    }
  }
}

// —— GHZ (Mermin 6.26)–(6.37) ——

/** |Ψ⟩ = ½(|000⟩ − |110⟩ − |011⟩ − |101⟩), indexed as x₂x₁x₀. */
export const GHZ_STATE: readonly number[] = (() => {
  const psi = new Array<number>(8).fill(0);
  psi[0b000] = 0.5;
  psi[0b011] = -0.5;
  psi[0b101] = -0.5;
  psi[0b110] = -0.5;
  return psi;
})();

function compIndex(x2: number, x1: number, x0: number): number {
  return x2 * 4 + x1 * 2 + x0;
}

function basisFactor(zBit: number, outcome: number, basis: Basis): number {
  if (basis === "Z") return zBit === outcome ? 1 : 0;
  const invSqrt2 = 1 / Math.sqrt(2);
  // H-basis: 0 → |+⟩, 1 → |−⟩
  return outcome === 0 ? invSqrt2 : zBit === 0 ? invSqrt2 : -invSqrt2;
}

export function ghzOutcomeAmplitude(
  outcome: [number, number, number],
  settings: [Basis, Basis, Basis],
): number {
  let amp = 0;
  for (let x2 = 0; x2 <= 1; x2++) {
    for (let x1 = 0; x1 <= 1; x1++) {
      for (let x0 = 0; x0 <= 1; x0++) {
        const idx = compIndex(x2, x1, x0);
        amp +=
          GHZ_STATE[idx]! *
          basisFactor(x2, outcome[0], settings[0]) *
          basisFactor(x1, outcome[1], settings[1]) *
          basisFactor(x0, outcome[2], settings[2]);
      }
    }
  }
  return amp;
}

export function ghzDistribution(settings: [Basis, Basis, Basis]): {
  outcome: [number, number, number];
  prob: number;
}[] {
  const rows: { outcome: [number, number, number]; prob: number }[] = [];
  for (let o2 = 0; o2 <= 1; o2++) {
    for (let o1 = 0; o1 <= 1; o1++) {
      for (let o0 = 0; o0 <= 1; o0++) {
        const outcome: [number, number, number] = [o2, o1, o0];
        const amp = ghzOutcomeAmplitude(outcome, settings);
        const prob = amp * amp;
        if (prob > 1e-12) rows.push({ outcome, prob });
      }
    }
  }
  const total = rows.reduce((s, r) => s + r.prob, 0);
  return rows.map((r) => ({ ...r, prob: r.prob / total }));
}

export function sampleGhzOutcome(
  settings: [Basis, Basis, Basis],
  rng: () => number = Math.random,
): [number, number, number] {
  const dist = ghzDistribution(settings);
  let r = rng();
  for (const row of dist) {
    r -= row.prob;
    if (r <= 0) return row.outcome;
  }
  return dist[dist.length - 1]!.outcome;
}

export function detectGhzCase(settings: [Basis, Basis, Basis]): TextbookCase {
  const [s2, s1, s0] = settings;
  if (s2 === "Z" && s1 === "Z" && s0 === "Z") return "all-z";
  if (s2 === "H" && s1 === "H" && s0 === "Z") return "hh-z";
  if (s2 === "H" && s1 === "Z" && s0 === "H") return "h-zh";
  if (s2 === "Z" && s1 === "H" && s0 === "H") return "z-hh";
  return "other";
}

export function expectedGhzParity(caseId: TextbookCase): number | null {
  if (caseId === "all-z") return 0;
  if (caseId === "other") return null;
  return 1;
}

export function outcomeParity(outcome: [number, number, number]): number {
  return outcome[0] ^ outcome[1] ^ outcome[2];
}
