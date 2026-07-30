/**
 * Teaching models for the clustered-index demos.
 * Numbers are illustrative, not a simulation of InnoDB page algorithms.
 */

export type PkShape = "bigint" | "uuid-v7" | "uuid-v4-char36" | "composite-tenant";

export type InsertShape = "bigint-ai" | "uuid-v4" | "uuid-v7";

/** Approximate clustered key width copied into secondary index entries. */
export function pkWidthBytes(shape: PkShape): number {
  switch (shape) {
    case "bigint":
      return 8;
    case "uuid-v7":
      return 16;
    case "uuid-v4-char36":
      return 36;
    case "composite-tenant":
      return 16;
  }
}

export function pkShapeLabel(shape: PkShape): string {
  switch (shape) {
    case "bigint":
      return "BIGINT";
    case "uuid-v7":
      return "UUIDv7 BINARY(16)";
    case "uuid-v4-char36":
      return "UUIDv4 CHAR(36)";
    case "composite-tenant":
      return "(tenant_id, id)";
  }
}

/** Secondary index luggage: indexed cols + PK cols (toy overhead ignored). */
export function secondaryLuggageBytes(options: {
  pkShape: PkShape;
  secondaryCount: number;
  indexedColBytesPerSecondary?: number;
}): {
  pkBytes: number;
  perSecondaryBytes: number;
  totalLuggageBytes: number;
} {
  const pkBytes = pkWidthBytes(options.pkShape);
  const indexed = options.indexedColBytesPerSecondary ?? 8;
  const perSecondaryBytes = indexed + pkBytes;
  return {
    pkBytes,
    perSecondaryBytes,
    totalLuggageBytes: perSecondaryBytes * options.secondaryCount,
  };
}

export type InsertLocalityResult = {
  shape: InsertShape;
  sequentiality: number;
  leafFillRatio: number;
  tone: "ok" | "warn" | "bad";
  title: string;
  detail: string;
  /** Fill fraction per toy leaf page (0–1), length = pageCount. */
  pageFills: number[];
};

const DEMO_INSERT_ROWS = 24;
const DEMO_PAGE_COUNT = 6;
const DEMO_SLOTS_PER_PAGE = 6;

/**
 * Pseudo-random page index for insert visualization.
 * Sequential shapes bias toward the end; random spreads across pages.
 */
export function insertPageIndex(
  shape: InsertShape,
  insertOrdinal: number,
  pageCount: number,
): number {
  if (pageCount <= 0) return 0;
  if (shape === "bigint-ai") {
    return Math.min(pageCount - 1, Math.floor(insertOrdinal / 4));
  }
  if (shape === "uuid-v7") {
    const base = Math.floor(insertOrdinal / 4);
    const wiggle = insertOrdinal % 7 === 0 ? -1 : 0;
    return Math.min(pageCount - 1, Math.max(0, base + wiggle));
  }
  const scramble = (insertOrdinal * 2654435761) >>> 0;
  return scramble % pageCount;
}

function pageFillsForShape(shape: InsertShape): number[] {
  const counts = Array.from({ length: DEMO_PAGE_COUNT }, () => 0);
  for (let i = 0; i < DEMO_INSERT_ROWS; i++) {
    counts[insertPageIndex(shape, i, DEMO_PAGE_COUNT)] += 1;
  }
  return counts.map((c) => Math.min(1, c / DEMO_SLOTS_PER_PAGE));
}

/** Illustrative insert locality for the slim demo (fixed toy row count). */
export function insertLocality(shape: InsertShape): InsertLocalityResult {
  const pageFills = pageFillsForShape(shape);

  if (shape === "bigint-ai") {
    return {
      shape,
      sequentiality: 1,
      leafFillRatio: 15 / 16,
      tone: "ok",
      title: "Append to the right edge",
      detail:
        "Monotonic keys pack leaves densely. Inserts land next to the previous row.",
      pageFills,
    };
  }

  if (shape === "uuid-v7") {
    return {
      shape,
      sequentiality: 0.85,
      leafFillRatio: 0.8,
      tone: "ok",
      title: "Mostly sequential (time-ordered)",
      detail:
        "UUIDv7 and ULID stay near the hot end. Wider than BIGINT, but not random thrash.",
      pageFills,
    };
  }

  return {
    shape,
    sequentiality: 0.15,
    leafFillRatio: 0.55,
    tone: "bad",
    title: "Random leaf inserts",
    detail:
      "UUIDv4 scatters writes across the B-tree. Pages split earlier and stay emptier.",
    pageFills,
  };
}

export type ToyRow = {
  id: number;
  email: string;
  status: string;
};

export function makeToyRows(count: number, seed = 1): ToyRow[] {
  const rows: ToyRow[] = [];
  for (let i = 0; i < count; i++) {
    const id = i + 1;
    void seed;
    rows.push({
      id,
      email: `user${id}@example.com`,
      status: id % 3 === 0 ? "closed" : id % 2 === 0 ? "open" : "pending",
    });
  }
  return rows;
}

export type BtreeLevel = "root" | "branch" | "leaf";

export type BtreeNode = {
  id: string;
  level: BtreeLevel;
  separators: number[];
  keys: number[];
  children: string[];
};

export const TOY_BTREE_ROOT = "root";

/** Keys offered in the slim B-tree picker. */
export const TOY_BTREE_PICK_KEYS = [2, 5, 8, 11] as const;

/** 3-level toy: root → 2 branches → 4 leaves, keys 1–12. */
export function toyBtree(): Record<string, BtreeNode> {
  return {
    root: {
      id: "root",
      level: "root",
      separators: [6],
      keys: [],
      children: ["b-left", "b-right"],
    },
    "b-left": {
      id: "b-left",
      level: "branch",
      separators: [3],
      keys: [],
      children: ["leaf-a", "leaf-b"],
    },
    "b-right": {
      id: "b-right",
      level: "branch",
      separators: [9],
      keys: [],
      children: ["leaf-c", "leaf-d"],
    },
    "leaf-a": {
      id: "leaf-a",
      level: "leaf",
      separators: [],
      keys: [1, 2, 3],
      children: [],
    },
    "leaf-b": {
      id: "leaf-b",
      level: "leaf",
      separators: [],
      keys: [4, 5, 6],
      children: [],
    },
    "leaf-c": {
      id: "leaf-c",
      level: "leaf",
      separators: [],
      keys: [7, 8, 9],
      children: [],
    },
    "leaf-d": {
      id: "leaf-d",
      level: "leaf",
      separators: [],
      keys: [10, 11, 12],
      children: [],
    },
  };
}

export function childIndexForKey(separators: number[], key: number): number {
  for (let i = 0; i < separators.length; i++) {
    if (key <= separators[i]) return i;
  }
  return separators.length;
}

export function btreeDescentPath(
  tree: Record<string, BtreeNode>,
  key: number,
  rootId: string = TOY_BTREE_ROOT,
): string[] {
  const path: string[] = [];
  let currentId: string | undefined = rootId;

  while (currentId !== undefined) {
    const node: BtreeNode | undefined = tree[currentId];
    if (!node) return [];
    path.push(node.id);

    if (node.level === "leaf") {
      return node.keys.includes(key) ? path : [];
    }

    const idx = childIndexForKey(node.separators, key);
    currentId = node.children[idx];
  }

  return [];
}

export type DescentStep = {
  nodeId: string;
  /** Comparison shown at this hop (empty on leaf). */
  comparison: string;
  /** Direction taken after the comparison. */
  direction: "left" | "right" | "leaf";
};

/** Step-by-step descent with human-readable comparisons for the player. */
export function btreeDescentSteps(
  tree: Record<string, BtreeNode>,
  key: number,
  rootId: string = TOY_BTREE_ROOT,
): DescentStep[] {
  const path = btreeDescentPath(tree, key, rootId);
  const steps: DescentStep[] = [];

  for (let i = 0; i < path.length; i++) {
    const node = tree[path[i]];
    if (!node) continue;

    if (node.level === "leaf") {
      steps.push({
        nodeId: node.id,
        comparison: `leaf holds key ${key} and the full row`,
        direction: "leaf",
      });
      continue;
    }

    const sep = node.separators[0];
    const goLeft = key <= sep;
    steps.push({
      nodeId: node.id,
      comparison: goLeft
        ? `${key} ≤ ${sep} → go left`
        : `${key} > ${sep} → go right`,
      direction: goLeft ? "left" : "right",
    });
  }

  return steps;
}

/** Toy clustered row payload revealed at the leaf. */
export function toyClusteredRow(key: number): {
  id: number;
  email: string;
  status: string;
} {
  return {
    id: key,
    email: `user${key}@example.com`,
    status: key % 3 === 0 ? "closed" : key % 2 === 0 ? "open" : "pending",
  };
}

/** Sequence of (pageIndex, causesSplit) for animated insert locality. */
export function insertSequence(
  shape: InsertShape,
  rowCount = DEMO_INSERT_ROWS,
  pageCount = DEMO_PAGE_COUNT,
  slotsPerPage = DEMO_SLOTS_PER_PAGE,
): { pageIndex: number; causesSplit: boolean }[] {
  const counts = Array.from({ length: pageCount }, () => 0);
  const seq: { pageIndex: number; causesSplit: boolean }[] = [];

  for (let i = 0; i < rowCount; i++) {
    const pageIndex = insertPageIndex(shape, i, pageCount);
    const before = counts[pageIndex];
    const causesSplit = before >= slotsPerPage;
    if (!causesSplit) counts[pageIndex] += 1;
    else {
      // Split: half stay, new row goes to "same" page metaphorically — still count.
      counts[pageIndex] = Math.floor(slotsPerPage / 2) + 1;
    }
    seq.push({ pageIndex, causesSplit });
  }

  return seq;
}

/** MB of secondary luggage at scale (illustrative). */
export function luggageAtScaleMb(options: {
  pkShape: PkShape;
  secondaryCount: number;
  rowCount: number;
  indexedColBytesPerSecondary?: number;
}): number {
  const { perSecondaryBytes } = secondaryLuggageBytes(options);
  const totalBytes =
    perSecondaryBytes * options.secondaryCount * options.rowCount;
  return totalBytes / (1024 * 1024);
}
