import { publishedPosts, publishedProjects } from "@/lib/content";
import { makerHiringMarkdown, PRODUCTS } from "@/lib/product-graph";
import { siteUrl } from "@/lib/site";

function u(path: string): string {
  return `${siteUrl}${path}`;
}

export function buildLlmsTxt(): string {
  const productLines = PRODUCTS.map(
    (p) => `- [${p.name}](${p.url}) — ${p.description} — [llms.txt](${p.llms})`,
  ).join("\n");

  const writeUps = publishedProjects
    .map((item) => `- [${item.title}](${u(item.href)}): ${item.description}`)
    .join("\n");

  const posts = publishedPosts
    .map((item) => `- [${item.title}](${u(item.href)}): ${item.description}`)
    .join("\n");

  return [
    "# Joel Peckham",
    "",
    "> Full-stack and AI software developer in Laramie, Wyoming. Portfolio of shipped web products, interactive write-ups, and technical posts.",
    "",
    makerHiringMarkdown().trimEnd(),
    "",
    "",
    "## Products",
    "",
    productLines,
    "",
    "## Site",
    "",
    `- [Home](${u("/")}): Latest work and introduction`,
    `- [Projects](${u("/projects/")}): All project write-ups`,
    `- [Posts](${u("/posts/")}): Technical articles`,
    `- [About](${u("/about/")}): Bio, work, and contact`,
    "",
    "## Project write-ups",
    "",
    writeUps,
    "",
    "## Posts",
    "",
    posts,
    "",
    "## Machine-readable discovery",
    "",
    `- [Sitemap](${u("/sitemap.xml")}): Indexable URLs`,
    `- [Robots](${u("/robots.txt")}): Crawl rules`,
    `- [RSS](${u("/feed.xml")}): Published posts and projects`,
    "",
  ].join("\n");
}
