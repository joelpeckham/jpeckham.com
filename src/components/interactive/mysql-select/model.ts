/**
 * Teaching models for SELECT / filtering demos.
 * Illustrative heuristics — not the real optimizer.
 */

export type AccessKind = "ref" | "range" | "ALL";

export type SargPresetId =
  | "year-fn"
  | "sargable-year"
  | "like-prefix"
  | "like-contains"
  | "org-status-range";

export type SargPreset = {
  id: SargPresetId;
  label: string;
  whereSql: string;
  access: AccessKind;
  tone: "ok" | "warn" | "bad";
  title: string;
  reason: string;
  /** Which index segments light for this preset (fixed tickets index). */
  litSegments: number;
};

/** Fixed teaching index: (org_id, status, updated_at) */
export const TICKETS_INDEX = ["org_id", "status", "updated_at"] as const;

export const SARG_PRESETS: SargPreset[] = [
  {
    id: "year-fn",
    label: "YEAR(updated_at)",
    whereSql:
      "org_id = ? AND status = 'open' AND YEAR(updated_at) = 2026",
    access: "ref",
    tone: "warn",
    title: "Function freezes the date column",
    reason:
      "org_id + status can still use a left prefix, but YEAR(updated_at) is not a range on updated_at. MySQL can't walk that column as a B-tree interval.",
    litSegments: 2,
  },
  {
    id: "sargable-year",
    label: "Date range",
    whereSql:
      "org_id = ? AND status = 'open' AND updated_at >= '2026-01-01' AND updated_at < '2027-01-01'",
    access: "range",
    tone: "ok",
    title: "Sargable range on the bare column",
    reason:
      "Equalities on org_id and status, then a range on updated_at. Same product filter as YEAR(...), index-friendly shape.",
    litSegments: 3,
  },
  {
    id: "like-prefix",
    label: "LIKE 'x%'",
    whereSql: "org_id = ? AND subject LIKE 'refund%'",
    access: "ref",
    tone: "ok",
    title: "Prefix LIKE can be a range",
    reason:
      "Constant prefix LIKE is range-eligible on that column. Here org_id drives the index; subject isn't in this composite (different index story).",
    litSegments: 1,
  },
  {
    id: "like-contains",
    label: "LIKE '%x%'",
    whereSql: "org_id = ? AND subject LIKE '%refund%'",
    access: "ref",
    tone: "warn",
    title: "Leading wildcard is not a B-tree range",
    reason:
      "LIKE '%refund%' cannot drive a range on subject. org_id may still narrow; the search part is filter-after or a different tool.",
    litSegments: 1,
  },
  {
    id: "org-status-range",
    label: "Inbox shape",
    whereSql:
      "org_id = ? AND status = 'open' AND updated_at > ?",
    access: "range",
    tone: "ok",
    title: "Classic list WHERE",
    reason:
      "Left prefix equalities then one range. This is the shape article 03's composite was built for.",
    litSegments: 3,
  },
];

export function sargPreset(id: SargPresetId): SargPreset {
  const found = SARG_PRESETS.find((p) => p.id === id);
  if (!found) return SARG_PRESETS[0];
  return found;
}

export type SargKeyScene = {
  columns: string[];
  keys: { parts: string[]; id: number }[];
  /** Contiguous lit range for seek; for scan, all rows in open+org are "candidates" that must be visited. */
  litStart: number;
  litEnd: number;
  /** Pointer path indexes through keys (seek jumps to start then walks lit; scan walks every open+org row). */
  pointerPath: number[];
  pointerMode: "seek" | "scan";
};

/**
 * Toy leaf for sargability: org=42, status runs, dates.
 * Seek presets jump to the open/2026 range; YEAR() forces a scan of every open row.
 */
export function buildSargKeyScene(id: SargPresetId): SargKeyScene {
  const columns = ["org_id", "status", "updated_at"];
  const keys: SargKeyScene["keys"] = [];
  let n = 1;
  // Sorted as (org, status, updated_at): closed…, open 2025…, open 2026…, pending…
  for (const status of ["closed", "open", "pending"] as const) {
    const years =
      status === "open" ? ([2025, 2026] as const) : ([2026] as const);
    for (const year of years) {
      const perYear = status === "open" ? 3 : 4;
      for (let d = 0; d < perYear; d++) {
        const day = String(10 + d).padStart(2, "0");
        keys.push({
          parts: ["42", status, `${year}-03-${day}`],
          id: n++,
        });
      }
    }
  }

  const openIndexes = keys
    .map((k, i) => (k.parts[1] === "open" ? i : -1))
    .filter((i) => i >= 0);
  const open2026 = openIndexes.filter((i) =>
    keys[i].parts[2].startsWith("2026"),
  );

  if (id === "year-fn") {
    // Function on column: must visit every open leaf entry, filter YEAR after.
    return {
      columns,
      keys,
      litStart: openIndexes[0] ?? 0,
      litEnd: (openIndexes[openIndexes.length - 1] ?? 0) + 1,
      pointerPath: openIndexes,
      pointerMode: "scan",
    };
  }

  if (id === "sargable-year" || id === "org-status-range") {
    // Bare column range: seek straight to the 2026 open run.
    return {
      columns,
      keys,
      litStart: open2026[0] ?? 0,
      litEnd: (open2026[open2026.length - 1] ?? 0) + 1,
      pointerPath: open2026,
      pointerMode: "seek",
    };
  }

  // LIKE presets: org_id prefix only — land at the start of the org block.
  return {
    columns,
    keys,
    litStart: 0,
    litEnd: keys.length,
    pointerPath: [0],
    pointerMode: "seek",
  };
}

/** Toy column widths for projection demo (bytes per row, illustrative). */
export type ProjectCol = {
  id: string;
  name: string;
  bytes: number;
  listDefault: boolean;
  fat?: boolean;
};

export const TICKET_PROJECT_COLS: ProjectCol[] = [
  { id: "id", name: "id", bytes: 8, listDefault: true },
  { id: "org_id", name: "org_id", bytes: 8, listDefault: false },
  { id: "status", name: "status", bytes: 1, listDefault: true },
  { id: "assignee_id", name: "assignee_id", bytes: 8, listDefault: true },
  { id: "subject", name: "subject", bytes: 80, listDefault: true },
  { id: "body", name: "body", bytes: 2400, listDefault: false, fat: true },
  { id: "updated_at", name: "updated_at", bytes: 8, listDefault: true },
  { id: "created_at", name: "created_at", bytes: 8, listDefault: false },
  {
    id: "public_id",
    name: "public_id",
    bytes: 26,
    listDefault: true,
  },
];

/** The SELECT list each projection mode ships to the server. */
export function projectionSelectSql(mode: "star" | "list"): string {
  if (mode === "star") return "SELECT *";
  const cols = TICKET_PROJECT_COLS.filter((c) => c.listDefault).map(
    (c) => c.name,
  );
  return `SELECT ${cols.join(", ")}`;
}

export type ProjectionEstimate = {
  mode: "star" | "list";
  bytesPerRow: number;
  columnCount: number;
  includesFat: boolean;
  tone: "ok" | "warn" | "bad";
  title: string;
  detail: string;
};

export function estimateProjection(mode: "star" | "list"): ProjectionEstimate {
  const cols =
    mode === "star"
      ? TICKET_PROJECT_COLS
      : TICKET_PROJECT_COLS.filter((c) => c.listDefault);
  const bytesPerRow = cols.reduce((sum, c) => sum + c.bytes, 0);
  const includesFat = cols.some((c) => c.fat);

  if (mode === "star") {
    return {
      mode,
      bytesPerRow,
      columnCount: cols.length,
      includesFat: true,
      tone: "bad",
      title: "SELECT * hauls the body",
      detail: `~${bytesPerRow.toLocaleString()} B/row including TEXT body. List cards rarely need it; you still bounce to the clustered leaf for every hit.`,
    };
  }

  return {
    mode,
    bytesPerRow,
    columnCount: cols.length,
    includesFat: false,
    tone: includesFat ? "warn" : "ok",
    title: "Card-shaped projection",
    detail: `~${bytesPerRow.toLocaleString()} B/row for the inbox table UI. Same WHERE; less junk over the wire and out of the buffer pool.`,
  };
}
