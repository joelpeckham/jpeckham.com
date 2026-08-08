/** Modular exponentiation (base^exp mod mod). */
export function modPow(base: number, exp: number, mod: number): number {
  if (mod <= 0) return 0;
  let result = 1;
  let b = ((base % mod) + mod) % mod;
  let e = Math.max(0, Math.floor(exp));
  while (e > 0) {
    if (e & 1) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1;
  }
  return result;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.trunc(a) * Math.trunc(b)) / gcd(a, b);
}

/**
 * Continued-fraction coefficients a_i for num/den via the Euclidean algorithm.
 * For 0 ≤ y/2ⁿ < 1 the leading coefficient is 0 (standard CF); Mermin's App K
 * inverted form starts at a₀ = ⌊1/x⌋ and omits that leading 0.
 */
export function continuedFractionCoeffs(
  num: number,
  den: number,
  maxTerms = 20,
): number[] {
  if (den === 0) return [];
  let a = Math.abs(Math.trunc(num));
  let b = Math.abs(Math.trunc(den));
  const coeffs: number[] = [];
  for (let i = 0; i < maxTerms && b !== 0; i++) {
    const q = Math.floor(a / b);
    coeffs.push(q);
    [a, b] = [b, a - q * b];
  }
  return coeffs;
}

/** Convergents p/q from continued-fraction coefficients. */
export function convergents(coeffs: number[]): { p: number; q: number }[] {
  const out: { p: number; q: number }[] = [];
  let pPrev = 0;
  let pCurr = 1;
  let qPrev = 1;
  let qCurr = 0;
  for (const ai of coeffs) {
    const p = ai * pCurr + pPrev;
    const q = ai * qCurr + qPrev;
    out.push({ p, q });
    pPrev = pCurr;
    pCurr = p;
    qPrev = qCurr;
    qCurr = q;
  }
  return out;
}

const MAX_QFT_BITS = 6;

/**
 * QFT output probabilities after measuring the modular-exponentiation output
 * and collapsing the input register onto |x0 + kr⟩.
 * Matches Mermin (3.51): p(y) = (1/(2ⁿ m)) |Σ_k exp(2π i k r y / 2ⁿ)|².
 * The overall phase from x₀ drops out of Born probabilities.
 */
export function qftProbabilities(
  nQbits: number,
  period: number,
  x0: number,
): { y: number; p: number }[] {
  const n = Math.min(Math.max(0, Math.floor(nQbits)), MAX_QFT_BITS);
  const dim = 2 ** n;
  const r = Math.max(1, Math.floor(period));
  const x = Math.max(0, Math.floor(x0)) % dim;
  const m = Math.floor((dim - x - 1) / r) + 1;
  const out: { y: number; p: number }[] = [];

  for (let y = 0; y < dim; y++) {
    let sumRe = 0;
    let sumIm = 0;
    for (let k = 0; k < m; k++) {
      const angle = (2 * Math.PI * k * r * y) / dim;
      sumRe += Math.cos(angle);
      sumIm += Math.sin(angle);
    }
    const magSq = sumRe * sumRe + sumIm * sumIm;
    out.push({ y, p: magSq / (dim * m) });
  }
  return out;
}

export type PeriodRecovery = {
  coeffs: number[];
  convergents: { p: number; q: number }[];
  candidates: number[];
  /** Convergent with largest denominator strictly below the period bound. */
  bestGuess: number | null;
  bestConvergent: { p: number; q: number } | null;
};

/**
 * Recover period candidates from a measured QFT peak y / 2ⁿ.
 * Mermin App K: take the convergent with the largest denominator less than
 * the known upper bound on r (here `periodBound`).
 */
export function recoverPeriodFromPeak(
  y: number,
  nQbits: number,
  periodBound: number,
): PeriodRecovery {
  const n = Math.max(0, Math.floor(nQbits));
  const dim = 2 ** n;
  const yy = Math.max(0, Math.floor(y)) % dim;
  const coeffs = continuedFractionCoeffs(yy, dim);
  const conv = convergents(coeffs);
  const bound = Math.max(2, Math.floor(periodBound));

  const underBound = conv.filter(({ q }) => q >= 2 && q < bound);
  const candidates = [
    ...new Set(underBound.map(({ q }) => q)),
  ].sort((a, b) => a - b);

  const bestConvergent =
    underBound.length > 0
      ? underBound.reduce((best, c) => (c.q > best.q ? c : best))
      : null;
  const bestGuess = bestConvergent?.q ?? null;

  return { coeffs, convergents: conv, candidates, bestGuess, bestConvergent };
}

/**
 * Nearest peak index j and distance for y ≈ j·2ⁿ/r.
 * Considers j = 0 … r (so the wrap-around peak at 2ⁿ ≡ 0 is included).
 */
export function nearestPeak(
  y: number,
  nQbits: number,
  period: number,
): { j: number; target: number; distance: number } {
  const dim = 2 ** nQbits;
  const r = Math.max(1, Math.floor(period));
  const spacing = dim / r;
  let bestJ = 0;
  let bestTarget = 0;
  let distance = Infinity;

  for (let j = 0; j <= r; j++) {
    const target = j * spacing;
    const d = Math.abs(y - target);
    if (d < distance) {
      distance = d;
      bestJ = j % r;
      // Display target in [0, 2ⁿ); the j=r peak sits at 2ⁿ ≡ 0.
      bestTarget = target >= dim ? 0 : target;
    }
  }

  return { j: bestJ, target: bestTarget, distance };
}

/** Integer y values near QFT peaks j·2ⁿ/r (within tolerance). */
export function peakYValues(
  nQbits: number,
  period: number,
  tolerance = 0.5,
): number[] {
  const dim = 2 ** nQbits;
  const r = Math.max(1, period);
  const ys: number[] = [];
  for (let j = 0; j < r; j++) {
    const target = (j * dim) / r;
    ys.push(Math.round(target) % dim);
    if (tolerance > 0) {
      const lo = Math.ceil(target - tolerance);
      const hi = Math.floor(target + tolerance);
      for (let y = lo; y <= hi; y++) {
        const yy = ((y % dim) + dim) % dim;
        ys.push(yy);
      }
    }
  }
  return [...new Set(ys)].sort((a, b) => a - b);
}
