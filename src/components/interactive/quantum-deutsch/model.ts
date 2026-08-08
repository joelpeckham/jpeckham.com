/** One-bit functions f₀…f₃ (Mermin Table 2.1). */

export type Bit = 0 | 1;
export type FnId = "f0" | "f1" | "f2" | "f3";

export type OneBitFn = {
  id: FnId;
  /** Short demo label. */
  label: string;
  /** Descriptive name. */
  name: "constant0" | "identity" | "NOT" | "constant1";
  f: (x: Bit) => Bit;
  /** f(0) = f(1)? */
  constant: boolean;
};

export const ONE_BIT_FUNCTIONS: Record<FnId, OneBitFn> = {
  f0: {
    id: "f0",
    label: "f₀",
    name: "constant0",
    f: () => 0,
    constant: true,
  },
  f1: {
    id: "f1",
    label: "f₁",
    name: "identity",
    f: (x) => x,
    constant: false,
  },
  f2: {
    id: "f2",
    label: "f₂",
    name: "NOT",
    f: (x) => (x === 0 ? 1 : 0),
    constant: false,
  },
  f3: {
    id: "f3",
    label: "f₃",
    name: "constant1",
    f: () => 1,
    constant: true,
  },
};

export const FN_IDS: FnId[] = ["f0", "f1", "f2", "f3"];

export type Complex = { re: number; im: number };

/** Two-Qbit state in order |00⟩, |01⟩, |10⟩, |11⟩ (input, output). */
export type TwoQubitState = [Complex, Complex, Complex, Complex];

const ZERO: Complex = { re: 0, im: 0 };
const ONE_C: Complex = { re: 1, im: 0 };
const INV_SQRT2 = 1 / Math.sqrt(2);

function c(re: number, im = 0): Complex {
  return { re, im };
}

function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function cScale(s: number, a: Complex): Complex {
  return { re: s * a.re, im: s * a.im };
}

function cMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

function cloneState(s: TwoQubitState): TwoQubitState {
  return s.map((a) => ({ ...a })) as TwoQubitState;
}

export function basisKet(input: Bit, output: Bit): TwoQubitState {
  const idx = input * 2 + output;
  return [0, 1, 2, 3].map((i) =>
    i === idx ? { ...ONE_C } : { ...ZERO },
  ) as TwoQubitState;
}

export function applyUf(fn: OneBitFn, state: TwoQubitState): TwoQubitState {
  const next: TwoQubitState = [{ ...ZERO }, { ...ZERO }, { ...ZERO }, { ...ZERO }];
  for (let input = 0; input <= 1; input++) {
    for (let output = 0; output <= 1; output++) {
      const from = input * 2 + output;
      const fx = fn.f(input as Bit);
      const to = input * 2 + (output ^ fx);
      next[to] = cAdd(next[to]!, state[from]!);
    }
  }
  return next;
}

function applySingleQubit(
  state: TwoQubitState,
  qubit: 0 | 1,
  matrix: [Complex, Complex, Complex, Complex],
): TwoQubitState {
  const next: TwoQubitState = [{ ...ZERO }, { ...ZERO }, { ...ZERO }, { ...ZERO }];
  for (let i = 0; i < 4; i++) {
    const input = (i >> 1) & 1;
    const output = i & 1;
    const bit = qubit === 0 ? input : output;
    const other = qubit === 0 ? output : input;

    for (let b = 0; b <= 1; b++) {
      const amp = matrix[b * 2 + bit]!;
      if (amp.re === 0 && amp.im === 0) continue;
      const j =
        qubit === 0 ? (b << 1) | other : (other << 1) | b;
      next[j] = cAdd(next[j]!, cMul(amp, state[i]!));
    }
  }
  return next;
}

const X_MATRIX: [Complex, Complex, Complex, Complex] = [
  c(0),
  c(1),
  c(1),
  c(0),
];

const H_MATRIX: [Complex, Complex, Complex, Complex] = [
  c(INV_SQRT2),
  c(INV_SQRT2),
  c(INV_SQRT2),
  c(-INV_SQRT2),
];

export function applyX(state: TwoQubitState, qubit: 0 | 1): TwoQubitState {
  return applySingleQubit(state, qubit, X_MATRIX);
}

export function applyH(state: TwoQubitState, qubit: 0 | 1): TwoQubitState {
  return applySingleQubit(state, qubit, H_MATRIX);
}

export function stateToAmplitudes(state: TwoQubitState) {
  return (["00", "01", "10", "11"] as const).map((label, i) => ({
    label,
    re: state[i]!.re,
    im: state[i]!.im,
  }));
}

export function formatKet(input: Bit, output: Bit): string {
  return `${input}${output}`;
}

export function ufStep(fn: OneBitFn, input: Bit, output: Bit) {
  const before = basisKet(input, output);
  const after = applyUf(fn, before);
  const yPrime = (output ^ fn.f(input)) as Bit;
  return {
    beforeLabel: formatKet(input, output),
    afterLabel: formatKet(input, yPrime),
    before,
    after,
  };
}

export function truthTable(fn: OneBitFn) {
  return ([0, 1] as Bit[]).map((x) => ({
    x,
    fx: fn.f(x),
  }));
}

export type DeutschStep =
  | "init"
  | "xx"
  | "hh"
  | "uf"
  | "h-input"
  | "measure";

export const DEUTSCH_STEPS: { id: DeutschStep; label: string }[] = [
  { id: "init", label: "Start |0⟩|0⟩" },
  { id: "xx", label: "Apply X ⊗ X" },
  { id: "hh", label: "Apply H ⊗ H" },
  { id: "uf", label: "Apply U_f" },
  { id: "h-input", label: "Apply H on input" },
  { id: "measure", label: "Measure input" },
];

export type DeutschResult = {
  fn: OneBitFn;
  /** Input register after full protocol (before measure). */
  inputKet: Bit;
  /** Mermin (2.22–2.23): |1⟩ iff constant, |0⟩ iff balanced. */
  measuredInput: Bit;
  classification: "constant" | "balanced";
  /** Output register ket label after protocol (for display). */
  outputDescription: string;
  /** State at each Deutsch step index (0..5). */
  states: TwoQubitState[];
};

/** Full Deutsch protocol; measurement on input distinguishes constant vs balanced. */
export function deutschProtocol(fnId: FnId): DeutschResult {
  const fn = ONE_BIT_FUNCTIONS[fnId];
  const states: TwoQubitState[] = [];

  let s = basisKet(0, 0);
  states.push(cloneState(s));

  s = applyX(applyX(s, 0), 1);
  states.push(cloneState(s));

  s = applyH(applyH(s, 0), 1);
  states.push(cloneState(s));

  s = applyUf(fn, s);
  states.push(cloneState(s));

  s = applyH(s, 0);
  states.push(cloneState(s));

  const amps = stateToAmplitudes(s);
  let inputKet: Bit = 0;
  let p0 = 0;
  let p1 = 0;
  for (const a of amps) {
    const p = a.re * a.re + a.im * a.im;
    if (a.label.startsWith("0")) p0 += p;
    else p1 += p;
  }
  if (p1 > p0) inputKet = 1;

  const measuredInput = inputKet;
  const classification = fn.constant ? "constant" : "balanced";

  states.push(cloneState(s));

  return {
    fn,
    inputKet,
    measuredInput,
    classification,
    outputDescription: "(1/√2)(|f(0)⟩ − |f̃(0)⟩)",
    states,
  };
}

export function deutschStateAtStep(fnId: FnId, stepIndex: number): TwoQubitState {
  const { states } = deutschProtocol(fnId);
  return states[Math.min(Math.max(stepIndex, 0), states.length - 1)]!;
}

/** Three-Qbit state |input⟩|output⟩|workspace⟩ basis order |000⟩…|111⟩. */
export type ThreeQubitState = [
  Complex,
  Complex,
  Complex,
  Complex,
  Complex,
  Complex,
  Complex,
  Complex,
];

function idx3(input: Bit, output: Bit, workspace: Bit): number {
  return (input << 2) | (output << 1) | workspace;
}

function basis3(input: Bit, output: Bit, workspace: Bit): ThreeQubitState {
  const i = idx3(input, output, workspace);
  return [0, 1, 2, 3, 4, 5, 6, 7].map((j) =>
    j === i ? { ...ONE_C } : { ...ZERO },
  ) as ThreeQubitState;
}

function clone3(s: ThreeQubitState): ThreeQubitState {
  return s.map((a) => ({ ...a })) as ThreeQubitState;
}

function apply3Single(
  state: ThreeQubitState,
  qubit: 0 | 1 | 2,
  matrix: [Complex, Complex, Complex, Complex],
): ThreeQubitState {
  const next: ThreeQubitState = Array.from({ length: 8 }, () => ({
    ...ZERO,
  })) as ThreeQubitState;

  for (let i = 0; i < 8; i++) {
    const input = (i >> 2) & 1;
    const output = (i >> 1) & 1;
    const workspace = i & 1;
    const bits = [input, output, workspace] as const;
    const bit = bits[qubit]!;

    for (let b = 0; b <= 1; b++) {
      const amp = matrix[b * 2 + bit]!;
      if (amp.re === 0 && amp.im === 0) continue;
      const newBits = [...bits] as [Bit, Bit, Bit];
      newBits[qubit] = b as Bit;
      const j = idx3(newBits[0], newBits[1], newBits[2]);
      next[j] = cAdd(next[j]!, cMul(amp, state[i]!));
    }
  }
  return next;
}

function apply3Cnot(
  state: ThreeQubitState,
  control: 0 | 1 | 2,
  target: 0 | 1 | 2,
): ThreeQubitState {
  const next: ThreeQubitState = Array.from({ length: 8 }, () => ({
    ...ZERO,
  })) as ThreeQubitState;

  for (let i = 0; i < 8; i++) {
    const input = (i >> 2) & 1;
    const output = (i >> 1) & 1;
    const workspace = i & 1;
    const bits = [input, output, workspace] as [Bit, Bit, Bit];
    const jBits = [...bits] as [Bit, Bit, Bit];
    if (bits[control] === 1) {
      jBits[target] = (jBits[target] === 0 ? 1 : 0) as Bit;
    }
    const j = idx3(jBits[0], jBits[1], jBits[2]);
    next[j] = cAdd(next[j]!, state[i]!);
  }
  return next;
}

/**
 * Toy V_f on input+workspace: |x⟩|y⟩|w⟩ ↦ |x⟩|y⟩|w ⊕ f(x)⟩.
 * Self-inverse; stand-in for Mermin's reversible compute into scratch (§2.3).
 */
function applyV(state: ThreeQubitState, fn: OneBitFn): ThreeQubitState {
  const next: ThreeQubitState = Array.from({ length: 8 }, () => ({
    ...ZERO,
  })) as ThreeQubitState;
  for (let i = 0; i < 8; i++) {
    const input = ((i >> 2) & 1) as Bit;
    const output = ((i >> 1) & 1) as Bit;
    const workspace = (i & 1) as Bit;
    const w2 = (workspace ^ fn.f(input)) as Bit;
    next[idx3(input, output, w2)] = cAdd(
      next[idx3(input, output, w2)]!,
      state[i]!,
    );
  }
  return next;
}

function applyVdag(state: ThreeQubitState, fn: OneBitFn): ThreeQubitState {
  return applyV(state, fn);
}

/** Copy workspace XOR into output (stand-in for C_m). */
function applyCm(state: ThreeQubitState): ThreeQubitState {
  return apply3Cnot(state, 2, 1);
}

export type GarbageScenario = {
  fn: OneBitFn;
  /** Input prepared as H|0⟩ so x-dependent scratch can entangle. */
  dirty: ThreeQubitState;
  clean: ThreeQubitState;
  /** True when input+output are entangled with workspace. */
  dirtyEntangled: boolean;
  /** True when clean state factors as |Ψ⟩_{io} ⊗ |0⟩_w. */
  cleanSeparable: boolean;
  /** Workspace is |0⟩ after V† (within tolerance). */
  workspaceClean: boolean;
};

/**
 * Illustrate W_f = V† C_m V on (|0⟩+|1⟩)/√2 |0⟩|0⟩ (Mermin §2.3).
 * Balanced f: dirty workspace depends on x → entanglement.
 * After V†: registers carry U_f result, workspace back to |0⟩.
 */
export function garbageScenario(fnId: FnId): GarbageScenario {
  const fn = ONE_BIT_FUNCTIONS[fnId];
  let s = basis3(0, 0, 0);
  s = apply3Single(s, 0, H_MATRIX);
  s = applyV(s, fn);
  s = applyCm(s);
  const dirty = clone3(s);
  const clean = applyVdag(s, fn);

  return {
    fn,
    dirty,
    clean,
    dirtyEntangled: !ioSeparableFromWorkspace(dirty),
    cleanSeparable: ioSeparableFromWorkspace(clean),
    workspaceClean: workspaceIsZero(clean),
  };
}

/** Whether the 3-Qbit state factors as |Ψ⟩_{input,output} ⊗ |φ⟩_{workspace}. */
function ioSeparableFromWorkspace(state: ThreeQubitState): boolean {
  const eps = 1e-8;
  // Build 2×2 matrix M_{io,w} of amplitudes; rank-1 (up to scale) ⇒ product.
  const m: Complex[][] = [
    [ZERO, ZERO],
    [ZERO, ZERO],
    [ZERO, ZERO],
    [ZERO, ZERO],
  ];
  for (let i = 0; i < 8; i++) {
    const io = i >> 1;
    const w = i & 1;
    m[io]![w] = state[i]!;
  }
  // All 2×2 minors of the 4×2 matrix must vanish.
  for (let a = 0; a < 4; a++) {
    for (let b = a + 1; b < 4; b++) {
      const det = cAdd(
        cMul(m[a]![0]!, m[b]![1]!),
        cScale(-1, cMul(m[a]![1]!, m[b]![0]!)),
      );
      if (Math.abs(det.re) > eps || Math.abs(det.im) > eps) return false;
    }
  }
  return true;
}

function workspaceIsZero(state: ThreeQubitState): boolean {
  const eps = 1e-8;
  let p1 = 0;
  for (let i = 0; i < 8; i++) {
    if (i & 1) {
      const a = state[i]!;
      p1 += a.re * a.re + a.im * a.im;
    }
  }
  return p1 < eps;
}

export function threeQubitAmplitudes(state: ThreeQubitState) {
  return (["000", "001", "010", "011", "100", "101", "110", "111"] as const).map(
    (label, i) => ({
      label,
      re: state[i]!.re,
      im: state[i]!.im,
    }),
  );
}
