/**
 * Pure teaching models for measurement & Born-rule demos.
 * Real amplitudes only (phases omitted for clarity).
 */

export type Complex = { re: number; im: number };

export const BASIS_1 = ["0", "1"] as const;
export const BASIS_2 = ["00", "01", "10", "11"] as const;

export function prob(c: Complex): number {
  return c.re * c.re + c.im * c.im;
}

export function probs(amplitudes: readonly Complex[]): number[] {
  return amplitudes.map(prob);
}

export function realAmp(magnitude: number): Complex {
  return { re: magnitude, im: 0 };
}

/** Renormalize amplitudes; empty norm falls back to |0⟩. */
export function normalize(amplitudes: readonly Complex[]): Complex[] {
  const sum = amplitudes.reduce((s, a) => s + prob(a), 0);
  if (sum < 1e-12) {
    const out = amplitudes.map(() => ({ re: 0, im: 0 }));
    if (out.length > 0) out[0] = { re: 1, im: 0 };
    return out;
  }
  const scale = 1 / Math.sqrt(sum);
  return amplitudes.map((a) => ({ re: a.re * scale, im: a.im * scale }));
}

/** Build a normalized 1-qubit state from non-negative magnitudes. */
export function qubitFromMagnitudes(m0: number, m1: number): Complex[] {
  return normalize([realAmp(Math.max(0, m0)), realAmp(Math.max(0, m1))]);
}

/** Sample an index from an unnormalized or normalized probability list. */
export function sampleFromProbs(
  p: readonly number[],
  rng: () => number = Math.random,
): number {
  const total = p.reduce((s, x) => s + x, 0);
  if (total <= 0 || p.length === 0) return 0;
  let r = rng() * total;
  for (let i = 0; i < p.length; i++) {
    r -= p[i]!;
    if (r <= 0) return i;
  }
  return p.length - 1;
}

/** |00⟩=0, |01⟩=1, |10⟩=2, |11⟩=3 — q0 is the left bit. */
export function indexToBits(index: number): [q0: number, q1: number] {
  const q1 = index & 1;
  const q0 = (index >> 1) & 1;
  return [q0, q1];
}

export function bitsToIndex(q0: number, q1: number): number {
  return q0 * 2 + q1;
}

export type PartialMeasureResult = {
  qubitIndex: 0 | 1;
  outcome: 0 | 1;
  probability: number;
  /** Full 2-qubit state after collapse (renormalized, two nonzero entries). */
  collapsed4: Complex[];
  /** Renormalized amplitudes of the unmeasured qubit in |0⟩,|1⟩ order. */
  remaining2: Complex[];
  survivingLabels: string[];
};

function indicesForOutcome(qubitIndex: 0 | 1, outcome: 0 | 1): number[] {
  return [0, 1, 2, 3].filter((i) => {
    const [q0, q1] = indexToBits(i);
    const bit = qubitIndex === 0 ? q0 : q1;
    return bit === outcome;
  });
}

function remainingPair(
  amplitudes4: readonly Complex[],
  qubitIndex: 0 | 1,
  outcome: 0 | 1,
): Complex[] {
  const pair = indicesForOutcome(qubitIndex, outcome).map((i) => amplitudes4[i]!);
  if (qubitIndex === 0) {
    // Measured q0; remaining is q1: |00⟩,|01⟩ or |10⟩,|11⟩
    return normalize(pair);
  }
  // Measured q1; remaining is q0: |00⟩,|10⟩ or |01⟩,|11⟩
  return normalize(pair);
}

/** Partial measurement of one qubit in a 2-qubit register. */
export function partialMeasure(
  amplitudes4: readonly Complex[],
  qubitIndex: 0 | 1,
  rng: () => number = Math.random,
): PartialMeasureResult {
  const state = normalize(amplitudes4);
  const p0 = indicesForOutcome(qubitIndex, 0).reduce(
    (s, i) => s + prob(state[i]!),
    0,
  );
  const p1 = 1 - p0;
  const outcome = sampleFromProbs([p0, p1], rng) as 0 | 1;
  const probability = outcome === 0 ? p0 : p1;

  const surviving = indicesForOutcome(qubitIndex, outcome);
  const collapsed4 = [0, 1, 2, 3].map((i) =>
    surviving.includes(i) ? { ...state[i]! } : { re: 0, im: 0 },
  );
  const collapsedNorm = normalize(collapsed4);
  const remaining2 = remainingPair(state, qubitIndex, outcome);
  const survivingLabels = surviving
    .filter((i) => prob(collapsedNorm[i]!) > 1e-12)
    .map((i) => BASIS_2[i]!);

  return {
    qubitIndex,
    outcome,
    probability,
    collapsed4: collapsedNorm,
    remaining2,
    survivingLabels,
  };
}

export type TwoQubitPreset = {
  id: string;
  label: string;
  amplitudes: Complex[];
};

const INV_SQRT2 = 1 / Math.sqrt(2);

export const TWO_QUBIT_PRESETS: TwoQubitPreset[] = [
  {
    id: "bell",
    label: "Bell-like (entangled)",
    amplitudes: normalize([
      realAmp(INV_SQRT2),
      realAmp(0),
      realAmp(0),
      realAmp(INV_SQRT2),
    ]),
  },
  {
    id: "product-h",
    label: "Product H|0⟩⊗|0⟩",
    amplitudes: normalize([
      realAmp(INV_SQRT2),
      realAmp(0),
      realAmp(INV_SQRT2),
      realAmp(0),
    ]),
  },
  {
    id: "product-0",
    label: "Product |0⟩⊗|0⟩",
    amplitudes: normalize([
      realAmp(1),
      realAmp(0),
      realAmp(0),
      realAmp(0),
    ]),
  },
];

/** Apply Hadamard to a single qubit (real, from |0⟩ or |1⟩ or superposition). */
export function applyH(amplitudes: readonly Complex[]): Complex[] {
  const a0 = amplitudes[0] ?? { re: 0, im: 0 };
  const a1 = amplitudes[1] ?? { re: 0, im: 0 };
  const h0 = {
    re: (a0.re + a1.re) * INV_SQRT2,
    im: (a0.im + a1.im) * INV_SQRT2,
  };
  const h1 = {
    re: (a0.re - a1.re) * INV_SQRT2,
    im: (a0.im - a1.im) * INV_SQRT2,
  };
  return normalize([h0, h1]);
}

/** Pauli X on one qubit. */
export function applyX(amplitudes: readonly Complex[]): Complex[] {
  const a0 = amplitudes[0] ?? { re: 0, im: 0 };
  const a1 = amplitudes[1] ?? { re: 0, im: 0 };
  return [a1, a0];
}

/** Projective measurement of a single qubit; returns collapsed basis state. */
export function measureQubit(
  amplitudes: readonly Complex[],
  rng: () => number = Math.random,
): { outcome: 0 | 1; probability: number; collapsed: Complex[] } {
  const state = normalize(amplitudes);
  const p0 = prob(state[0]!);
  const p1 = prob(state[1]!);
  const outcome = sampleFromProbs([p0, p1], rng) as 0 | 1;
  const collapsed =
    outcome === 0
      ? [{ re: 1, im: 0 }, { re: 0, im: 0 }]
      : [{ re: 0, im: 0 }, { re: 1, im: 0 }];
  return { outcome, probability: outcome === 0 ? p0 : p1, collapsed };
}

/**
 * Stand-in prior for an unknown shelf qubit when sampling a first measurement.
 * Not a claim that the shelf "is" this superposition — only a fair coin for demos.
 */
export function shelfState(): Complex[] {
  return normalize([realAmp(1), realAmp(1)]);
}

/** |0⟩ */
export function ket0(): Complex[] {
  return [{ re: 1, im: 0 }, { re: 0, im: 0 }];
}

/** Format probability as percent string. */
export function pct(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}
