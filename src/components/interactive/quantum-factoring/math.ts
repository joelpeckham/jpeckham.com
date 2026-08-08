/** Pure helpers for Shor-style period → factor step (Mermin §3.10). */

export type EuclideanStep = {
  /** Dividend (minuend) at this step — Mermin’s f. */
  f: number;
  /** Divisor (subtrahend) — Mermin’s c. */
  c: number;
  /** Quotient floor(f / c). */
  q: number;
  /** Remainder f − q·c. */
  rem: number;
};

export type FactorResult = {
  ok: boolean;
  reason: string;
  x: number | null;
  /** gcd(x − 1, N) when x is defined. */
  gMinus: number | null;
  /** gcd(x + 1, N) when x is defined. */
  gPlus: number | null;
  /** Nontrivial prime factor (or null on abort). */
  factor1: number | null;
  factor2: number | null;
};

export type FactoringPreset = {
  id: string;
  N: number;
  a: number;
  /** True multiplicative order of a mod N. */
  r: number;
  label: string;
  kind: "success" | "fail-odd-r" | "fail-minus-one";
};

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export function egcd(
  a: number,
  b: number,
): { g: number; x: number; y: number } {
  let r0 = Math.abs(a);
  let r1 = Math.abs(b);
  let s0 = 1;
  let s1 = 0;
  let t0 = 0;
  let t1 = 1;

  while (r1 !== 0) {
    const q = Math.floor(r0 / r1);
    const r2 = r0 - q * r1;
    const s2 = s0 - q * s1;
    const t2 = t0 - q * t1;
    r0 = r1;
    r1 = r2;
    s0 = s1;
    s1 = s2;
    t0 = t1;
    t1 = t2;
  }

  return { g: r0, x: s0, y: t0 };
}

export function modPow(base: number, exp: number, mod: number): number {
  if (mod <= 0) return 0;
  if (!Number.isInteger(exp) || exp < 0) {
    throw new Error("modPow requires a non-negative integer exponent");
  }

  let result = 1;
  let b = ((base % mod) + mod) % mod;
  let e = exp;

  while (e > 0) {
    if (e & 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1;
  }

  return result;
}

/** Smallest r > 0 with a^r ≡ 1 (mod N), or null if not found within maxSteps. */
export function order(a: number, N: number, maxSteps = 512): number | null {
  if (gcd(a, N) !== 1) return null;

  let current = 1;
  for (let r = 1; r <= maxSteps; r++) {
    current = (current * a) % N;
    if (current === 1) return r;
  }

  return null;
}

export function euclideanSteps(a: number, b: number): EuclideanStep[] {
  let f = Math.abs(a);
  let c = Math.abs(b);
  const steps: EuclideanStep[] = [];

  while (c !== 0) {
    const q = Math.floor(f / c);
    const rem = f - q * c;
    steps.push({ f, c, q, rem });
    f = c;
    c = rem;
  }

  return steps;
}

/** Apply Mermin §3.10: even r and a^{r/2} ≢ −1 yield gcd factors. */
export function factorFromPeriod(a: number, r: number, N: number): FactorResult {
  if (!Number.isInteger(r) || r <= 0) {
    return {
      ok: false,
      reason: "invalid r",
      x: null,
      gMinus: null,
      gPlus: null,
      factor1: null,
      factor2: null,
    };
  }

  if (r % 2 !== 0) {
    return {
      ok: false,
      reason: "r odd",
      x: null,
      gMinus: null,
      gPlus: null,
      factor1: null,
      factor2: null,
    };
  }

  const x = modPow(a, r / 2, N);
  const gMinus = gcd(x - 1, N);
  const gPlus = gcd(x + 1, N);

  if (x === N - 1) {
    return {
      ok: false,
      reason: "a^{r/2} ≡ -1",
      x,
      gMinus,
      gPlus,
      factor1: null,
      factor2: null,
    };
  }

  const nontrivial =
    (gMinus > 1 && gMinus < N) || (gPlus > 1 && gPlus < N);

  if (!nontrivial) {
    return {
      ok: false,
      reason: "gcd gave trivial factor",
      x,
      gMinus,
      gPlus,
      factor1: null,
      factor2: null,
    };
  }

  const p = gMinus > 1 && gMinus < N ? gMinus : gPlus;
  const q = N / p;

  return {
    ok: true,
    reason: "factors found",
    x,
    gMinus,
    gPlus,
    factor1: p,
    factor2: q,
  };
}

export const FACTORING_PRESETS: FactoringPreset[] = [
  {
    id: "15-7",
    N: 15,
    a: 7,
    r: 4,
    label: "N=15, a=7 (order 4)",
    kind: "success",
  },
  {
    id: "15-2",
    N: 15,
    a: 2,
    r: 4,
    label: "N=15, a=2 (order 4)",
    kind: "success",
  },
  {
    id: "15-4",
    N: 15,
    a: 4,
    r: 2,
    label: "N=15, a=4 (order 2)",
    kind: "success",
  },
  {
    id: "15-11",
    N: 15,
    a: 11,
    r: 2,
    label: "N=15, a=11 (order 2)",
    kind: "success",
  },
  {
    id: "15-14",
    N: 15,
    a: 14,
    r: 2,
    label: "N=15, a=14 (a^{r/2} ≡ −1)",
    kind: "fail-minus-one",
  },
  {
    id: "21-2",
    N: 21,
    a: 2,
    r: 6,
    label: "N=21, a=2 (order 6)",
    kind: "success",
  },
  {
    id: "21-8",
    N: 21,
    a: 8,
    r: 2,
    label: "N=21, a=8 (order 2)",
    kind: "success",
  },
  {
    id: "21-4",
    N: 21,
    a: 4,
    r: 3,
    label: "N=21, a=4 (order 3, r odd)",
    kind: "fail-odd-r",
  },
  {
    id: "21-5",
    N: 21,
    a: 5,
    r: 6,
    label: "N=21, a=5 (a^{r/2} ≡ −1)",
    kind: "fail-minus-one",
  },
];

export const COPRIME_CHOICES: Record<number, number[]> = {
  15: [2, 4, 7, 8, 11, 13, 14],
  21: [2, 4, 5, 8, 10, 11, 13, 16, 17, 19, 20],
};
