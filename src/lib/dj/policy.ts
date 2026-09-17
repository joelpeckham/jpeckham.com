export function finalizeCommandError(
  lastError: string | undefined,
  timedOut: boolean,
): string | undefined {
  if (lastError) return lastError;
  if (timedOut) return undefined;
  return undefined;
}

export function commandStillFresh(
  enqueuedAt: number | undefined,
  now: number,
  ttlMs: number,
): boolean {
  if (enqueuedAt === undefined) return true;
  return now - enqueuedAt <= ttlMs;
}

export function shouldAcceptEnqueue(length: number, max: number): boolean {
  return length < max;
}

export function oneshotResumeDecision(args: {
  oneshotTidalId: string;
  infoTidalId: string | null;
  isPlaying: boolean;
  now: number;
  armedAt: number;
  mismatchCount: number;
  stoppedCount: number;
  graceMs?: number;
  confirmPolls?: number;
}): { resume: boolean; mismatchCount: number; stoppedCount: number } {
  const graceMs = args.graceMs ?? 2000;
  const confirmPolls = args.confirmPolls ?? 3;
  if (args.now - args.armedAt < graceMs) {
    return { resume: false, mismatchCount: 0, stoppedCount: 0 };
  }
  if (args.infoTidalId === args.oneshotTidalId && args.isPlaying) {
    return { resume: false, mismatchCount: 0, stoppedCount: 0 };
  }
  if (args.infoTidalId && args.infoTidalId !== args.oneshotTidalId && args.isPlaying) {
    const mismatchCount = args.mismatchCount + 1;
    return {
      resume: mismatchCount >= confirmPolls,
      mismatchCount,
      stoppedCount: 0,
    };
  }
  const stoppedCount = args.stoppedCount + 1;
  return {
    resume: stoppedCount >= confirmPolls,
    mismatchCount: 0,
    stoppedCount,
  };
}
