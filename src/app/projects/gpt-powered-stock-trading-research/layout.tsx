import type { Metadata } from "next";
import { ArticleShell, articleMetadata } from "@/components/article-shell";

export const metadata: Metadata = articleMetadata(
  "gpt-powered-stock-trading-research",
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ArticleShell slug="gpt-powered-stock-trading-research">
      {children}
    </ArticleShell>
  );
}
