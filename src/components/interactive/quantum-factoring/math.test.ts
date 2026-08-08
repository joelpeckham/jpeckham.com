import { describe, expect, it } from "vitest";
import {
  FACTORING_PRESETS,
  factorFromPeriod,
  gcd,
  modPow,
  order,
} from "./math";

describe("FACTORING_PRESETS", () => {
  it("each preset r matches the true multiplicative order", () => {
    for (const p of FACTORING_PRESETS) {
      expect(order(p.a, p.N)).toBe(p.r);
    }
  });

  it("kind tags match factorFromPeriod outcomes", () => {
    for (const p of FACTORING_PRESETS) {
      const result = factorFromPeriod(p.a, p.r, p.N);
      if (p.kind === "success") {
        expect(result.ok).toBe(true);
        expect(result.factor1! * result.factor2!).toBe(p.N);
      } else if (p.kind === "fail-odd-r") {
        expect(result.ok).toBe(false);
        expect(result.reason).toBe("r odd");
      } else {
        expect(result.ok).toBe(false);
        expect(result.reason).toBe("a^{r/2} ≡ -1");
        expect(result.gPlus).toBe(p.N);
      }
    }
  });
});

describe("factorFromPeriod", () => {
  it("factors N=15 from a=7, r=4 (Mermin §3.10 example shape)", () => {
    const result = factorFromPeriod(7, 4, 15);
    expect(result.ok).toBe(true);
    expect(result.x).toBe(4);
    expect(result.gMinus).toBe(3);
    expect(result.gPlus).toBe(5);
    expect(new Set([result.factor1, result.factor2])).toEqual(new Set([3, 5]));
  });

  it("aborts on odd r without inventing a half-exponent", () => {
    const result = factorFromPeriod(4, 3, 21);
    expect(result).toMatchObject({
      ok: false,
      reason: "r odd",
      x: null,
      gMinus: null,
      gPlus: null,
    });
  });

  it("aborts when a^{r/2} ≡ −1 with gcd(x+1,N)=N", () => {
    const result = factorFromPeriod(14, 2, 15);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("a^{r/2} ≡ -1");
    expect(result.x).toBe(14);
    expect(result.gMinus).toBe(1);
    expect(result.gPlus).toBe(15);
  });
});

describe("modPow", () => {
  it("rejects non-integer exponents", () => {
    expect(() => modPow(5, 2.5, 21)).toThrow(/integer/);
  });
});

describe("gcd / Euclid", () => {
  it("matches known pairs", () => {
    expect(gcd(3, 15)).toBe(3);
    expect(gcd(5, 15)).toBe(5);
    expect(gcd(13, 15)).toBe(1);
    expect(gcd(15, 15)).toBe(15);
  });
});
