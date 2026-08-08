import { describe, expect, it } from "vitest";
import {
  bitDot,
  bvSolve,
  classicalBvQueryCount,
  classicalBvRevealBit,
  formatDotEquation,
  parseBits,
  simonRank,
  simonSampleY,
  solveSimonFromYs,
  toffoli,
} from "./model";

describe("bitDot", () => {
  it("computes mod-2 inner products", () => {
    expect(bitDot([1, 0, 1], [1, 1, 0])).toBe(1);
    expect(bitDot([1, 1, 1], [1, 1, 1])).toBe(1);
    expect(bitDot([1, 0, 0], [0, 1, 1])).toBe(0);
  });
});

describe("bvSolve", () => {
  it("returns the hidden string in one shot", () => {
    const secret = parseBits("1011");
    expect(bvSolve(secret)).toEqual(secret);
    expect(classicalBvQueryCount(4)).toBe(4);
  });

  it("classical basis queries reveal secret bits one at a time", () => {
    const secret = parseBits("1101");
    expect(classicalBvRevealBit(secret, 0)).toBe(1);
    expect(classicalBvRevealBit(secret, 1)).toBe(1);
    expect(classicalBvRevealBit(secret, 2)).toBe(0);
    expect(classicalBvRevealBit(secret, 3)).toBe(1);
  });
});

describe("simonSampleY", () => {
  it("samples y orthogonal to the hidden period", () => {
    const period = parseBits("101");
    for (let i = 0; i < 20; i++) {
      const y = simonSampleY(period);
      expect(bitDot(y, period)).toBe(0);
      expect(y.some((b) => b === 1)).toBe(true);
    }
  });

  it("enough independent equations recover the period", () => {
    const period = parseBits("0110");
    const ys = new Set<string>();
    let guard = 0;
    while (simonRank([...ys].map(parseBits)) < period.length - 1 && guard < 50) {
      ys.add(simonSampleY(period).join(""));
      guard++;
    }
    const samples = [...ys].map(parseBits);
    const solved = solveSimonFromYs(samples, period.length);
    expect(solved).not.toBeNull();
    expect(solved!.join("")).toBe(period.join(""));
  });
});

describe("formatDotEquation", () => {
  it("states the constraint on a, not on the sample y", () => {
    expect(formatDotEquation(parseBits("101"))).toBe("a₀ ⊕ a₂ = 0");
    expect(formatDotEquation(parseBits("010"))).toBe("a₁ = 0");
    expect(formatDotEquation(parseBits("000"))).toBe("0 · a = 0");
  });
});

describe("toffoli", () => {
  it("implements AND on the target wire", () => {
    expect(toffoli(0, 0, 0)).toBe(0);
    expect(toffoli(0, 1, 0)).toBe(0);
    expect(toffoli(1, 0, 1)).toBe(1);
    expect(toffoli(1, 1, 0)).toBe(1);
    expect(toffoli(1, 1, 1)).toBe(0);
  });
});
