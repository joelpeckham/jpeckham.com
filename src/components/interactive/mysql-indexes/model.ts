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
        : `Missing leading column ${first ?? "?"} — left-prefix needs the front of the key.`,
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
      title: "Partial prefix — range froze the rest",
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
      title: "Partial prefix — gap in the key",
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
  };
}
