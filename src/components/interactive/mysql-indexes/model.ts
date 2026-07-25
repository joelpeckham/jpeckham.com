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

/** Know it (=), range (>), or off. LIKE/IN live in prose, not the toy. */
export type PredOp = "eq" | "gt";

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

function isEqualityLike(op: PredOp): boolean {
  return op === "eq";
}

function isRangeOp(op: PredOp): boolean {
  return op === "gt";
}

/**
 * Walk a composite index left-to-right. Equalities keep the walk going; one
 * range consumes the next column and freezes the suffix; a gap stops the walk.
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

/** Move an index column from `from` to `to` (drag-reorder). */
export function reorderCol(
  cols: readonly TicketCol[],
  from: number,
  to: number,
): TicketCol[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= cols.length ||
    to >= cols.length
  ) {
    return [...cols];
  }
  const next = [...cols];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ---------------------------------------------------------------------------
// Guess Who selectivity game
// ---------------------------------------------------------------------------

export type GuessAttr = "org" | "status" | "assignee";

export type TicketTile = {
  id: number;
  org: number;
  status: "open" | "pending" | "resolved";
  assignee: number;
};

export type GuessQuestion = {
  attr: GuessAttr;
  label: string;
  /** Short chip label. */
  short: string;
};

export const GUESS_QUESTIONS: GuessQuestion[] = [
  { attr: "org", label: "org_id = 42?", short: "org = 42" },
  { attr: "status", label: "status = open?", short: "status = open" },
  { attr: "assignee", label: "assignee_id = 7?", short: "assignee = 7" },
];

export const GUESS_TARGET = {
  org: 42,
  status: "open" as const,
  assignee: 7,
};

const ORGS = [42, 11, 17, 23, 31, 55, 67, 89] as const;
const STATUSES = ["open", "pending", "resolved"] as const;
const ASSIGNEES = [7, 3, 5, 9, 12, 15] as const;

/**
 * Deterministic 48-tile board.
 * Selectivities ≈ org 1/8, status 1/3, assignee 1/6 of the full board.
 */
export function dealGuessBoard(count = 48): TicketTile[] {
  const tiles: TicketTile[] = [];
  for (let i = 0; i < count; i++) {
    tiles.push({
      id: i + 1,
      org: ORGS[i % ORGS.length],
      status: STATUSES[i % STATUSES.length],
      assignee: ASSIGNEES[i % ASSIGNEES.length],
    });
  }
  return tiles;
}

export function tileMatchesQuestion(
  tile: TicketTile,
  attr: GuessAttr,
): boolean {
  if (attr === "org") return tile.org === GUESS_TARGET.org;
  if (attr === "status") return tile.status === GUESS_TARGET.status;
  return tile.assignee === GUESS_TARGET.assignee;
}

export function tileMatchesAll(tile: TicketTile): boolean {
  return (
    tile.org === GUESS_TARGET.org &&
    tile.status === GUESS_TARGET.status &&
    tile.assignee === GUESS_TARGET.assignee
  );
}

export type GuessStage = {
  attr: GuessAttr;
  label: string;
  /** Survivors entering this stage. */
  before: number;
  /** Survivors after this question. */
  after: number;
  /**
   * Peeks charged. Question 1 is an index jump (0). Later questions
   * walk every survivor still standing when asked.
   */
  peeks: number;
  /** True when this stage used the free index regroup. */
  indexJump: boolean;
};

export type GuessRun = {
  order: GuessAttr[];
  stages: GuessStage[];
  totalPeeks: number;
  survivors: number;
};

/**
 * Cost a question order. Same survivors every time; peeks depend on order.
 * First question is free (index regroup/sweep). Later ones cost 1 peek per
 * tile still alive when asked.
 */
export function evaluateGuessOrder(
  tiles: readonly TicketTile[],
  order: readonly GuessAttr[],
): GuessRun {
  let alive = [...tiles];
  const stages: GuessStage[] = [];
  let totalPeeks = 0;

  for (let i = 0; i < order.length; i++) {
    const attr = order[i];
    const q = GUESS_QUESTIONS.find((x) => x.attr === attr);
    const before = alive.length;
    const indexJump = i === 0;
    const peeks = indexJump ? 0 : before;
    totalPeeks += peeks;
    alive = alive.filter((t) => tileMatchesQuestion(t, attr));
    stages.push({
      attr,
      label: q?.label ?? attr,
      before,
      after: alive.length,
      peeks,
      indexJump,
    });
  }

  return {
    order: [...order],
    stages,
    totalPeeks,
    survivors: alive.length,
  };
}

export function guessOrderKey(order: readonly GuessAttr[]): string {
  return order.join(" → ");
}

export type GuessPreset = {
  id: string;
  label: string;
  order: GuessAttr[];
};

export const GUESS_PRESETS: GuessPreset[] = [
  {
    id: "status-trap",
    label: "Status first (trap)",
    order: ["status", "org", "assignee"],
  },
  {
    id: "org-first",
    label: "Org first",
    order: ["org", "status", "assignee"],
  },
];

/** Toy scale caption: each tile stands in for this many production rows. */
export const TILE_ROW_SCALE = 100_000;

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

// ---------------------------------------------------------------------------
// Nested phone book (left-prefix visual)
// ---------------------------------------------------------------------------

export type PhoneBookRow = {
  id: number;
  /** Values aligned with the current index column order. */
  parts: string[];
  /** Raw fields — used to re-nest when columns reorder. */
  org: string;
  status: string;
  assignee: string;
  updated_at: string;
  subject: string;
};

export type PhoneBookGroup = {
  /** Value for this nesting level. */
  value: string;
  /** Column this group is keyed by. */
  col: TicketCol;
  rows: PhoneBookRow[];
  children: PhoneBookGroup[];
};

export type PhoneBookHighlight =
  | { kind: "contiguous"; rowIds: number[] }
  | { kind: "scattered"; rowIds: number[]; fragmentCount: number }
  | { kind: "interleaved"; walkRowIds: number[]; matchRowIds: number[] }
  | { kind: "none" };

export type PhoneBookScene = {
  columns: TicketCol[];
  rows: PhoneBookRow[];
  groups: PhoneBookGroup[];
  highlight: PhoneBookHighlight;
  badge: string;
};

const PHONE_ORGS = ["42", "11", "17"] as const;
const PHONE_STATUSES = ["open", "closed", "pending"] as const;

function fieldForCol(row: PhoneBookRow, col: TicketCol): string {
  switch (col) {
    case "org_id":
      return row.org;
    case "status":
      return row.status;
    case "assignee_id":
      return row.assignee;
    case "updated_at":
      return row.updated_at;
    case "subject":
      return row.subject;
  }
}

/** Fixed pool of toy rows; parts are filled per index order. */
export function dealPhoneBookRows(): PhoneBookRow[] {
  const rows: PhoneBookRow[] = [];
  let id = 1;
  for (const org of PHONE_ORGS) {
    for (const status of PHONE_STATUSES) {
      for (let d = 0; d < 3; d++) {
        const day = String(10 + d).padStart(2, "0");
        rows.push({
          id: id++,
          parts: [],
          org,
          status,
          assignee: String(100 + d),
          updated_at: `03-${day}`,
          subject: status === "open" ? "refund…" : "hello…",
        });
      }
    }
  }
  return rows;
}

function withParts(
  rows: readonly PhoneBookRow[],
  indexCols: readonly TicketCol[],
): PhoneBookRow[] {
  const cols = indexCols.slice(0, 3);
  return rows.map((r) => ({
    ...r,
    parts: cols.map((c) => fieldForCol(r, c)),
  }));
}

function sortRows(
  rows: PhoneBookRow[],
  indexCols: readonly TicketCol[],
): PhoneBookRow[] {
  const cols = indexCols.slice(0, 3);
  return [...rows].sort((a, b) => {
    for (const col of cols) {
      const av = fieldForCol(a, col);
      const bv = fieldForCol(b, col);
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return a.id - b.id;
  });
}

/**
 * Nest the first two index columns as group bands; remaining columns
 * stay on the leaf rows (dates / assignees read as the phone-book lines).
 */
function nestGroups(
  rows: readonly PhoneBookRow[],
  indexCols: readonly TicketCol[],
  depth = 0,
  maxDepth = 2,
): PhoneBookGroup[] {
  const cols = indexCols.slice(0, maxDepth);
  if (depth >= cols.length || rows.length === 0) return [];
  const col = cols[depth];
  const byValue = new Map<string, PhoneBookRow[]>();
  for (const row of rows) {
    const v = fieldForCol(row, col);
    const bucket = byValue.get(v);
    if (bucket) bucket.push(row);
    else byValue.set(v, [row]);
  }
  return [...byValue.entries()].map(([value, groupRows]) => ({
    value,
    col,
    rows: groupRows,
    children: nestGroups(groupRows, indexCols, depth + 1, maxDepth),
  }));
}

function rowMatchesPredicates(
  row: PhoneBookRow,
  predicates: PredicateMap,
  cols: readonly TicketCol[],
): boolean {
  for (const col of cols) {
    const op = predicates[col];
    if (!op) continue;
    const v = fieldForCol(row, col);
    if (op === "eq") {
      if (col === "org_id" && v !== "42") return false;
      if (col === "status" && v !== "open") return false;
      if (col === "assignee_id" && v !== "100") return false;
      if (col === "updated_at" && v !== "03-10") return false;
      if (col === "subject" && !v.startsWith("refund")) return false;
    }
    if (op === "gt") {
      // Toy range: updated_at > 03-11 keeps 03-12+
      if (col === "updated_at" && v <= "03-11") return false;
    }
  }
  return true;
}

/**
 * Build a nested phone-book scene for the left-prefix demo.
 * Contiguous = usable left prefix; scattered = missing leader;
 * interleaved = range froze a later equality.
 */
export function buildPhoneBookScene(
  indexCols: readonly TicketCol[],
  predicates: PredicateMap,
  verdict: PrefixVerdict,
): PhoneBookScene {
  const raw = dealPhoneBookRows();
  const sorted = sortRows(withParts(raw, indexCols), indexCols);
  const groups = nestGroups(sorted, indexCols);
  const columns = indexCols.slice(0, 3) as TicketCol[];

  if (verdict.status === "none") {
    const matchIds = sorted
      .filter((r) => rowMatchesPredicates(r, predicates, TICKET_COLS))
      .map((r) => r.id);
    // Missing leader: matches exist but walk can't seek — count fragments
    // as one per top-level group that contains a match.
    const topCol = columns[0];
    const fragmentKeys = new Set<string>();
    if (topCol && matchIds.length > 0) {
      for (const r of sorted) {
        if (matchIds.includes(r.id)) fragmentKeys.add(fieldForCol(r, topCol));
      }
    }
    const fragmentCount = Math.max(fragmentKeys.size, matchIds.length > 0 ? 1 : 0);
    return {
      columns,
      rows: sorted,
      groups,
      highlight:
        matchIds.length === 0
          ? { kind: "none" }
          : {
              kind: "scattered",
              rowIds: matchIds,
              fragmentCount,
            },
      badge:
        matchIds.length === 0
          ? "No usable walk"
          : `${fragmentCount} fragments — read the whole book`,
    };
  }

  const rangeFroze =
    verdict.status === "partial" &&
    verdict.frozenPredCols.length > 0 &&
    verdict.usableCols.some((c) => predicates[c] === "gt");

  if (rangeFroze) {
    // Walk covers the equality+range prefix; frozen equality matches interleave.
    const walkPreds: PredicateMap = {};
    for (const c of verdict.usableCols) {
      const op = predicates[c];
      if (op) walkPreds[c] = op;
    }
    const walkRows = sorted.filter((r) =>
      rowMatchesPredicates(r, walkPreds, verdict.usableCols),
    );
    const matchRows = sorted.filter((r) =>
      rowMatchesPredicates(r, predicates, TICKET_COLS),
    );
    return {
      columns,
      rows: sorted,
      groups,
      highlight: {
        kind: "interleaved",
        walkRowIds: walkRows.map((r) => r.id),
        matchRowIds: matchRows.map((r) => r.id),
      },
      badge: "Can't narrow further — values interleaved",
    };
  }

  // Contiguous walk on usable equality prefix.
  const walkPreds: PredicateMap = {};
  for (const c of verdict.usableCols) {
    if (predicates[c] === "eq") walkPreds[c] = "eq";
  }
  const walkRows = sorted.filter((r) =>
    rowMatchesPredicates(r, walkPreds, verdict.usableCols),
  );
  // Contiguous check: all matching row indexes form one run in sorted order.
  const walkIds = new Set(walkRows.map((r) => r.id));
  const indexes = sorted
    .map((r, i) => (walkIds.has(r.id) ? i : -1))
    .filter((i) => i >= 0);
  const contiguous =
    indexes.length > 0 &&
    indexes[indexes.length - 1] - indexes[0] + 1 === indexes.length;

  if (!contiguous && walkRows.length > 0) {
    // Gap in usable prefix produced non-contiguous — treat as scattered.
    const topCol = columns[0];
    const fragmentKeys = new Set(
      walkRows.map((r) => (topCol ? fieldForCol(r, topCol) : String(r.id))),
    );
    return {
      columns,
      rows: sorted,
      groups,
      highlight: {
        kind: "scattered",
        rowIds: walkRows.map((r) => r.id),
        fragmentCount: fragmentKeys.size,
      },
      badge: `${fragmentKeys.size} fragments — read the whole book`,
    };
  }

  return {
    columns,
    rows: sorted,
    groups,
    highlight: {
      kind: "contiguous",
      rowIds: walkRows.map((r) => r.id),
    },
    badge:
      walkRows.length === 0
        ? "No usable walk"
        : "1 jump — contiguous left-prefix walk",
  };
}
