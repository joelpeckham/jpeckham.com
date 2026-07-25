import { describe, expect, it } from "vitest";
import {
  createPreset,
  decimalStorageBytes,
  estimateRow,
  idStrategyEstimate,
  jsonNumberRoundTrip,
  pagesForLimit,
  resetColumnIdCounter,
  rowsPerPage,
  simulateTimeDisplay,
  sumMoneyLines,
  varcharWorstCaseBytes,
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

describe("varcharWorstCaseBytes", () => {
  it("prices VARCHAR(255) utf8mb4 near 1KB", () => {
    const v = varcharWorstCaseBytes(255, "utf8mb4");
    expect(v.perChar).toBe(4);
    expect(v.payload).toBe(1020);
    expect(v.prefix).toBe(2);
    expect(v.bytes).toBe(1022);
  });

  it("uses a 1-byte prefix when the max payload fits in 255 bytes", () => {
    const v = varcharWorstCaseBytes(80, "utf8mb4");
    expect(v.payload).toBe(320);
    // 320 > 255 → still 2-byte prefix
    expect(v.prefix).toBe(2);
    const skinny = varcharWorstCaseBytes(60, "utf8mb4");
    expect(skinny.payload).toBe(240);
    expect(skinny.prefix).toBe(1);
  });
});

describe("idStrategyEstimate", () => {
  it("flags JS precision only for bare BIGINT PK", () => {
    expect(idStrategyEstimate("int-pk").jsPrecisionRisk).toBe(false);
    expect(idStrategyEstimate("bigint-pk").jsPrecisionRisk).toBe(true);
    expect(idStrategyEstimate("ulid-pk").jsPrecisionRisk).toBe(false);
    expect(idStrategyEstimate("bigint-plus-public").jsPrecisionRisk).toBe(
      false,
    );
  });

  it("sizes ULID PK as 26×4 under utf8mb4", () => {
    expect(idStrategyEstimate("ulid-pk").clusteredKeyBytes).toBe(104);
    expect(idStrategyEstimate("bigint-plus-public").clusteredKeyBytes).toBe(8);
    expect(idStrategyEstimate("bigint-plus-public").totalBytes).toBe(112);
  });
});

describe("simulateTimeDisplay", () => {
  it("keeps DATETIME digits across session timezones", () => {
    const sim = simulateTimeDisplay({
      kind: "datetime",
      writtenLocal: "2026-03-15T00:00:00",
      writeSessionTz: "America/Phoenix",
      readSessionTz: "America/New_York",
    });
    expect(sim.converts).toBe(false);
    expect(sim.displayedLocal).toBe("2026-03-15 00:00:00");
    expect(sim.timestamp2038Risk).toBe(false);
  });

  it("shifts TIMESTAMP display when the read session timezone changes", () => {
    const sim = simulateTimeDisplay({
      kind: "timestamp",
      writtenLocal: "2026-03-15T00:00:00",
      writeSessionTz: "America/Phoenix",
      readSessionTz: "America/New_York",
    });
    expect(sim.converts).toBe(true);
    expect(sim.timestamp2038Risk).toBe(true);
    // Phoenix (UTC-7) midnight → 07:00 UTC → 03:00 Eastern (EDT in March)
    expect(sim.displayedLocal).toBe("2026-03-15 03:00:00");
  });
});

describe("sumMoneyLines", () => {
  it("keeps cents and DECIMAL exact", () => {
    for (const mode of ["cents", "decimal"] as const) {
      const sum = sumMoneyLines(mode, 100, 10);
      expect(sum.expectedCents).toBe(1000);
      expect(sum.storedTotalCents).toBe(1000);
      expect(sum.driftCents).toBe(0);
      expect(sum.floatLies).toBe(false);
    }
  });

  it("shows DOUBLE raw sum lying and truncate drift", () => {
    const sum = sumMoneyLines("double", 10, 10);
    expect(sum.floatLies).toBe(true);
    expect(sum.floatRaw).not.toBe(1);
    expect(sum.storedTotalCents).toBe(99);
    expect(sum.driftCents).toBe(-1);
    expect(sum.roundedCents).toBe(100);
  });
});

describe("jsonNumberRoundTrip", () => {
  it("corrupts ids above MAX_SAFE_INTEGER", () => {
    const rt = jsonNumberRoundTrip(BigInt("9007199254740993"));
    expect(rt.corrupted).toBe(true);
    expect(rt.afterJson).not.toBe(rt.mysqlId);
  });

  it("keeps small ints intact", () => {
    const rt = jsonNumberRoundTrip(BigInt(42));
    expect(rt.corrupted).toBe(false);
  });
});

describe("rowsPerPage", () => {
  it("packs more skinny rows than fat ones", () => {
    expect(rowsPerPage(100)).toBeGreaterThan(rowsPerPage(2000));
    expect(pagesForLimit(2000, 50)).toBeGreaterThan(pagesForLimit(100, 50));
  });
});
