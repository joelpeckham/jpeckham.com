import { describe, expect, it } from "vitest";
import {
  applyH,
  applyX,
  ket0,
  measureQubit,
  normalize,
  partialMeasure,
  prob,
  qubitFromMagnitudes,
  realAmp,
  sampleFromProbs,
  TWO_QUBIT_PRESETS,
} from "./model";

describe("normalize", () => {
  it("renormalizes magnitudes to unit length", () => {
    const state = normalize([realAmp(3), realAmp(4)]);
    expect(prob(state[0]!)).toBeCloseTo(0.36, 5);
    expect(prob(state[1]!)).toBeCloseTo(0.64, 5);
    expect(prob(state[0]!) + prob(state[1]!)).toBeCloseTo(1, 5);
  });

  it("builds a valid qubit from magnitudes", () => {
    const state = qubitFromMagnitudes(0.6, 0.8);
    expect(prob(state[0]!)).toBeCloseTo(0.36, 5);
    expect(prob(state[1]!)).toBeCloseTo(0.64, 5);
  });
});

describe("sampleFromProbs", () => {
  it("respects a deterministic distribution", () => {
    expect(sampleFromProbs([1, 0], () => 0.99)).toBe(0);
    expect(sampleFromProbs([0, 1], () => 0.01)).toBe(1);
  });

  it("samples proportionally with a fixed rng", () => {
    expect(sampleFromProbs([1, 1], () => 0.25)).toBe(0);
    expect(sampleFromProbs([1, 1], () => 0.75)).toBe(1);
  });
});

describe("partialMeasure", () => {
  it("collapses Bell-like states to correlated branches", () => {
    const bell = TWO_QUBIT_PRESETS.find((p) => p.id === "bell")!.amplitudes;
    const r0 = partialMeasure(bell, 0, () => 0.1);
    expect(r0.outcome).toBe(0);
    expect(r0.survivingLabels).toEqual(["00"]);
    expect(prob(r0.remaining2[0]!)).toBeCloseTo(1, 5);
    expect(prob(r0.remaining2[1]!)).toBeCloseTo(0, 5);

    const r1 = partialMeasure(bell, 0, () => 0.9);
    expect(r1.outcome).toBe(1);
    expect(r1.survivingLabels).toEqual(["11"]);
    expect(prob(r1.remaining2[1]!)).toBeCloseTo(1, 5);
  });

  it("leaves the other qubit in |0⟩ when measuring the H wire of H|0⟩⊗|0⟩", () => {
    const product = TWO_QUBIT_PRESETS.find((p) => p.id === "product-h")!
      .amplitudes;
    const r = partialMeasure(product, 0, () => 0.2);
    expect(r.outcome).toBe(0);
    expect(prob(r.remaining2[0]!)).toBeCloseTo(1, 5);
    expect(prob(r.remaining2[1]!)).toBeCloseTo(0, 5);
  });

  it("keeps the H superposition when measuring the |0⟩ wire of H|0⟩⊗|0⟩", () => {
    const product = TWO_QUBIT_PRESETS.find((p) => p.id === "product-h")!
      .amplitudes;
    // Measuring q1: only outcome 0 is possible; leftover q0 stays (|0⟩+|1⟩)/√2.
    const r = partialMeasure(product, 1, () => 0.5);
    expect(r.outcome).toBe(0);
    expect(r.probability).toBeCloseTo(1, 5);
    expect(prob(r.remaining2[0]!)).toBeCloseTo(0.5, 5);
    expect(prob(r.remaining2[1]!)).toBeCloseTo(0.5, 5);
  });
});

describe("single-qubit gates", () => {
  it("Hadamard then measure is fifty-fifty from |0⟩", () => {
    const h = applyH(ket0());
    expect(prob(h[0]!)).toBeCloseTo(0.5, 5);
    expect(prob(h[1]!)).toBeCloseTo(0.5, 5);
    const m = measureQubit(h, () => 0.4);
    expect(m.outcome).toBe(0);
    expect(prob(m.collapsed[0]!)).toBeCloseTo(1, 5);
  });

  it("X swaps amplitudes", () => {
    const x = applyX(ket0());
    expect(prob(x[1]!)).toBeCloseTo(1, 5);
  });
});
