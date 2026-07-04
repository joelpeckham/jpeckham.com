import type { Metadata } from "next";
import { ArticleShell, articleMetadata } from "@/components/article-shell";

export const metadata: Metadata = articleMetadata("8-puzzle-solver");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ArticleShell slug="8-puzzle-solver">{children}</ArticleShell>;
}
