import { describe, expect, it } from "vitest";
import {
  btreeDescentPath,
  btreeDescentSteps,
  childIndexForKey,
  insertLocality,
  insertPageIndex,
  insertSequence,
  luggageAtScaleMb,
  makeToyRows,
  pkWidthBytes,
  secondaryLuggageBytes,
  toyBtree,
  toyClusteredRow,
  TOY_BTREE_PICK_KEYS,
} from "./model";

describe("pkWidthBytes", () => {
  it("sizes common PK shapes", () => {
    expect(pkWidthBytes("bigint")).toBe(8);
    expect(pkWidthBytes("uuid-v7")).toBe(16);
    expect(pkWidthBytes("uuid-v4-char36")).toBe(36);
    expect(pkWidthBytes("composite-tenant")).toBe(16);
  });
});

describe("secondaryLuggageBytes", () => {
  it("multiplies PK width across secondaries", () => {
    const skinny = secondaryLuggageBytes({
      pkShape: "bigint",
      secondaryCount: 3,
      indexedColBytesPerSecondary: 8,
    });
    expect(skinny.pkBytes).toBe(8);
    expect(skinny.perSecondaryBytes).toBe(16);
    expect(skinny.totalLuggageBytes).toBe(48);

    const fat = secondaryLuggageBytes({
      pkShape: "uuid-v4-char36",
      secondaryCount: 3,
      indexedColBytesPerSecondary: 8,
    });
    expect(fat.perSecondaryBytes).toBe(44);
    expect(fat.totalLuggageBytes).toBe(132);
  });
});

describe("insertLocality", () => {
  it("favors bigint over uuid-v4", () => {
    const ai = insertLocality("bigint-ai");
    const v4 = insertLocality("uuid-v4");
    const v7 = insertLocality("uuid-v7");

    expect(ai.sequentiality).toBeGreaterThan(v7.sequentiality);
    expect(v7.sequentiality).toBeGreaterThan(v4.sequentiality);
    expect(ai.leafFillRatio).toBeGreaterThan(v4.leafFillRatio);
    expect(ai.tone).toBe("ok");
    expect(v4.tone).toBe("bad");
    expect(ai.pageFills).toHaveLength(6);
    expect(v4.pageFills.some((f) => f > 0)).toBe(true);
  });
});

describe("makeToyRows", () => {
  it("builds stable deterministic rows", () => {
    const a = makeToyRows(3, 1);
    const b = makeToyRows(3, 1);
    expect(a).toEqual(b);
    expect(a[0].email).toBe("user1@example.com");
  });
});

describe("insertPageIndex", () => {
  it("appends for bigint and scatters for uuid-v4", () => {
    const pages = 8;
    const aiPages = Array.from({ length: 24 }, (_, i) =>
      insertPageIndex("bigint-ai", i, pages),
    );
    const v4Pages = Array.from({ length: 24 }, (_, i) =>
      insertPageIndex("uuid-v4", i, pages),
    );

    for (let i = 1; i < aiPages.length; i++) {
      expect(aiPages[i]).toBeGreaterThanOrEqual(aiPages[i - 1]);
    }
    expect(new Set(v4Pages).size).toBeGreaterThan(new Set(aiPages).size);
  });
});

describe("toy B-tree descent", () => {
  it("picks the child via separators", () => {
    expect(childIndexForKey([6], 3)).toBe(0);
    expect(childIndexForKey([6], 6)).toBe(0);
    expect(childIndexForKey([6], 7)).toBe(1);
  });

  it("walks root → branch → leaf for picker keys", () => {
    const tree = toyBtree();
    for (const key of TOY_BTREE_PICK_KEYS) {
      const path = btreeDescentPath(tree, key);
      expect(path[0]).toBe("root");
      expect(path).toHaveLength(3);
      expect(tree[path[2]].keys).toContain(key);
    }
  });

  it("returns empty path for missing keys", () => {
    expect(btreeDescentPath(toyBtree(), 99)).toEqual([]);
  });

  it("emits stepped comparisons ending in the leaf", () => {
    const steps = btreeDescentSteps(toyBtree(), 5);
    expect(steps).toHaveLength(3);
    expect(steps[0].comparison).toContain("go left");
    expect(steps[2].direction).toBe("leaf");
    expect(toyClusteredRow(5).email).toBe("user5@example.com");
  });
});

describe("insertSequence", () => {
  it("lands bigint inserts toward later pages and uuid-v4 more widely", () => {
    const ai = insertSequence("bigint-ai");
    const v4 = insertSequence("uuid-v4");
    expect(ai.length).toBe(24);
    const aiPages = new Set(ai.map((s) => s.pageIndex));
    const v4Pages = new Set(v4.map((s) => s.pageIndex));
    expect(v4Pages.size).toBeGreaterThanOrEqual(aiPages.size);
  });

  it("flags page splits when a leaf overflows", () => {
    // Many random inserts into few small pages forces overflows.
    const v4 = insertSequence("uuid-v4", 40, 4, 4);
    expect(v4.some((s) => s.causesSplit)).toBe(true);
  });
});

describe("luggageAtScaleMb", () => {
  it("shows CHAR(36) heavier than BIGINT at 10M rows", () => {
    const fat = luggageAtScaleMb({
      pkShape: "uuid-v4-char36",
      secondaryCount: 3,
      rowCount: 10_000_000,
    });
    const skinny = luggageAtScaleMb({
      pkShape: "bigint",
      secondaryCount: 3,
      rowCount: 10_000_000,
    });
    expect(fat).toBeGreaterThan(skinny);
    expect(Math.round(fat)).toBe(1259); // 44 * 3 * 10M / 1MiB
  });
});
