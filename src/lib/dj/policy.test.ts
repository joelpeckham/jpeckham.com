import { describe, expect, it } from "vitest";
import {
  commandStillFresh,
  finalizeCommandError,
  oneshotResumeDecision,
  shouldAcceptEnqueue,
} from "./policy";

describe("finalizeCommandError", () => {
  it("never stamps a timeout after a successful command", () => {
    expect(finalizeCommandError(undefined, true)).toBeUndefined();
    expect(finalizeCommandError(undefined, false)).toBeUndefined();
  });

  it("keeps a real command failure", () => {
    expect(finalizeCommandError("Could not pause", true)).toBe("Could not pause");
  });
});

describe("command queue helpers", () => {
  it("rejects enqueue at the cap", () => {
    expect(shouldAcceptEnqueue(31, 32)).toBe(true);
    expect(shouldAcceptEnqueue(32, 32)).toBe(false);
  });

  it("expires commands from the original enqueuedAt", () => {
    expect(commandStillFresh(1_000, 31_000, 30_000)).toBe(true);
    expect(commandStillFresh(1_000, 31_001, 30_000)).toBe(false);
    expect(commandStillFresh(undefined, 99_000, 30_000)).toBe(true);
  });
});

describe("oneshotResumeDecision", () => {
  const base = {
    oneshotTidalId: "111",
    now: 10_000,
    armedAt: 5_000,
    mismatchCount: 0,
    stoppedCount: 0,
  };

  it("ignores mismatches during the grace window", () => {
    const decision = oneshotResumeDecision({
      ...base,
      now: 6_000,
      armedAt: 5_000,
      infoTidalId: "222",
      isPlaying: true,
    });
    expect(decision.resume).toBe(false);
    expect(decision.mismatchCount).toBe(0);
  });

  it("requires three mismatched playing polls", () => {
    let mismatchCount = 0;
    let stoppedCount = 0;
    for (let i = 0; i < 2; i += 1) {
      const decision = oneshotResumeDecision({
        ...base,
        mismatchCount,
        stoppedCount,
        infoTidalId: "222",
        isPlaying: true,
      });
      expect(decision.resume).toBe(false);
      mismatchCount = decision.mismatchCount;
      stoppedCount = decision.stoppedCount;
    }
    const third = oneshotResumeDecision({
      ...base,
      mismatchCount,
      stoppedCount,
      infoTidalId: "222",
      isPlaying: true,
    });
    expect(third.resume).toBe(true);
  });

  it("resumes after the anthem stops for three polls", () => {
    let mismatchCount = 0;
    let stoppedCount = 0;
    for (let i = 0; i < 3; i += 1) {
      const decision = oneshotResumeDecision({
        ...base,
        mismatchCount,
        stoppedCount,
        infoTidalId: "111",
        isPlaying: false,
      });
      mismatchCount = decision.mismatchCount;
      stoppedCount = decision.stoppedCount;
      if (i < 2) expect(decision.resume).toBe(false);
      else expect(decision.resume).toBe(true);
    }
  });

  it("resets when the anthem is still playing", () => {
    const decision = oneshotResumeDecision({
      ...base,
      mismatchCount: 2,
      infoTidalId: "111",
      isPlaying: true,
    });
    expect(decision.resume).toBe(false);
    expect(decision.mismatchCount).toBe(0);
    expect(decision.stoppedCount).toBe(0);
  });
});
