import type { Metadata } from "next";
import { ArticleShell, articleMetadata } from "@/components/article-shell";

export const metadata: Metadata = articleMetadata("no-bullshit-qr");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ArticleShell slug="no-bullshit-qr">{children}</ArticleShell>;
}
