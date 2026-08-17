import {
  contentSectionHref,
  contentSectionName,
  getAdjacentInSeries,
  publishedProjects,
  type ContentItem,
} from "@/lib/content";
import {
  PERSON_DESCRIPTION,
  PERSON_EMAIL,
  PERSON_LINKEDIN,
  personProfile,
  personRef,
  productByContentSlug,
  PRODUCTS,
  relatedApps,
} from "@/lib/product-graph";
import { siteName, siteUrl } from "@/lib/site";

type JsonLdProps = {
  data: Record<string, unknown>;
};

/** Stable identifiers so every schema block references one shared entity. */
export const personId = `${siteUrl}/#person`;
export const websiteId = `${siteUrl}/#website`;

const socialSameAs = [
  "https://github.com/joelpeckham",
  "https://www.linkedin.com/in/joelpeckham/",
  "https://x.com/peckham_joel",
] as const;

/** Product sites from the catalog, plus social profiles. */
export function personSameAs(): string[] {
  const productUrls = publishedProjects
    .map((p) => p.productUrl)
    .filter((url): url is string => Boolean(url));
  return [...socialSameAs, ...productUrls];
}

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function personJsonLd() {
  const profile = personProfile();
  return {
    "@context": "https://schema.org",
    ...profile,
    image: `${siteUrl}/snowboard_joel.webp`,
    email: PERSON_EMAIL,
    description: PERSON_DESCRIPTION,
    disambiguatingDescription:
      "Software engineer and full-stack developer in Laramie, Wyoming. Dual US and Canadian citizen. Not the poet Joel B. Peckham.",
    worksFor: {
      "@type": "Organization",
      name: "BetterRx",
      url: "https://www.betterrx.com/",
    },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Southern Adventist University",
      url: "https://www.southern.edu/",
    },
    knowsAbout: [
      ...profile.knowsAbout,
      "Software Engineering",
      "Full-Stack Development",
      "Artificial Intelligence",
      "Machine Learning",
    ],
    sameAs: personSameAs(),
    contactPoint: {
      "@type": "ContactPoint",
      email: PERSON_EMAIL,
      url: PERSON_LINKEDIN,
      contactType: "professional",
      availableLanguage: ["English"],
    },
  };
}

export function articleJsonLd(item: ContentItem) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: item.description,
    datePublished: item.date,
    image: `${siteUrl}/og/${item.slug}/`,
    author: {
      "@type": "Person",
      "@id": personId,
      name: siteName,
      url: siteUrl,
    },
    url: `${siteUrl}${item.href}`,
    keywords: item.tags?.join(", "),
    ...(item.productUrl
      ? {
          about: {
            "@type": "SoftwareApplication",
            "@id": productByContentSlug(item.slug)?.appId,
            name: item.title,
            url: item.productUrl,
          },
        }
      : {}),
  };
}

/** Product schema for write-ups that ship a live site. */
export function softwareApplicationJsonLd(item: ContentItem) {
  if (!item.productUrl) return null;
  const product = productByContentSlug(item.slug);
  const sameAs = [`${siteUrl}${item.href}`];
  if (product?.github) sameAs.push(product.github);
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    ...(product ? { "@id": product.appId } : {}),
    name: item.title,
    description: item.description,
    url: item.productUrl,
    image: `${siteUrl}/og/${item.slug}/`,
    applicationCategory: "BrowserApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: personRef(),
    creator: personRef(),
    sameAs,
    ...(product ? { isRelatedTo: relatedApps(product.id) } : {}),
  };
}

export function productItemListJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Shipped products",
    itemListElement: PRODUCTS.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareApplication",
        "@id": product.appId,
        name: product.name,
        url: product.url,
      },
    })),
  };
}

export function breadcrumbJsonLd(item: ContentItem) {
  const adjacent = getAdjacentInSeries(item.slug);

  if (adjacent) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${siteUrl}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Projects",
          item: `${siteUrl}/projects/`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: adjacent.hub.title,
          item: `${siteUrl}${adjacent.hub.href}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: item.title,
          item: `${siteUrl}${item.href}`,
        },
      ],
    };
  }

  const sectionName = contentSectionName(item.kind);
  const sectionHref = contentSectionHref(item.kind);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: sectionName,
        item: `${siteUrl}${sectionHref}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: item.title,
        item: `${siteUrl}${item.href}`,
      },
    ],
  };
}

export function profilePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteUrl}/about/`,
    mainEntity: personJsonLd(),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    name: siteName,
    url: siteUrl,
    author: { "@id": personId },
    publisher: { "@id": personId },
  };
}
