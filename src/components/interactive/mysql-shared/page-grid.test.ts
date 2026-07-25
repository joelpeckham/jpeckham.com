import { describe, expect, it } from "vitest";
import { makePageSlots, pagesForLimit, rowsPerPage } from "./page-grid";

describe("rowsPerPage / pagesForLimit", () => {
  it("packs more skinny rows per page", () => {
    expect(rowsPerPage(131)).toBeGreaterThan(rowsPerPage(2547));
    expect(pagesForLimit(50, 6)).toBe(9);
    expect(pagesForLimit(50, 100)).toBe(1);
  });
});

describe("makePageSlots", () => {
  it("marks filled and landing slots", () => {
    const slots = makePageSlots(6, 3, { landingIndex: 2 });
    expect(slots.filter((s) => s.filled)).toHaveLength(3);
    expect(slots[2].landing).toBe(true);
    expect(slots[0].landing).toBeFalsy();
  });
});
