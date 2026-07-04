import type { Metadata } from "next";
import { ArticleShell, articleMetadata } from "@/components/article-shell";

export const metadata: Metadata = articleMetadata("neural-net-visualizer");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ArticleShell slug="neural-net-visualizer">{children}</ArticleShell>;
}
