import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Tag } from "@/components/ui/tag";
import {
  CoverArt,
  coverTransitionKey,
  heroUnit,
  webFontDisplay,
  webFontMono,
} from "@/components/cover-art";
import { SeriesNav } from "@/components/series-nav";
import {
  allContent,
  contentLabel,
  contentSectionHref,
  contentSectionName,
  formatDate,
  getAdjacentInSeries,
  type ContentItem,
  type ContentSlug,
} from "@/lib/content";
import { siteName } from "@/lib/site";
import { JsonLd, articleJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";
import { BackToListLink, ScrollToTopOnMount } from "@/components/scroll-to-top";
import "highlight.js/styles/an-old-hope.css";

function itemForSlug(slug: ContentSlug): ContentItem {
  const item = allContent.find((c) => c.slug === slug);
  if (!item) throw new Error(`Unknown content slug: ${slug}`);
  return item;
}

export function articleMetadata(slug: ContentSlug): Metadata {
  const item = itemForSlug(slug);
  const ogImage = {
    url: `/og/${item.slug}/`,
    width: 1200,
    height: 630,
    alt: item.title,
  };
  return {
    title: item.title,
    description: item.description,
    keywords: item.tags,
    authors: [{ name: siteName }],
    openGraph: {
      type: "article",
      title: item.title,
      description: item.description,
      publishedTime: item.date,
      url: item.href,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.description,
      images: [ogImage],
    },
    alternates: { canonical: item.href },
  };
}

export function createArticleLayout(slug: ContentSlug) {
  return {
    metadata: articleMetadata(slug),
    Layout({ children }: { children: React.ReactNode }) {
      return <ArticleShell slug={slug}>{children}</ArticleShell>;
    },
  };
}

export function createProjectLayout(slug: ContentSlug) {
  return createArticleLayout(slug);
}

export function ArticleShell({
  slug,
  children,
}: {
  slug: ContentSlug;
  children: React.ReactNode;
}) {
  const item = itemForSlug(slug);
  const adjacent = getAdjacentInSeries(slug);
  const backHref = adjacent ? adjacent.hub.href : contentSectionHref(item.kind);
  const backLabel = adjacent
    ? adjacent.series.title
    : `All ${contentSectionName(item.kind)}`;

  return (
    <>
      <JsonLd data={articleJsonLd(item)} />
      <JsonLd data={breadcrumbJsonLd(item)} />
      <ScrollToTopOnMount />
      <ViewTransition name={coverTransitionKey(item.slug)} share="cover-piece">
        <div
          className="h-[34vh] max-h-[520px] min-h-[220px] w-full overflow-hidden border-b-2 border-ink sm:h-[42vh] sm:min-h-[280px]"
          style={{ containerType: "size" }}
        >
          <CoverArt
            art={item.art}
            u={heroUnit}
            label={contentLabel(item)}
            fontDisplay={webFontDisplay}
            fontMono={webFontMono}
            transitionKey={coverTransitionKey(item.slug)}
          />
        </div>
      </ViewTransition>

      <article className="mx-auto w-full min-w-0 max-w-[960px] px-5 py-12 sm:px-8">
        <nav className="mb-10" aria-label="Breadcrumb">
          <BackToListLink
            href={backHref}
            className="group inline-flex items-center gap-[0.5em] border-b-2 border-transparent pb-0.5 font-mono text-sm font-medium uppercase tracking-[0.04em] transition-colors hover:border-ink"
          >
            <span className="inline-block transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-x-[5px]">
              ←
            </span>
            {backLabel}
          </BackToListLink>
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

        {adjacent ? <SeriesNav adjacent={adjacent} /> : null}
      </article>
    </>
  );
}
