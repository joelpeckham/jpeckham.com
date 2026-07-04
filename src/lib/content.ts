export type ContentItem = {
  slug: string;
  href: string;
  title: string;
  description: string;
  date: string;
  kind: "project" | "post";
  interactive?: boolean;
  cover?: string;
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
    cover: "/projects/images/uwyoschedule.webp",
    kind: "project",
    tags: ["Next.js", "Full Stack", "Product"],
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
  },
  {
    slug: "forth-compiler-in-python",
    href: "/projects/forth-compiler-in-python/",
    title: "FORTH interpreter in 130* lines of Python",
    description:
      "Building a compiler and interpreter for the stack-based FORTH language in a surprisingly small amount of Python.",
    date: "2023-02-01",
    kind: "project",
    cover: "/projects/images/pyforthBanner.webp",
    tags: ["Compilers", "Python"],
  },
  {
    slug: "gpt-powered-stock-trading-research",
    href: "/projects/gpt-powered-stock-trading-research/",
    title: "GPT-Powered Stock Trading Research",
    description:
      "Can a large transformer model act as an all-in-one, news-based trading bot? A senior research project.",
    date: "2023-01-05",
    cover: "/projects/images/NewspaperTransparent.webp",
    kind: "project",
    tags: ["Machine Learning", "Research", "NLP"],
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
    cover: "/posts/images/no-bullshit-qr.webp",
    kind: "post",
    tags: ["Next.js", "Product", "Rant"],
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
