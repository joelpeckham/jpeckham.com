// Pure TypeScript logic for the 8-puzzle: state representation, move
// generation, heuristics, and the three search algorithms. No React, no DOM —
// everything here is deterministic and testable in isolation.
//
// A puzzle is a 9-character string laid out row-major over a 3x3 grid, where
// "-" is the blank tile. The goal state is "12345678-".
//
//   index:   0 1 2
//            3 4 5
//            6 7 8

export type Puzzle = string;

export const GOAL: Puzzle = "12345678-";
export const SIZE = 3;

export type Heuristic = "manhattan" | "hamming";
export type Algorithm = "bfs" | "greedy" | "astar";

export type SearchResult = {
  // The full sequence of states from the start puzzle to the goal, inclusive.
  path: Puzzle[];
  // Deepest g-cost (number of moves from the start) reached during the search.
  maxDepth: number;
  // Number of nodes expanded before the goal was found.
  visited: number;
  // Wall-clock time spent inside the search, in milliseconds.
  timeMs: number;
};

export const ALGORITHMS: { id: Algorithm; label: string; optimal: boolean }[] = [
  { id: "astar", label: "A* Search", optimal: true },
  { id: "greedy", label: "Greedy Best-First", optimal: false },
  { id: "bfs", label: "Breadth-First", optimal: true },
];

export const HEURISTICS: { id: Heuristic; label: string }[] = [
  { id: "manhattan", label: "Manhattan Distance" },
  { id: "hamming", label: "Hamming Distance" },
];

// Sum over every tile of its grid distance from where it belongs. The blank is
// ignored so the heuristic stays admissible (never overestimates).
export function manhattanDistance(puzzle: Puzzle): number {
  let distance = 0;
  for (let i = 0; i < puzzle.length; i++) {
    const ch = puzzle[i];
    if (ch === "-") continue;
    const target = Number(ch) - 1;
    distance +=
      Math.abs(Math.floor(target / SIZE) - Math.floor(i / SIZE)) +
      Math.abs((target % SIZE) - (i % SIZE));
  }
  return distance;
}

// Count of tiles (excluding the blank) that are not in their goal position.
export function hammingDistance(puzzle: Puzzle): number {
  let distance = 0;
  for (let i = 0; i < puzzle.length; i++) {
    if (puzzle[i] !== "-" && puzzle[i] !== GOAL[i]) distance++;
  }
  return distance;
}

function heuristicFn(h: Heuristic): (p: Puzzle) => number {
  return h === "manhattan" ? manhattanDistance : hammingDistance;
}

// The states reachable in one move: slide the blank up, down, left, or right.
export function getChildren(puzzle: Puzzle): Puzzle[] {
  const blank = puzzle.indexOf("-");
  const row = Math.floor(blank / SIZE);
  const col = blank % SIZE;
  const targets: number[] = [];
  if (row > 0) targets.push(blank - SIZE);
  if (row < SIZE - 1) targets.push(blank + SIZE);
  if (col > 0) targets.push(blank - 1);
  if (col < SIZE - 1) targets.push(blank + 1);

  const children: Puzzle[] = [];
  for (const swap of targets) {
    const arr = puzzle.split("");
    arr[blank] = arr[swap];
    arr[swap] = "-";
    children.push(arr.join(""));
  }
  return children;
}

// Half of all 9! permutations are unreachable from the goal. A permutation is
// solvable iff its number of inversions (ignoring the blank) is even.
export function isSolvable(puzzle: Puzzle): boolean {
  const tiles = puzzle
    .split("")
    .filter((c) => c !== "-")
    .map(Number);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j]) inversions++;
    }
  }
  return inversions % 2 === 0;
}

// A random solvable puzzle that is not already solved.
export function randomPuzzle(): Puzzle {
  const tiles = GOAL.split("");
  let puzzle: Puzzle;
  do {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    puzzle = tiles.join("");
  } while (!isSolvable(puzzle) || puzzle === GOAL);
  return puzzle;
}

// Whether the tile at `index` can slide into the blank (orthogonally adjacent).
export function canMove(puzzle: Puzzle, index: number): boolean {
  const blank = puzzle.indexOf("-");
  const br = Math.floor(blank / SIZE);
  const bc = blank % SIZE;
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  return (
    (r === br && Math.abs(c - bc) === 1) ||
    (c === bc && Math.abs(r - br) === 1)
  );
}

// Slide the tile at `index` into the blank, returning the new state (or the
// original state unchanged if the move is illegal).
export function move(puzzle: Puzzle, index: number): Puzzle {
  if (!canMove(puzzle, index)) return puzzle;
  const blank = puzzle.indexOf("-");
  const arr = puzzle.split("");
  arr[blank] = arr[index];
  arr[index] = "-";
  return arr.join("");
}

// A small binary min-heap keyed by a numeric priority. Two parallel arrays keep
// the puzzle strings and their priorities aligned to avoid per-node allocation.
class MinHeap {
  private items: Puzzle[] = [];
  private priorities: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: Puzzle, priority: number): void {
    this.items.push(item);
    this.priorities.push(priority);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.priorities[i] >= this.priorities[parent]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): Puzzle | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const lastItem = this.items.pop() as Puzzle;
    const lastPriority = this.priorities.pop() as number;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.priorities[0] = lastPriority;
      const n = this.items.length;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < n && this.priorities[left] < this.priorities[smallest]) {
          smallest = left;
        }
        if (right < n && this.priorities[right] < this.priorities[smallest]) {
          smallest = right;
        }
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const ti = this.items[a];
    this.items[a] = this.items[b];
    this.items[b] = ti;
    const tp = this.priorities[a];
    this.priorities[a] = this.priorities[b];
    this.priorities[b] = tp;
  }
}

function reconstruct(
  parent: Map<Puzzle, Puzzle | null>,
  goal: Puzzle,
): Puzzle[] {
  const path: Puzzle[] = [];
  let current: Puzzle | null = goal;
  while (current !== null) {
    path.push(current);
    current = parent.get(current) ?? null;
  }
  path.reverse();
  return path;
}

type RawResult = { path: Puzzle[]; maxDepth: number; visited: number } | null;

// A* search: expand the node with the lowest f = g + h. With an admissible
// heuristic this is guaranteed to return a shortest solution.
function aStar(start: Puzzle, h: (p: Puzzle) => number): RawResult {
  const heap = new MinHeap();
  const parent = new Map<Puzzle, Puzzle | null>();
  const g = new Map<Puzzle, number>();
  const closed = new Set<Puzzle>();
  let maxDepth = 0;
  let visited = 0;

  heap.push(start, h(start));
  g.set(start, 0);
  parent.set(start, null);

  while (heap.size > 0) {
    const current = heap.pop() as Puzzle;
    if (closed.has(current)) continue;
    closed.add(current);
    visited++;

    const cg = g.get(current) as number;
    if (cg > maxDepth) maxDepth = cg;
    if (current === GOAL) {
      return { path: reconstruct(parent, current), maxDepth, visited };
    }

    for (const child of getChildren(current)) {
      if (closed.has(child)) continue;
      const ng = cg + 1;
      const known = g.get(child);
      if (known === undefined || ng < known) {
        g.set(child, ng);
        parent.set(child, current);
        heap.push(child, ng + h(child));
      }
    }
  }
  return null;
}

// Greedy best-first search: expand the node that looks closest to the goal
// (priority = h only). Fast, but the solution it finds may be far from optimal.
function greedy(start: Puzzle, h: (p: Puzzle) => number): RawResult {
  const heap = new MinHeap();
  const parent = new Map<Puzzle, Puzzle | null>();
  const depth = new Map<Puzzle, number>();
  const seen = new Set<Puzzle>();
  let maxDepth = 0;
  let visited = 0;

  heap.push(start, h(start));
  parent.set(start, null);
  depth.set(start, 0);
  seen.add(start);

  while (heap.size > 0) {
    const current = heap.pop() as Puzzle;
    visited++;
    const d = depth.get(current) as number;
    if (d > maxDepth) maxDepth = d;
    if (current === GOAL) {
      return { path: reconstruct(parent, current), maxDepth, visited };
    }

    for (const child of getChildren(current)) {
      if (seen.has(child)) continue;
      seen.add(child);
      parent.set(child, current);
      depth.set(child, d + 1);
      heap.push(child, h(child));
    }
  }
  return null;
}

// Breadth-first search: explore level by level, ignoring any heuristic. Always
// finds a shortest solution, but expands the most nodes of the three.
function bfs(start: Puzzle): RawResult {
  const parent = new Map<Puzzle, Puzzle | null>();
  const depth = new Map<Puzzle, number>();
  const queue: Puzzle[] = [start];
  parent.set(start, null);
  depth.set(start, 0);
  let head = 0;
  let maxDepth = 0;
  let visited = 0;

  while (head < queue.length) {
    const current = queue[head++];
    visited++;
    const d = depth.get(current) as number;
    if (d > maxDepth) maxDepth = d;
    if (current === GOAL) {
      return { path: reconstruct(parent, current), maxDepth, visited };
    }

    for (const child of getChildren(current)) {
      if (parent.has(child)) continue;
      parent.set(child, current);
      depth.set(child, d + 1);
      queue.push(child);
    }
  }
  return null;
}

// Run the chosen algorithm on `puzzle`, timing the search itself.
export function solve(
  puzzle: Puzzle,
  algorithm: Algorithm,
  heuristic: Heuristic,
): SearchResult | null {
  const start = performance.now();
  const h = heuristicFn(heuristic);
  const result =
    algorithm === "bfs"
      ? bfs(puzzle)
      : algorithm === "greedy"
        ? greedy(puzzle, h)
        : aStar(puzzle, h);
  const timeMs = performance.now() - start;
  if (!result) return null;
  return { ...result, timeMs };
}
