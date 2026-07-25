"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/projects", label: "Projects" },
  { href: "/posts", label: "Posts" },
  { href: "/about", label: "About" },
  { href: "/design", label: "Design" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-8">
        <Link
          href="/"
          className="group inline-flex min-w-0 shrink items-center gap-[0.5em] whitespace-nowrap font-display text-lg font-black uppercase tracking-[-0.02em] sm:gap-[0.6em] sm:text-h4"
        >
          <span className="size-4 rounded-[50%] border-2 border-ink bg-red transition-[border-radius,rotate] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [@media(hover:hover)]:group-hover:rotate-90 [@media(hover:hover)]:group-hover:rounded-none" />
          <span>
            <span className="hidden sm:inline">Joel </span>Peckham
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="flex shrink-0 items-center gap-2 sm:gap-5"
        >
          {navLinks.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative whitespace-nowrap pb-1 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.04em] transition-colors after:absolute after:-bottom-px after:left-0 after:h-[2px] after:w-0 after:transition-[width] after:duration-200 after:ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:text-sm sm:tracking-[0.06em]",
                  active
                    ? "text-red after:w-full after:bg-red"
                    : "text-ink after:bg-ink [@media(hover:hover)]:hover:after:w-full",
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
