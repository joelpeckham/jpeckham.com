/**
 * Teaching models for secondary-index demos.
 * Rules are illustrative leftmost-prefix heuristics, not the real optimizer.
 */

export const TICKET_COLS = [
  "org_id",
  "status",
  "assignee_id",
  "updated_at",
  "subject",
] as const;

export type TicketCol = (typeof TICKET_COLS)[number];

export type PredOp =
  | "eq"
  | "gt"
  | "in"
  | "like_prefix"
  | "like_contains";

export type PredicateMap = Partial<Record<TicketCol, PredOp>>;

export type PrefixStatus = "uses" | "partial" | "none";

export type PrefixVerdict = {
  status: PrefixStatus;
  /** Index columns that participate in the range walk (left prefix). */
  usableCols: TicketCol[];
  /** Index column indexes (0-based) that light up as usable. */
  usableIndexes: number[];
  /** Predicates that exist but do not extend the index range. */
  frozenPredCols: TicketCol[];
  tone: "ok" | "warn" | "bad";
  title: string;
  reason: string;
};

const EQUALITY_OPS: PredOp[] = ["eq", "in", "like_prefix"];

function isEqualityLike(op: PredOp): boolean {
  return EQUALITY_OPS.includes(op);
}

function isRangeOp(op: PredOp): boolean {
  return op === "gt";
}

/**
 * Walk a composite index left-to-right. Equalities/`IN`/prefix-LIKE keep the
 * walk going; one range consumes the next column and freezes the suffix;
 * a leading-wildcard LIKE or a gap stops the walk.
 */
export function evaluateLeftPrefix(
  indexCols: readonly TicketCol[],
  predicates: PredicateMap,
): PrefixVerdict {
  const usableCols: TicketCol[] = [];
  const usableIndexes: number[] = [];
  let frozen = false;
  let stoppedAtGap = false;

  for (let i = 0; i < indexCols.length; i++) {
    const col = indexCols[i];
    const op = predicates[col];

    if (!op) {
      stoppedAtGap = true;
      break;
    }

    if (op === "like_contains") {
      if (usableCols.length === 0) {
        return {
          status: "none",
          usableCols: [],
          usableIndexes: [],
          frozenPredCols: Object.keys(predicates) as TicketCol[],
          tone: "bad",
          title: "Cannot use this index",
          reason: `LIKE '%…%' on ${col} is not a B-tree range. Leading wildcard, no left prefix.`,
        };
      }
      frozen = true;
      break;
    }

    if (isEqualityLike(op)) {
      usableCols.push(col);
      usableIndexes.push(i);
      continue;
    }

    if (isRangeOp(op)) {
      usableCols.push(col);
      usableIndexes.push(i);
      frozen = true;
      break;
    }
  }

  const activePredCols = TICKET_COLS.filter((c) => predicates[c] != null);
  const usableSet = new Set(usableCols);
  const frozenPredCols = activePredCols.filter((c) => !usableSet.has(c));

  if (usableCols.length === 0) {
    const first = indexCols[0];
    const firstOp = first ? predicates[first] : undefined;
    return {
      status: "none",
      usableCols: [],
      usableIndexes: [],
      frozenPredCols: activePredCols,
      tone: "bad",
      title: "Cannot use this index",
      reason: firstOp
        ? `Leading column ${first} has a non-range shape.`
        : `Missing leading column ${first ?? "?"}. A left prefix needs the front of the key.`,
    };
  }

  if (frozenPredCols.length === 0 && !stoppedAtGap) {
    return {
      status: "uses",
      usableCols,
      usableIndexes,
      frozenPredCols: [],
      tone: "ok",
      title: "Uses the index",
      reason: `Left prefix ${usableCols.join(", ")} matches your predicates.`,
    };
  }

  if (frozen && frozenPredCols.length > 0) {
    return {
      status: "partial",
      usableCols,
      usableIndexes,
      frozenPredCols,
      tone: "warn",
      title: "Partial prefix: range froze the rest",
      reason: `Used ${usableCols.join(", ")}. After a range, ${frozenPredCols.join(", ")} cannot narrow the index walk (filter later / ICP territory).`,
    };
  }

  if (stoppedAtGap && frozenPredCols.length > 0) {
    return {
      status: "partial",
      usableCols,
      usableIndexes,
      frozenPredCols,
      tone: "warn",
      title: "Partial prefix: gap in the key",
      reason: `Used ${usableCols.join(", ")}. Skipping a middle column stops the walk; ${frozenPredCols.join(", ")} sits past the gap.`,
    };
  }

  return {
    status: "uses",
    usableCols,
    usableIndexes,
    frozenPredCols,
    tone: "ok",
    title: "Uses a left prefix",
    reason: `Index walk uses ${usableCols.join(", ")}. Trailing index columns without predicates are fine.`,
  };
}

export type PrefixPreset = {
  id: string;
  label: string;
  indexCols: TicketCol[];
  predicates: PredicateMap;
};

export const PREFIX_PRESETS: PrefixPreset[] = [
  {
    id: "inbox-open",
    label: "Inbox open",
    indexCols: ["org_id", "status", "assignee_id", "updated_at"],
    predicates: { org_id: "eq", status: "eq" },
  },
  {
    id: "inbox-assignee",
    label: "Open + assignee",
    indexCols: ["org_id", "status", "assignee_id", "updated_at"],
    predicates: { org_id: "eq", status: "eq", assignee_id: "eq" },
  },
  {
    id: "missing-org",
    label: "Missing org_id",
    indexCols: ["org_id", "status", "assignee_id", "updated_at"],
    predicates: { status: "eq", assignee_id: "eq" },
  },
  {
    id: "range-freeze",
    label: "Range freezes status",
    indexCols: ["org_id", "updated_at", "status"],
    predicates: { org_id: "eq", updated_at: "gt", status: "eq" },
  },
  {
    id: "leading-wildcard",
    label: "Leading %LIKE%",
    indexCols: ["org_id", "status", "subject"],
    predicates: { org_id: "eq", subject: "like_contains" },
  },
];

export const DEFAULT_INDEX_COLS: TicketCol[] = [
  "org_id",
  "status",
  "assignee_id",
  "updated_at",
];

const OP_SQL: Record<PredOp, (col: TicketCol) => string> = {
  eq: (col) => `${col} = ?`,
  gt: (col) => `${col} > ?`,
  in: (col) => `${col} IN (?, ?, ?)`,
  like_prefix: (col) => `${col} LIKE 'refund%'`,
  like_contains: (col) => `${col} LIKE '%refund%'`,
};

/**
 * Render the current predicate map as WHERE-clause lines, index columns
 * first (in key order), then any predicates on columns outside the key.
 */
export function predicateSqlLines(
  indexCols: readonly TicketCol[],
  predicates: PredicateMap,
): string[] {
  const inKey = indexCols.filter((c) => predicates[c] != null);
  const outsideKey = TICKET_COLS.filter(
    (c) => predicates[c] != null && !indexCols.includes(c),
  );
  return [...inKey, ...outsideKey].map((col) => {
    const op = predicates[col];
    if (!op) throw new Error(`Missing predicate for ${col}`);
    return OP_SQL[op](col);
  });
}

export function moveCol(
  cols: readonly TicketCol[],
  index: number,
  direction: -1 | 1,
): TicketCol[] {
  const next = [...cols];
  const target = index + direction;
  if (target < 0 || target >= next.length) return next;
  const tmp = next[index];
  next[index] = next[target];
  next[target] = tmp;
  return next;
}

/** Toy selectivity — not histograms, not the cost-based optimizer. */
export type SelectivityEstimate = {
  tableRows: number;
  scopedRows: number;
  statusAloneRows: number;
  assigneeAloneRows: number;
  orgThenStatusRows: number;
  orgStatusAssigneeRows: number;
  statusTone: "ok" | "warn" | "bad";
  scopedTone: "ok" | "warn" | "bad";
};

export function estimateSelectivity(options: {
  tableRows?: number;
  orgCount: number;
  statusDistinct: number;
  assigneeDistinct: number;
  orgScoped: boolean;
}): SelectivityEstimate {
  const tableRows = options.tableRows ?? 5_000_000;
  const orgs = Math.max(1, options.orgCount);
  const statuses = Math.max(2, options.statusDistinct);
  const assignees = Math.max(2, options.assigneeDistinct);

  const scopedRows = options.orgScoped
    ? Math.max(1, Math.round(tableRows / orgs))
    : tableRows;

  const statusAloneRows = Math.max(1, Math.round(tableRows / statuses));
  const assigneeAloneRows = Math.max(1, Math.round(tableRows / assignees));
  const orgThenStatusRows = Math.max(1, Math.round(scopedRows / statuses));
  const orgStatusAssigneeRows = Math.max(
    1,
    Math.round(orgThenStatusRows / assignees),
  );

  const statusTone: SelectivityEstimate["statusTone"] =
    statusAloneRows > tableRows * 0.2
      ? "bad"
      : statusAloneRows > tableRows * 0.05
        ? "warn"
        : "ok";

  const scopedTone: SelectivityEstimate["scopedTone"] =
    orgThenStatusRows > scopedRows * 0.5
      ? "warn"
      : "ok";

  return {
    tableRows,
    scopedRows,
    statusAloneRows,
    assigneeAloneRows,
    orgThenStatusRows,
    orgStatusAssigneeRows,
    statusTone,
    scopedTone,
  };
}

export type IndexStrategy = "singles" | "composite";

export type StrategyStory = {
  strategy: IndexStrategy;
  tone: "ok" | "warn" | "bad";
  title: string;
  detail: string;
  pathLabel: string;
  writeTax: string;
  /** Clustered + secondary index writes per INSERT (toy). */
  insertWriteCount: number;
};

export function strategyStory(strategy: IndexStrategy): StrategyStory {
  if (strategy === "singles") {
    return {
      strategy,
      tone: "warn",
      title: "Three skinny indexes, one messy plan",
      detail:
        "MySQL may Index Merge (intersect) org_id ∩ status ∩ assignee_id, then sort. Sometimes fine. Often worse than one matching composite.",
      pathLabel: "Index Merge hope → sort → bounce",
      writeTax: "Every ticket update maintains 3 B-trees",
      insertWriteCount: 4, // clustered + 3 secondaries
    };
  }

  return {
    strategy,
    tone: "ok",
    title: "One composite, one range walk",
    detail:
      "Left prefix (org_id, status, assignee_id, updated_at) matches the inbox query. One descent, rows already near the ORDER BY order.",
    pathLabel: "Single range scan → bounce",
    writeTax: "One extra B-tree on write",
    insertWriteCount: 2, // clustered + 1 composite
  };
}

export type SortedKeyScene = {
  /** Column headers for the strip. */
  columns: string[];
  /** Toy key tuples already sorted. */
  keys: { parts: string[]; id: number }[];
  /** Contiguous walk vs interleaved freeze picture. */
  mode: "contiguous" | "interleaved" | "none";
  /** For contiguous: inclusive start / exclusive end into keys. */
  walkStart: number;
  walkEnd: number;
  /** For interleaved: which rows match the frozen predicate. */
  matches: boolean[];
};

/**
 * Build a phone-book leaf scene for the left-prefix demo.
 * Range-freeze (status after a date range) uses interleaved status runs.
 */
export function buildLeftPrefixKeyScene(
  indexCols: readonly TicketCol[],
  predicates: PredicateMap,
  verdict: PrefixVerdict,
): SortedKeyScene {
  const columns = indexCols.slice(0, 3).map(String);
  const frozen =
    verdict.status === "partial" &&
    verdict.frozenPredCols.includes("status") &&
    predicates.updated_at === "gt";

  if (verdict.status === "none") {
    const keys = Array.from({ length: 16 }, (_, i) => ({
      parts: indexCols.slice(0, 3).map((c, ci) => {
        if (c === "org_id") return "42";
        if (c === "status") return ["open", "closed", "pending"][i % 3];
        if (c === "updated_at") return `03-${String(10 + i).padStart(2, "0")}`;
        if (c === "assignee_id") return String(100 + (i % 5));
        if (c === "subject") return i % 2 === 0 ? "refund…" : "hello…";
        return String(i);
      }),
      id: i + 1,
    }));
    return {
      columns,
      keys,
      mode: "none",
      walkStart: 0,
      walkEnd: 0,
      matches: keys.map(() => false),
    };
  }

  if (frozen) {
    // Interleaved: org · date · status — dates sorted, status mixed under each date.
    const statuses = ["open", "closed", "pending"] as const;
    const keys: SortedKeyScene["keys"] = [];
    for (let day = 10; day < 16; day++) {
      for (const status of statuses) {
        keys.push({
          parts: ["42", `03-${day}`, status],
          id: keys.length + 1,
        });
      }
    }
    const matches = keys.map((k) => k.parts[2] === "open");
    return {
      columns: ["org_id", "updated_at", "status"],
      keys,
      mode: "interleaved",
      walkStart: 0,
      walkEnd: keys.length,
      matches,
    };
  }

  // Contiguous runs: equality prefix groups (org, status, …).
  const statuses = ["open", "closed", "pending"] as const;
  const keys: SortedKeyScene["keys"] = [];
  let id = 1;
  for (const status of statuses) {
    for (let d = 0; d < 5; d++) {
      const parts = indexCols.slice(0, 3).map((c) => {
        if (c === "org_id") return "42";
        if (c === "status") return status;
        if (c === "updated_at") return `03-${String(10 + d).padStart(2, "0")}`;
        if (c === "assignee_id") return String(100 + d);
        if (c === "subject") return status === "open" ? "refund…" : "hello…";
        return "?";
      });
      keys.push({ parts, id: id++ });
    }
  }

  // Light the open + org=42 run (first 5 rows when status is second/third).
  const openIndexes = keys
    .map((k, i) => (k.parts.includes("open") ? i : -1))
    .filter((i) => i >= 0);
  const walkStart = openIndexes[0] ?? 0;
  const walkEnd = (openIndexes[openIndexes.length - 1] ?? 0) + 1;

  return {
    columns,
    keys,
    mode: "contiguous",
    walkStart,
    walkEnd: verdict.usableCols.length > 0 ? walkEnd : 0,
    matches: keys.map((_, i) => i >= walkStart && i < walkEnd),
  };
}
