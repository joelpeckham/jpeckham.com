export type CoverBg = "red" | "blue" | "yellow" | "ink" | "paper";
export type CoverIcon =
  | "qr"
  | "calendar"
  | "network"
  | "puzzle"
  | "stack"
  | "newspaper"
  | "drive";
export type CoverVariant = "split" | "stamp" | "band";

export type CornerMarkColor = "a1" | "a2" | "fg";

export type CornerMark = {
  color?: CornerMarkColor;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type CoverArtSpec = {
  bg: CoverBg;
  headline: string[];
  icon: CoverIcon;
  variant: CoverVariant;
  label?: string;
  /** Optional overrides for the split layout's corner square and circle. */
  corners?: {
    square?: CornerMark;
    circle?: CornerMark;
  };
};

export type ContentItem = {
  slug: string;
  href: string;
  title: string;
  description: string;
  date: string;
  kind: "project" | "post";
  interactive?: boolean;
  art: CoverArtSpec;
  tags?: string[];
  /** When set, this item belongs to a series (usually a topic post). */
  seriesId?: string;
};

export type Series = {
  id: string;
  title: string;
  description: string;
  /** Project slug for the series homepage. */
  hubSlug: string;
  /** Ordered topic post slugs. */
  postSlugs: string[];
};

export const projects: ContentItem[] = [
  {
    slug: "uwyo-schedule",
    href: "/projects/uwyo-schedule/",
    title: "uwyoschedule",
    description:
      "A conflict-free class schedule planner for University of Wyoming students, built on a live copy of the UW course catalog.",
    date: "2026-06-01",
    kind: "project",
    tags: ["Next.js", "Full Stack", "Product"],
    art: {
      bg: "yellow",
      headline: ["CLASS", "PLANNER"],
      icon: "calendar",
      variant: "band",
    },
  },
  {
    slug: "neural-net-visualizer",
    href: "/projects/neural-net-visualizer/",
    title: "Neural Network Visualizer",
    description:
      "An interactive tool to visualize the training of a neural network in real time.",
    date: "2023-03-05",
    kind: "project",
    interactive: true,
    tags: ["Machine Learning", "Interactive", "Visualization"],
    art: {
      bg: "blue",
      headline: ["NEURAL", "NET"],
      icon: "network",
      variant: "split",
    },
  },
  {
    slug: "8-puzzle-solver",
    href: "/projects/8-puzzle-solver/",
    title: "8 Puzzle Solver",
    description:
      "A sliding-puzzle solver with your choice of heuristic and search algorithm, ported from Python to the browser.",
    date: "2023-02-20",
    kind: "project",
    interactive: true,
    tags: ["Algorithms", "Interactive", "Search"],
    art: {
      bg: "paper",
      headline: ["8", "PUZZLE"],
      icon: "puzzle",
      variant: "stamp",
    },
  },
  {
    slug: "forth-compiler-in-python",
    href: "/projects/forth-compiler-in-python/",
    title: "FORTH interpreter in 130* lines of Python",
    description:
      "Building a compiler and interpreter for the stack-based FORTH language in a surprisingly small amount of Python.",
    date: "2023-02-01",
    kind: "project",
    tags: ["Compilers", "Python"],
    art: {
      bg: "ink",
      headline: ["FORTH"],
      icon: "stack",
      variant: "split",
      corners: {
        square: { color: "a2", bottom: 40, left: 40 },
        circle: { color: "a1", top: 48, left: 128 },
      },
    },
  },
  {
    slug: "raid-visualizer",
    href: "/projects/raid-visualizer/",
    title: "RAID Visualizer",
    description:
      "An interactive teaching tool for visualizing how RAID arrays stripe, mirror, and rebuild data across drives.",
    date: "2022-10-12",
    kind: "project",
    interactive: true,
    tags: ["Systems", "Interactive", "Visualization"],
    art: {
      bg: "red",
      headline: ["RAID", "VIZ"],
      icon: "drive",
      variant: "split",
    },
  },
  {
    slug: "gpt-powered-stock-trading-research",
    href: "/projects/gpt-powered-stock-trading-research/",
    title: "GPT-Powered Stock Trading Research",
    description:
      "Can a large transformer model act as an all-in-one, news-based trading bot? A senior research project.",
    date: "2023-01-05",
    kind: "project",
    tags: ["Machine Learning", "Research", "NLP"],
    art: {
      bg: "paper",
      headline: ["GPT", "TRADES"],
      icon: "newspaper",
      variant: "band",
    },
  },
  {
    slug: "no-bullshit-qr",
    href: "/projects/no-bullshit-qr/",
    title: "No Bullshit QR Codes",
    description:
      "Paywalled QR generators broke a friend's printed posters, so I built a free one that never holds your links hostage — with real SVG and PNG export.",
    date: "2025-12-02",
    kind: "project",
    tags: ["Next.js", "Product", "Rant"],
    art: {
      bg: "red",
      headline: ["NO BS", "QR"],
      icon: "qr",
      variant: "stamp",
    },
  },
  {
    slug: "mysql",
    href: "/projects/mysql/",
    title: "Learn MySQL",
    description:
      "An interactive series on MySQL and InnoDB for web app programmers — foundations first, then the deep dives that show up under real traffic.",
    date: "2026-07-24",
    kind: "project",
    tags: ["MySQL", "Databases", "Series"],
    art: {
      bg: "blue",
      headline: ["LEARN", "MYSQL"],
      icon: "stack",
      variant: "band",
    },
  },
];

export const posts: ContentItem[] = [
  {
    slug: "mysql-schema-types",
    href: "/posts/mysql-schema-types/",
    title: "Tables, Types & Schema That Survive Production",
    description:
      "Data types, nullability, and schema choices that keep web apps correct under real traffic.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "Schema"],
    art: {
      bg: "paper",
      headline: ["SCHEMA"],
      icon: "stack",
      variant: "stamp",
    },
  },
  {
    slug: "mysql-primary-keys",
    href: "/posts/mysql-primary-keys/",
    title: "Primary Keys & the Clustered Index",
    description:
      "In InnoDB the primary key is the table: clustered lookups, secondary bounce, and why random UUID PKs hurt.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "InnoDB"],
    art: {
      bg: "yellow",
      headline: ["PRIMARY", "KEY"],
      icon: "stack",
      variant: "split",
    },
  },
  {
    slug: "mysql-indexes",
    href: "/posts/mysql-indexes/",
    title: "Secondary Indexes",
    description:
      "B-tree secondary indexes, composite left-prefix rules, and selectivity without the guesswork.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "Performance"],
    art: {
      bg: "blue",
      headline: ["INDEXES"],
      icon: "stack",
      variant: "band",
    },
  },
  {
    slug: "mysql-select",
    href: "/posts/mysql-select/",
    title: "SELECT, Filtering & Projection",
    description:
      "How WHERE and the SELECT list drive index use on real list and detail endpoints.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "SQL"],
    art: {
      bg: "red",
      headline: ["SELECT"],
      icon: "stack",
      variant: "stamp",
    },
  },
  {
    slug: "mysql-pagination",
    href: "/posts/mysql-pagination/",
    title: "Sorting, LIMIT & Pagination",
    description:
      "ORDER BY, filesort, and why OFFSET pagination falls apart — plus keyset patterns that scale.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "SQL", "Performance"],
    art: {
      bg: "ink",
      headline: ["PAGE"],
      icon: "stack",
      variant: "split",
    },
  },
  {
    slug: "mysql-joins",
    href: "/posts/mysql-joins/",
    title: "JOINs That Scale",
    description:
      "Nested-loop joins, join order, and when an ORM N+1 is worse than one deliberate join.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "SQL"],
    art: {
      bg: "paper",
      headline: ["JOINS"],
      icon: "stack",
      variant: "band",
    },
  },
  {
    slug: "mysql-writes",
    href: "/posts/mysql-writes/",
    title: "Writes: INSERT, UPDATE, DELETE & Upserts",
    description:
      "Idempotent APIs, bulk inserts, upserts, and the write cost of every index you keep.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "SQL"],
    art: {
      bg: "yellow",
      headline: ["WRITES"],
      icon: "stack",
      variant: "stamp",
    },
  },
  {
    slug: "mysql-transactions",
    href: "/posts/mysql-transactions/",
    title: "Transactions & ACID for Request Handlers",
    description:
      "Request-scoped transactions, autocommit pitfalls, and multi-step checkout that stays atomic.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "InnoDB"],
    art: {
      bg: "blue",
      headline: ["ACID"],
      icon: "stack",
      variant: "split",
    },
  },
  {
    slug: "mysql-isolation",
    href: "/posts/mysql-isolation/",
    title: "Isolation Levels & What Other Requests See",
    description:
      "MySQL’s default REPEATABLE READ, the anomalies that matter for HTTP handlers, and when RC wins.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "InnoDB"],
    art: {
      bg: "red",
      headline: ["ISOLATE"],
      icon: "stack",
      variant: "band",
    },
  },
  {
    slug: "mysql-explain",
    href: "/posts/mysql-explain/",
    title: "EXPLAIN & Reading the Optimizer",
    description:
      "How to read EXPLAIN and EXPLAIN ANALYZE so slow endpoints stop being guesswork.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "Performance"],
    art: {
      bg: "ink",
      headline: ["EXPLAIN"],
      icon: "stack",
      variant: "stamp",
    },
  },
  {
    slug: "mysql-mvcc",
    href: "/posts/mysql-mvcc/",
    title: "MVCC, Undo Logs & Long Transactions",
    description:
      "Consistent reads via undo versions — and why idle-in-transaction connections hurt production.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "InnoDB"],
    art: {
      bg: "paper",
      headline: ["MVCC"],
      icon: "stack",
      variant: "split",
    },
  },
  {
    slug: "mysql-locks",
    href: "/posts/mysql-locks/",
    title: "Row Locks, Gap Locks & Deadlocks",
    description:
      "How InnoDB locks rows and gaps under concurrency — and how apps should retry deadlocks.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "InnoDB"],
    art: {
      bg: "yellow",
      headline: ["LOCKS"],
      icon: "stack",
      variant: "band",
    },
  },
  {
    slug: "mysql-buffer-pool",
    href: "/posts/mysql-buffer-pool/",
    title: "The Buffer Pool & Hot Working Sets",
    description:
      "InnoDB’s RAM cache, LRU behavior, and why fit-in-memory beats clever SQL once pages go cold.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "InnoDB", "Performance"],
    art: {
      bg: "blue",
      headline: ["BUFFER"],
      icon: "stack",
      variant: "stamp",
    },
  },
  {
    slug: "mysql-durability",
    href: "/posts/mysql-durability/",
    title: "Redo, Doublewrite & Durability Tradeoffs",
    description:
      "Crash safety, flush settings, and when teams knowingly trade fsync for throughput.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "InnoDB"],
    art: {
      bg: "red",
      headline: ["DURABLE"],
      icon: "stack",
      variant: "split",
    },
  },
  {
    slug: "mysql-covering-indexes",
    href: "/posts/mysql-covering-indexes/",
    title: "Covering Indexes, ICP & Index-Only Access",
    description:
      "Index-only scans, index condition pushdown, and fewer primary-key lookups on hot read paths.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "Performance"],
    art: {
      bg: "ink",
      headline: ["COVER"],
      icon: "stack",
      variant: "band",
    },
  },
  {
    slug: "mysql-foreign-keys",
    href: "/posts/mysql-foreign-keys/",
    title: "Foreign Keys, Cascades & Integrity",
    description:
      "DB-enforced integrity vs app-only FKs — cascades, locks, and when large systems skip them.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "Schema"],
    art: {
      bg: "paper",
      headline: ["FK"],
      icon: "stack",
      variant: "stamp",
    },
  },
  {
    slug: "mysql-json",
    href: "/posts/mysql-json/",
    title: "JSON Columns, Generated Columns & Multi-Valued Indexes",
    description:
      "Flexible attributes without abandoning indexes — generated columns and multi-valued indexes.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "SQL"],
    art: {
      bg: "yellow",
      headline: ["JSON"],
      icon: "stack",
      variant: "split",
    },
  },
  {
    slug: "mysql-online-ddl",
    href: "/posts/mysql-online-ddl/",
    title: "Online DDL & Zero-Downtime Migrations",
    description:
      "INSTANT vs INPLACE vs COPY, metadata locks, and expand/contract migrations that survive deploys.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "Operations"],
    art: {
      bg: "blue",
      headline: ["DDL"],
      icon: "stack",
      variant: "band",
    },
  },
  {
    slug: "mysql-replication",
    href: "/posts/mysql-replication/",
    title: "Replication, Binlogs & Read Replicas",
    description:
      "Scale reads with replicas, understand lag, and keep read-your-writes after a POST.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "Operations"],
    art: {
      bg: "red",
      headline: ["REPLICA"],
      icon: "stack",
      variant: "stamp",
    },
  },
  {
    slug: "mysql-perf-schema",
    href: "/posts/mysql-perf-schema/",
    title: "Slow Query Forensics with Performance Schema",
    description:
      "Digests, waits, and a practical forensics loop when EXPLAIN alone isn’t enough.",
    date: "2026-07-24",
    kind: "post",
    seriesId: "mysql",
    tags: ["MySQL", "Performance"],
    art: {
      bg: "ink",
      headline: ["FORENSICS"],
      icon: "stack",
      variant: "split",
    },
  },
];

export const seriesList: Series[] = [
  {
    id: "mysql",
    title: "Learn MySQL",
    description:
      "Interactive articles on MySQL and InnoDB — foundations first, then deep dives. Start at the top and move through in order.",
    hubSlug: "mysql",
    postSlugs: [
      "mysql-schema-types",
      "mysql-primary-keys",
      "mysql-indexes",
      "mysql-select",
      "mysql-pagination",
      "mysql-joins",
      "mysql-writes",
      "mysql-transactions",
      "mysql-isolation",
      "mysql-explain",
      "mysql-mvcc",
      "mysql-locks",
      "mysql-buffer-pool",
      "mysql-durability",
      "mysql-covering-indexes",
      "mysql-foreign-keys",
      "mysql-json",
      "mysql-online-ddl",
      "mysql-replication",
      "mysql-perf-schema",
    ],
  },
];

export type ContentSlug =
  | (typeof projects)[number]["slug"]
  | (typeof posts)[number]["slug"];

export const allContent: ContentItem[] = [...projects, ...posts].sort(
  (a, b) => +new Date(b.date) - +new Date(a.date),
);

export function getSeries(id: string): Series | undefined {
  return seriesList.find((s) => s.id === id);
}

export function getSeriesPosts(seriesId: string): ContentItem[] {
  const series = getSeries(seriesId);
  if (!series) return [];
  return series.postSlugs.map((slug) => {
    const item = allContent.find((c) => c.slug === slug);
    if (!item) throw new Error(`Unknown series post slug: ${slug}`);
    return item;
  });
}

export type SeriesAdjacent = {
  series: Series;
  hub: ContentItem;
  prev: ContentItem | null;
  next: ContentItem | null;
};

export function getAdjacentInSeries(slug: string): SeriesAdjacent | null {
  const item = allContent.find((c) => c.slug === slug);
  if (!item?.seriesId) return null;

  const series = getSeries(item.seriesId);
  if (!series) return null;

  const hub = allContent.find((c) => c.slug === series.hubSlug);
  if (!hub) throw new Error(`Unknown series hub slug: ${series.hubSlug}`);

  const ordered = getSeriesPosts(series.id);
  const index = ordered.findIndex((p) => p.slug === slug);
  if (index === -1) return null;

  return {
    series,
    hub,
    prev: index > 0 ? ordered[index - 1]! : null,
    next: index < ordered.length - 1 ? ordered[index + 1]! : null,
  };
}

export function contentSectionLabel(kind: ContentItem["kind"]): string {
  return kind === "post" ? "Writing" : "Project";
}

export function contentSectionName(kind: ContentItem["kind"]): string {
  return kind === "post" ? "Posts" : "Projects";
}

export function contentSectionHref(kind: ContentItem["kind"]): string {
  return kind === "post" ? "/posts/" : "/projects/";
}

export function contentCtaLabel(kind: ContentItem["kind"]): string {
  return kind === "post" ? "Read post" : "Case study";
}

export function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid content date: ${date}`);
  }
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
