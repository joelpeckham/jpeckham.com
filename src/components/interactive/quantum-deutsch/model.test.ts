import { describe, expect, it } from "vitest";
import {
  FN_IDS,
  ONE_BIT_FUNCTIONS,
  applyUf,
  basisKet,
  deutschProtocol,
  garbageScenario,
  ufStep,
} from "./model";

describe("applyUf", () => {
  it("maps |x⟩|y⟩ to |x⟩|y ⊕ f(x)⟩ for all four functions", () => {
    for (const id of FN_IDS) {
      const fn = ONE_BIT_FUNCTIONS[id];
      for (const x of [0, 1] as const) {
        for (const y of [0, 1] as const) {
          const { afterLabel } = ufStep(fn, x, y);
          expect(afterLabel).toBe(`${x}${y ^ fn.f(x)}`);
        }
      }
    }
  });

  it("matches explicit truth tables (Mermin Table 2.1)", () => {
    expect(ONE_BIT_FUNCTIONS.f0.f(0)).toBe(0);
    expect(ONE_BIT_FUNCTIONS.f0.f(1)).toBe(0);
    expect(ONE_BIT_FUNCTIONS.f1.f(0)).toBe(0);
    expect(ONE_BIT_FUNCTIONS.f1.f(1)).toBe(1);
    expect(ONE_BIT_FUNCTIONS.f2.f(0)).toBe(1);
    expect(ONE_BIT_FUNCTIONS.f2.f(1)).toBe(0);
    expect(ONE_BIT_FUNCTIONS.f3.f(0)).toBe(1);
    expect(ONE_BIT_FUNCTIONS.f3.f(1)).toBe(1);
  });
});

describe("deutschProtocol", () => {
  it("identifies constant vs balanced for all four f (Mermin 2.22–2.23)", () => {
    for (const id of FN_IDS) {
      const fn = ONE_BIT_FUNCTIONS[id];
      const result = deutschProtocol(id);

      if (fn.constant) {
        expect(result.measuredInput).toBe(1);
        expect(result.classification).toBe("constant");
      } else {
        expect(result.measuredInput).toBe(0);
        expect(result.classification).toBe("balanced");
      }
    }
  });

  it("leaves input in a definite computational basis state after H on input", () => {
    for (const id of FN_IDS) {
      const { states } = deutschProtocol(id);
      const preMeasure = states[4]!;
      const probs = preMeasure.map((c) => c.re * c.re + c.im * c.im);
      const inputZero = probs[0]! + probs[1]!;
      const inputOne = probs[2]! + probs[3]!;
      expect(Math.max(inputZero, inputOne)).toBeCloseTo(1, 5);
      expect(Math.min(inputZero, inputOne)).toBeCloseTo(0, 5);
    }
  });
});

describe("garbageScenario", () => {
  it("restores io⊗|0⟩_w after V† for every f", () => {
    for (const id of FN_IDS) {
      const scenario = garbageScenario(id);
      expect(scenario.cleanSeparable).toBe(true);
      expect(scenario.workspaceClean).toBe(true);
    }
  });

  it("entangles registers with workspace when f is balanced and V† is skipped", () => {
    for (const id of ["f1", "f2"] as const) {
      const scenario = garbageScenario(id);
      expect(scenario.dirtyEntangled).toBe(true);
    }
  });

  it("does not need x-dependent scratch when f is constant", () => {
    for (const id of ["f0", "f3"] as const) {
      const scenario = garbageScenario(id);
      expect(scenario.dirtyEntangled).toBe(false);
    }
  });
});

describe("applyUf linearity", () => {
  it("is identity for f0 on basis states", () => {
    for (const x of [0, 1] as const) {
      for (const y of [0, 1] as const) {
        const s = basisKet(x, y);
        const out = applyUf(ONE_BIT_FUNCTIONS.f0, s);
        expect(out[x * 2 + y]!.re).toBeCloseTo(1);
      }
    }
  });
});
