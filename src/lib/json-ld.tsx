import { allContent, type ContentItem } from "@/lib/content";
import { siteName, siteUrl } from "@/lib/site";

type JsonLdProps = {
  data: Record<string, unknown>;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteName,
    url: siteUrl,
    email: "mail@jpeckham.com",
    jobTitle: "Software Developer",
    sameAs: [
      "https://github.com/joelpeckham",
      "https://www.linkedin.com/in/joelpeckham/",
    ],
  };
}

export function articleJsonLd(item: ContentItem) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.description,
    datePublished: item.date,
    author: {
      "@type": "Person",
      name: siteName,
      url: siteUrl,
    },
    url: `${siteUrl}${item.href}`,
    keywords: item.tags?.join(", "),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    author: {
      "@type": "Person",
      name: siteName,
    },
  };
}

export function allArticlesJsonLd() {
  return allContent.map((item) => articleJsonLd(item));
}
