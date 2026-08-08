import { describe, expect, it, vi } from "vitest";
import {
  applyDiffusion,
  applyOracle,
  groverAngle,
  groverStep,
  initialAmplitudes,
  optimalIterations,
  probabilityAt,
  probabilityOfMarked,
  rotationComponents,
  runGrover,
  sampleBasisOutcome,
  totalProbability,
} from "./model";

describe("initialAmplitudes", () => {
  it("uniform initial probs sum to 1", () => {
    for (const N of [4, 8, 16]) {
      const amps = initialAmplitudes(N);
      expect(totalProbability(amps)).toBeCloseTo(1, 10);
    }
  });
});

describe("oracle and diffusion", () => {
  it("oracle flips only the marked amplitude", () => {
    const amps = initialAmplitudes(4);
    const flipped = applyOracle(amps, [2]);
    expect(flipped[2]!.re).toBeCloseTo(-amps[2]!.re, 10);
    expect(flipped[0]!.re).toBeCloseTo(amps[0]!.re, 10);
  });

  it("diffusion is inversion about the mean", () => {
    // After oracle on |0⟩: amps are (-1,1,1,1)/2
    const afterOracle = applyOracle(initialAmplitudes(4), [0]);
    const afterW = applyDiffusion(afterOracle);
    // Mean of (-0.5, 0.5, 0.5, 0.5) is 0.25; invert → (1, 0, 0, 0)
    expect(probabilityAt(afterW, 0)).toBeCloseTo(1, 10);
    expect(totalProbability(afterW)).toBeCloseTo(1, 10);
  });
});

describe("single marked item", () => {
  it("after one iteration N=4: exact success on |0⟩", () => {
    const N = 4;
    const marked = [0];
    const afterOne = groverStep(initialAmplitudes(N), marked);
    expect(probabilityAt(afterOne, 0)).toBeCloseTo(1, 10);
    expect(probabilityOfMarked(afterOne, marked)).toBeCloseTo(1, 10);
  });

  it("after optimal iterations for N=4, marked=0: probability of |0⟩ ≈ 1", () => {
    const N = 4;
    const marked = [0];
    const k = optimalIterations(N, 1);
    expect(k).toBe(1);
    const amps = runGrover(initialAmplitudes(N), marked, k);
    expect(probabilityAt(amps, 0)).toBeCloseTo(1, 6);
  });

  it("N=8 at optimal k has high marked probability; one more step dips", () => {
    const N = 8;
    const marked = [3];
    const k = optimalIterations(N, 1);
    expect(k).toBe(2);
    const atOpt = runGrover(initialAmplitudes(N), marked, k);
    const overshoot = runGrover(initialAmplitudes(N), marked, k + 1);
    const pOpt = probabilityOfMarked(atOpt, marked);
    const pOver = probabilityOfMarked(overshoot, marked);
    expect(pOpt).toBeGreaterThan(0.9);
    expect(pOver).toBeLessThan(pOpt);
  });
});

describe("optimalIterations", () => {
  it("multi-solution reduces optimal iterations", () => {
    const N = 16;
    const one = optimalIterations(N, 1);
    const four = optimalIterations(N, 4);
    expect(four).toBeLessThan(one);
    expect(one).toBe(3);
    expect(four).toBe(1);
  });

  it("m=4 at N=16 reaches certainty in one step (sin Θ = 1/2)", () => {
    const N = 16;
    const marked = [0, 1, 2, 3];
    const amps = runGrover(initialAmplitudes(N), marked, 1);
    expect(probabilityOfMarked(amps, marked)).toBeCloseTo(1, 8);
  });
});

describe("geometry", () => {
  it("sin θ = √(m/N)", () => {
    expect(Math.sin(groverAngle(16, 1))).toBeCloseTo(1 / 4, 10);
    expect(Math.sin(groverAngle(16, 4))).toBeCloseTo(1 / 2, 10);
  });

  it("after k steps angle is (2k+1)θ", () => {
    const N = 16;
    const theta = groverAngle(N, 1);
    const { angleRad, aParallel } = rotationComponents(2, N, 1);
    expect(angleRad).toBeCloseTo(5 * theta, 10);
    expect(aParallel).toBeCloseTo(Math.sin(5 * theta), 10);
  });
});

describe("sampleBasisOutcome", () => {
  it("samples from the full basis by Born weight", () => {
    const amps = [
      { re: 1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    ];
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    expect(sampleBasisOutcome(amps)).toBe(0);
    vi.restoreAllMocks();
  });
});
