import type { Metadata } from "next";
import { ArticleShell, articleMetadata } from "@/components/article-shell";

export const metadata: Metadata = articleMetadata("improving_arc");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ArticleShell slug="improving_arc">{children}</ArticleShell>;
}
