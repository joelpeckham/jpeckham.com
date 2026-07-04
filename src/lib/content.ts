export type CoverBg = "red" | "blue" | "yellow" | "ink" | "paper";
export type CoverIcon =
  | "qr"
  | "calendar"
  | "network"
  | "puzzle"
  | "stack"
  | "newspaper";
export type CoverVariant = "split" | "stamp" | "band";

export type CoverArtSpec = {
  bg: CoverBg;
  headline: string[];
  icon: CoverIcon;
  variant: CoverVariant;
  label?: string;
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
};

export const projects: ContentItem[] = [
  {
    slug: "uwyo-schedule",
    href: "/projects/uwyo-schedule/",
    title: "uwyoschedule — UW Class Schedule Planner",
    description:
      "A conflict-free class schedule planner for University of Wyoming students, built on a live copy of the UW course catalog.",
    date: "2026-06-01",
    kind: "project",
    tags: ["Next.js", "Full Stack", "Product"],
    art: {
      bg: "yellow",
      headline: ["SCHED", "ULE"],
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
];

export const posts: ContentItem[] = [
  {
    slug: "no-bullshit-qr",
    href: "/posts/no-bullshit-qr/",
    title: "No Bullshit QR Codes",
    description:
      "Paywalled QR generators broke a friend's printed posters, so I built a free one that never holds your links hostage — with real SVG and PNG export.",
    date: "2025-12-02",
    kind: "post",
    tags: ["Next.js", "Product", "Rant"],
    art: {
      bg: "red",
      headline: ["NO BS", "QR"],
      icon: "qr",
      variant: "stamp",
    },
  },
];

export const allContent: ContentItem[] = [...projects, ...posts].sort(
  (a, b) => +new Date(b.date) - +new Date(a.date),
);

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
