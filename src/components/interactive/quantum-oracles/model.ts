/** Bit vector as 0/1 array; index 0 is the leftmost (MSB) bit in display. */
export type BitVec = number[];

export function bitsToString(bits: BitVec): string {
  return bits.map((b) => (b ? "1" : "0")).join("");
}

export function parseBits(s: string): BitVec {
  return s.split("").map((c) => (c === "1" ? 1 : 0));
}

export function randomBitVec(n: number, forceNonZero = false): BitVec {
  let bits = Array.from({ length: n }, () =>
    Math.random() < 0.5 ? 1 : 0,
  );
  if (forceNonZero && !bits.some((b) => b === 1)) {
    bits = bits.map((b, i) => (i === n - 1 ? 1 : b));
  }
  return bits;
}

/** Mod-2 inner product a · x = Σ aᵢxᵢ (mod 2). */
export function bitDot(a: BitVec, x: BitVec): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum ^= a[i] & x[i];
  }
  return sum;
}

/** Bernstein–Vazirani: one quantum query reveals the hidden string. */
export function bvSolve(secret: BitVec): BitVec {
  return [...secret];
}

export function classicalBvQueryCount(n: number): number {
  return n;
}

/** Classical BV: query basis vector eᵢ to learn secret bit aᵢ. */
export function classicalBvRevealBit(secret: BitVec, bitIndex: number): number {
  const x = secret.map((_, i) => (i === bitIndex ? 1 : 0));
  return bitDot(secret, x);
}

/** Simon: sample y with y · a ≡ 0 (mod 2). */
export function simonSampleY(period: BitVec): BitVec {
  const n = period.length;
  const aOnes = period
    .map((b, i) => (b === 1 ? i : -1))
    .filter((i) => i >= 0);
  const aZeros = period
    .map((b, i) => (b === 0 ? i : -1))
    .filter((i) => i >= 0);

  if (aOnes.length === 0) {
    return randomBitVec(n, true);
  }

  let y = randomBitVec(n);

  if (bitDot(y, period) === 1) {
    y[aOnes[Math.floor(Math.random() * aOnes.length)]] ^= 1;
  }

  if (y.every((b) => b === 0)) {
    y = [...y];
    if (aZeros.length > 0) {
      y[aZeros[Math.floor(Math.random() * aZeros.length)]] = 1;
    } else {
      y[0] = 1;
      if (n > 1) y[1] = 1;
    }
  }

  return y;
}

function rowReduceMod2(rows: BitVec[]): { rank: number; rref: BitVec[] } {
  const k = rows.length;
  const n = rows[0]?.length ?? 0;
  const A = rows.map((r) => [...r]);
  let rank = 0;

  for (let col = 0; col < n && rank < k; col++) {
    let pivot = -1;
    for (let r = rank; r < k; r++) {
      if (A[r][col] === 1) {
        pivot = r;
        break;
      }
    }
    if (pivot === -1) continue;

    if (pivot !== rank) {
      [A[rank], A[pivot]] = [A[pivot], A[rank]];
    }

    for (let r = 0; r < k; r++) {
      if (r !== rank && A[r][col] === 1) {
        for (let c = col; c < n; c++) {
          A[r][c] ^= A[rank][c];
        }
      }
    }
    rank++;
  }

  return { rank, rref: A };
}

export function simonRank(ys: BitVec[]): number {
  if (ys.length === 0) return 0;
  return rowReduceMod2(ys).rank;
}

/** Recover hidden period a (non-zero) from Simon samples, or null if under-determined. */
export function solveSimonFromYs(ys: BitVec[], n: number): BitVec | null {
  if (ys.length === 0) return null;

  const { rank, rref } = rowReduceMod2(ys);
  if (rank >= n) return null;

  const pivotCols: number[] = [];
  for (let row = 0; row < rank; row++) {
    let pc = -1;
    for (let col = 0; col < n; col++) {
      if (rref[row][col] === 1) {
        pc = col;
        break;
      }
    }
    if (pc >= 0) pivotCols.push(pc);
  }

  const pivotSet = new Set(pivotCols);
  const freeCols = [...Array(n).keys()].filter((c) => !pivotSet.has(c));
  if (freeCols.length === 0) return null;

  const a: BitVec = Array.from({ length: n }, () => 0);
  a[freeCols[0]] = 1;

  for (let row = 0; row < rank; row++) {
    const pc = pivotCols[row];
    let val = 0;
    for (const fc of freeCols) {
      if (a[fc]) val ^= rref[row][fc];
    }
    a[pc] = val;
  }

  return a.every((b) => b === 0) ? null : a;
}

/** Toffoli (ccNOT): flip target iff both controls are 1. */
export function toffoli(c1: number, c2: number, target: number): number {
  return target ^ (c1 & c2);
}

const SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

function subIndex(i: number): string {
  return String(i)
    .split("")
    .map((d) => SUB[Number(d)] ?? d)
    .join("");
}

/** Constraint on unknown a from a measured Simon sample y: y · a = 0. */
export function formatDotEquation(y: BitVec): string {
  const terms = y
    .map((b, i) => (b ? `a${subIndex(i)}` : null))
    .filter((t): t is string => t != null);
  if (terms.length === 0) return "0 · a = 0";
  return `${terms.join(" ⊕ ")} = 0`;
}
