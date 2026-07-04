import type { Metadata } from "next";
import { ArticleShell, articleMetadata } from "@/components/article-shell";

export const metadata: Metadata = articleMetadata("uwyo-schedule");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ArticleShell slug="uwyo-schedule">{children}</ArticleShell>;
}
