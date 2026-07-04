"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/design", label: "Design" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-paper">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-5 sm:gap-4 sm:px-8">
        <Link
          href="/"
          className="group inline-flex shrink-0 items-center gap-[0.6em] whitespace-nowrap font-display text-h4 font-black uppercase tracking-[-0.02em]"
        >
          <span className="size-4 rounded-[50%] border-2 border-ink bg-red transition-[border-radius,rotate] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [@media(hover:hover)]:group-hover:rotate-90 [@media(hover:hover)]:group-hover:rounded-none" />
          <span>
            <span className="hidden sm:inline">Joel </span>Peckham
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="flex shrink-0 items-center gap-3 sm:gap-5"
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
                  "relative whitespace-nowrap pb-1 font-mono text-xs font-medium uppercase tracking-[0.06em] transition-colors after:absolute after:-bottom-px after:left-0 after:h-[2px] after:w-0 after:transition-[width] after:duration-200 after:ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:text-sm",
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
