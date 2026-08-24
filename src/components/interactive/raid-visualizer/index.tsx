"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TEXT,
  addDrives,
  applyRecoveryStep,
  arrayStats,
  blockDisplay,
  clearRecoveredDriveFlags,
  createInitialState,
  defaultDriveCount,
  drivesToAdd,
  failBlock,
  failDrive,
  generateRandomText,
  isBlockOccupied,
  maxLogicalCapacity,
  randomFailure,
  randomStaticChar,
  rebuild,
  setDriveCount,
  validateDriveCount,
  writeData,
  type ArrayState,
  type BlockRef,
  type Drive,
  type RaidLevel,
  type RecoveryStep,
} from "./raid";

const LEVELS: { value: RaidLevel; label: string }[] = [
  { value: "0", label: "RAID 0 — Striping" },
  { value: "1", label: "RAID 1 — Mirroring" },
  { value: "4", label: "RAID 4 — Dedicated Parity" },
  { value: "5", label: "RAID 5 — Distributed Parity" },
  { value: "10", label: "RAID 10 — Striped Mirrors" },
];

const controlSelect =
  "border-2 border-ink bg-white px-2 py-1 font-mono text-sm focus-visible:outline-none";

const controlInput =
  "min-w-0 flex-1 border-2 border-ink bg-white px-2 py-1 font-mono text-sm focus-visible:outline-none";

const STATIC_MS = 80;
const HIGHLIGHT_MS = 420;

type Phase = "write" | "corrupt" | "rebuild";

const WORKFLOW: {
  phase: Phase;
  step: number;
  label: string;
  hint: string;
}[] = [
  {
    phase: "write",
    step: 1,
    label: "Write data",
    hint: "Data is already on the array. Edit the text and write again to overwrite.",
  },
  {
    phase: "corrupt",
    step: 2,
    label: "Corrupt storage",
    hint: "Click a block to fail it. Or hit Fail on a drive. Yellow blocks hold XOR parity.",
  },
  {
    phase: "rebuild",
    step: 3,
    label: "Rebuild array",
    hint: "Hit Fix on a failed drive. Source blocks light up blue, then the recovered block turns red.",
  },
];

function getPhase(state: ArrayState): Phase {
  if (state.writtenLength === 0) return "write";
  const anyFailed = state.drives.some(
    (drive) =>
      drive.failed || drive.blocks.some((block) => block.failed),
  );
  return anyFailed ? "rebuild" : "corrupt";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clampText(text: string, capacity: number): string {
  if (capacity <= 0) return text;
  return text.slice(0, capacity);
}

function filledState(
  level: RaidLevel,
  text: string,
  driveCount?: number,
): ArrayState {
  return writeData(createInitialState(level, driveCount), text);
}

function writeStatus(text: string, writtenLength: number): string {
  return text.length > writtenLength
    ? `Wrote ${writtenLength} of ${text.length} characters. Array is full.`
    : `Wrote ${writtenLength} character(s) across the array.`;
}

function driveHasFailure(drive: Drive): boolean {
  return drive.failed || drive.blocks.some((block) => block.failed);
}

type Highlight = {
  refs: BlockRef[];
  kind: "source" | "target";
};

function isHighlighted(
  highlight: Highlight | null,
  kind: Highlight["kind"],
  driveIndex: number,
  blockIndex: number,
): boolean {
  if (highlight?.kind !== kind) return false;
  return highlight.refs.some(
    (ref) => ref.driveIndex === driveIndex && ref.blockIndex === blockIndex,
  );
}

function RaidBlock({
  driveIndex,
  blockIndex,
  state,
  highlight,
  onFail,
}: {
  driveIndex: number;
  blockIndex: number;
  state: ArrayState;
  highlight: Highlight | null;
  onFail: (driveIndex: number, blockIndex: number) => void;
}) {
  const block = state.drives[driveIndex].blocks[blockIndex];
  const occupied = isBlockOccupied(block);
  const isSource = isHighlighted(highlight, "source", driveIndex, blockIndex);
  const isTarget = isHighlighted(highlight, "target", driveIndex, blockIndex);

  // Failed blocks render animated "static": the parent re-renders every tick
  // while any failure exists, so this picks a fresh random char each time.
  const display =
    block.failed && occupied ? randomStaticChar() : blockDisplay(block);
  const contentLabel =
    occupied && display
      ? block.kind === "parity"
        ? `, parity ${display}`
        : `, value ${display}`
      : "";

  return (
    <button
      type="button"
      disabled={!occupied || block.failed}
      onClick={() => onFail(driveIndex, blockIndex)}
      className={cn(
        "flex size-9 min-h-9 min-w-9 items-center justify-center border border-ink/25 font-mono text-[11px] transition-colors sm:size-8 sm:min-h-8 sm:min-w-8 sm:text-[11px]",
        blockIndex % 4 === 0 && "border-l-2 border-l-ink",
        blockIndex < 4 && "border-t-2 border-t-ink",
        block.kind === "parity" && !block.failed && "bg-yellow/35",
        block.failed && "bg-red/15 text-red",
        isSource && "bg-blue text-white",
        isTarget && "bg-red text-white",
        occupied && !block.failed && "cursor-pointer hover:bg-paper",
        !occupied && "cursor-default text-grey/50",
      )}
      aria-label={
        occupied
          ? `Drive ${driveIndex + 1} block ${blockIndex + 1}${contentLabel}${block.failed ? ", failed" : ". Click to corrupt"}`
          : `Drive ${driveIndex + 1} empty block ${blockIndex + 1}`
      }
    >
      {display}
    </button>
  );
}

function DriveCard({
  driveIndex,
  drive,
  state,
  highlight,
  rebuilding,
  onFailBlock,
  onFailDrive,
  onRebuild,
}: {
  driveIndex: number;
  drive: Drive;
  state: ArrayState;
  highlight: Highlight | null;
  rebuilding: boolean;
  onFailBlock: (driveIndex: number, blockIndex: number) => void;
  onFailDrive: (driveIndex: number) => void;
  onRebuild: () => void;
}) {
  const canFail = drive.blocks.some(
    (block) => isBlockOccupied(block) && !block.failed,
  );
  const failed = driveHasFailure(drive);

  return (
    <Card className="w-min shrink-0 snap-start p-2">
      <div className="w-36 sm:w-32">
        <div className="mb-1.5 flex h-8 items-center justify-between gap-1.5">
          <span
            className={cn(
              "label min-w-0 shrink truncate text-[10px]",
              drive.failed && "text-red",
            )}
          >
            D{driveIndex + 1}
            {drive.failed ? " ✕" : ""}
          </span>
          <Button
            type="button"
            variant={failed ? "red" : "outline"}
            size="sm"
            className={cn(
              "@container min-w-0 w-16 max-w-16 shrink-0 overflow-hidden px-1.5",
              !failed && "bg-grey-line text-ink",
            )}
            disabled={failed ? rebuilding : !canFail}
            onClick={() => (failed ? onRebuild() : onFailDrive(driveIndex))}
            aria-label={
              failed
                ? `Fix drive ${driveIndex + 1}`
                : `Fail drive ${driveIndex + 1}`
            }
          >
            <span className="block w-full overflow-hidden text-center text-[clamp(0.55rem,32cqi,0.75rem)] leading-none">
              {failed ? "Fix" : "Fail"}
            </span>
          </Button>
        </div>
        <div className="grid grid-cols-4">
          {drive.blocks.map((_, blockIndex) => (
            <RaidBlock
              key={blockIndex}
              driveIndex={driveIndex}
              blockIndex={blockIndex}
              state={state}
              highlight={highlight}
              onFail={onFailBlock}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function WorkflowStep({
  step,
  label,
  active,
  done,
}: {
  step: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] sm:text-xs",
        active ? "font-bold text-ink" : done ? "text-grey" : "text-grey/60",
      )}
      aria-current={active ? "step" : undefined}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center border-2 border-ink font-bold tabular-nums",
          active && "bg-blue text-white",
          done && !active && "bg-paper",
        )}
      >
        {done && !active ? "✓" : step}
      </span>
      {label}
    </span>
  );
}

export function RaidVisualizer() {
  const [state, setState] = useState<ArrayState>(() =>
    filledState("0", DEFAULT_TEXT),
  );
  const [text, setText] = useState(DEFAULT_TEXT);
  const [status, setStatus] = useState(() => {
    const initial = filledState("0", DEFAULT_TEXT);
    return writeStatus(DEFAULT_TEXT, initial.writtenLength);
  });
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [, setStaticTick] = useState(0);
  const [rebuilding, setRebuilding] = useState(false);

  const mountedRef = useRef(true);
  const rebuildTokenRef = useRef(0);
  const statusId = useId();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Re-render on a timer only while failed blocks exist, to animate static.
  const anyFailed = state.drives.some((drive) =>
    drive.blocks.some((block) => block.failed),
  );
  useEffect(() => {
    if (!anyFailed || rebuilding || highlight) return;
    const id = window.setInterval(() => {
      setStaticTick((tick) => tick + 1);
    }, STATIC_MS);
    return () => window.clearInterval(id);
  }, [anyFailed, rebuilding, highlight]);

  const level = state.level;
  const stats = arrayStats(level, state.drives.length);
  const capacity = maxLogicalCapacity(level, state.drives.length);
  const stepCount = drivesToAdd(level);
  const canAddDrives = validateDriveCount(
    level,
    state.drives.length + stepCount,
  ).valid;
  const canRemoveDrives = validateDriveCount(
    level,
    state.drives.length - stepCount,
  ).valid;
  const overCapacity = text.length > capacity;
  const hasData = state.writtenLength > 0;
  const phase = getPhase(state);
  const activeHint = WORKFLOW.find((entry) => entry.phase === phase)?.hint ?? "";

  // Any mutation of the array must invalidate an in-flight rebuild animation,
  // otherwise its pending steps would stomp the new state.
  const cancelRebuildAnimation = useCallback(() => {
    rebuildTokenRef.current += 1;
    setHighlight(null);
    setRebuilding(false);
  }, []);

  const handleLevelChange = useCallback(
    (nextLevel: RaidLevel) => {
      cancelRebuildAnimation();
      const nextCapacity = maxLogicalCapacity(
        nextLevel,
        defaultDriveCount(nextLevel),
      );
      const nextText = clampText(text, nextCapacity);
      const next = filledState(nextLevel, nextText);
      setState(next);
      setText(nextText);
      setStatus(writeStatus(nextText, next.writtenLength));
    },
    [cancelRebuildAnimation, text],
  );

  const handleReset = useCallback(() => {
    cancelRebuildAnimation();
    const next = filledState(level, DEFAULT_TEXT);
    setState(next);
    setText(DEFAULT_TEXT);
    setStatus(writeStatus(DEFAULT_TEXT, next.writtenLength));
  }, [cancelRebuildAnimation, level]);

  const handleWrite = useCallback(() => {
    cancelRebuildAnimation();
    const next = writeData(state, text);
    setState(next);
    setStatus(writeStatus(text, next.writtenLength));
  }, [cancelRebuildAnimation, state, text]);

  const handleFailBlock = useCallback(
    (driveIndex: number, blockIndex: number) => {
      cancelRebuildAnimation();
      setState((prev) => failBlock(prev, driveIndex, blockIndex));
      setStatus(`Corrupted drive ${driveIndex + 1}, block ${blockIndex + 1}.`);
    },
    [cancelRebuildAnimation],
  );

  const handleFailDrive = useCallback(
    (driveIndex: number) => {
      cancelRebuildAnimation();
      setState((prev) => failDrive(prev, driveIndex));
      setStatus(`Failed drive ${driveIndex + 1}.`);
    },
    [cancelRebuildAnimation],
  );

  const handleRandomFailure = useCallback(() => {
    cancelRebuildAnimation();
    const next = randomFailure(state);
    setState(next);
    setStatus(
      next === state
        ? "Nothing left to fail. Write some data first."
        : "Injected a random failure.",
    );
  }, [cancelRebuildAnimation, state]);

  const animateRebuild = useCallback(async (steps: RecoveryStep[]) => {
    const token = rebuildTokenRef.current + 1;
    rebuildTokenRef.current = token;
    setRebuilding(true);

    const active = () =>
      rebuildTokenRef.current === token && mountedRef.current;
    const instant = prefersReducedMotion();
    const stepDelay = instant ? 0 : HIGHLIGHT_MS;

    for (const step of steps) {
      if (!active()) return;

      if (step.sources.length > 0) {
        setHighlight({ refs: step.sources, kind: "source" });
        if (stepDelay > 0) await sleep(stepDelay);
        if (!active()) return;
      }

      setHighlight({ refs: [step.target], kind: "target" });
      if (stepDelay > 0) await sleep(stepDelay);
      if (!active()) return;

      setState((prev) => applyRecoveryStep(prev, step));
    }

    if (active()) {
      setState((prev) => clearRecoveredDriveFlags(prev));
      setHighlight(null);
      setRebuilding(false);
    }
  }, []);

  const handleRebuild = useCallback(() => {
    cancelRebuildAnimation();
    const result = rebuild(state);
    setStatus(result.message);
    if (result.steps.length === 0) return;

    if (result.steps.every((step) => step.recovered)) {
      void animateRebuild(result.steps);
    } else {
      // Partial failure: apply whatever was recoverable without animation and
      // leave the unrecoverable blocks visibly failed.
      setState(result.state);
    }
  }, [animateRebuild, cancelRebuildAnimation, state]);

  const handleAddDrives = useCallback(() => {
    cancelRebuildAnimation();
    const nextGeometry = addDrives(state);
    const nextText = clampText(
      text,
      maxLogicalCapacity(nextGeometry.level, nextGeometry.drives.length),
    );
    const next = writeData(nextGeometry, nextText);
    setState(next);
    setText(nextText);
    setStatus(writeStatus(nextText, next.writtenLength));
  }, [cancelRebuildAnimation, state, text]);

  const handleRemoveDrives = useCallback(() => {
    cancelRebuildAnimation();
    const nextGeometry = setDriveCount(state, state.drives.length - stepCount);
    const nextText = clampText(
      text,
      maxLogicalCapacity(nextGeometry.level, nextGeometry.drives.length),
    );
    const next = writeData(nextGeometry, nextText);
    setState(next);
    setText(nextText);
    setStatus(writeStatus(nextText, next.writtenLength));
  }, [cancelRebuildAnimation, state, stepCount, text]);

  return (
    <div className="not-prose my-8 flex flex-col gap-3">
      <Card accent="blue">
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {WORKFLOW.map((entry) => (
              <WorkflowStep
                key={entry.phase}
                step={entry.step}
                label={entry.label}
                active={phase === entry.phase}
                done={
                  (entry.phase === "write" && hasData) ||
                  (entry.phase === "corrupt" && phase === "rebuild")
                }
              />
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1 font-mono text-xs uppercase tracking-[0.12em] sm:max-w-xs">
              RAID level
              <select
                className={cn(controlSelect, "normal-case tracking-normal")}
                value={level}
                onChange={(event) =>
                  handleLevelChange(event.target.value as RaidLevel)
                }
              >
                {LEVELS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveDrives}
                disabled={!canRemoveDrives}
                aria-label={`Remove ${stepCount} drive${stepCount > 1 ? "s" : ""}`}
              >
                −{stepCount}
              </Button>
              <span className="min-w-18 text-center font-mono text-xs tabular-nums">
                {state.drives.length} drives
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDrives}
                disabled={!canAddDrives}
                aria-label={`Add ${stepCount} drive${stepCount > 1 ? "s" : ""}`}
              >
                +{stepCount}
              </Button>
            </div>

            <Button type="button" variant="yellow" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>

          <p className="font-mono text-xs text-grey">
            {stats.capacityLabel} · {stats.faultTolerance} · {stats.readWrite}
          </p>
        </div>
      </Card>

      <Card accent="red">
        <div className="flex flex-col gap-2 p-4 sm:p-5">
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
            {state.drives.map((drive, driveIndex) => (
              <DriveCard
                key={drive.id}
                driveIndex={driveIndex}
                drive={drive}
                state={state}
                highlight={highlight}
                rebuilding={rebuilding}
                onFailBlock={handleFailBlock}
                onFailDrive={handleFailDrive}
                onRebuild={handleRebuild}
              />
            ))}
          </div>
          <p className="font-mono text-xs text-grey">{activeHint}</p>
        </div>
      </Card>

      <Card accent="yellow">
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div
            className={cn(
              "flex flex-col gap-2 rounded-sm border-l-4 pl-3",
              phase === "write" ? "border-l-blue" : "border-l-transparent",
            )}
          >
            <span className="label">1 · Write data</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={controlInput}
                value={text}
                onChange={(event) =>
                  setText(event.target.value.replaceAll(" ", "_"))
                }
                maxLength={capacity || undefined}
                aria-label="Data to write"
                placeholder="Type characters to write across the drives"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setText(generateRandomText(capacity || 16))}
              >
                Random
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setText("")}
              >
                Clear
              </Button>
              <Button type="button" variant="ink" size="sm" onClick={handleWrite}>
                Write →
              </Button>
              <span
                className={cn(
                  "font-mono text-xs tabular-nums",
                  overCapacity ? "text-red" : "text-grey",
                )}
              >
                {text.length}/{capacity}
              </span>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-wrap items-center gap-2 border-l-4 pl-3",
              phase === "corrupt" ? "border-l-blue" : "border-l-transparent",
            )}
          >
            <span className="label w-full sm:w-auto">2 · Corrupt</span>
            <Button
              type="button"
              variant="red"
              size="sm"
              onClick={handleRandomFailure}
              disabled={!hasData || rebuilding}
            >
              Random failure
            </Button>
            <span className="font-mono text-xs text-grey">
              Or click blocks. Or hit Fail on a drive.
            </span>
          </div>

          <div
            className={cn(
              "flex flex-col gap-2 border-l-4 pl-3 sm:flex-row sm:flex-wrap sm:items-center",
              phase === "rebuild" ? "border-l-blue" : "border-l-transparent",
            )}
          >
            <span className="label w-full sm:w-auto">3 · Rebuild</span>
            <p
              id={statusId}
              aria-live="polite"
              aria-atomic="true"
              className="font-mono text-xs text-grey"
            >
              {status}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
