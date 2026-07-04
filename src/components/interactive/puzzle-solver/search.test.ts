import { describe, expect, it } from "vitest";
import {
  GOAL,
  hammingDistance,
  isSolvable,
  manhattanDistance,
  solve,
} from "./search";

describe("isSolvable", () => {
  it("accepts the goal state", () => {
    expect(isSolvable(GOAL)).toBe(true);
  });

  it("rejects an unsolvable permutation", () => {
    expect(isSolvable("21345678-")).toBe(false);
  });

  it("accepts a known solvable scramble", () => {
    expect(isSolvable("13425678-")).toBe(true);
  });
});

describe("heuristics", () => {
  it("returns zero for the goal", () => {
    expect(manhattanDistance(GOAL)).toBe(0);
    expect(hammingDistance(GOAL)).toBe(0);
  });

  it("counts misplaced tiles for hamming", () => {
    expect(hammingDistance("13425678-")).toBeGreaterThan(0);
  });
});

describe("solve", () => {
  const oneMove = "1234567-8";

  it("returns the goal immediately when already solved", () => {
    const result = solve(GOAL, "bfs", "manhattan");
    expect(result).not.toBeNull();
    expect(result!.path).toEqual([GOAL]);
    expect(result!.path.length - 1).toBe(0);
  });

  it("finds a one-move solution with BFS", () => {
    const result = solve(oneMove, "bfs", "manhattan");
    expect(result).not.toBeNull();
    expect(result!.path.at(-1)).toBe(GOAL);
    expect(result!.path.length - 1).toBe(1);
  });

  it("finds the same optimal length with A*", () => {
    const bfs = solve(oneMove, "bfs", "manhattan");
    const astar = solve(oneMove, "astar", "manhattan");
    expect(bfs!.path.length).toBe(astar!.path.length);
  });
});
