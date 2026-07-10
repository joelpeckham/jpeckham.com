"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Board } from "./board";
import {
  ALGORITHMS,
  GOAL,
  HEURISTICS,
  algorithmLabel,
  heuristicLabel,
  manhattanDistance,
  move,
  parsePuzzle,
  randomPuzzle,
  type Algorithm,
  type Heuristic,
  type Puzzle,
  type SearchResult,
} from "./search";

const PLAYBACK_MS = 380;

type Run = {
  algorithm: Algorithm;
  heuristic: Heuristic;
  timeMs: number;
  visited: number;
  moves: number;
  optimal: boolean;
};

export function PuzzleSolver() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("astar");
  const [heuristic, setHeuristic] = useState<Heuristic>("manhattan");

  // `puzzle` is always what the board shows. It starts at the solved state so
  // server and client first paints match; a random puzzle is dealt on mount.
  const [puzzle, setPuzzle] = useState<Puzzle>(GOAL);
  const [startPuzzle, setStartPuzzle] = useState<Puzzle>(GOAL);
  const [manualMoves, setManualMoves] = useState(0);

  const [solution, setSolution] = useState<Puzzle[] | null>(null);
  const [step, setStep] = useState(0);
  const [stats, setStats] = useState<SearchResult | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);

  const [solving, setSolving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [puzzleInput, setPuzzleInput] = useState("");
  const [puzzleInputError, setPuzzleInputError] = useState<string | null>(null);

  const dealtRef = useRef(false);
  const solvingRef = useRef(false);
  const solveGenRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const statusId = useId();

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./solve.worker.ts", import.meta.url),
    );
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const shuffle = useCallback(() => {
    solveGenRef.current += 1;
    const next = randomPuzzle();
    setPuzzle(next);
    setStartPuzzle(next);
    setSolution(null);
    setStep(0);
    setStats(null);
    setPlaying(false);
    setManualMoves(0);
    setSolving(false);
    solvingRef.current = false;
  }, []);

  // Deal the first real puzzle after hydration.
  useEffect(() => {
    if (dealtRef.current) return;
    dealtRef.current = true;
    shuffle();
  }, [shuffle]);

  const applyPuzzle = useCallback((next: Puzzle) => {
    solveGenRef.current += 1;
    setPuzzle(next);
    setStartPuzzle(next);
    setSolution(null);
    setStep(0);
    setStats(null);
    setPlaying(false);
    setManualMoves(0);
    setSolving(false);
    solvingRef.current = false;
    setPuzzleInputError(null);
  }, []);

  const setCustomPuzzle = useCallback(() => {
    const parsed = parsePuzzle(puzzleInput);
    if (!parsed) {
      setPuzzleInputError("Invalid puzzle");
      return;
    }
    applyPuzzle(parsed);
  }, [puzzleInput, applyPuzzle]);

  const reset = useCallback(() => {
    solveGenRef.current += 1;
    setPuzzle(startPuzzle);
    setSolution(null);
    setStep(0);
    setStats(null);
    setPlaying(false);
    setManualMoves(0);
    setRuns([]);
    setSolving(false);
    solvingRef.current = false;
  }, [startPuzzle]);

  const handleTileClick = useCallback((index: number) => {
    setPlaying(false);
    setSolution(null);
    setStep(0);
    setStats(null);
    setPuzzle((prev) => {
      const next = move(prev, index);
      if (next !== prev) setManualMoves((m) => m + 1);
      return next;
    });
  }, []);

  const runSolve = useCallback(() => {
    if (puzzle === GOAL || solvingRef.current) return;
    const worker = workerRef.current;
    if (!worker) return;

    setPlaying(false);
    solvingRef.current = true;
    setSolving(true);
    const gen = ++solveGenRef.current;
    const puzzleAtSolve = puzzle;

    const onMessage = (event: MessageEvent<SearchResult | null>) => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (gen !== solveGenRef.current) return;
      solvingRef.current = false;
      setSolving(false);

      const result = event.data;
      if (!result) return;
      setSolution(result.path);
      setStep(0);
      setStats(result);
      setRuns((prev) => [
        ...prev,
        {
          algorithm,
          heuristic,
          timeMs: result.timeMs,
          visited: result.visited,
          moves: result.path.length - 1,
          optimal:
            ALGORITHMS.find((a) => a.id === algorithm)?.optimal ?? false,
        },
      ]);
    };

    const onError = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (gen !== solveGenRef.current) return;
      solvingRef.current = false;
      setSolving(false);
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ puzzle: puzzleAtSolve, algorithm, heuristic });
  }, [puzzle, algorithm, heuristic]);

  const goToStep = useCallback(
    (i: number) => {
      setSolution((sol) => {
        if (!sol) return sol;
        const clamped = Math.max(0, Math.min(sol.length - 1, i));
        setStep(clamped);
        setPuzzle(sol[clamped]);
        return sol;
      });
    },
    [],
  );

  const togglePlay = useCallback(() => {
    if (!solution) return;
    if (step >= solution.length - 1) {
      goToStep(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }, [solution, step, goToStep]);

  // Auto-play advances one move at a time until the solution is exhausted. The
  // state updates live inside the timeout callback (not the effect body) so we
  // never trigger a synchronous cascading render.
  useEffect(() => {
    if (!playing || !solution || step >= solution.length - 1) return;
    const id = setTimeout(() => {
      const next = step + 1;
      setStep(next);
      setPuzzle(solution[next]);
      if (next >= solution.length - 1) setPlaying(false);
    }, PLAYBACK_MS);
    return () => clearTimeout(id);
  }, [playing, solution, step]);

  const solved = puzzle === GOAL;
  const distance = manhattanDistance(puzzle);
  const hasSolution = solution !== null && solution.length > 1;
  const atEnd = solution ? step >= solution.length - 1 : false;
  const heuristicDisabled = algorithm === "bfs";
  const boardInteractive = !solving && !playing;

  return (
    <div className="not-prose my-8 flex min-w-0 max-w-full flex-col gap-4 lg:gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:items-stretch lg:gap-5 xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        {/* Board (+ playback on mobile) */}
        <div className="flex min-w-0 flex-col gap-4 lg:order-1">
          <Card accent="red" className="h-full">
            <div className="flex h-full flex-col gap-3 p-4 sm:p-5 lg:max-w-[16rem] lg:gap-2.5 lg:p-3 xl:max-w-[18rem]">
            <Board
              puzzle={puzzle}
              onTileClick={handleTileClick}
              interactive={boardInteractive}
            />
            <div
              id={statusId}
              aria-live="polite"
              aria-atomic="true"
              className="flex flex-col gap-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.12em] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 lg:text-xs"
            >
              <span className={cn(solved ? "font-bold text-red" : "text-grey")}>
                {solved
                  ? "Solved \u2713"
                  : `Manhattan distance: ${distance}`}
              </span>
              <span className="text-grey">Your moves: {manualMoves}</span>
            </div>
            {!solved ? (
              <p className="text-xs text-grey lg:leading-snug">
                Click a tile next to the blank, or hit Solve.
              </p>
            ) : null}
            </div>
          </Card>
          {hasSolution ? (
            <div className="lg:hidden">
              <SolutionPlayback
                solution={solution}
                step={step}
                playing={playing}
                atEnd={atEnd}
                togglePlay={togglePlay}
                goToStep={goToStep}
                setPlaying={setPlaying}
              />
            </div>
          ) : null}
        </div>

        {/* Controls */}
        <Card accent="blue" className="h-full lg:order-2">
          <div className="flex h-full flex-col gap-3 p-4 sm:p-5 lg:gap-2.5 lg:p-3">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-4 lg:grid-cols-1 lg:gap-2">
              <Select
                label="Algorithm"
                value={algorithm}
                onChange={(v) => setAlgorithm(v as Algorithm)}
                options={ALGORITHMS.map((a) => ({
                  value: a.id,
                  label: a.label,
                }))}
              />
              <Select
                label="Heuristic"
                value={heuristic}
                disabled={heuristicDisabled}
                onChange={(v) => setHeuristic(v as Heuristic)}
                options={HEURISTICS.map((h) => ({
                  value: h.id,
                  label: h.label,
                }))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex min-w-0 items-center gap-2">
                <input
                  type="text"
                  value={puzzleInput}
                  onChange={(e) => {
                    setPuzzleInput(e.target.value);
                    if (puzzleInputError) setPuzzleInputError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setCustomPuzzle();
                    }
                  }}
                  disabled={solving || playing}
                  placeholder="e.g. 1 2 3 4 5 6 7 8 _"
                  aria-label="Custom puzzle state"
                  aria-invalid={puzzleInputError ? true : undefined}
                  className="min-w-0 flex-1 border-2 border-ink bg-white px-3 py-2 font-mono text-sm tracking-normal focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 lg:px-2 lg:py-1.5 lg:text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 lg:px-3 lg:py-1.5 lg:text-xs"
                  onClick={setCustomPuzzle}
                  disabled={solving || playing}
                >
                  {"SET \u2192"}
                </Button>
              </div>
              {puzzleInputError ? (
                <p className="font-mono text-xs text-red">{puzzleInputError}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 lg:gap-1.5">
              <Button
                type="button"
                variant="ink"
                size="sm"
                className="lg:px-3 lg:py-1.5 lg:text-xs"
                onClick={shuffle}
                disabled={solving || playing}
              >
                {"Shuffle \u21bb"}
              </Button>
              <Button
                type="button"
                variant="blue"
                size="sm"
                className="lg:px-3 lg:py-1.5 lg:text-xs"
                onClick={runSolve}
                disabled={solving || playing || solved}
              >
                {solving ? "Solving\u2026" : "Solve \u2192"}
              </Button>
              <Button
                type="button"
                variant="red"
                size="sm"
                className="lg:px-3 lg:py-1.5 lg:text-xs"
                onClick={reset}
                disabled={solving || playing}
              >
                {"Reset \u21ba"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Playback + stats */}
      {hasSolution || stats ? (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-3">
          {hasSolution ? (
            <div className="hidden h-full lg:block">
              <SolutionPlayback
                solution={solution}
                step={step}
                playing={playing}
                atEnd={atEnd}
                togglePlay={togglePlay}
                goToStep={goToStep}
                setPlaying={setPlaying}
              />
            </div>
          ) : null}

          {stats ? (
            <Card className="h-full">
              <div className="flex h-full flex-col gap-2.5 p-4 sm:p-5 lg:gap-2 lg:p-3">
                <span className="label">Last search</span>
                <div className="grid flex-1 grid-cols-2 content-center gap-y-4 sm:grid-cols-4 sm:gap-y-0">
                  <StatItem
                    label="Time"
                    value={`${stats.timeMs.toFixed(1)} ms`}
                    index={0}
                  />
                  <StatItem
                    label="Nodes visited"
                    value={stats.visited.toLocaleString()}
                    index={1}
                  />
                  <StatItem
                    label="Max depth"
                    value={stats.maxDepth.toLocaleString()}
                    index={2}
                  />
                  <StatItem
                    label="Solution moves"
                    value={`${stats.path.length - 1}`}
                    index={3}
                  />
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* Run comparison */}
      {runs.length > 0 ? (
        <div className="flex min-w-0 max-w-full flex-col gap-2">
          <span className="label">Run comparison</span>
          <Card>
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse font-mono text-xs sm:text-sm">
                <thead>
                  <tr className="border-b-2 border-ink text-left uppercase tracking-[0.1em]">
                    <Th>#</Th>
                    <Th>Algorithm</Th>
                    <Th>Heuristic</Th>
                    <Th className="text-right">Time</Th>
                    <Th className="text-right">Visited</Th>
                    <Th className="text-right">Moves</Th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, i) => (
                    <tr
                      key={i}
                      className="border-b border-grey-line last:border-b-0"
                    >
                      <Td className="text-grey">{i + 1}</Td>
                      <Td>{algorithmLabel(run.algorithm)}</Td>
                      <Td>
                        {run.algorithm === "bfs"
                          ? "\u2014"
                          : heuristicLabel(run.heuristic)}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {run.timeMs.toFixed(1)} ms
                      </Td>
                      <Td className="text-right tabular-nums">
                        {run.visited.toLocaleString()}
                      </Td>
                      <Td className="text-right tabular-nums">
                        {run.moves}
                        {run.optimal ? "" : "*"}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="font-mono text-xs text-grey">
            * Greedy best-first is not guaranteed to find the shortest solution.
            Run different algorithms on the same board (before shuffling) to
            compare their speed and solution length.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-w-0 flex-col gap-1 font-mono text-xs uppercase tracking-[0.12em]",
        disabled && "opacity-45",
      )}
    >
      {label}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 border-ink bg-white px-3 py-2 font-mono text-sm normal-case tracking-normal focus-visible:outline-none disabled:cursor-not-allowed lg:px-2 lg:py-1.5 lg:text-xs"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatItem({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col px-2 sm:px-3",
        index % 2 === 1 && "border-l-2 border-ink pl-3",
        index > 0 && "sm:border-l-2 sm:border-ink sm:pl-3",
        index > 0 && index % 2 === 0 && "max-sm:border-l-0 max-sm:pl-2",
      )}
    >
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-grey lg:text-[0.6875rem]">
        {label}
      </span>
      <span className="font-mono text-lg font-bold tabular-nums lg:text-base">
        {value}
      </span>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-3 py-2 text-xs font-medium", className)}>
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-2", className)}>{children}</td>;
}

const ICON_CLASS = "size-[1.15em] shrink-0";

function PrevIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={ICON_CLASS}
    >
      <rect x="3" y="3" width="2.2" height="10" />
      <path d="M13 3 L6 8 L13 13 Z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={ICON_CLASS}
    >
      <path d="M3 3 L10 8 L3 13 Z" />
      <rect x="10.8" y="3" width="2.2" height="10" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={ICON_CLASS}
    >
      <path d="M4 3 L13 8 L4 13 Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={ICON_CLASS}
    >
      <rect x="4" y="3" width="3" height="10" />
      <rect x="9" y="3" width="3" height="10" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      aria-hidden="true"
      className={ICON_CLASS}
    >
      <path d="M12.5 8 A4.5 4.5 0 1 1 8 3.5" />
      <path d="M8 0.8 L8 6.2 L11.4 3.5 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SolutionPlayback({
  solution,
  step,
  playing,
  atEnd,
  togglePlay,
  goToStep,
  setPlaying,
}: {
  solution: Puzzle[] | null;
  step: number;
  playing: boolean;
  atEnd: boolean;
  togglePlay: () => void;
  goToStep: (i: number) => void;
  setPlaying: (playing: boolean) => void;
}) {
  if (!solution) return null;
  const lastStep = solution.length - 1;
  const playLabel = playing ? "Pause" : atEnd ? "Replay" : "Play";

  return (
    <Card className="h-full">
      <div className="flex h-full flex-col gap-2.5 p-4 sm:p-5 lg:gap-2 lg:p-3">
        <span className="label">Solution playback</span>
        <div className="flex min-w-0 items-center gap-2 lg:gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Previous move"
            className="shrink-0 max-sm:px-3 lg:px-3 lg:py-1.5 lg:text-xs"
            onClick={() => {
              setPlaying(false);
              goToStep(step - 1);
            }}
            disabled={step === 0}
          >
            <PrevIcon />
            <span className="sr-only sm:not-sr-only">Prev</span>
          </Button>
          <Button
            type="button"
            variant={playing ? "yellow" : "blue"}
            size="sm"
            aria-label={playLabel}
            className="shrink-0 lg:px-3 lg:py-1.5 lg:text-xs"
            onClick={togglePlay}
          >
            {playing ? <PauseIcon /> : atEnd ? <ReplayIcon /> : <PlayIcon />}
            <span>{playLabel}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Next move"
            className="shrink-0 max-sm:px-3 lg:px-3 lg:py-1.5 lg:text-xs"
            onClick={() => {
              setPlaying(false);
              goToStep(step + 1);
            }}
            disabled={atEnd}
          >
            <span className="sr-only sm:not-sr-only">Next</span>
            <NextIcon />
          </Button>
          <span className="ml-auto font-mono text-xs tabular-nums text-grey sm:text-sm lg:text-xs">
            Move {step} / {lastStep}
          </span>
        </div>
        <Slider
          accent="blue"
          min={0}
          max={lastStep}
          value={step}
          onValueChange={(value) => {
            setPlaying(false);
            goToStep(value);
          }}
          aria-label="Scrub through the solution"
          aria-valuetext={`Move ${step} of ${lastStep}`}
        />
      </div>
    </Card>
  );
}
