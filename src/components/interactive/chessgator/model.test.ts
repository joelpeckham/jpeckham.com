import { describe, expect, it } from "vitest";
import {
  applyLegalMask,
  argmax,
  candidateLogits,
  candidateMask,
  channelPlane,
  chooseConcept,
  classifyEvalLoss,
  evalLossForMover,
  histogramFromLogits,
  mirrorMove,
  mirrorPieces,
  modelPiecesForFen,
  parseFen,
  renderExplanation,
  runPipeline,
  sampleFromLogits,
  squareToIndex,
  staleMessage,
  takeResult,
  tokenizeFen,
  PIPELINE_PRESETS,
  SAMPLE_CANDIDATES,
} from "./model";

describe("tokenizeFen", () => {
  it("places a white pawn on e2 at channel P without mirroring", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const tokens = tokenizeFen(fen);
    const e2 = squareToIndex("e2");
    expect(tokens[e2 * 12 + 0]).toBe(1);
    expect(channelPlane(tokens, 0)[e2]).toBe(1);
    expect(tokens[squareToIndex("e7") * 12 + 6]).toBe(1);
  });

  it("mirrors Black-to-move so side-to-move is White in token space", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const tokens = tokenizeFen(fen);
    // Real white pawn on e4 → flip to e5 + recolor → black pawn on e5.
    expect(tokens[squareToIndex("e5") * 12 + 6]).toBe(1);
    // Real black pawn on e7 → flip to e2 + recolor → white pawn on e2.
    expect(tokens[squareToIndex("e2") * 12 + 0]).toBe(1);
    // The real e4 square is empty in the mirrored view.
    const e4 = squareToIndex("e4");
    let occupied = 0;
    for (let c = 0; c < 12; c++) occupied += tokens[e4 * 12 + c]!;
    expect(occupied).toBe(0);
  });

  it("can skip the mirror so a Black-to-move board stays as-is", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const tokens = tokenizeFen(fen, { mirrorBlack: false });
    expect(tokens[squareToIndex("e4") * 12 + 0]).toBe(1);
    expect(tokens[squareToIndex("e7") * 12 + 6]).toBe(1);
  });

  it("round-trips piece color swap on a vertical flip", () => {
    const { pieces } = parseFen(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    );
    const mirrored = mirrorPieces(pieces);
    expect(mirrored[squareToIndex("e5")]).toBe("p");
    expect(mirrored[squareToIndex("e2")]).toBe("P");
    expect(modelPiecesForFen(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    )[squareToIndex("e5")]).toBe("p");
  });
});

describe("mirrorMove", () => {
  it("flips ranks and keeps the promotion piece", () => {
    expect(mirrorMove("e7e5")).toBe("e2e4");
    expect(mirrorMove("a7a8q")).toBe("a2a1q");
  });
});

describe("sampleFromLogits", () => {
  it("temperature <= 0 selects argmax (parity / test mode)", () => {
    const logits = [0.1, 4.2, 1.0];
    expect(sampleFromLogits(logits, { temperature: 0, topP: 1 })).toBe(1);
    expect(sampleFromLogits(logits, { temperature: -1, topP: 0.5 })).toBe(1);
    expect(argmax(logits)).toBe(1);
  });

  it("never samples a masked-illegal move", () => {
    const logits = candidateLogits();
    const masked = applyLegalMask(logits, candidateMask());
    const counts = histogramFromLogits(
      masked,
      { temperature: 0.8, topP: 0.9, random: (() => {
        let i = 0;
        return () => {
          i = (i * 17 + 3) % 1000;
          return i / 1000;
        };
      })() },
      200,
    );
    for (const [index, count] of counts.entries()) {
      if (!SAMPLE_CANDIDATES[index]!.legal) expect(count).toBe(0);
    }
    expect(counts.reduce((a, b) => a + b, 0)).toBe(200);
  });

  it("top-p keeps the first mass and drops the tail", () => {
    const logits = [0, 10, 0];
    const idx = sampleFromLogits(logits, {
      temperature: 1,
      topP: 0.0001,
      random: () => 0.99,
    });
    expect(idx).toBe(1);
  });
});

describe("takeResult", () => {
  it("applies a result tagged with the current node", () => {
    expect(
      takeResult("n2", { requestId: "r1", gameNodeId: "n2", cancelled: false }, "n2"),
    ).toBe("applied");
  });

  it("drops a result after the pointer rewinds", () => {
    expect(
      takeResult("n1", { requestId: "r1", gameNodeId: "n2", cancelled: false }, "n2"),
    ).toBe("stale");
    expect(staleMessage("n2", "n1")).toMatch(/n2/);
  });

  it("rejects cancelled and missing jobs", () => {
    expect(
      takeResult("n2", { requestId: "r1", gameNodeId: "n2", cancelled: true }, "n2"),
    ).toBe("cancelled");
    expect(takeResult("n2", undefined, "n2")).toBe("missing");
  });
});

describe("classifyEvalLoss", () => {
  it("uses the teaching thresholds", () => {
    expect(classifyEvalLoss(0)).toBe("best");
    expect(classifyEvalLoss(20)).toBe("excellent");
    expect(classifyEvalLoss(50)).toBe("good");
    expect(classifyEvalLoss(100)).toBe("inaccuracy");
    expect(classifyEvalLoss(200)).toBe("mistake");
    expect(classifyEvalLoss(201)).toBe("blunder");
  });
});

describe("evalLossForMover", () => {
  it("treats a drop in White-eval as loss for White", () => {
    expect(
      evalLossForMover({
        evalBeforeWhiteCp: -120,
        evalAfterWhiteCp: -900,
        mover: "w",
      }),
    ).toBe(780);
  });

  it("treats a rise in White-eval as loss for Black", () => {
    expect(
      evalLossForMover({
        evalBeforeWhiteCp: 15,
        evalAfterWhiteCp: 80,
        mover: "b",
      }),
    ).toBe(65);
  });
});

describe("chooseConcept", () => {
  it("returns best_move before scanning tactics", () => {
    expect(chooseConcept("best", { leftPieceHanging: true }, 0)).toBe(
      "best_move",
    );
  });

  it("prefers piece_safety over later concepts", () => {
    expect(
      chooseConcept(
        "blunder",
        { leftPieceHanging: true, ignoredThreat: true },
        780,
      ),
    ).toBe("piece_safety");
  });
});

describe("runPipeline", () => {
  it("turns the hanging-queen searches into a blunder card", () => {
    const result = runPipeline(PIPELINE_PRESETS[0]!);
    expect(result.classification).toBe("blunder");
    expect(result.concept).toBe("piece_safety");
    expect(result.nudge).toBe(true);
    expect(result.explanation).toMatch(/hangs the queen/);
    expect(result.explanation).not.toMatch(/centipawn/i);
  });

  it("keeps e4 as a because-sentence without a problem clause", () => {
    const result = runPipeline(PIPELINE_PRESETS[1]!);
    expect(result.classification).toBe("best");
    expect(result.concept).toBe("best_move");
    expect(result.explanation).toMatch(/claims the center/);
  });
});

describe("renderExplanation", () => {
  it("leads with eval, then problem, consequence, and a better move", () => {
    const text = renderExplanation({
      playedPhrase: "Nf3",
      classification: "blunder",
      evalFrame: "still_winning",
      problem: "hangs the queen",
      consequence: "Black takes on d4",
      suggestedPhrase: "d4",
      suggestedBecause: "it grabs the center",
      playedBecause: null,
    });
    expect(text).toBe(
      "You are still winning, but Nf3 hangs the queen. Black takes on d4. A better move would have been d4 because it grabs the center.",
    );
  });

  it("uses a verdict sentence when there is no problem", () => {
    const text = renderExplanation({
      playedPhrase: "e4",
      classification: "good",
      evalFrame: null,
      problem: null,
      consequence: null,
      suggestedPhrase: null,
      suggestedBecause: null,
      playedBecause: "it claims the center",
    });
    expect(text).toBe("E4 is a good move because it claims the center.");
  });
});
