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
      "An interactive series on MySQL and InnoDB for web app developers. Build mental models that hold up under real traffic, one demo at a time.",
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
      label: "MySQL",
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
      label: "MySQL",
    },
  },
  {
    slug: "mysql-indexes",
    href: "/posts/mysql-indexes/",
    title: "Composite Indexes & the Left Prefix",
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
      label: "MySQL",
    },
  },
  {
    slug: "mysql-select",
    href: "/posts/mysql-select/",
    title: "WHERE, Projection & Sargable Queries",
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
      label: "MySQL",
    },
  },
];

export const seriesList: Series[] = [
  {
    id: "mysql",
    title: "Learn MySQL",
    description:
      "Interactive articles on MySQL and InnoDB. Start at the top and move through in order.",
    hubSlug: "mysql",
    postSlugs: [
      "mysql-schema-types",
      "mysql-primary-keys",
      "mysql-indexes",
      "mysql-select",
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

/**
 * Eyebrow label shown on cards, article heroes, and OG covers.
 * Per-item `art.label` (e.g. "MySQL" on series posts) wins over the
 * generic kind-based label.
 */
export function contentLabel(item: ContentItem): string {
  return item.art.label ?? contentSectionLabel(item.kind);
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
