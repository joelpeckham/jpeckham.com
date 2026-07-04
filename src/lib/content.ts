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
    slug: "improving_arc",
    href: "/posts/improving_arc/",
    title: "Improving Arc",
    description:
      "Making the Arc window more accessible by improving the key-window focus design.",
    date: "2023-03-29",
    kind: "post",
    cover: "/posts/arcScreenshots/arcFocusedWindow.webp",
    tags: ["Design", "UX"],
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
