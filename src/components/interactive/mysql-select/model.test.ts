import { describe, expect, it } from "vitest";
import {
  buildSargKeyScene,
  estimateProjection,
  evaluatePrefixHighlight,
  projectionSelectSql,
  sargPreset,
} from "./model";

describe("sargPreset", () => {
  it("marks YEAR() as weaker than a bare date range", () => {
    const bad = sargPreset("year-fn");
    const good = sargPreset("sargable-year");
    expect(bad.litSegments).toBeLessThan(good.litSegments);
    expect(good.access).toBe("range");
    expect(good.tone).toBe("ok");
    expect(bad.tone).toBe("warn");
  });

  it("treats leading wildcard LIKE as non-range on subject", () => {
    expect(sargPreset("like-contains").tone).toBe("warn");
    expect(sargPreset("like-prefix").tone).toBe("ok");
  });
});

describe("estimateProjection", () => {
  it("makes SELECT * heavier than list columns", () => {
    const star = estimateProjection("star");
    const list = estimateProjection("list");
    expect(star.bytesPerRow).toBeGreaterThan(list.bytesPerRow);
    expect(star.includesFat).toBe(true);
    expect(list.includesFat).toBe(false);
    expect(star.tone).toBe("bad");
  });
});

describe("projectionSelectSql", () => {
  it("lists the card columns and never the body", () => {
    expect(projectionSelectSql("star")).toBe("SELECT *");
    const list = projectionSelectSql("list");
    expect(list).toContain("subject");
    expect(list).not.toContain("body");
  });
});

describe("buildSargKeyScene", () => {
  it("scans open rows for YEAR() and seeks for a bare range", () => {
    const scan = buildSargKeyScene("year-fn");
    const seek = buildSargKeyScene("sargable-year");
    expect(scan.pointerMode).toBe("scan");
    expect(seek.pointerMode).toBe("seek");
    expect(scan.pointerPath.length).toBeGreaterThan(seek.pointerPath.length);
    expect(seek.litEnd - seek.litStart).toBeLessThanOrEqual(
      scan.litEnd - scan.litStart,
    );
  });
});

describe("evaluatePrefixHighlight", () => {
  it("lights the full inbox prefix", () => {
    const v = evaluatePrefixHighlight({
      org_id: "eq",
      status: "eq",
      updated_at: "gt",
    });
    expect(v.litCount).toBe(3);
    expect(v.access).toBe("range");
    expect(v.tone).toBe("ok");
  });

  it("scans when org_id is missing", () => {
    const v = evaluatePrefixHighlight({
      org_id: "off",
      status: "eq",
    });
    expect(v.access).toBe("ALL");
    expect(v.litCount).toBe(0);
  });

  it("stops at a gap before updated_at", () => {
    const v = evaluatePrefixHighlight({
      org_id: "eq",
      status: "off",
      updated_at: "gt",
    });
    expect(v.litCount).toBe(1);
    expect(v.tone).toBe("warn");
  });
});
