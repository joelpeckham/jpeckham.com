"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/designPortfolio", label: "Design" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-[0.6em] font-display text-h4 font-black uppercase tracking-[-0.02em]"
        >
          <span className="size-4 rounded-full border-2 border-ink bg-red" />
          <span>
            <span className="hidden sm:inline">Joel </span>Peckham
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-5">
          {navLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b-2 pb-0.5 font-mono text-sm font-medium uppercase tracking-[0.06em] transition-colors",
                  active
                    ? "border-red text-red"
                    : "border-transparent text-ink hover:border-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
