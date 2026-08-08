import { describe, expect, it } from "vitest";
import {
  continuedFractionCoeffs,
  convergents,
  lcm,
  nearestPeak,
  peakYValues,
  qftProbabilities,
  recoverPeriodFromPeak,
} from "./math";

describe("continuedFractionCoeffs / convergents", () => {
  it("expands 11490/2^14 as in Mermin App K Ex.1", () => {
    const coeffs = continuedFractionCoeffs(11490, 2 ** 14);
    expect(coeffs.slice(0, 6)).toEqual([0, 1, 2, 2, 1, 7]);
    const conv = convergents(coeffs);
    expect(conv[5]).toEqual({ p: 54, q: 77 });
  });

  it("expands App K Ex.2 peaks to 9/13 and 5/6", () => {
    const a = recoverPeriodFromPeak(11343, 14, 128);
    expect(a.bestGuess).toBe(13);
    expect(a.bestConvergent).toEqual({ p: 9, q: 13 });

    const b = recoverPeriodFromPeak(13653, 14, 128);
    expect(b.bestGuess).toBe(6);
    expect(b.bestConvergent).toEqual({ p: 5, q: 6 });

    expect(lcm(13, 6)).toBe(78);
  });
});

describe("recoverPeriodFromPeak", () => {
  it("recovers r=77 from y=11490 (App K Ex.1)", () => {
    const r = recoverPeriodFromPeak(11490, 14, 128);
    expect(r.bestGuess).toBe(77);
    expect(r.candidates).toContain(77);
    expect(Math.abs(11490 / 2 ** 14 - 54 / 77)).toBeLessThan(1 / 2 ** 15);
  });

  it("recovers r=5 from the toy peak y=13, n=6", () => {
    const r = recoverPeriodFromPeak(13, 6, 15);
    expect(r.bestGuess).toBe(5);
  });
});

describe("nearestPeak", () => {
  it("finds exact multiples when r divides 2^n", () => {
    const peak = nearestPeak(12, 4, 4);
    expect(peak.j).toBe(3);
    expect(peak.target).toBe(12);
    expect(peak.distance).toBe(0);
  });

  it("includes the wrap-around peak at 2^n ≡ 0", () => {
    const peak = nearestPeak(15, 4, 4);
    expect(peak.distance).toBe(1);
    expect(peak.j).toBe(0);
  });

  it("does not map j=r to a bogus far peak at 0", () => {
    const peak = nearestPeak(16383, 14, 77);
    expect(peak.distance).toBeLessThan(2);
    expect(peak.j).toBe(0);
  });
});

describe("peakYValues", () => {
  it("includes App K Ex.1 measurement 11490", () => {
    expect(peakYValues(14, 77)).toContain(11490);
  });
});

describe("qftProbabilities", () => {
  it("is independent of x0 (phase drops out) and peaks near j·2^n/r", () => {
    const n = 4;
    const r = 4;
    const p0 = qftProbabilities(n, r, 0);
    const p1 = qftProbabilities(n, r, 1);
    for (let y = 0; y < 16; y++) {
      expect(p0[y]!.p).toBeCloseTo(p1[y]!.p, 10);
    }
    const atPeak = p0.filter((row) => row.y % 4 === 0);
    const offPeak = p0.filter((row) => row.y % 4 !== 0);
    const peakMass = atPeak.reduce((s, row) => s + row.p, 0);
    const offMass = offPeak.reduce((s, row) => s + row.p, 0);
    expect(peakMass).toBeGreaterThan(0.99);
    expect(offMass).toBeLessThan(0.01);
  });
});
