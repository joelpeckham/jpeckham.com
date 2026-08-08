/**
 * Toy stabilizer syndrome models for 5- and 7-Qbit codes (Mermin §5.5–5.9).
 * Commutation: Pauli strings anticommute iff they anticommute on an odd number of positions.
 */

import type { CircuitGate, CircuitWire } from "@/components/interactive/quantum-shared";

export type PauliLetter = "I" | "X" | "Y" | "Z";
export type PauliString = PauliLetter[];
export type SyndromeSign = 1 | -1;

export type StabilizerOp = {
  id: string;
  label: string;
  /** Compact product string, e.g. "ZXXZ" on qubits 1–4 with I elsewhere. */
  product: string;
  ops: PauliString;
  /** M = X-type checks; N = Z-type checks (Steane). */
  family?: "M" | "N";
};

export type QubitError =
  | { kind: "none" }
  | { kind: "X" | "Y" | "Z"; qubit: number };

export type CodeId = "five" | "steane";

export type CodeDefinition = {
  id: CodeId;
  name: string;
  n: number;
  stabilizers: StabilizerOp[];
};

export type CodeFamily = {
  id: string;
  name: string;
  n: number;
  /** Hamming-style distance intuition: corrects t = floor((d-1)/2) of the listed error types. */
  distance: number;
  corrects: string[];
  notes: string;
  catches: {
    bitFlip: boolean;
    phaseFlip: boolean;
    combinedY: boolean;
    multiQubit: boolean;
  };
  faultTolerantGates?: string;
};

/** Whether single Pauli letters anticommute (I commutes with everything). */
export function pauliAnticommute(a: PauliLetter, b: PauliLetter): boolean {
  if (a === "I" || b === "I") return false;
  if (a === b) return false;
  return true;
}

/** Pauli strings anticommute iff odd number of positions anticommute. */
export function pauliStringsAnticommute(a: PauliString, b: PauliString): boolean {
  let odd = false;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (pauliAnticommute(a[i] ?? "I", b[i] ?? "I")) odd = !odd;
  }
  return odd;
}

/** Build a length-n Pauli string from sparse { qubit: letter } entries. */
export function pauliString(n: number, terms: Partial<Record<number, PauliLetter>>): PauliString {
  const out: PauliString = Array.from({ length: n }, () => "I");
  for (const [q, p] of Object.entries(terms)) {
    out[Number(q)] = p as PauliLetter;
  }
  return out;
}

/** Parse a spaced product like "Z1 X2 X3 Z4" into ops (indices 0..n-1). */
export function parsePauliProduct(spec: string, n: number): PauliString {
  const out: PauliString = Array.from({ length: n }, () => "I");
  const tokens = spec.trim().split(/\s+/);
  for (const token of tokens) {
    const m = token.match(/^([XYZ])(\d+)$/i);
    if (!m) continue;
    const letter = m[1]!.toUpperCase() as PauliLetter;
    const index = Number(m[2]);
    if (index >= 0 && index < n) out[index] = letter;
  }
  return out;
}

export function formatPauliString(ops: PauliString): string {
  return ops
    .map((p, i) => (p === "I" ? null : `${p}${i}`))
    .filter((s): s is string => s != null)
    .join(" ");
}

function errorAsPauliString(error: QubitError, n: number): PauliString {
  const out: PauliString = Array.from({ length: n }, () => "I");
  if (error.kind !== "none") out[error.qubit] = error.kind;
  return out;
}

/** +1 if error commutes with stabilizer; -1 if anticommutes. */
export function syndromeSign(error: QubitError, stabilizer: PauliString): SyndromeSign {
  if (error.kind === "none") return 1;
  const err = errorAsPauliString(error, stabilizer.length);
  return pauliStringsAnticommute(err, stabilizer) ? -1 : 1;
}

export function computeSyndrome(
  error: QubitError,
  stabilizers: readonly StabilizerOp[],
): SyndromeSign[] {
  return stabilizers.map((s) => syndromeSign(error, s.ops));
}

export function syndromeKey(syndrome: readonly SyndromeSign[]): string {
  return syndrome.map((s) => (s === 1 ? "+" : "-")).join("");
}

export function formatError(error: QubitError): string {
  if (error.kind === "none") return "no error (I)";
  return `${error.kind}${error.qubit}`;
}

/** 5-Qbit stabilizers M0..M3 (Mermin 5.29), indices 0..4. */
export const FIVE_QBIT_STABILIZERS: StabilizerOp[] = [
  {
    id: "M0",
    label: "M₀",
    product: "Z1 X2 X3 Z4",
    ops: pauliString(5, { 1: "Z", 2: "X", 3: "X", 4: "Z" }),
    family: "M",
  },
  {
    id: "M1",
    label: "M₁",
    product: "Z2 X3 X4 Z0",
    ops: pauliString(5, { 0: "Z", 2: "Z", 3: "X", 4: "X" }),
    family: "M",
  },
  {
    id: "M2",
    label: "M₂",
    product: "Z3 X4 X0 Z1",
    ops: pauliString(5, { 0: "X", 1: "Z", 3: "Z", 4: "X" }),
    family: "M",
  },
  {
    id: "M3",
    label: "M₃",
    product: "Z4 X0 X1 Z2",
    ops: pauliString(5, { 0: "X", 1: "X", 2: "Z", 4: "Z" }),
    family: "M",
  },
];

/** 7-Qbit Steane stabilizers (Mermin 5.42). */
export const STEANE_STABILIZERS: StabilizerOp[] = [
  {
    id: "M0",
    label: "M₀",
    product: "X0 X4 X5 X6",
    ops: pauliString(7, { 0: "X", 4: "X", 5: "X", 6: "X" }),
    family: "M",
  },
  {
    id: "N0",
    label: "N₀",
    product: "Z0 Z4 Z5 Z6",
    ops: pauliString(7, { 0: "Z", 4: "Z", 5: "Z", 6: "Z" }),
    family: "N",
  },
  {
    id: "M1",
    label: "M₁",
    product: "X1 X3 X5 X6",
    ops: pauliString(7, { 1: "X", 3: "X", 5: "X", 6: "X" }),
    family: "M",
  },
  {
    id: "N1",
    label: "N₁",
    product: "Z1 Z3 Z5 Z6",
    ops: pauliString(7, { 1: "Z", 3: "Z", 5: "Z", 6: "Z" }),
    family: "N",
  },
  {
    id: "M2",
    label: "M₂",
    product: "X2 X3 X4 X6",
    ops: pauliString(7, { 2: "X", 3: "X", 4: "X", 6: "X" }),
    family: "M",
  },
  {
    id: "N2",
    label: "N₂",
    product: "Z2 Z3 Z4 Z6",
    ops: pauliString(7, { 2: "Z", 3: "Z", 4: "Z", 6: "Z" }),
    family: "N",
  },
];

export const CODES: Record<CodeId, CodeDefinition> = {
  five: {
    id: "five",
    name: "5-Qbit",
    n: 5,
    stabilizers: FIVE_QBIT_STABILIZERS,
  },
  steane: {
    id: "steane",
    name: "7-Qbit Steane",
    n: 7,
    stabilizers: STEANE_STABILIZERS,
  },
};

export const CODE_FAMILIES: CodeFamily[] = [
  {
    id: "3-bit-flip",
    name: "3-Qbit bit-flip",
    n: 3,
    distance: 3,
    corrects: ["Single bit-flip (X) on any of 3 data qubits"],
    notes: "Ideal for X errors only; packs 1 + 3 syndromes with equality at n = 3.",
    catches: {
      bitFlip: true,
      phaseFlip: false,
      combinedY: false,
      multiQubit: false,
    },
  },
  {
    id: "5-qbit",
    name: "5-Qbit",
    n: 5,
    distance: 3,
    corrects: ["Any single-qubit X, Y, or Z on qubits 0–4"],
    notes: "Smallest perfect code for general 1-Qbit errors: 2^{n−1} = 3n + 1 at n = 5.",
    catches: {
      bitFlip: true,
      phaseFlip: true,
      combinedY: true,
      multiQubit: false,
    },
    faultTolerantGates: "Logical X, Z work; many 2-Qbit extensions are cumbersome.",
  },
  {
    id: "7-steane",
    name: "7-Qbit Steane",
    n: 7,
    distance: 3,
    corrects: ["Any single-qubit X, Y, or Z on qubits 0–6"],
    notes: "Preferred in practice: transversal H, X, Z, and CNOT on codewords.",
    catches: {
      bitFlip: true,
      phaseFlip: true,
      combinedY: true,
      multiQubit: false,
    },
    faultTolerantGates: "Transversal H, X, Z, CNOT — fault-tolerant and simple.",
  },
  {
    id: "9-shor",
    name: "9-Qbit Shor (historical)",
    n: 9,
    distance: 3,
    corrects: ["Any single-qubit X, Y, or Z (via nested 3-bit protection)"],
    notes: "First QEC code (1995); now mainly of historical interest (Mermin App. N).",
    catches: {
      bitFlip: true,
      phaseFlip: true,
      combinedY: true,
      multiQubit: false,
    },
    faultTolerantGates: "Corrects general 1-Qbit errors but uses 9 physical qubits.",
  },
];

const SINGLE_QUBIT_ERRORS: QubitError[] = [{ kind: "none" }];

function allSingleQubitErrors(n: number): QubitError[] {
  const errors: QubitError[] = [{ kind: "none" }];
  for (let q = 0; q < n; q++) {
    errors.push({ kind: "X", qubit: q }, { kind: "Y", qubit: q }, { kind: "Z", qubit: q });
  }
  return errors;
}

function buildLookup(code: CodeDefinition): Map<string, QubitError[]> {
  const map = new Map<string, QubitError[]>();
  for (const error of allSingleQubitErrors(code.n)) {
    const key = syndromeKey(computeSyndrome(error, code.stabilizers));
    const list = map.get(key) ?? [];
    list.push(error);
    map.set(key, list);
  }
  return map;
}

const LOOKUP: Record<CodeId, Map<string, QubitError[]>> = {
  five: buildLookup(CODES.five),
  steane: buildLookup(CODES.steane),
};

export type SyndromeLookupResult =
  | { status: "match"; error: QubitError }
  | { status: "none" }
  | { status: "ambiguous"; candidates: QubitError[] }
  | { status: "unknown" };

/** Map a measured ±1 pattern back to the matching single-qubit error, if unique. */
export function lookupError(
  syndrome: readonly SyndromeSign[],
  codeId: CodeId,
): SyndromeLookupResult {
  const candidates = LOOKUP[codeId].get(syndromeKey(syndrome)) ?? [];
  if (candidates.length === 0) return { status: "unknown" };
  if (candidates.length === 1) {
    return candidates[0]!.kind === "none"
      ? { status: "none" }
      : { status: "match", error: candidates[0]! };
  }
  return { status: "ambiguous", candidates };
}

/**
 * Schematic of Mermin Fig. 5.10 (§5.8): data on q₃, controlled X₄X₅,
 * H on q₀–q₂, then controlled multi-NOTs for M₂, M₁, M₀.
 * One gate object per column so CircuitMini (one gate/wire/column) can show it.
 */
export function steaneEncodeCircuit(): {
  wires: CircuitWire[];
  columns: CircuitGate[][];
  stageLabels: string[];
} {
  // Top → bottom mirrors Mermin’s 6…0 numbering for easier book comparison.
  const wires: CircuitWire[] = [
    { id: "q6", label: "q6" },
    { id: "q5", label: "q5" },
    { id: "q4", label: "q4" },
    { id: "q3", label: "|ψ⟩" },
    { id: "q2", label: "q2" },
    { id: "q1", label: "q1" },
    { id: "q0", label: "q0" },
  ];

  const stageLabels = [
    "Start: |ψ⟩ on q₃, ancillas |0⟩",
    "Controlled X₄X₅ from data",
    "Hadamards on q₀, q₁, q₂",
    "Controlled-M₂ → (1 + M₂)",
    "Controlled-M₁ → (1 + M₁)",
    "Controlled-M₀ → encoded α|0̄⟩ + β|1̄⟩",
  ];

  const columns: CircuitGate[][] = [
    [{ id: "cxx", wires: ["q3", "q4", "q5"], label: "⊕" }],
    [
      { id: "h0", wires: ["q0"], label: "H" },
      { id: "h1", wires: ["q1"], label: "H" },
      { id: "h2", wires: ["q2"], label: "H" },
    ],
    // M₂ = X₂X₃X₄X₆: control q₂ after H, targets 3,4,6
    [{ id: "m2", wires: ["q2", "q3", "q4", "q6"], label: "⊕" }],
    // M₁ = X₁X₃X₅X₆
    [{ id: "m1", wires: ["q1", "q3", "q5", "q6"], label: "⊕" }],
    // M₀ = X₀X₄X₅X₆
    [{ id: "m0", wires: ["q0", "q4", "q5", "q6"], label: "⊕" }],
  ];

  return { wires, columns, stageLabels };
}

export { SINGLE_QUBIT_ERRORS, allSingleQubitErrors };
