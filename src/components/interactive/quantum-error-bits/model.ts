/**
 * Three-qubit bit-flip code (Mermin Ch. 5.1–5.4).
 *
 * Logical codewords: |0̄⟩ = |000⟩, |1̄⟩ = |111⟩ (q₂ q₁ q₀ left-to-right).
 * Encode α|0⟩+β|1⟩ → α|000⟩+β|111⟩ with two CNOTs from the data qubit q₀.
 *
 * Syndrome convention (stabilizers Z₂Z₁ and Z₁Z₀):
 *   s = (parity(q₂ ⊕ q₁), parity(q₁ ⊕ q₀))  as classical bits (s₁, s₀)
 *   00 → no error
 *   01 → X₀  (bit flip on q₀)
 *   11 → X₁  (bit flip on q₁)
 *   10 → X₂  (bit flip on q₂)
 */

import type { AmplitudeEntry } from "@/components/interactive/quantum-shared";
import type { CircuitGate, CircuitWire } from "@/components/interactive/quantum-shared";

export type Complex = { re: number; im: number };

export type ErrorKind = "none" | "x0" | "x1" | "x2";

export type Syndrome = readonly [0 | 1, 0 | 1];

export type LogicalState = {
  alpha: Complex;
  beta: Complex;
  errorKind: ErrorKind;
};

export const BASIS_3 = [
  "000",
  "001",
  "010",
  "011",
  "100",
  "101",
  "110",
  "111",
] as const;

/** Which basis kets carry α (logical |0̄⟩) and β (logical |1̄⟩) for each error. */
export const ERROR_SUPPORT: Record<
  ErrorKind,
  { alpha: (typeof BASIS_3)[number]; beta: (typeof BASIS_3)[number] }
> = {
  none: { alpha: "000", beta: "111" },
  x0: { alpha: "001", beta: "110" },
  x1: { alpha: "010", beta: "101" },
  x2: { alpha: "100", beta: "011" },
};

export const SYNDROME_MAP: Record<ErrorKind, Syndrome> = {
  none: [0, 0],
  x0: [0, 1],
  x1: [1, 1],
  x2: [1, 0],
};

const SYNDROME_TO_ERROR = new Map<string, ErrorKind>(
  (Object.entries(SYNDROME_MAP) as [ErrorKind, Syndrome][]).map(([kind, s]) => [
    `${s[0]}${s[1]}`,
    kind,
  ]),
);

export function prob(c: Complex): number {
  return c.re * c.re + c.im * c.im;
}

export function magnitude(c: Complex): number {
  return Math.sqrt(prob(c));
}

/** Normalize real nonnegative magnitudes to a unit logical state (phases = 0). */
export function normalizeMagnitudes(aMag: number, bMag: number): LogicalState {
  const a = Math.max(0, aMag);
  const b = Math.max(0, bMag);
  const sumSq = a * a + b * b;
  if (sumSq <= 0) {
    return {
      alpha: { re: 1, im: 0 },
      beta: { re: 0, im: 0 },
      errorKind: "none",
    };
  }
  const scale = 1 / Math.sqrt(sumSq);
  return {
    alpha: { re: a * scale, im: 0 },
    beta: { re: b * scale, im: 0 },
    errorKind: "none",
  };
}

/** Place logical |ψ⟩ = α|0⟩+β|1⟩ into the code space (no physical error yet). */
export function encode(alpha: Complex, beta: Complex): LogicalState {
  return { alpha, beta, errorKind: "none" };
}

export function injectError(state: LogicalState, errorKind: ErrorKind): LogicalState {
  return { ...state, errorKind };
}

/** Classical parity bits (q₂⊕q₁, q₁⊕q₀) for a computational-basis label. */
export function basisParities(label: (typeof BASIS_3)[number]): Syndrome {
  const q2 = Number(label[0]) as 0 | 1;
  const q1 = Number(label[1]) as 0 | 1;
  const q0 = Number(label[2]) as 0 | 1;
  return [(q2 ^ q1) as 0 | 1, (q1 ^ q0) as 0 | 1];
}

/** Syndrome from stabilizer parity checks (deterministic for single bit-flip errors). */
export function computeSyndrome(state: LogicalState): Syndrome {
  return SYNDROME_MAP[state.errorKind];
}

export function syndromeToErrorKind(s: Syndrome): ErrorKind {
  return SYNDROME_TO_ERROR.get(`${s[0]}${s[1]}`) ?? "none";
}

/** Apply the corrective X gate; logical amplitudes α, β are unchanged. */
export function correct(state: LogicalState): LogicalState {
  return { ...state, errorKind: "none" };
}

export function physicalAmplitudes(state: LogicalState): AmplitudeEntry[] {
  const { alpha, beta, errorKind } = state;
  const { alpha: aLabel, beta: bLabel } = ERROR_SUPPORT[errorKind];
  return BASIS_3.map((label) => ({
    label,
    re: label === aLabel ? alpha.re : label === bLabel ? beta.re : 0,
    im: label === aLabel ? alpha.im : label === bLabel ? beta.im : 0,
  }));
}

export function errorLabel(kind: ErrorKind): string {
  switch (kind) {
    case "none":
      return "no flip";
    case "x0":
      return "X₀";
    case "x1":
      return "X₁";
    case "x2":
      return "X₂";
  }
}

export function randomErrorKind(): ErrorKind {
  const kinds: ErrorKind[] = ["none", "x0", "x1", "x2"];
  return kinds[Math.floor(Math.random() * kinds.length)]!;
}

/** Random among the three nontrivial flips (for demos that always inject something). */
export function randomFlipKind(): ErrorKind {
  const kinds: ErrorKind[] = ["x0", "x1", "x2"];
  return kinds[Math.floor(Math.random() * kinds.length)]!;
}

export const ENCODE_WIRES: CircuitWire[] = [
  { id: "q2", label: "q₂" },
  { id: "q1", label: "q₁" },
  { id: "q0", label: "q₀ |ψ⟩" },
];

export const ENCODE_COLUMNS: CircuitGate[][] = [
  [{ id: "cnot-01", wires: ["q0", "q1"], label: "X" }],
  [{ id: "cnot-02", wires: ["q0", "q2"], label: "X" }],
];
