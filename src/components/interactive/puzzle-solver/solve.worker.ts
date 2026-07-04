import {
  solve,
  type Algorithm,
  type Heuristic,
  type Puzzle,
  type SearchResult,
} from "./search";

type SolveMessage = {
  puzzle: Puzzle;
  algorithm: Algorithm;
  heuristic: Heuristic;
};

self.onmessage = (event: MessageEvent<SolveMessage>) => {
  const { puzzle, algorithm, heuristic } = event.data;
  const result: SearchResult | null = solve(puzzle, algorithm, heuristic);
  self.postMessage(result);
};
