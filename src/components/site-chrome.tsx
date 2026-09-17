"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isTableTool =
    pathname === "/dj" ||
    pathname.startsWith("/dj/") ||
    pathname === "/vikram" ||
    pathname.startsWith("/vikram/");

  if (isTableTool) {
    return <div className="min-h-full flex-1">{children}</div>;
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-[100] focus:border-2 focus:border-ink focus:bg-paper focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:uppercase focus:tracking-[0.06em]"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id="main" className="min-w-0 flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
