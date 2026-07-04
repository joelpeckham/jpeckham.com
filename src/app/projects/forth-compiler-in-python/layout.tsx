import type { Metadata } from "next";
import { ArticleShell, articleMetadata } from "@/components/article-shell";

export const metadata: Metadata = articleMetadata("forth-compiler-in-python");

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ArticleShell slug="forth-compiler-in-python">{children}</ArticleShell>
  );
}
