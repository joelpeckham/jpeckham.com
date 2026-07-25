import { describe, expect, it } from "vitest";
import {
  DEFAULT_INDEX_COLS,
  buildLeftPrefixKeyScene,
  estimateSelectivity,
  evaluateLeftPrefix,
  moveCol,
  predicateSqlLines,
  strategyStory,
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

  it("blocks leading wildcard LIKE", () => {
    const v = evaluateLeftPrefix(["org_id", "subject"], {
      subject: "like_contains",
    });
    expect(v.status).toBe("none");
  });

  it("allows prefix LIKE to continue the walk", () => {
    const v = evaluateLeftPrefix(["org_id", "subject"], {
      org_id: "eq",
      subject: "like_prefix",
    });
    expect(v.status).toBe("uses");
    expect(v.usableCols).toEqual(["org_id", "subject"]);
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
      subject: "like_contains",
    });
    expect(lines).toEqual([
      "org_id = ?",
      "status = ?",
      "subject LIKE '%refund%'",
    ]);
  });

  it("returns no lines when nothing is toggled on", () => {
    expect(predicateSqlLines(DEFAULT_INDEX_COLS, {})).toEqual([]);
  });

  it("renders each operator shape", () => {
    const lines = predicateSqlLines(["org_id", "status", "updated_at"], {
      org_id: "in",
      status: "like_prefix",
      updated_at: "gt",
    });
    expect(lines).toEqual([
      "org_id IN (?, ?, ?)",
      "status LIKE 'refund%'",
      "updated_at > ?",
    ]);
  });
});

describe("moveCol", () => {
  it("swaps neighbors and no-ops at edges", () => {
    expect(moveCol(DEFAULT_INDEX_COLS, 0, -1)).toEqual(DEFAULT_INDEX_COLS);
    expect(moveCol(DEFAULT_INDEX_COLS, 1, -1)[0]).toBe("status");
    expect(moveCol(DEFAULT_INDEX_COLS, 0, 1)[1]).toBe("org_id");
  });
});

describe("estimateSelectivity", () => {
  it("makes status-alone look worse than org-scoped status", () => {
    const e = estimateSelectivity({
      orgCount: 200,
      statusDistinct: 3,
      assigneeDistinct: 40,
      orgScoped: true,
    });
    expect(e.statusAloneRows).toBeGreaterThan(e.orgThenStatusRows);
    expect(e.orgStatusAssigneeRows).toBeLessThan(e.orgThenStatusRows);
    expect(e.statusTone).toBe("bad");
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

describe("buildLeftPrefixKeyScene", () => {
  it("uses interleaved mode when a range freezes status", () => {
    const indexCols = ["org_id", "updated_at", "status"] as const;
    const predicates = {
      org_id: "eq" as const,
      updated_at: "gt" as const,
      status: "eq" as const,
    };
    const verdict = evaluateLeftPrefix(indexCols, predicates);
    const scene = buildLeftPrefixKeyScene(indexCols, predicates, verdict);
    expect(scene.mode).toBe("interleaved");
    expect(scene.matches.some(Boolean)).toBe(true);
    expect(scene.matches.every(Boolean)).toBe(false);
  });

  it("uses a contiguous walk for a clean equality prefix", () => {
    const verdict = evaluateLeftPrefix(DEFAULT_INDEX_COLS, {
      org_id: "eq",
      status: "eq",
    });
    const scene = buildLeftPrefixKeyScene(
      DEFAULT_INDEX_COLS,
      { org_id: "eq", status: "eq" },
      verdict,
    );
    expect(scene.mode).toBe("contiguous");
    expect(scene.walkEnd).toBeGreaterThan(scene.walkStart);
  });
});
