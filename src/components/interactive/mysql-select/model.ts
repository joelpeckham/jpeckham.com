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

export type PrefixPredKey = "org_id" | "status" | "updated_at" | "assignee_id";

export type PrefixPredState = Partial<
  Record<PrefixPredKey, "eq" | "gt" | "off">
>;

export type PrefixHighlight = {
  litCount: number;
  access: AccessKind;
  tone: "ok" | "warn" | "bad";
  title: string;
  reason: string;
  keyLenHint: string;
};

/**
 * Fixed index (org_id, status, updated_at). assignee_id is a predicate that
 * never extends this index's range (gap / not in key).
 */
export function evaluatePrefixHighlight(
  preds: PrefixPredState,
): PrefixHighlight {
  const org = preds.org_id ?? "off";
  const status = preds.status ?? "off";
  const updated = preds.updated_at ?? "off";
  const assignee = preds.assignee_id ?? "off";

  if (org === "off") {
    return {
      litCount: 0,
      access: "ALL",
      tone: "bad",
      title: "No left prefix",
      reason:
        "This index starts with org_id. Without it, the optimizer looks elsewhere or scans.",
      keyLenHint: "key_len ≈ 0 on this index",
    };
  }

  if (org === "gt") {
    return {
      litCount: 1,
      access: "range",
      tone: "warn",
      title: "Range on org_id freezes the rest",
      reason:
        "A range on the leading column stops the walk. status / updated_at won't extend the interval.",
      keyLenHint: "key_len covers org_id only",
    };
  }

  // org = eq
  let lit = 1;
  let access: AccessKind = "ref";
  let frozen = false;

  if (status === "eq") {
    lit = 2;
  } else if (status === "gt") {
    lit = 2;
    access = "range";
    frozen = true;
  } else if (status === "off" && updated !== "off") {
    return {
      litCount: 1,
      access: updated === "gt" ? "range" : "ref",
      tone: "warn",
      title: "Gap at status",
      reason:
        "Skipping status means only the org_id prefix participates. updated_at can't extend past the gap.",
      keyLenHint: "key_len covers org_id",
    };
  }

  if (!frozen && status === "eq") {
    if (updated === "eq") {
      lit = 3;
      access = "ref";
    } else if (updated === "gt") {
      lit = 3;
      access = "range";
    }
  }

  const assigneeNote =
    assignee !== "off"
      ? " assignee_id is not in this index; filter after or use a different key."
      : "";

  if (lit === 3) {
    return {
      litCount: 3,
      access,
      tone: "ok",
      title: access === "range" ? "Full prefix + range" : "Full equality prefix",
      reason: `org_id → status → updated_at all participate.${assigneeNote}`,
      keyLenHint: "key_len covers all three parts",
    };
  }

  if (lit === 2) {
    return {
      litCount: 2,
      access,
      tone: frozen ? "warn" : "ok",
      title: frozen
        ? "status range froze updated_at"
        : "Prefix through status",
      reason: frozen
        ? `Used org_id + status as a range; updated_at can't tighten the walk.${assigneeNote}`
        : `Equalities on org_id and status.${assigneeNote}`,
      keyLenHint: "key_len covers org_id + status",
    };
  }

  return {
    litCount: 1,
    access: "ref",
    tone: "ok",
    title: "org_id prefix only",
    reason: `Only the leading equality is in play.${assigneeNote}`,
    keyLenHint: "key_len covers org_id",
  };
}

export const PREFIX_DEFAULT_PREDS: PrefixPredState = {
  org_id: "eq",
  status: "eq",
  updated_at: "gt",
  assignee_id: "off",
};
