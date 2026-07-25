import { describe, expect, it } from "vitest";
import {
  DEFAULT_INDEX_COLS,
  buildPhoneBookScene,
  dealGuessBoard,
  evaluateGuessOrder,
  evaluateLeftPrefix,
  guessOrderKey,
  moveCol,
  reorderCol,
  predicateSqlLines,
  strategyStory,
  tileMatchesAll,
} from "./model";

describe("evaluateLeftPrefix", () => {
  it("uses a clean equality prefix", () => {
    const v = evaluateLeftPrefix(DEFAULT_INDEX_COLS, {
      org_id: "eq",
      status: "eq",
    });
    expect(v.status).toBe("uses");
    expect(v.usableCols).toEqual(["org_id", "status"]);
    expect(v.tone).toBe("ok");
  });

  it("rejects queries that skip the leading column", () => {
    const v = evaluateLeftPrefix(DEFAULT_INDEX_COLS, {
      status: "eq",
      assignee_id: "eq",
    });
    expect(v.status).toBe("none");
    expect(v.usableCols).toEqual([]);
  });

  it("freezes suffix columns after a range", () => {
    const v = evaluateLeftPrefix(["org_id", "updated_at", "status"], {
      org_id: "eq",
      updated_at: "gt",
      status: "eq",
    });
    expect(v.status).toBe("partial");
    expect(v.usableCols).toEqual(["org_id", "updated_at"]);
    expect(v.frozenPredCols).toContain("status");
    expect(v.tone).toBe("warn");
  });

  it("treats a gap as a partial prefix", () => {
    const v = evaluateLeftPrefix(DEFAULT_INDEX_COLS, {
      org_id: "eq",
      assignee_id: "eq",
    });
    expect(v.status).toBe("partial");
    expect(v.usableCols).toEqual(["org_id"]);
    expect(v.frozenPredCols).toContain("assignee_id");
  });
});

describe("predicateSqlLines", () => {
  it("renders predicates in index order, then leftovers", () => {
    const lines = predicateSqlLines(DEFAULT_INDEX_COLS, {
      status: "eq",
      org_id: "eq",
    });
    expect(lines).toEqual(["org_id = ?", "status = ?"]);
  });

  it("returns no lines when nothing is toggled on", () => {
    expect(predicateSqlLines(DEFAULT_INDEX_COLS, {})).toEqual([]);
  });

  it("renders equality and range shapes", () => {
    const lines = predicateSqlLines(["org_id", "updated_at"], {
      org_id: "eq",
      updated_at: "gt",
    });
    expect(lines).toEqual(["org_id = ?", "updated_at > ?"]);
  });
});

describe("moveCol", () => {
  it("swaps neighbors and no-ops at edges", () => {
    expect(moveCol(DEFAULT_INDEX_COLS, 0, -1)).toEqual(DEFAULT_INDEX_COLS);
    expect(moveCol(DEFAULT_INDEX_COLS, 1, -1)[0]).toBe("status");
    expect(moveCol(DEFAULT_INDEX_COLS, 0, 1)[1]).toBe("org_id");
  });
});

describe("reorderCol", () => {
  it("moves a column to a new index", () => {
    const cols = ["org_id", "status", "updated_at"] as const;
    expect(reorderCol(cols, 0, 2)).toEqual([
      "status",
      "updated_at",
      "org_id",
    ]);
    expect(reorderCol(cols, 2, 0)).toEqual([
      "updated_at",
      "org_id",
      "status",
    ]);
  });
});

describe("evaluateGuessOrder", () => {
  const board = dealGuessBoard(48);

  it("deals a board with expected selectivities", () => {
    expect(board).toHaveLength(48);
    const orgHits = board.filter((t) => t.org === 42).length;
    const statusHits = board.filter((t) => t.status === "open").length;
    const assigneeHits = board.filter((t) => t.assignee === 7).length;
    expect(orgHits).toBe(6); // 1/8
    expect(statusHits).toBe(16); // 1/3
    expect(assigneeHits).toBe(8); // 1/6
  });

  it("ends with the same survivors regardless of order", () => {
    const a = evaluateGuessOrder(board, ["status", "org", "assignee"]);
    const b = evaluateGuessOrder(board, ["org", "status", "assignee"]);
    expect(a.survivors).toBe(b.survivors);
    expect(a.survivors).toBe(
      board.filter(tileMatchesAll).length,
    );
  });

  it("charges more peeks when the weak question leads", () => {
    const trap = evaluateGuessOrder(board, ["status", "org", "assignee"]);
    const good = evaluateGuessOrder(board, ["org", "status", "assignee"]);
    expect(trap.totalPeeks).toBeGreaterThan(good.totalPeeks);
    expect(trap.stages[0].indexJump).toBe(true);
    expect(trap.stages[0].peeks).toBe(0);
    expect(good.stages[0].peeks).toBe(0);
    // After status-first, ~16 survivors; peeks for org = 16
    expect(trap.stages[1].peeks).toBe(16);
    // After org-first, 6 survivors; peeks for status = 6
    expect(good.stages[1].peeks).toBe(6);
  });

  it("formats order keys for the scoreboard", () => {
    expect(guessOrderKey(["org", "status", "assignee"])).toBe(
      "org → status → assignee",
    );
  });
});

describe("strategyStory", () => {
  it("prefers composite over singles for tone", () => {
    expect(strategyStory("composite").tone).toBe("ok");
    expect(strategyStory("singles").tone).toBe("warn");
    expect(strategyStory("singles").insertWriteCount).toBeGreaterThan(
      strategyStory("composite").insertWriteCount,
    );
  });
});

describe("buildPhoneBookScene", () => {
  it("uses interleaved mode when a range freezes status", () => {
    const indexCols = ["org_id", "updated_at", "status"] as const;
    const predicates = {
      org_id: "eq" as const,
      updated_at: "gt" as const,
      status: "eq" as const,
    };
    const verdict = evaluateLeftPrefix(indexCols, predicates);
    const scene = buildPhoneBookScene(indexCols, predicates, verdict);
    expect(scene.highlight.kind).toBe("interleaved");
    if (scene.highlight.kind === "interleaved") {
      expect(scene.highlight.matchRowIds.length).toBeGreaterThan(0);
      expect(scene.highlight.walkRowIds.length).toBeGreaterThan(
        scene.highlight.matchRowIds.length,
      );
    }
    expect(scene.badge.toLowerCase()).toContain("interleaved");
  });

  it("uses a contiguous walk for a clean equality prefix", () => {
    const verdict = evaluateLeftPrefix(DEFAULT_INDEX_COLS, {
      org_id: "eq",
      status: "eq",
    });
    const scene = buildPhoneBookScene(
      DEFAULT_INDEX_COLS,
      { org_id: "eq", status: "eq" },
      verdict,
    );
    expect(scene.highlight.kind).toBe("contiguous");
    if (scene.highlight.kind === "contiguous") {
      expect(scene.highlight.rowIds.length).toBeGreaterThan(0);
    }
    expect(scene.badge).toContain("1 jump");
  });

  it("scatters matches when the leading column is missing", () => {
    const verdict = evaluateLeftPrefix(DEFAULT_INDEX_COLS, {
      status: "eq",
      assignee_id: "eq",
    });
    const scene = buildPhoneBookScene(
      DEFAULT_INDEX_COLS,
      { status: "eq", assignee_id: "eq" },
      verdict,
    );
    expect(scene.highlight.kind).toBe("scattered");
    if (scene.highlight.kind === "scattered") {
      expect(scene.highlight.fragmentCount).toBeGreaterThan(1);
      expect(scene.highlight.rowIds.length).toBeGreaterThan(0);
    }
    expect(scene.badge).toContain("fragments");
  });

  it("re-nests groups when index columns reorder", () => {
    const verdict = evaluateLeftPrefix(
      ["status", "org_id", "updated_at"],
      { status: "eq" },
    );
    const scene = buildPhoneBookScene(
      ["status", "org_id", "updated_at"],
      { status: "eq" },
      verdict,
    );
    expect(scene.groups[0]?.col).toBe("status");
    expect(scene.columns[0]).toBe("status");
  });
});
