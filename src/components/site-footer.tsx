import Link from "next/link";

const links = [
  { href: "https://github.com/joelpeckham", label: "GitHub", external: true },
  {
    href: "https://www.linkedin.com/in/joelpeckham/",
    label: "LinkedIn",
    external: true,
  },
  { href: "mailto:mail@jpeckham.com", label: "Email", external: false },
  { href: "/feed.xml", label: "RSS", external: false },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-[3px] border-red bg-ink text-paper">
      <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-6 px-5 py-12 sm:flex-row sm:items-center sm:px-8">
        <span className="group inline-flex items-center gap-[0.6em] font-display text-h4 font-black uppercase tracking-[-0.02em]">
          <span className="size-4 rounded-[50%] border-2 border-paper bg-yellow transition-[border-radius,rotate] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [@media(hover:hover)]:group-hover:rotate-90 [@media(hover:hover)]:group-hover:rounded-none" />
          Joel Peckham
        </span>

        <nav aria-label="Footer" className="flex flex-wrap gap-5 font-mono text-sm uppercase tracking-[0.06em]">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="relative pb-0.5 after:absolute after:-bottom-px after:left-0 after:h-[2px] after:w-0 after:bg-paper after:transition-[width] after:duration-200 after:ease-[cubic-bezier(0.2,0.8,0.2,1)] [@media(hover:hover)]:hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <span className="font-mono text-xs text-grey">
          © {new Date().getFullYear()} · Built by hand
        </span>
      </div>
    </footer>
  );
}
