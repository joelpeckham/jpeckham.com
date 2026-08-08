/**
 * Pure Grover search math for teaching demos.
 * Amplitudes are complex numbers as { re, im }; probability = |amp|².
 */

export type Complex = { re: number; im: number };

export type GroverDemoSize = 8 | 16;

export const GROVER_DEMO_SIZES: GroverDemoSize[] = [8, 16];

/** Number of qubits for a Hilbert-space dimension N = 2^n. */
export function qubitCount(N: number): number {
  return Math.round(Math.log2(N));
}

/** Binary basis label for index i (e.g. 3 → "011" when n=3). */
export function basisLabel(index: number, n: number): string {
  return index.toString(2).padStart(n, "0");
}

/** |amp|² */
export function probability(amp: Complex): number {
  return amp.re * amp.re + amp.im * amp.im;
}

/** Uniform superposition |s⟩ = H^⊗n |0⟩ — every amplitude 1/√N. */
export function initialAmplitudes(N: number): Complex[] {
  const amp = 1 / Math.sqrt(N);
  return Array.from({ length: N }, () => ({ re: amp, im: 0 }));
}

/** Oracle V: flip the sign of every marked basis state. */
export function applyOracle(
  amplitudes: readonly Complex[],
  marked: readonly number[],
): Complex[] {
  const flip = new Set(marked);
  return amplitudes.map((a, i) =>
    flip.has(i) ? { re: -a.re, im: -a.im } : { re: a.re, im: a.im },
  );
}

/** Diffusion W = 2|s⟩⟨s| − I — inversion about the uniform mean. */
export function applyDiffusion(amplitudes: readonly Complex[]): Complex[] {
  const N = amplitudes.length;
  let sumRe = 0;
  let sumIm = 0;
  for (const a of amplitudes) {
    sumRe += a.re;
    sumIm += a.im;
  }
  const meanRe = sumRe / N;
  const meanIm = sumIm / N;
  return amplitudes.map((a) => ({
    re: 2 * meanRe - a.re,
    im: 2 * meanIm - a.im,
  }));
}

/** One Grover iteration: W V. */
export function groverStep(
  amplitudes: readonly Complex[],
  marked: readonly number[],
): Complex[] {
  return applyDiffusion(applyOracle(amplitudes, marked));
}

/** Apply k Grover iterations from a starting state. */
export function runGrover(
  amplitudes: readonly Complex[],
  marked: readonly number[],
  iterations: number,
): Complex[] {
  let state = amplitudes.map((a) => ({ re: a.re, im: a.im }));
  for (let k = 0; k < iterations; k++) {
    state = groverStep(state, marked);
  }
  return state;
}

/** Grover angle θ with sin θ = √(m/N). */
export function groverAngle(N: number, markedCount = 1): number {
  const m = Math.max(1, Math.min(markedCount, N));
  return Math.asin(Math.sqrt(m / N));
}

/** Optimal iteration count ≈ ⌊π / (4θ)⌋ ≈ ⌊(π/4)√(N/m)⌋. */
export function optimalIterations(N: number, markedCount = 1): number {
  const m = Math.max(1, Math.min(markedCount, N));
  const theta = groverAngle(N, m);
  return Math.floor(Math.PI / (4 * theta));
}

/** Total probability mass on marked indices. */
export function probabilityOfMarked(
  amplitudes: readonly Complex[],
  marked: readonly number[],
): number {
  let total = 0;
  for (const i of marked) {
    total += probability(amplitudes[i]);
  }
  return total;
}

/** Probability of a single basis index. */
export function probabilityAt(
  amplitudes: readonly Complex[],
  index: number,
): number {
  return probability(amplitudes[index]);
}

/** Sum of all basis probabilities (should stay ≈ 1). */
export function totalProbability(amplitudes: readonly Complex[]): number {
  return amplitudes.reduce((sum, a) => sum + probability(a), 0);
}

/** Map amplitudes to AmplitudeBar entries. */
export function toAmplitudeEntries(
  amplitudes: readonly Complex[],
  n: number,
): { label: string; re: number; im: number }[] {
  return amplitudes.map((a, i) => ({
    label: basisLabel(i, n),
    re: a.re,
    im: a.im,
  }));
}

/**
 * 2D rotation picture in the span of |a⟩ (vertical) and |a⊥⟩ (horizontal).
 * After k iterations the state is at angle (2k+1)θ from |a⊥⟩ toward |a⟩.
 */
export function rotationComponents(
  iterations: number,
  N: number,
  markedCount = 1,
): { aPerp: number; aParallel: number; angleRad: number } {
  const theta = groverAngle(N, markedCount);
  const angleRad = (2 * iterations + 1) * theta;
  return {
    aPerp: Math.cos(angleRad),
    aParallel: Math.sin(angleRad),
    angleRad,
  };
}

/** First m indices — convenient default marked set for multi-mark demo. */
export function defaultMarkedSet(count: number, N = 16): number[] {
  const m = Math.max(1, Math.min(count, N));
  return Array.from({ length: m }, (_, i) => i);
}

/** Sample a computational-basis index by the Born rule. */
export function sampleBasisOutcome(amplitudes: readonly Complex[]): number {
  let r = Math.random();
  for (let i = 0; i < amplitudes.length; i++) {
    r -= probability(amplitudes[i]);
    if (r <= 0) return i;
  }
  return amplitudes.length - 1;
}
