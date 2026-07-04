"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BLOCKS_PER_DRIVE,
  DEFAULT_TEXT,
  addDrives,
  applyRecoveryStep,
  arrayStats,
  blockDisplay,
  clearRecoveredDriveFlags,
  createInitialState,
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
  "border-2 border-ink bg-white px-3 py-2 font-mono text-sm focus-visible:outline-none";

const controlInput =
  "w-full border-2 border-ink bg-white px-3 py-2 font-mono text-sm focus-visible:outline-none";

const STATIC_MS = 80;
const HIGHLIGHT_MS = 420;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

  return (
    <button
      type="button"
      disabled={!occupied || block.failed}
      onClick={() => onFail(driveIndex, blockIndex)}
      className={cn(
        "flex h-7 w-7 items-center justify-center border border-ink/25 font-mono text-[10px] transition-colors sm:h-8 sm:w-8 sm:text-[11px]",
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
          ? `Drive ${driveIndex + 1} block ${blockIndex + 1}${block.failed ? " failed" : ""}`
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
  onFailBlock,
  onFailDrive,
}: {
  driveIndex: number;
  drive: Drive;
  state: ArrayState;
  highlight: Highlight | null;
  onFailBlock: (driveIndex: number, blockIndex: number) => void;
  onFailDrive: (driveIndex: number) => void;
}) {
  const canFail = drive.blocks.some(
    (block) => isBlockOccupied(block) && !block.failed,
  );

  return (
    <Card className="min-w-[136px] shrink-0 snap-start p-3 sm:min-w-[168px]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={cn("label text-[10px]", drive.failed && "text-red")}>
          Drive {driveIndex + 1}
          {drive.failed ? " — failed" : ""}
        </span>
        <Button
          type="button"
          variant="red"
          size="sm"
          disabled={!canFail}
          onClick={() => onFailDrive(driveIndex)}
        >
          Fail
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
    </Card>
  );
}

export function RaidVisualizer() {
  const [state, setState] = useState<ArrayState>(() => createInitialState("0"));
  const [text, setText] = useState(DEFAULT_TEXT);
  const [status, setStatus] = useState(
    "Write data, then corrupt blocks or drives to test rebuild.",
  );
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [, setStaticTick] = useState(0);
  const [rebuilding, setRebuilding] = useState(false);

  const mountedRef = useRef(true);
  const rebuildTokenRef = useRef(0);

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
    if (!anyFailed) return;
    const id = window.setInterval(() => {
      setStaticTick((tick) => tick + 1);
    }, STATIC_MS);
    return () => window.clearInterval(id);
  }, [anyFailed]);

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
      setState(createInitialState(nextLevel));
      setStatus("Array reset for the new RAID level.");
    },
    [cancelRebuildAnimation],
  );

  const handleReset = useCallback(() => {
    cancelRebuildAnimation();
    setState(createInitialState(level));
    setText(DEFAULT_TEXT);
    setStatus("Array reset.");
  }, [cancelRebuildAnimation, level]);

  const handleWrite = useCallback(() => {
    cancelRebuildAnimation();
    const next = writeData(state, text);
    setState(next);
    setStatus(
      text.length > next.writtenLength
        ? `Wrote ${next.writtenLength} of ${text.length} characters — array is full.`
        : `Wrote ${next.writtenLength} character(s) across the array.`,
    );
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
        ? "Nothing left to fail — write some data first."
        : "Random failure injected.",
    );
  }, [cancelRebuildAnimation, state]);

  const animateRebuild = useCallback(async (steps: RecoveryStep[]) => {
    const token = rebuildTokenRef.current + 1;
    rebuildTokenRef.current = token;
    setRebuilding(true);

    const active = () =>
      rebuildTokenRef.current === token && mountedRef.current;

    for (const step of steps) {
      if (!active()) return;

      if (step.sources.length > 0) {
        setHighlight({ refs: step.sources, kind: "source" });
        await sleep(HIGHLIGHT_MS);
        if (!active()) return;
      }

      setHighlight({ refs: [step.target], kind: "target" });
      await sleep(HIGHLIGHT_MS);
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
    setState((prev) => addDrives(prev));
    setStatus("Drives added — data cleared, write again to see the new layout.");
  }, [cancelRebuildAnimation]);

  const handleRemoveDrives = useCallback(() => {
    cancelRebuildAnimation();
    setState((prev) => setDriveCount(prev, prev.drives.length - stepCount));
    setStatus(
      "Drives removed — data cleared, write again to see the new layout.",
    );
  }, [cancelRebuildAnimation, stepCount]);

  return (
    <div className="not-prose my-8 flex flex-col gap-5">
      <Card accent="red">
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className="label">RAID level</span>
              <select
                className={controlSelect}
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

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveDrives}
                disabled={!canRemoveDrives}
              >
                − {stepCount} Drive{stepCount > 1 ? "s" : ""}
              </Button>
              <span className="font-mono text-sm">
                {state.drives.length} drives
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDrives}
                disabled={!canAddDrives}
              >
                + {stepCount} Drive{stepCount > 1 ? "s" : ""}
              </Button>
            </div>

            <Button type="button" variant="yellow" onClick={handleReset}>
              Reset
            </Button>
            <Button type="button" variant="red" onClick={handleRandomFailure}>
              Random Failure
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="label mb-1">Capacity</p>
              <p className="font-mono text-sm">{stats.capacityLabel}</p>
            </div>
            <div>
              <p className="label mb-1">Fault tolerance</p>
              <p className="font-mono text-sm">{stats.faultTolerance}</p>
            </div>
            <div>
              <p className="label mb-1">Read / write</p>
              <p className="font-mono text-sm">{stats.readWrite}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card accent="blue">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto p-5">
          {state.drives.map((drive, driveIndex) => (
            <DriveCard
              key={drive.id}
              driveIndex={driveIndex}
              drive={drive}
              state={state}
              highlight={highlight}
              onFailBlock={handleFailBlock}
              onFailDrive={handleFailDrive}
            />
          ))}
        </div>
      </Card>

      <Card accent="yellow">
        <div className="flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-1">
            <span className="label">Data to write</span>
            <input
              className={controlInput}
              value={text}
              onChange={(event) =>
                setText(event.target.value.replaceAll(" ", "_"))
              }
              maxLength={capacity || undefined}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="blue"
              onClick={() => setText(generateRandomText(capacity || 16))}
            >
              Random
            </Button>
            <Button type="button" variant="outline" onClick={() => setText("")}>
              Clear
            </Button>
            <Button type="button" variant="ink" onClick={handleWrite}>
              Write Data
            </Button>
            <span
              className={cn(
                "font-mono text-sm",
                overCapacity ? "text-red" : "text-grey",
              )}
            >
              {text.length} / {capacity} chars · {BLOCKS_PER_DRIVE} blocks per
              drive
            </span>
          </div>
        </div>
      </Card>

      <Card accent="red">
        <div className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="red"
              onClick={handleRebuild}
              disabled={rebuilding}
            >
              {rebuilding ? "Rebuilding…" : "Rebuild Array"}
            </Button>
            <p className="font-mono text-sm">{status}</p>
          </div>
          <p className="font-mono text-xs text-grey">
            Click a block to corrupt it, or fail an entire drive. Parity blocks
            are shown in yellow as two-digit hex.
          </p>
        </div>
      </Card>
    </div>
  );
}
