import { describe, expect, it } from "vitest";
import {
  DEFAULT_INDEX_COLS,
  estimateSelectivity,
  evaluateLeftPrefix,
  moveCol,
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
  });
});
