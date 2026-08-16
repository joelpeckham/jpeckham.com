/**
 * Ported slices of chessgator's engine/teaching code for the write-up demos.
 * Tokenizer + mirror match CSSLab/maia3 via chessgator `src/engines/maia/encode.ts`.
 * Softmax / top-p match `src/engines/maia/sample.ts`.
 * Job-book stale drop matches `EngineJobBook.takeResult`.
 * Classification + templates match the teaching pipeline.
 */

// ---------------------------------------------------------------------------
// Board encoding (Maia tokenizer)
// ---------------------------------------------------------------------------

/** Channel order: white P,N,B,R,Q,K then black p,n,b,r,q,k (0-based). */
export const PIECE_CHANNEL: Record<string, number> = {
  P: 0,
  N: 1,
  B: 2,
  R: 3,
  Q: 4,
  K: 5,
  p: 6,
  n: 7,
  b: 8,
  r: 9,
  q: 10,
  k: 11,
};

export const CHANNEL_LABELS = [
  "P",
  "N",
  "B",
  "R",
  "Q",
  "K",
  "p",
  "n",
  "b",
  "r",
  "q",
  "k",
] as const;

export type PieceChar = keyof typeof PIECE_CHANNEL;

export const FILES = "abcdefgh";

export function squareToIndex(square: string): number {
  const file = FILES.indexOf(square[0]!);
  const rank = Number(square[1]) - 1;
  if (file < 0 || rank < 0 || rank > 7) {
    throw new Error(`Invalid square: ${square}`);
  }
  return file + rank * 8;
}

export function indexToSquare(index: number): string {
  return `${FILES[index % 8]}${Math.floor(index / 8) + 1}`;
}

/** Mirror a square vertically (rank ↔ 9-rank), matching upstream `mirror_square`. */
export function mirrorSquare(square: string): string {
  const file = square[0]!;
  const rank = 9 - Number(square[1]);
  return `${file}${rank}`;
}

/** Mirror a UCI move vertically; promotion piece is unchanged. */
export function mirrorMove(moveUci: string): string {
  const uci = moveUci.toLowerCase();
  const start = uci.slice(0, 2);
  const end = uci.slice(2, 4);
  const promo = uci.length > 4 ? uci.slice(4) : "";
  return mirrorSquare(start) + mirrorSquare(end) + promo;
}

export type ParsedFen = {
  pieces: Array<PieceChar | null>;
  turn: "w" | "b";
};

/** Piece placement only. Index 0 is a1, matching chessgator's square order. */
export function parseFen(fen: string): ParsedFen {
  const [placement, turnRaw] = fen.split(" ");
  if (!placement) throw new Error(`Invalid FEN: ${fen}`);
  const pieces: Array<PieceChar | null> = Array.from({ length: 64 }, () => null);
  const ranks = placement.split("/");
  if (ranks.length !== 8) throw new Error(`Invalid FEN placement: ${fen}`);

  for (let rankFromTop = 0; rankFromTop < 8; rankFromTop++) {
    const rank = 7 - rankFromTop;
    let file = 0;
    for (const ch of ranks[rankFromTop]!) {
      if (ch >= "1" && ch <= "8") {
        file += Number(ch);
        continue;
      }
      if (!(ch in PIECE_CHANNEL)) {
        throw new Error(`Invalid piece in FEN: ${ch}`);
      }
      if (file > 7) throw new Error(`FEN rank overflow: ${fen}`);
      pieces[file + rank * 8] = ch as PieceChar;
      file += 1;
    }
  }

  return { pieces, turn: turnRaw === "b" ? "b" : "w" };
}

function swapColor(piece: PieceChar): PieceChar {
  return (
    piece === piece.toUpperCase() ? piece.toLowerCase() : piece.toUpperCase()
  ) as PieceChar;
}

/**
 * python-chess `BaseBoard.mirror()`: vertical flip + color swap.
 * Side-to-move becomes White in token space.
 */
export function mirrorPieces(
  pieces: ReadonlyArray<PieceChar | null>,
): Array<PieceChar | null> {
  const out: Array<PieceChar | null> = Array.from({ length: 64 }, () => null);
  for (let square = 0; square < 64; square++) {
    const piece = pieces[square];
    if (!piece) continue;
    const file = square % 8;
    const rank = Math.floor(square / 8);
    out[file + (7 - rank) * 8] = swapColor(piece);
  }
  return out;
}

export function tokenizePieces(
  pieces: ReadonlyArray<PieceChar | null>,
): Float32Array {
  const tokens = new Float32Array(64 * 12);
  for (let square = 0; square < 64; square++) {
    const piece = pieces[square];
    if (!piece) continue;
    const channel = PIECE_CHANNEL[piece];
    if (channel === undefined) continue;
    tokens[square * 12 + channel] = 1;
  }
  return tokens;
}

/**
 * Tokenize a FEN into a Float32Array of length 64*12 (row-major square×channel).
 * When Black is to move the board is mirrored so the side-to-move is always White.
 */
export function tokenizeFen(
  fen: string,
  options: { mirrorBlack?: boolean } = {},
): Float32Array {
  const { pieces, turn } = parseFen(fen);
  const mirrorBlack = options.mirrorBlack ?? true;
  const viewed = turn === "b" && mirrorBlack ? mirrorPieces(pieces) : pieces;
  return tokenizePieces(viewed);
}

export function modelPiecesForFen(
  fen: string,
  options: { mirrorBlack?: boolean } = {},
): Array<PieceChar | null> {
  const { pieces, turn } = parseFen(fen);
  const mirrorBlack = options.mirrorBlack ?? true;
  return turn === "b" && mirrorBlack ? mirrorPieces(pieces) : [...pieces];
}

export type BoardPreset = {
  id: string;
  label: string;
  fen: string;
  note: string;
};

export const BOARD_PRESETS: readonly BoardPreset[] = [
  {
    id: "start",
    label: "Start",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    note: "White to move. Tokens match the board you see: no flip, no color swap.",
  },
  {
    id: "after-e4",
    label: "1. e4",
    fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    note: "Black to move. The net sees a mirrored board so it is always White's turn in token space.",
  },
  {
    id: "g6-attack",
    label: "…g6 vs Qh5",
    fen: "rnbqkbnr/pppp1ppp/6p1/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 3",
    note: "White to move after 2…g6. Queen on h5 is hanging. Still no mirror; White is already to move.",
  },
];

export function channelPlane(
  tokens: ArrayLike<number>,
  channel: number,
): Uint8Array {
  const plane = new Uint8Array(64);
  for (let square = 0; square < 64; square++) {
    plane[square] = tokens[square * 12 + channel] ? 1 : 0;
  }
  return plane;
}

export function occupiedSquares(tokens: ArrayLike<number>): number {
  let count = 0;
  for (let square = 0; square < 64; square++) {
    for (let c = 0; c < 12; c++) {
      if (tokens[square * 12 + c]) {
        count += 1;
        break;
      }
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Legal mask + temperature / top-p sampling
// ---------------------------------------------------------------------------

export type SampleOptions = {
  temperature: number;
  topP: number;
  random?: () => number;
};

/** Apply -Infinity to illegal logits (mutates a copy). */
export function applyLegalMask(
  logits: ArrayLike<number>,
  mask: ArrayLike<number>,
): Float64Array {
  const out = new Float64Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    out[i] = mask[i] ? Number(logits[i]) : Number.NEGATIVE_INFINITY;
  }
  return out;
}

/** Numerically stable softmax. Entries that are -Infinity become 0. */
export function stableSoftmax(logits: ArrayLike<number>): Float64Array {
  const n = logits.length;
  const out = new Float64Array(n);
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const v = Number(logits[i]);
    if (v > max) max = v;
  }
  if (!Number.isFinite(max)) {
    return out;
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = Number(logits[i]);
    if (!Number.isFinite(v)) {
      out[i] = 0;
      continue;
    }
    const e = Math.exp(v - max);
    out[i] = e;
    sum += e;
  }
  if (sum <= 0) return out;
  for (let i = 0; i < n; i++) out[i]! /= sum;
  return out;
}

/** Deterministic argmax; ties break toward the lowest index. */
export function argmax(logits: ArrayLike<number>): number {
  let bestIdx = 0;
  let bestVal = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < logits.length; i++) {
    const v = Number(logits[i]);
    if (v > bestVal) {
      bestVal = v;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function sampleCategorical(
  probs: ArrayLike<number>,
  random: () => number,
): number {
  let r = random();
  if (!(r >= 0 && r < 1)) r = 0;
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += Number(probs[i]);
    if (r < acc) return i;
  }
  for (let i = probs.length - 1; i >= 0; i--) {
    if (Number(probs[i]) > 0) return i;
  }
  return 0;
}

/**
 * Sample a vocabulary index from masked logits.
 * `temperature <= 0` ⇒ deterministic argmax (used by parity tests).
 */
export function sampleFromLogits(
  logits: ArrayLike<number>,
  options: SampleOptions,
): number {
  const temperature = options.temperature;
  if (temperature <= 0) {
    return argmax(logits);
  }

  const scaled = new Float64Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    const v = Number(logits[i]);
    scaled[i] = Number.isFinite(v) ? v / temperature : v;
  }
  const probs = stableSoftmax(scaled);
  const random = options.random ?? Math.random;

  if (options.topP < 1) {
    const order = Array.from({ length: probs.length }, (_, i) => i);
    order.sort((a, b) => Number(probs[b]) - Number(probs[a]));

    const kept: number[] = [];
    const keptProbs: number[] = [];
    let cumulative = 0;
    for (let k = 0; k < order.length; k++) {
      const idx = order[k]!;
      const p = Number(probs[idx]);
      if (p <= 0 && k > 0) break;
      cumulative += p;
      if (k > 0 && cumulative > options.topP) break;
      kept.push(idx);
      keptProbs.push(p);
    }
    if (kept.length === 0) {
      kept.push(order[0]!);
      keptProbs.push(Number(probs[order[0]!]));
    }

    let sum = 0;
    for (const p of keptProbs) sum += p;
    const renormalized = keptProbs.map((p) => (sum > 0 ? p / sum : 0));
    const choice = sampleCategorical(renormalized, random);
    return kept[choice]!;
  }

  return sampleCategorical(probs, random);
}

export function histogramFromLogits(
  logits: ArrayLike<number>,
  options: SampleOptions,
  draws: number,
): number[] {
  const counts = Array.from({ length: logits.length }, () => 0);
  for (let i = 0; i < draws; i++) {
    counts[sampleFromLogits(logits, options)]! += 1;
  }
  return counts;
}

export type SampleCandidate = {
  uci: string;
  san: string;
  logit: number;
  legal: boolean;
};

/**
 * Synthetic policy over a slice of the 4352-move vocab, after 1. e4 e5.
 * Illegal entries keep high logits on purpose so the mask is visible.
 */
export const SAMPLE_CANDIDATES: readonly SampleCandidate[] = [
  { uci: "g1f3", san: "Nf3", logit: 4.6, legal: true },
  { uci: "e4e5", san: "e5?", logit: 4.2, legal: false },
  { uci: "b1c3", san: "Nc3", logit: 3.5, legal: true },
  { uci: "e2e4", san: "e4?", logit: 3.3, legal: false },
  { uci: "d2d4", san: "d4", logit: 3.0, legal: true },
  { uci: "d1h5", san: "Qh5", logit: 2.4, legal: true },
  { uci: "f1c4", san: "Bc4", logit: 2.2, legal: true },
  { uci: "g1e5", san: "Ne5?", logit: 2.0, legal: false },
  { uci: "f2f4", san: "f4", logit: 1.6, legal: true },
  { uci: "a2a4", san: "a4", logit: 0.8, legal: true },
];

export const SAMPLE_POSITION_LABEL = "1. e4 e5, White to move";

export function candidateLogits(
  candidates: readonly SampleCandidate[] = SAMPLE_CANDIDATES,
): Float64Array {
  return Float64Array.from(candidates.map((c) => c.logit));
}

export function candidateMask(
  candidates: readonly SampleCandidate[] = SAMPLE_CANDIDATES,
): Uint8Array {
  return Uint8Array.from(candidates.map((c) => (c.legal ? 1 : 0)));
}

export const PLAYTIME_TEMPERATURE = 0.8;
export const PLAYTIME_TOP_P = 0.9;

// ---------------------------------------------------------------------------
// Engine job book (stale gameNodeId drop)
// ---------------------------------------------------------------------------

export type JobRecord = {
  requestId: string;
  gameNodeId: string;
  cancelled: boolean;
};

export type TakeResultOutcome = "applied" | "stale" | "cancelled" | "missing";

/**
 * Core of `EngineJobBook.takeResult`: a result only applies when its
 * `gameNodeId` still matches the live pointer (and the job was not cancelled).
 */
export function takeResult(
  currentGameNodeId: string | null,
  job: JobRecord | undefined,
  resultGameNodeId: string,
): TakeResultOutcome {
  if (!job) return "missing";
  if (job.cancelled) return "cancelled";
  if (currentGameNodeId !== null && resultGameNodeId !== currentGameNodeId) {
    return "stale";
  }
  return "applied";
}

export type JobBookPly = {
  id: string;
  san: string;
};

export const JOB_BOOK_LINE: readonly JobBookPly[] = [
  { id: "n0", san: "start" },
  { id: "n1", san: "e4" },
  { id: "n2", san: "e5" },
  { id: "n3", san: "Nf3" },
];

export function staleMessage(gameNodeId: string, current: string): string {
  return `Stale engine result for ${gameNodeId}; current node is ${current}`;
}

// ---------------------------------------------------------------------------
// Classification + teaching pipeline
// ---------------------------------------------------------------------------

export type MoveClassification =
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

/** Same bands chessgator uses. Tuned for teaching, not Lichess parity. */
export const CLASSIFICATION_THRESHOLDS = {
  bestMaxLossCp: 0,
  excellentMaxLossCp: 20,
  goodMaxLossCp: 50,
  inaccuracyMaxLossCp: 100,
  mistakeMaxLossCp: 200,
} as const;

export function classifyEvalLoss(lossCp: number): MoveClassification {
  const loss = Math.max(0, Math.round(lossCp));
  const t = CLASSIFICATION_THRESHOLDS;
  if (loss <= t.bestMaxLossCp) return "best";
  if (loss <= t.excellentMaxLossCp) return "excellent";
  if (loss <= t.goodMaxLossCp) return "good";
  if (loss <= t.inaccuracyMaxLossCp) return "inaccuracy";
  if (loss <= t.mistakeMaxLossCp) return "mistake";
  return "blunder";
}

export const CLASSIFICATION_LABEL: Record<MoveClassification, string> = {
  best: "Best",
  excellent: "Excellent",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

/**
 * Centipawn loss for the side that just moved (White's eval swing against them).
 * Positive = the mover made their position worse.
 */
export function evalLossForMover(input: {
  evalBeforeWhiteCp: number;
  evalAfterWhiteCp: number;
  mover: "w" | "b";
}): number {
  const deltaForWhite = input.evalAfterWhiteCp - input.evalBeforeWhiteCp;
  return input.mover === "w" ? -deltaForWhite : deltaForWhite;
}

export type TeachingConcept =
  | "piece_safety"
  | "threat"
  | "king_safety"
  | "check"
  | "capture"
  | "development"
  | "missed_improvement"
  | "solid_move"
  | "best_move";

export const CONCEPT_PRIORITY: readonly TeachingConcept[] = [
  "piece_safety",
  "threat",
  "king_safety",
  "check",
  "capture",
  "development",
  "missed_improvement",
  "solid_move",
  "best_move",
];

export const CONCEPT_LABEL: Record<TeachingConcept, string> = {
  piece_safety: "Piece safety",
  threat: "Threat",
  king_safety: "King safety",
  check: "Check",
  capture: "Capture",
  development: "Development",
  missed_improvement: "Missed improvement",
  solid_move: "Solid move",
  best_move: "Best move",
};

export type TacticalFlags = {
  movedPieceHanging?: boolean;
  leftPieceHanging?: boolean;
  capturedHangingPiece?: boolean;
  ignoredThreat?: boolean;
  kingMoreExposed?: boolean;
  castlingRightsLost?: boolean;
  gaveCheck?: boolean;
  isCapture?: boolean;
  developedPiece?: boolean;
};

export function isTeachable(classification: MoveClassification): boolean {
  return (
    classification === "inaccuracy" ||
    classification === "mistake" ||
    classification === "blunder"
  );
}

function matchesConcept(
  concept: TeachingConcept,
  classification: MoveClassification,
  t: TacticalFlags,
  evalLossCp: number,
): boolean {
  const teachable = isTeachable(classification);

  switch (concept) {
    case "piece_safety":
      return Boolean(
        teachable &&
          (t.movedPieceHanging || t.leftPieceHanging || t.capturedHangingPiece),
      );
    case "threat":
      return Boolean(teachable && t.ignoredThreat);
    case "king_safety":
      return Boolean(teachable && (t.kingMoreExposed || t.castlingRightsLost));
    case "check":
      return Boolean(t.gaveCheck && (teachable || classification === "good"));
    case "capture":
      return Boolean(t.isCapture && teachable);
    case "development":
      return Boolean(t.developedPiece && evalLossCp <= 50);
    case "missed_improvement":
      return teachable;
    case "solid_move":
      return classification === "excellent" || classification === "good";
    case "best_move":
      return classification === "best";
    default:
      return false;
  }
}

/** First matching heuristic in CONCEPT_PRIORITY wins. Best short-circuits. */
export function chooseConcept(
  classification: MoveClassification,
  flags: TacticalFlags,
  evalLossCp: number,
): TeachingConcept {
  if (classification === "best") return "best_move";
  for (const concept of CONCEPT_PRIORITY) {
    if (matchesConcept(concept, classification, flags, evalLossCp)) {
      return concept;
    }
  }
  return "missed_improvement";
}

export type EvalFrame = "still_winning" | "still_losing" | "holds" | null;

export type CoachDraft = {
  playedPhrase: string;
  classification: MoveClassification;
  evalFrame: EvalFrame;
  problem: string | null;
  consequence: string | null;
  suggestedPhrase: string | null;
  suggestedBecause: string | null;
  playedBecause: string | null;
};

const VERDICT: Record<MoveClassification, string> = {
  best: "is the strongest move",
  excellent: "is an excellent move",
  good: "is a good move",
  inaccuracy: "is an inaccuracy",
  mistake: "is a mistake",
  blunder: "is a blunder",
};

function capitalizePhrase(text: string): string {
  if (text.length === 0) return text;
  return text[0]!.toUpperCase() + text.slice(1);
}

function evalLead(frame: EvalFrame): string | null {
  if (frame === "still_winning") return "You are still winning";
  if (frame === "still_losing") return "You are still worse";
  if (frame === "holds") return "The position stays even";
  return null;
}

/**
 * Same sentence shape chessgator uses in `renderExplanation`.
 * Problem present: lead + problem + consequence + better move.
 * Otherwise: verdict, optionally with a because-clause.
 */
export function renderExplanation(draft: CoachDraft): string {
  const played = capitalizePhrase(draft.playedPhrase);
  const parts: string[] = [];

  if (draft.problem) {
    const lead = evalLead(draft.evalFrame);
    if (lead) {
      parts.push(`${lead}, but ${draft.playedPhrase} ${draft.problem}.`);
    } else {
      parts.push(`${played} ${draft.problem}.`);
    }
    if (draft.consequence) {
      parts.push(`${capitalizePhrase(draft.consequence)}.`);
    }
    if (draft.suggestedPhrase && draft.suggestedBecause) {
      parts.push(
        `A better move would have been ${draft.suggestedPhrase} because ${draft.suggestedBecause}.`,
      );
    }
  } else {
    const verdict = VERDICT[draft.classification];
    if (draft.playedBecause) {
      parts.push(`${played} ${verdict} because ${draft.playedBecause}.`);
    } else {
      parts.push(`${played} ${verdict}.`);
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export type PipelinePreset = {
  id: string;
  label: string;
  playedSan: string;
  mover: "w" | "b";
  evalBeforeWhiteCp: number;
  evalAfterWhiteCp: number;
  beforeSearch: { multipv: number; movetimeMs: number };
  afterSearch: { multipv: number; movetimeMs: number };
  flags: TacticalFlags;
  draft: Omit<CoachDraft, "classification">;
};

export const PIPELINE_PRESETS: readonly PipelinePreset[] = [
  {
    id: "hanging-queen",
    label: "Hanging queen",
    playedSan: "a3",
    mover: "w",
    evalBeforeWhiteCp: -120,
    evalAfterWhiteCp: -900,
    beforeSearch: { multipv: 3, movetimeMs: 180 },
    afterSearch: { multipv: 2, movetimeMs: 135 },
    flags: { leftPieceHanging: true },
    draft: {
      playedPhrase: "a3",
      evalFrame: "still_losing",
      problem: "hangs the queen",
      consequence: "Black takes on h5",
      suggestedPhrase: "Qxe5",
      suggestedBecause: "it grabs the hanging pawn and steps off the attack",
      playedBecause: null,
    },
  },
  {
    id: "center",
    label: "Center pawn",
    playedSan: "e4",
    mover: "w",
    evalBeforeWhiteCp: 25,
    evalAfterWhiteCp: 30,
    beforeSearch: { multipv: 3, movetimeMs: 180 },
    afterSearch: { multipv: 2, movetimeMs: 135 },
    flags: { developedPiece: true },
    draft: {
      playedPhrase: "pawn to e4",
      evalFrame: null,
      problem: null,
      consequence: null,
      suggestedPhrase: null,
      suggestedBecause: null,
      playedBecause: "it claims the center and frees the bishop",
    },
  },
  {
    id: "quiet-inaccuracy",
    label: "Quiet miss",
    playedSan: "a6",
    mover: "b",
    evalBeforeWhiteCp: 15,
    evalAfterWhiteCp: 80,
    beforeSearch: { multipv: 3, movetimeMs: 180 },
    afterSearch: { multipv: 2, movetimeMs: 135 },
    flags: { ignoredThreat: true },
    draft: {
      playedPhrase: "a6",
      evalFrame: "holds",
      problem: "ignores a pin",
      consequence: "the knight on c3 stays free",
      suggestedPhrase: "Bb4",
      suggestedBecause: "it pins the knight and fights for the center",
      playedBecause: null,
    },
  },
];

export type PipelineResult = {
  lossCp: number;
  classification: MoveClassification;
  concept: TeachingConcept;
  explanation: string;
  nudge: boolean;
};

export function runPipeline(preset: PipelinePreset): PipelineResult {
  const lossCp = evalLossForMover({
    evalBeforeWhiteCp: preset.evalBeforeWhiteCp,
    evalAfterWhiteCp: preset.evalAfterWhiteCp,
    mover: preset.mover,
  });
  const classification = classifyEvalLoss(lossCp);
  const concept = chooseConcept(classification, preset.flags, lossCp);
  const explanation = renderExplanation({
    ...preset.draft,
    classification,
  });
  return {
    lossCp,
    classification,
    concept,
    explanation,
    nudge: classification === "blunder",
  };
}
