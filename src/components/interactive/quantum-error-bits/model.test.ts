import { describe, expect, it } from "vitest";
import {
  BASIS_3,
  ERROR_SUPPORT,
  SYNDROME_MAP,
  basisParities,
  computeSyndrome,
  correct,
  encode,
  injectError,
  magnitude,
  normalizeMagnitudes,
  physicalAmplitudes,
  prob,
} from "./model";

const ALPHA = { re: 0.6, im: 0 };
const BETA = { re: 0.8, im: 0 };

describe("encode", () => {
  it("places amplitudes on |000⟩ and |111⟩ with syndrome 00", () => {
    const state = encode(ALPHA, BETA);
    expect(state.errorKind).toBe("none");

    const amps = physicalAmplitudes(state);
    expect(amps.find((a) => a.label === "000")?.re).toBeCloseTo(0.6);
    expect(amps.find((a) => a.label === "111")?.re).toBeCloseTo(0.8);
    expect(amps.filter((a) => prob({ re: a.re, im: a.im }) > 0)).toHaveLength(2);

    expect(computeSyndrome(state)).toEqual([0, 0]);
  });
});

describe("normalizeMagnitudes", () => {
  it("defaults to |0⟩ when both sliders are zero", () => {
    const state = normalizeMagnitudes(0, 0);
    expect(magnitude(state.alpha)).toBeCloseTo(1);
    expect(magnitude(state.beta)).toBeCloseTo(0);
  });
});

describe("Mermin (5.4) error supports", () => {
  it("matches the four corrupted states for q₂q₁q₀", () => {
    expect(ERROR_SUPPORT.none).toEqual({ alpha: "000", beta: "111" });
    expect(ERROR_SUPPORT.x0).toEqual({ alpha: "001", beta: "110" });
    expect(ERROR_SUPPORT.x1).toEqual({ alpha: "010", beta: "101" });
    expect(ERROR_SUPPORT.x2).toEqual({ alpha: "100", beta: "011" });
  });

  it("parity checks on support kets reproduce the syndrome table", () => {
    for (const kind of Object.keys(ERROR_SUPPORT) as (keyof typeof ERROR_SUPPORT)[]) {
      const { alpha, beta } = ERROR_SUPPORT[kind];
      const sAlpha = basisParities(alpha);
      const sBeta = basisParities(beta);
      expect(sAlpha).toEqual(SYNDROME_MAP[kind]);
      expect(sBeta).toEqual(SYNDROME_MAP[kind]);
    }
  });

  it("covers every 3-Qbit basis ket exactly once across supports", () => {
    const seen = new Set<string>();
    for (const kind of Object.keys(ERROR_SUPPORT) as (keyof typeof ERROR_SUPPORT)[]) {
      const { alpha, beta } = ERROR_SUPPORT[kind];
      seen.add(alpha);
      seen.add(beta);
    }
    expect(seen.size).toBe(BASIS_3.length);
  });
});

describe("single bit-flip errors", () => {
  const flips = ["x0", "x1", "x2"] as const;

  it.each(flips)("maps %s to a unique syndrome and correct restores", (kind) => {
    const encoded = encode(ALPHA, BETA);
    const corrupted = injectError(encoded, kind);

    expect(computeSyndrome(corrupted)).toEqual(SYNDROME_MAP[kind]);

    const syndromes = flips.map((k) => SYNDROME_MAP[k].join(""));
    expect(new Set(syndromes).size).toBe(3);

    const restored = correct(corrupted);
    expect(restored.errorKind).toBe("none");
    expect(restored.alpha).toEqual(ALPHA);
    expect(restored.beta).toEqual(BETA);

    const amps = physicalAmplitudes(restored);
    expect(amps.find((a) => a.label === "000")?.re).toBeCloseTo(0.6);
    expect(amps.find((a) => a.label === "111")?.re).toBeCloseTo(0.8);
  });
});

describe("correct preserves logical magnitudes", () => {
  it("keeps |α| and |β| after correction", () => {
    const encoded = encode(ALPHA, BETA);
    const corrupted = injectError(encoded, "x1");
    const restored = correct(corrupted);

    expect(magnitude(restored.alpha)).toBeCloseTo(magnitude(ALPHA));
    expect(magnitude(restored.beta)).toBeCloseTo(magnitude(BETA));
    expect(prob(restored.alpha)).toBeCloseTo(prob(ALPHA));
    expect(prob(restored.beta)).toBeCloseTo(prob(BETA));
  });
});
