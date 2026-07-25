import { describe, expect, it } from "vitest";
import {
  createPreset,
  decimalStorageBytes,
  estimateRow,
  resetColumnIdCounter,
  type SchemaColumn,
} from "./budget";

describe("decimalStorageBytes", () => {
  it("matches MySQL packing for DECIMAL(12,2)", () => {
    // int digits 10 → 4 + 1; frac 2 → 1; total 6
    expect(decimalStorageBytes(12, 2)).toBe(6);
  });

  it("handles DECIMAL(10,0)", () => {
    // 9→4 + 1 leftover → 5
    expect(decimalStorageBytes(10, 0)).toBe(5);
  });
});

describe("estimateRow", () => {
  it("sizes fixed integers", () => {
    resetColumnIdCounter();
    const columns: SchemaColumn[] = [
      {
        id: "1",
        name: "id",
        kind: "integer",
        intWidth: "bigint",
        unsigned: true,
        nullable: false,
      },
      {
        id: "2",
        name: "status",
        kind: "integer",
        intWidth: "tinyint",
        unsigned: true,
        nullable: false,
      },
    ];
    const row = estimateRow(columns);
    expect(row.columns[0].bytes).toBe(8);
    expect(row.columns[1].bytes).toBe(1);
    expect(row.nullBitmapBytes).toBe(0);
    expect(row.totalOnPageBytes).toBe(9);
  });

  it("flags approximate money on DOUBLE", () => {
    const row = estimateRow(createPreset("orm-bad"));
    expect(row.moneyExact).toBe(false);
    expect(row.hasTimestamp).toBe(true);
    expect(row.timestamp2038Risk).toBe(true);
    expect(row.utf8mb3Risk).toBe(true);
  });

  it("marks marketplace preset as exact money with DATETIME event", () => {
    const row = estimateRow(createPreset("marketplace-good"));
    expect(row.moneyExact).toBe(true);
    expect(row.timestamp2038Risk).toBe(false);
    expect(row.utf8mb3Risk).toBe(false);
    expect(row.hasDatetimeEvent).toBe(true);
  });

  it("warns when wide VARCHAR soup approaches the soft budget", () => {
    const row = estimateRow(createPreset("wide-soup"));
    expect(row.nearRowLimit).toBe(true);
    expect(row.totalOnPageBytes).toBeGreaterThan(1000);
  });

  it("counts null bitmap for nullable columns", () => {
    resetColumnIdCounter();
    const columns: SchemaColumn[] = [
      { id: "a", name: "a", kind: "integer", intWidth: "int", nullable: true },
      { id: "b", name: "b", kind: "integer", intWidth: "int", nullable: true },
      { id: "c", name: "c", kind: "integer", intWidth: "int", nullable: true },
      { id: "d", name: "d", kind: "integer", intWidth: "int", nullable: true },
      { id: "e", name: "e", kind: "integer", intWidth: "int", nullable: true },
      { id: "f", name: "f", kind: "integer", intWidth: "int", nullable: true },
      { id: "g", name: "g", kind: "integer", intWidth: "int", nullable: true },
      { id: "h", name: "h", kind: "integer", intWidth: "int", nullable: true },
      { id: "i", name: "i", kind: "integer", intWidth: "int", nullable: true },
    ];
    const row = estimateRow(columns);
    expect(row.nullBitmapBytes).toBe(2);
  });

  it("treats TIMESTAMP as smaller than DATETIME at fsp 0", () => {
    resetColumnIdCounter();
    const ts = estimateRow([
      { id: "1", name: "t", kind: "timestamp", nullable: false, fsp: 0 },
    ]);
    const dt = estimateRow([
      { id: "1", name: "t", kind: "datetime", nullable: false, fsp: 0 },
    ]);
    expect(ts.columns[0].bytes).toBe(4);
    expect(dt.columns[0].bytes).toBe(5);
  });
});
