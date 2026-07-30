/**
 * Illustrative InnoDB DYNAMIC on-page storage estimates for teaching.
 * Not a substitute for INFORMATION_SCHEMA / the InnoDB row format docs.
 */

export type IntegerWidth =
  | "tinyint"
  | "smallint"
  | "mediumint"
  | "int"
  | "bigint";

export type Charset = "utf8mb3" | "utf8mb4";

export type ColumnKind =
  | "integer"
  | "double"
  | "decimal"
  | "bigint_cents"
  | "varchar"
  | "char"
  | "text"
  | "json"
  | "datetime"
  | "timestamp";

export type SchemaColumn = {
  id: string;
  name: string;
  kind: ColumnKind;
  nullable: boolean;
  intWidth?: IntegerWidth;
  unsigned?: boolean;
  precision?: number;
  scale?: number;
  length?: number;
  charset?: Charset;
  /** Fractional seconds precision 0–6 */
  fsp?: number;
};

export type PresetId = "orm-bad" | "marketplace-good" | "wide-soup";

export type ColumnEstimate = {
  columnId: string;
  name: string;
  label: string;
  bytes: number;
  offPage: boolean;
  notes: string[];
};

export type RowEstimate = {
  columns: ColumnEstimate[];
  nullBitmapBytes: number;
  totalOnPageBytes: number;
  nearRowLimit: boolean;
  moneyExact: boolean | null;
  hasTimestamp: boolean;
  hasDatetimeEvent: boolean;
  timestamp2038Risk: boolean;
  utf8mb3Risk: boolean;
};

export const ROW_BYTE_SOFT_LIMIT = 65_535;
export const NEAR_LIMIT_RATIO = 0.5;

const INT_BYTES: Record<IntegerWidth, number> = {
  tinyint: 1,
  smallint: 2,
  mediumint: 3,
  int: 4,
  bigint: 8,
};

const CHARSET_BYTES: Record<Charset, number> = {
  utf8mb3: 3,
  utf8mb4: 4,
};

/** Compact leftover digit packing used by MySQL DECIMAL storage. */
function decimalLeftoverBytes(digits: number): number {
  if (digits <= 0) return 0;
  if (digits <= 2) return 1;
  if (digits <= 4) return 2;
  if (digits <= 6) return 3;
  return 4;
}

/** MySQL DECIMAL storage: groups of 9 digits → 4 bytes. */
export function decimalStorageBytes(precision: number, scale: number): number {
  const p = Math.max(1, Math.min(65, Math.floor(precision)));
  const s = Math.max(0, Math.min(30, Math.floor(scale)));
  const intDigits = p - s;
  const pack = (digits: number) => {
    const full = Math.floor(digits / 9) * 4;
    return full + decimalLeftoverBytes(digits % 9);
  };
  return pack(intDigits) + pack(s);
}

function fspExtraBytes(fsp: number | undefined): number {
  const f = Math.max(0, Math.min(6, fsp ?? 0));
  if (f === 0) return 0;
  if (f <= 2) return 1;
  if (f <= 4) return 2;
  return 3;
}

export function varcharLengthPrefix(charBytes: number): number {
  return charBytes < 256 ? 1 : 2;
}

/** Worst-case on-page budget for VARCHAR(n) under a charset (teaching estimate). */
export function varcharWorstCaseBytes(
  length: number,
  charset: Charset = "utf8mb4",
): { payload: number; prefix: number; bytes: number; perChar: number } {
  const n = Math.max(0, Math.floor(length));
  const perChar = CHARSET_BYTES[charset];
  const payload = n * perChar;
  const prefix = varcharLengthPrefix(payload);
  return { payload, prefix, bytes: prefix + payload, perChar };
}

export type IdStrategy =
  | "int-pk"
  | "bigint-pk"
  | "ulid-pk"
  | "bigint-plus-public";

export type IdStrategyEstimate = {
  id: IdStrategy;
  label: string;
  columns: SchemaColumn[];
  clusteredKeyBytes: number;
  totalBytes: number;
  /** Exposed as a bare JSON number to clients */
  jsPrecisionRisk: boolean;
  note: string;
};

export function idStrategyEstimate(strategy: IdStrategy): IdStrategyEstimate {
  switch (strategy) {
    case "int-pk": {
      const columns: SchemaColumn[] = [
        {
          id: "pk",
          name: "id",
          kind: "integer",
          intWidth: "int",
          nullable: false,
        },
      ];
      return {
        id: strategy,
        label: "INT PK",
        columns,
        clusteredKeyBytes: 4,
        totalBytes: 4,
        jsPrecisionRisk: false,
        note: "Skinny and fast. Fine when ids never leave the database.",
      };
    }
    case "bigint-pk": {
      const columns: SchemaColumn[] = [
        {
          id: "pk",
          name: "id",
          kind: "integer",
          intWidth: "bigint",
          unsigned: true,
          nullable: false,
        },
      ];
      return {
        id: strategy,
        label: "BIGINT PK",
        columns,
        clusteredKeyBytes: 8,
        totalBytes: 8,
        jsPrecisionRisk: true,
        note: "Plenty of range. A bare JSON number can round in JavaScript.",
      };
    }
    case "ulid-pk": {
      const columns: SchemaColumn[] = [
        {
          id: "pk",
          name: "id",
          kind: "char",
          length: 26,
          charset: "utf8mb4",
          nullable: false,
        },
      ];
      const clusteredKeyBytes = 26 * 4;
      return {
        id: strategy,
        label: "CHAR(26) ULID as PK",
        columns,
        clusteredKeyBytes,
        totalBytes: clusteredKeyBytes,
        jsPrecisionRisk: false,
        note: "Opaque and client-mintable. Every secondary index copies ~104B.",
      };
    }
    case "bigint-plus-public": {
      const columns: SchemaColumn[] = [
        {
          id: "pk",
          name: "id",
          kind: "integer",
          intWidth: "bigint",
          unsigned: true,
          nullable: false,
        },
        {
          id: "pub",
          name: "public_id",
          kind: "char",
          length: 26,
          charset: "utf8mb4",
          nullable: false,
        },
      ];
      return {
        id: strategy,
        label: "BIGINT + public_id",
        columns,
        clusteredKeyBytes: 8,
        totalBytes: 8 + 26 * 4,
        jsPrecisionRisk: false,
        note: "Cheap joins inside. Use a stringy ULID at the API boundary.",
      };
    }
  }
}

export type SessionTz = "UTC" | "America/Phoenix" | "America/New_York";

export const SESSION_TZ_LABELS: Record<SessionTz, string> = {
  UTC: "UTC",
  "America/Phoenix": "America/Phoenix",
  "America/New_York": "America/New_York",
};

/**
 * Teaching simulation: app writes wall-clock digits in the write session TZ.
 * TIMESTAMP converts; DATETIME keeps the digits.
 */
export function simulateTimeDisplay(opts: {
  kind: "timestamp" | "datetime";
  /** Local wall-clock written by the app, no offset — e.g. 2026-03-15T00:00:00 */
  writtenLocal: string;
  writeSessionTz: SessionTz;
  readSessionTz: SessionTz;
}): {
  storedLabel: string;
  displayedLocal: string;
  converts: boolean;
  timestamp2038Risk: boolean;
} {
  const { kind, writtenLocal, writeSessionTz, readSessionTz } = opts;
  const timestamp2038Risk = kind === "timestamp";

  if (kind === "datetime") {
    const digits = writtenLocal.replace("T", " ");
    return {
      storedLabel: digits,
      displayedLocal: digits,
      converts: false,
      timestamp2038Risk,
    };
  }

  // TIMESTAMP: interpret writtenLocal in writeSessionTz → UTC instant → format in readSessionTz
  const instant = wallClockToUtc(writtenLocal, writeSessionTz);
  const displayedLocal = formatInTz(instant, readSessionTz);
  return {
    storedLabel: `UTC instant (${formatInTz(instant, "UTC")})`,
    displayedLocal,
    converts: true,
    timestamp2038Risk,
  };
}

/** Parse "YYYY-MM-DDTHH:mm:ss" as wall clock in `tz` and return a UTC Date. */
function wallClockToUtc(local: string, tz: SessionTz): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(local);
  if (!m) return new Date(NaN);
  const [, ys, mos, ds, hs, mis, ss] = m;
  const y = Number(ys);
  const mo = Number(mos);
  const d = Number(ds);
  const h = Number(hs);
  const mi = Number(mis);
  const s = Number(ss);

  // Binary search a UTC epoch whose wall clock in `tz` matches the digits.
  let lo = Date.UTC(y, mo - 1, d - 1, 0, 0, 0);
  let hi = Date.UTC(y, mo - 1, d + 1, 23, 59, 59);
  const target = `${ys}-${mos}-${ds}T${hs}:${mis}:${ss}`;
  for (let i = 0; i < 40; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const wall = formatInTz(new Date(mid), tz).replace(" ", "T");
    if (wall === target) return new Date(mid);
    if (wall < target) lo = mid + 1;
    else hi = mid - 1;
  }
  // Fallback: treat as UTC digits if search misses (shouldn't for normal inputs).
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}

function formatInTz(date: Date, tz: SessionTz): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

function columnTypeLabel(col: SchemaColumn): string {
  switch (col.kind) {
    case "integer": {
      const w = (col.intWidth ?? "int").toUpperCase();
      return col.unsigned ? `${w} UNSIGNED` : w;
    }
    case "double":
      return "DOUBLE";
    case "decimal":
      return `DECIMAL(${col.precision ?? 12},${col.scale ?? 2})`;
    case "bigint_cents":
      return "BIGINT UNSIGNED /* cents */";
    case "varchar":
      return `VARCHAR(${col.length ?? 255}) ${col.charset ?? "utf8mb4"}`;
    case "char":
      return `CHAR(${col.length ?? 3}) ${col.charset ?? "utf8mb4"}`;
    case "text":
      return `TEXT ${col.charset ?? "utf8mb4"}`;
    case "json":
      return "JSON";
    case "datetime":
      return col.fsp ? `DATETIME(${col.fsp})` : "DATETIME";
    case "timestamp":
      return col.fsp ? `TIMESTAMP(${col.fsp})` : "TIMESTAMP";
    default:
      return col.kind;
  }
}

export function estimateColumn(col: SchemaColumn): ColumnEstimate {
  const notes: string[] = [];
  let bytes = 0;
  let offPage = false;
  const label = columnTypeLabel(col);

  switch (col.kind) {
    case "integer": {
      const width = col.intWidth ?? "int";
      bytes = INT_BYTES[width];
      notes.push(`${bytes} fixed byte${bytes === 1 ? "" : "s"} for ${width.toUpperCase()}.`);
      if (col.unsigned) notes.push("UNSIGNED doubles the positive range.");
      break;
    }
    case "double":
      bytes = 8;
      notes.push("8 bytes, approximate. Do not use for money.");
      break;
    case "decimal": {
      const p = col.precision ?? 12;
      const s = col.scale ?? 2;
      bytes = decimalStorageBytes(p, s);
      notes.push(`Exact fixed-point. About ${bytes} bytes for DECIMAL(${p},${s}).`);
      break;
    }
    case "bigint_cents":
      bytes = 8;
      notes.push("Integer minor units (cents). Exact. JSON-safe if you stringify bigints.");
      break;
    case "varchar": {
      const n = Math.max(0, col.length ?? 255);
      const cs = col.charset ?? "utf8mb4";
      const { payload, prefix, bytes: worst, perChar } = varcharWorstCaseBytes(
        n,
        cs,
      );
      // Teaching budget: count declared worst-case so the strip grows with length.
      // Real InnoDB may spill long values off-page; we flag that separately.
      bytes = worst;
      const INLINE_SOFT = 768;
      offPage = payload > INLINE_SOFT;
      notes.push(
        `Worst-case under ${cs}: ${n}×${perChar} + ${prefix}B length prefix = ${bytes}B.`,
      );
      if (offPage) {
        notes.push(
          "Long VARCHAR values often spill off-page in real InnoDB. This bar still shows the declared budget.",
        );
      }
      if (cs === "utf8mb3") {
        notes.push("utf8mb3 cannot store emoji or supplementary-plane chars.");
      }
      break;
    }
    case "char": {
      const n = Math.max(0, col.length ?? 3);
      const cs = col.charset ?? "utf8mb4";
      bytes = n * CHARSET_BYTES[cs];
      notes.push(`Fixed ${n} chars × ${CHARSET_BYTES[cs]}B (${cs}).`);
      break;
    }
    case "text":
    case "json":
      offPage = true;
      bytes = 20;
      notes.push(
        col.kind === "json"
          ? "JSON is validated binary storage. Large docs usually live off-page."
          : "TEXT is typically off-page. List endpoints pay for every wide row.",
      );
      break;
    case "datetime": {
      const extra = fspExtraBytes(col.fsp);
      bytes = 5 + extra;
      notes.push("Stores the wall-clock digits you give it. No session TZ conversion.");
      break;
    }
    case "timestamp": {
      const extra = fspExtraBytes(col.fsp);
      bytes = 4 + extra;
      notes.push("Converted to and from the session time_zone on write and read.");
      notes.push("TIMESTAMP range tops out in 2038.");
      break;
    }
  }

  if (col.nullable) {
    notes.push("Nullable. Contributes to the null bitmap.");
  }

  return {
    columnId: col.id,
    name: col.name,
    label,
    bytes,
    offPage,
    notes,
  };
}

export function estimateRow(columns: SchemaColumn[]): RowEstimate {
  const colEstimates = columns.map(estimateColumn);
  const nullableCount = columns.filter((c) => c.nullable).length;
  const nullBitmapBytes = nullableCount === 0 ? 0 : Math.ceil(nullableCount / 8);

  const dataBytes = colEstimates.reduce((sum, c) => sum + c.bytes, 0);
  const totalOnPageBytes = dataBytes + nullBitmapBytes;

  const moneyKinds = columns.filter((c) =>
    c.kind === "double" || c.kind === "decimal" || c.kind === "bigint_cents",
  );
  let moneyExact: boolean | null = null;
  if (moneyKinds.length > 0) {
    moneyExact = moneyKinds.every(
      (c) => c.kind === "decimal" || c.kind === "bigint_cents",
    );
  }

  const hasTimestamp = columns.some((c) => c.kind === "timestamp");
  const hasDatetimeEvent = columns.some(
    (c) => c.kind === "datetime" && /start|event|sched|send/i.test(c.name),
  );
  const timestamp2038Risk = columns.some(
    (c) => c.kind === "timestamp" && /start|event|sched|send/i.test(c.name),
  );
  const utf8mb3Risk = columns.some(
    (c) =>
      (c.kind === "varchar" || c.kind === "char" || c.kind === "text") &&
      (c.charset ?? "utf8mb4") === "utf8mb3",
  );

  return {
    columns: colEstimates,
    nullBitmapBytes,
    totalOnPageBytes,
    nearRowLimit: totalOnPageBytes >= ROW_BYTE_SOFT_LIMIT * NEAR_LIMIT_RATIO,
    moneyExact,
    hasTimestamp,
    hasDatetimeEvent,
    timestamp2038Risk,
    utf8mb3Risk,
  };
}

let idCounter = 0;

export function resetColumnIdCounter(): void {
  idCounter = 0;
}

export function nextColumnId(prefix = "col"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function col(
  partial: Omit<SchemaColumn, "id"> & { id?: string },
): SchemaColumn {
  return {
    id: partial.id ?? nextColumnId(),
    ...partial,
  };
}

export const PRESET_LABELS: Record<PresetId, string> = {
  "orm-bad": "ORM defaults (bad)",
  "marketplace-good": "Marketplace v1 (good)",
  "wide-soup": "Wide VARCHAR soup",
};

export function createPreset(id: PresetId): SchemaColumn[] {
  resetColumnIdCounter();
  switch (id) {
    case "orm-bad":
      return [
        col({ name: "id", kind: "integer", intWidth: "int", nullable: false }),
        col({
          name: "shop_id",
          kind: "integer",
          intWidth: "int",
          nullable: false,
        }),
        col({
          name: "title",
          kind: "varchar",
          length: 255,
          charset: "utf8mb3",
          nullable: true,
        }),
        col({
          name: "description",
          kind: "varchar",
          length: 8000,
          charset: "utf8mb3",
          nullable: true,
        }),
        col({ name: "price", kind: "double", nullable: false }),
        col({
          name: "currency",
          kind: "char",
          length: 3,
          charset: "utf8mb3",
          nullable: true,
        }),
        col({ name: "starts_at", kind: "timestamp", nullable: true, fsp: 0 }),
        col({ name: "attrs", kind: "text", charset: "utf8mb3", nullable: true }),
        col({ name: "created_at", kind: "timestamp", nullable: true, fsp: 0 }),
        col({ name: "updated_at", kind: "timestamp", nullable: true, fsp: 0 }),
      ];
    case "marketplace-good":
      return [
        col({
          name: "id",
          kind: "integer",
          intWidth: "bigint",
          unsigned: true,
          nullable: false,
        }),
        col({
          name: "shop_id",
          kind: "integer",
          intWidth: "bigint",
          unsigned: true,
          nullable: false,
        }),
        col({
          name: "title",
          kind: "varchar",
          length: 140,
          charset: "utf8mb4",
          nullable: false,
        }),
        col({
          name: "description",
          kind: "text",
          charset: "utf8mb4",
          nullable: false,
        }),
        col({ name: "price_cents", kind: "bigint_cents", nullable: false }),
        col({
          name: "currency",
          kind: "char",
          length: 3,
          charset: "utf8mb4",
          nullable: false,
        }),
        col({
          name: "status",
          kind: "integer",
          intWidth: "tinyint",
          unsigned: true,
          nullable: false,
        }),
        col({ name: "starts_at", kind: "datetime", nullable: false, fsp: 0 }),
        col({ name: "attrs", kind: "json", nullable: true }),
        col({
          name: "created_at",
          kind: "datetime",
          nullable: false,
          fsp: 3,
        }),
        col({
          name: "updated_at",
          kind: "datetime",
          nullable: false,
          fsp: 3,
        }),
      ];
    case "wide-soup":
      return [
        col({ name: "id", kind: "integer", intWidth: "int", nullable: false }),
        col({
          name: "a",
          kind: "varchar",
          length: 2000,
          charset: "utf8mb4",
          nullable: true,
        }),
        col({
          name: "b",
          kind: "varchar",
          length: 2000,
          charset: "utf8mb4",
          nullable: true,
        }),
        col({
          name: "c",
          kind: "varchar",
          length: 2000,
          charset: "utf8mb4",
          nullable: true,
        }),
        col({
          name: "d",
          kind: "varchar",
          length: 2000,
          charset: "utf8mb4",
          nullable: true,
        }),
        col({
          name: "e",
          kind: "varchar",
          length: 2000,
          charset: "utf8mb4",
          nullable: true,
        }),
      ];
  }
}

export type PaletteItem = {
  id: string;
  label: string;
  factory: () => SchemaColumn;
};

export const COLUMN_PALETTE: PaletteItem[] = [
  {
    id: "int",
    label: "INT",
    factory: () =>
      col({
        name: "int_col",
        kind: "integer",
        intWidth: "int",
        nullable: false,
      }),
  },
  {
    id: "bigint",
    label: "BIGINT",
    factory: () =>
      col({
        name: "id",
        kind: "integer",
        intWidth: "bigint",
        unsigned: true,
        nullable: false,
      }),
  },
  {
    id: "double",
    label: "DOUBLE",
    factory: () => col({ name: "price", kind: "double", nullable: false }),
  },
  {
    id: "decimal",
    label: "DECIMAL",
    factory: () =>
      col({
        name: "amount",
        kind: "decimal",
        precision: 12,
        scale: 2,
        nullable: false,
      }),
  },
  {
    id: "cents",
    label: "CENTS",
    factory: () =>
      col({ name: "price_cents", kind: "bigint_cents", nullable: false }),
  },
  {
    id: "varchar",
    label: "VARCHAR",
    factory: () =>
      col({
        name: "title",
        kind: "varchar",
        length: 255,
        charset: "utf8mb4",
        nullable: false,
      }),
  },
  {
    id: "datetime",
    label: "DATETIME",
    factory: () =>
      col({ name: "starts_at", kind: "datetime", nullable: false, fsp: 0 }),
  },
  {
    id: "timestamp",
    label: "TIMESTAMP",
    factory: () =>
      col({ name: "starts_at", kind: "timestamp", nullable: true, fsp: 0 }),
  },
  {
    id: "json",
    label: "JSON",
    factory: () => col({ name: "attrs", kind: "json", nullable: true }),
  },
];

export function updateColumn(
  columns: SchemaColumn[],
  id: string,
  patch: Partial<SchemaColumn>,
): SchemaColumn[] {
  return columns.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export function removeColumn(
  columns: SchemaColumn[],
  id: string,
): SchemaColumn[] {
  return columns.filter((c) => c.id !== id);
}

export function addColumn(
  columns: SchemaColumn[],
  column: SchemaColumn,
): SchemaColumn[] {
  return [...columns, column];
}

export function cycleIntegerWidth(width: IntegerWidth): IntegerWidth {
  const order: IntegerWidth[] = [
    "tinyint",
    "smallint",
    "mediumint",
    "int",
    "bigint",
  ];
  const i = order.indexOf(width);
  return order[(i + 1) % order.length];
}

export function moneyModeOf(col: SchemaColumn): "double" | "decimal" | "cents" | null {
  if (col.kind === "double") return "double";
  if (col.kind === "decimal") return "decimal";
  if (col.kind === "bigint_cents") return "cents";
  return null;
}

/** Illustrative InnoDB page size for “rows per page” teaching demos. */
export const INNODB_PAGE_BYTES = 16_384;
/** Rough usable bytes after page headers / fillers — teaching constant. */
export const INNODB_PAGE_USABLE_BYTES = 15_000;

export function rowsPerPage(rowBytes: number): number {
  if (rowBytes <= 0) return 0;
  return Math.max(1, Math.floor(INNODB_PAGE_USABLE_BYTES / rowBytes));
}

/** Pages touched to return `limit` rows (list-endpoint metaphor). */
export function pagesForLimit(rowBytes: number, limit: number): number {
  const rpp = rowsPerPage(rowBytes);
  if (rpp <= 0) return limit;
  return Math.ceil(limit / rpp);
}

/**
 * Classic float footgun: sum many “ten cent” line items.
 * DOUBLE’s raw sum often ≠ expected even when lucky rounding hides it;
 * truncating to cents (a common bug) makes the penny loss obvious.
 */
export function sumMoneyLines(
  mode: "double" | "cents" | "decimal",
  lineCount: number,
  unitCents = 10,
): {
  expectedCents: number;
  /** What a truncate-to-cents cast would store */
  storedTotalCents: number;
  driftCents: number;
  floatRaw: number | null;
  /** True when binary float sum is not identically the decimal expectation */
  floatLies: boolean;
  roundedCents: number;
} {
  const n = Math.max(0, Math.floor(lineCount));
  const expectedCents = n * unitCents;
  if (mode === "cents" || mode === "decimal") {
    return {
      expectedCents,
      storedTotalCents: expectedCents,
      driftCents: 0,
      floatRaw: null,
      floatLies: false,
      roundedCents: expectedCents,
    };
  }
  let dollars = 0;
  const unitDollars = unitCents / 100;
  for (let i = 0; i < n; i++) dollars += unitDollars;
  const expectedDollars = expectedCents / 100;
  const truncatedCents = Math.floor(dollars * 100);
  const roundedCents = Math.round(dollars * 100);
  return {
    expectedCents,
    storedTotalCents: truncatedCents,
    driftCents: truncatedCents - expectedCents,
    floatRaw: dollars,
    floatLies: dollars !== expectedDollars,
    roundedCents,
  };
}

/** JSON number round-trip for a MySQL-style unsigned BIGINT id. */
export function jsonNumberRoundTrip(mysqlId: bigint): {
  mysqlId: string;
  afterJson: string;
  corrupted: boolean;
} {
  const asNumber = Number(mysqlId);
  const afterJson = String(asNumber);
  return {
    mysqlId: mysqlId.toString(),
    afterJson,
    corrupted: afterJson !== mysqlId.toString(),
  };
}

export function applyMoneyMode(
  col: SchemaColumn,
  mode: "double" | "decimal" | "cents",
): SchemaColumn {
  if (mode === "double") {
    return {
      ...col,
      kind: "double",
      name: col.name.includes("price") || col.name.includes("amount")
        ? col.name.replace(/_cents$/, "").replace(/^price_cents$/, "price")
        : "price",
    };
  }
  if (mode === "decimal") {
    return {
      ...col,
      kind: "decimal",
      precision: 12,
      scale: 2,
      name: col.name === "price_cents" ? "price_amount" : col.name,
    };
  }
  return {
    ...col,
    kind: "bigint_cents",
    name: col.name.includes("price") ? "price_cents" : col.name,
  };
}
