import { describe, expect, it } from "vitest";
import {
  CODE_FAMILIES,
  CODES,
  FIVE_QBIT_STABILIZERS,
  STEANE_STABILIZERS,
  computeSyndrome,
  formatError,
  formatPauliString,
  lookupError,
  pauliAnticommute,
  pauliString,
  pauliStringsAnticommute,
  steaneEncodeCircuit,
  syndromeKey,
} from "./model";

describe("pauliAnticommute", () => {
  it("X and Z anticommute", () => {
    expect(pauliAnticommute("X", "Z")).toBe(true);
    expect(pauliAnticommute("Z", "X")).toBe(true);
  });

  it("I commutes with everything", () => {
    expect(pauliAnticommute("I", "X")).toBe(false);
    expect(pauliAnticommute("Y", "I")).toBe(false);
  });

  it("identical Paulis commute", () => {
    expect(pauliAnticommute("X", "X")).toBe(false);
    expect(pauliAnticommute("Y", "Y")).toBe(false);
  });

  it("Y anticommutes with X and with Z", () => {
    expect(pauliAnticommute("Y", "X")).toBe(true);
    expect(pauliAnticommute("Y", "Z")).toBe(true);
  });
});

describe("pauliStringsAnticommute", () => {
  it("anticommutes on an odd number of positions", () => {
    const a = pauliString(3, { 0: "X" });
    const b = pauliString(3, { 0: "Z" });
    expect(pauliStringsAnticommute(a, b)).toBe(true);
  });

  it("commutes when two positions anticommute (even count)", () => {
    const a = pauliString(3, { 0: "X", 1: "X" });
    const b = pauliString(3, { 0: "Z", 1: "Z" });
    expect(pauliStringsAnticommute(a, b)).toBe(false);
  });
});

describe("5-Qbit stabilizers (Mermin 5.29)", () => {
  it("ops match the product labels", () => {
    expect(formatPauliString(FIVE_QBIT_STABILIZERS[0]!.ops)).toBe("Z1 X2 X3 Z4");
    expect(formatPauliString(FIVE_QBIT_STABILIZERS[1]!.ops)).toBe("Z0 Z2 X3 X4");
    expect(formatPauliString(FIVE_QBIT_STABILIZERS[2]!.ops)).toBe("X0 Z1 Z3 X4");
    expect(formatPauliString(FIVE_QBIT_STABILIZERS[3]!.ops)).toBe("X0 X1 Z2 Z4");
  });

  it("each single X/Y/Z has a distinct syndrome", () => {
    const keys = new Set<string>();
    for (let q = 0; q < 5; q++) {
      for (const kind of ["X", "Y", "Z"] as const) {
        const s = computeSyndrome({ kind, qubit: q }, CODES.five.stabilizers);
        keys.add(syndromeKey(s));
      }
    }
    expect(keys.size).toBe(15);
    expect(keys.has("++++")).toBe(false);
  });
});

describe("Steane syndrome (Mermin 5.42 / Table 5.3)", () => {
  const stabs = CODES.steane.stabilizers;

  it("ops match M₀/N₀/… products", () => {
    expect(STEANE_STABILIZERS.map((s) => s.product)).toEqual([
      "X0 X4 X5 X6",
      "Z0 Z4 Z5 Z6",
      "X1 X3 X5 X6",
      "Z1 Z3 Z5 Z6",
      "X2 X3 X4 X6",
      "Z2 Z3 Z4 Z6",
    ]);
  });

  it("no error → all +1", () => {
    const s = computeSyndrome({ kind: "none" }, stabs);
    expect(s.every((v) => v === 1)).toBe(true);
    expect(lookupError(s, "steane")).toEqual({ status: "none" });
  });

  it("X0 → all M +1, N0 −1 (N identifies qubit)", () => {
    const error = { kind: "X" as const, qubit: 0 };
    const s = computeSyndrome(error, stabs);
    // order: M0, N0, M1, N1, M2, N2
    expect(s).toEqual([1, -1, 1, 1, 1, 1]);
    const result = lookupError(s, "steane");
    expect(result).toEqual({ status: "match", error });
  });

  it("Z3 → all N +1; M₁ and M₂ −1 identify qubit", () => {
    const error = { kind: "Z" as const, qubit: 3 };
    const s = computeSyndrome(error, stabs);
    expect(s).toEqual([1, 1, -1, 1, -1, 1]);
    expect(lookupError(s, "steane")).toEqual({ status: "match", error });
  });

  it("Y2 → M₂ and N₂ both −1", () => {
    const error = { kind: "Y" as const, qubit: 2 };
    const s = computeSyndrome(error, stabs);
    expect(s[4]).toBe(-1);
    expect(s[5]).toBe(-1);
    expect(lookupError(s, "steane")).toEqual({ status: "match", error });
  });

  it("Y3 lights both M and N families (TryIt)", () => {
    const error = { kind: "Y" as const, qubit: 3 };
    const s = computeSyndrome(error, stabs);
    const mSigns = [s[0], s[2], s[4]];
    const nSigns = [s[1], s[3], s[5]];
    expect(mSigns.some((v) => v === -1)).toBe(true);
    expect(nSigns.some((v) => v === -1)).toBe(true);
    expect(lookupError(s, "steane")).toEqual({ status: "match", error });
  });

  it("all 21 single-qubit Paulis have unique syndromes", () => {
    const keys = new Set<string>();
    for (let q = 0; q < 7; q++) {
      for (const kind of ["X", "Y", "Z"] as const) {
        keys.add(syndromeKey(computeSyndrome({ kind, qubit: q }, stabs)));
      }
    }
    expect(keys.size).toBe(21);
  });

  it("X1 and Z4 do not collide", () => {
    const x1 = computeSyndrome({ kind: "X", qubit: 1 }, stabs);
    const z4 = computeSyndrome({ kind: "Z", qubit: 4 }, stabs);
    expect(syndromeKey(x1)).not.toBe(syndromeKey(z4));
    expect(formatError({ kind: "X", qubit: 1 })).toBe("X1");
  });
});

describe("steaneEncodeCircuit (Mermin Fig. 5.10 sketch)", () => {
  it("places data on q3 and stages H then M₂/M₁/M₀ controls", () => {
    const { wires, columns, stageLabels } = steaneEncodeCircuit();
    expect(wires.find((w) => w.id === "q3")?.label).toBe("|ψ⟩");
    expect(stageLabels.length).toBe(columns.length + 1);

    // controlled X4 X5 from q3
    expect(columns[0]).toEqual([
      expect.objectContaining({ wires: ["q3", "q4", "q5"] }),
    ]);

    const hadamardWires = new Set(columns[1]!.flatMap((g) => g.wires));
    expect(hadamardWires).toEqual(new Set(["q0", "q1", "q2"]));

    // controls for M2, M1, M0
    expect(columns[2]![0]!.wires[0]).toBe("q2");
    expect(columns[3]![0]!.wires[0]).toBe("q1");
    expect(columns[4]![0]!.wires[0]).toBe("q0");

    // no duplicate wire occupancy inside a column
    for (const col of columns) {
      const seen = new Set<string>();
      for (const g of col) {
        for (const w of g.wires) {
          expect(seen.has(w)).toBe(false);
          seen.add(w);
        }
      }
    }
  });
});

describe("code families", () => {
  it("all listed families are distance 3", () => {
    expect(CODE_FAMILIES.every((f) => f.distance === 3)).toBe(true);
  });
});
