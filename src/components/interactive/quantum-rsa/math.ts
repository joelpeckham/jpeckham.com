/** Tiny RSA / order-finding helpers for teaching demos (Mermin Ch. 3). */

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

export function modPow(base: number, exp: number, mod: number): number {
  if (mod <= 0) return 0;
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

/** Extended Euclidean: returns { g, x, y } with a x + b y = g. */
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

/** Inverse of c mod m, or null if gcd ≠ 1. */
export function modInverse(c: number, m: number): number | null {
  const { g, x } = egcd(c, m);
  if (g !== 1) return null;
  return ((x % m) + m) % m;
}

/** Order of a in G_N: smallest r > 0 with a^r ≡ 1 (mod N). */
export function order(a: number, N: number, max = 10_000): number | null {
  if (N <= 1 || gcd(a, N) !== 1) return null;
  let pow = 1;
  for (let r = 1; r <= max; r++) {
    pow = (pow * (a % N)) % N;
    if (pow === 1) return r;
  }
  return null;
}

/** Members of G_N: positives < N coprime to N. */
export function groupGN(N: number): number[] {
  const out: number[] = [];
  for (let a = 1; a < N; a++) {
    if (gcd(a, N) === 1) out.push(a);
  }
  return out;
}

export type RsaKey = {
  p: number;
  q: number;
  N: number;
  phi: number;
  c: number;
  d: number;
};

export const RSA_PRESETS: RsaKey[] = [
  { p: 3, q: 5, N: 15, phi: 8, c: 3, d: 3 },
  { p: 5, q: 7, N: 35, phi: 24, c: 5, d: 5 },
  { p: 3, q: 11, N: 33, phi: 20, c: 3, d: 7 },
];

export function encrypt(a: number, c: number, N: number): number {
  return modPow(a, c, N);
}

export function decrypt(b: number, d: number, N: number): number {
  return modPow(b, d, N);
}

/** Powers a^1, a^2, … until 1 (mod N), for order-finding toy. */
export function powerLadder(a: number, N: number, max = 64): number[] {
  const steps: number[] = [];
  let pow = 1;
  for (let k = 1; k <= max; k++) {
    pow = (pow * (a % N)) % N;
    steps.push(pow);
    if (pow === 1) break;
  }
  return steps;
}
