import Link from "next/link";
import type { Metadata } from "next";
import { Tag } from "@/components/ui/tag";
import { allContent, formatDate, type ContentItem } from "@/lib/content";

function itemForSlug(slug: string): ContentItem {
  const item = allContent.find((c) => c.slug === slug);
  if (!item) throw new Error(`Unknown content slug: ${slug}`);
  return item;
}

export function articleMetadata(slug: string): Metadata {
  const item = itemForSlug(slug);
  return {
    title: item.title,
    description: item.description,
    openGraph: {
      type: "article",
      title: item.title,
      description: item.description,
      publishedTime: item.date,
      url: item.href,
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.description,
    },
    alternates: { canonical: item.href },
  };
}

export function ArticleShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const item = itemForSlug(slug);
  const section = item.kind === "post" ? "Posts" : "Projects";
  const sectionHref = item.kind === "post" ? "/" : "/projects";

  return (
    <article className="mx-auto max-w-[760px] px-5 py-12 sm:px-8">
      <nav className="mb-10">
        <Link
          href={sectionHref}
          className="group inline-flex items-center gap-[0.5em] border-b-2 border-transparent pb-0.5 font-mono text-sm font-medium uppercase tracking-[0.04em] transition-colors hover:border-ink"
        >
          <span className="inline-block transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-x-[5px]">
            ←
          </span>
          All {section}
        </Link>
      </nav>

      <header className="mb-10 border-b-4 border-ink pb-8">
        {item.tags?.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        ) : null}
        <h1 className="text-balance font-display text-h1 font-black uppercase leading-[1.05] tracking-[-0.02em]">
          {item.title}
        </h1>
        <p className="mt-4 text-lg leading-normal text-ink/80">
          {item.description}
        </p>
        <time
          dateTime={item.date}
          className="mt-5 block font-mono text-meta uppercase tracking-[0.18em] text-grey"
        >
          {formatDate(item.date)}
        </time>
      </header>

      <div className="prose prose-lg max-w-none prose-headings:scroll-mt-24 prose-pre:bg-[#1c1d21]">
        {children}
      </div>
    </article>
  );
}
