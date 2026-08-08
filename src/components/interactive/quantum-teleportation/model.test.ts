import { describe, expect, it } from "vitest";
import {
  CORRECTION,
  MEASURE_KEYS,
  applyCorrection,
  bobBeforeCorrection,
  detectGhzCase,
  expectedGhzParity,
  ghzDistribution,
  outcomeParity,
} from "./model";

describe("teleportation corrections (Mermin 6.24–6.25)", () => {
  it("maps Alice bits to the textbook Pauli table", () => {
    expect(CORRECTION["00"].gate).toBe("I");
    expect(CORRECTION["01"].gate).toBe("X");
    expect(CORRECTION["10"].gate).toBe("Z");
    expect(CORRECTION["11"].gate).toBe("ZX");
  });

  it("Bob’s pre-correction state matches Mermin for generic α,β", () => {
    const alpha = 0.6;
    const beta = Math.sqrt(1 - alpha * alpha);
    expect(bobBeforeCorrection(alpha, beta, "00")).toEqual([alpha, beta]);
    expect(bobBeforeCorrection(alpha, beta, "10")).toEqual([alpha, -beta]);
    expect(bobBeforeCorrection(alpha, beta, "01")).toEqual([beta, alpha]);
    expect(bobBeforeCorrection(alpha, beta, "11")).toEqual([-beta, alpha]);
  });

  it("each Pauli restores |ψ⟩ for every measurement outcome", () => {
    const cases: [number, number][] = [
      [1, 0],
      [0, 1],
      [1 / Math.sqrt(2), 1 / Math.sqrt(2)],
      [1 / Math.sqrt(2), -1 / Math.sqrt(2)],
      [0.3, Math.sqrt(1 - 0.09)],
    ];
    for (const [alpha, beta] of cases) {
      for (const key of MEASURE_KEYS) {
        const before = bobBeforeCorrection(alpha, beta, key);
        const after = applyCorrection(before[0], before[1], key);
        expect(after[0]).toBeCloseTo(alpha, 10);
        expect(after[1]).toBeCloseTo(beta, 10);
      }
    }
  });
});

describe("GHZ parities (Mermin 6.34–6.37)", () => {
  it("all-Z supports only even parity", () => {
    const dist = ghzDistribution(["Z", "Z", "Z"]);
    expect(detectGhzCase(["Z", "Z", "Z"])).toBe("all-z");
    expect(expectedGhzParity("all-z")).toBe(0);
    for (const row of dist) {
      expect(outcomeParity(row.outcome)).toBe(0);
    }
    expect(dist).toHaveLength(4);
  });

  it("the three two-H settings support only odd parity", () => {
    const settingsList = [
      ["H", "H", "Z"],
      ["H", "Z", "H"],
      ["Z", "H", "H"],
    ] as const;
    for (const settings of settingsList) {
      const caseId = detectGhzCase([...settings]);
      expect(expectedGhzParity(caseId)).toBe(1);
      const dist = ghzDistribution([...settings]);
      for (const row of dist) {
        expect(outcomeParity(row.outcome)).toBe(1);
      }
      expect(dist).toHaveLength(4);
    }
  });
});
