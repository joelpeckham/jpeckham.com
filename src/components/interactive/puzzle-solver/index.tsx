"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="not-prose my-8 flex flex-col gap-5">
      {/* Controls */}
      <Card accent="blue">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-6">
            <Select
              label="Algorithm"
              value={algorithm}
              onChange={(v) => setAlgorithm(v as Algorithm)}
              options={ALGORITHMS.map((a) => ({ value: a.id, label: a.label }))}
            />
            <Select
              label="Heuristic"
              value={heuristic}
              disabled={heuristicDisabled}
              onChange={(v) => setHeuristic(v as Heuristic)}
              options={HEURISTICS.map((h) => ({ value: h.id, label: h.label }))}
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              type="button"
              variant="ink"
              size="sm"
              onClick={shuffle}
              disabled={solving || playing}
            >
              {"Shuffle \u21bb"}
            </Button>
            <Button
              type="button"
              variant="blue"
              size="sm"
              onClick={runSolve}
              disabled={solving || playing || solved}
            >
              {solving ? "Solving\u2026" : "Solve \u2192"}
            </Button>
            <Button
              type="button"
              variant="red"
              size="sm"
              onClick={reset}
              disabled={solving || playing}
            >
              {"Reset \u21ba"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Board */}
      <Card accent="red">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <Board
            puzzle={puzzle}
            onTileClick={handleTileClick}
            interactive={boardInteractive}
          />
          <div
            id={statusId}
            aria-live="polite"
            aria-atomic="true"
            className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.12em] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3"
          >
            <span className={cn(solved ? "font-bold text-red" : "text-grey")}>
              {solved
                ? "Solved \u2713"
                : `Manhattan distance to goal: ${distance}`}
            </span>
            <span className="text-grey">Your moves: {manualMoves}</span>
          </div>
          {!solved ? (
            <p className="text-sm text-grey">
              Click a tile next to the blank to slide it, or hit Solve to let a
              search algorithm finish it for you.
            </p>
          ) : null}
        </div>
      </Card>

      {/* Playback */}
      {hasSolution ? (
        <Card>
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="label">Solution playback</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPlaying(false);
                  goToStep(step - 1);
                }}
                disabled={step === 0}
              >
                {"\u25c0 Prev"}
              </Button>
              <Button
                type="button"
                variant={playing ? "yellow" : "blue"}
                size="sm"
                onClick={togglePlay}
              >
                {playing ? "Pause \u23f8" : atEnd ? "Replay \u21ba" : "Play \u25b6"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPlaying(false);
                  goToStep(step + 1);
                }}
                disabled={atEnd}
              >
                {"Next \u25b6"}
              </Button>
              <span className="font-mono text-sm tabular-nums text-grey">
                Move {step} / {solution.length - 1}
              </span>
            </div>
            <div className="py-1">
              <input
                type="range"
                min={0}
                max={solution.length - 1}
                value={step}
                onChange={(e) => {
                  setPlaying(false);
                  goToStep(Number(e.target.value));
                }}
                className="h-2 w-full cursor-pointer accent-[color:var(--blue)]"
                aria-label="Scrub through the solution"
                aria-valuetext={`Move ${step} of ${solution.length - 1}`}
              />
            </div>
          </div>
        </Card>
      ) : null}

      {/* Stats */}
      {stats ? (
        <div className="flex flex-col gap-2">
          <span className="label">Last search</span>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <Stat label="Time" value={`${stats.timeMs.toFixed(1)} ms`} />
            <Stat label="Nodes visited" value={stats.visited.toLocaleString()} />
            <Stat label="Max depth" value={stats.maxDepth.toLocaleString()} />
            <Stat label="Solution moves" value={`${stats.path.length - 1}`} />
          </div>
        </div>
      ) : null}

      {/* Run comparison */}
      {runs.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="label">Run comparison</span>
          <Card>
            <div className="overflow-x-auto">
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
        className="w-full border-2 border-ink bg-white px-3 py-2 font-mono text-sm normal-case tracking-normal focus-visible:outline-none disabled:cursor-not-allowed"
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col border-2 border-ink bg-white px-3 py-2 sm:min-w-[7rem]">
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-grey">
        {label}
      </span>
      <span className="font-mono text-lg font-bold tabular-nums">{value}</span>
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
