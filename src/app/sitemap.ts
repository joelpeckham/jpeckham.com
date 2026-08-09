import type { MetadataRoute } from "next";
import { publishedContent } from "@/lib/content";
import { siteLastUpdated, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["/", "/projects/", "/posts/", "/about/", "/design/"].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: siteLastUpdated,
    changeFrequency: "monthly" as const,
    priority: path === "/" ? 1 : 0.8,
  }));

  const contentRoutes = publishedContent.map((item) => ({
    url: `${siteUrl}${item.href}`,
    lastModified: new Date(item.date),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...contentRoutes];
}
