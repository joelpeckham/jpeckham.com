import { cn } from "@/lib/utils";

export type ReferenceItem = {
  n: number;
  title: string;
  href: string;
};

/** IEEE-style in-text citation: hyperlinked superscript [n] → #ref-n */
export function Cite({ n }: { n: number }) {
  return (
    <a
      href={`#ref-${n}`}
      className={cn(
        "cite-ref font-mono text-[0.7em] font-medium tabular-nums text-red no-underline",
        "align-super leading-none",
        "hover:text-red-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red",
      )}
      aria-label={`Reference ${n}`}
    >
      [{n}]
    </a>
  );
}

/** Numbered references list; each item is the jump target for <Cite n={…} /> */
export function References({
  items,
  heading = "References",
}: {
  items: ReferenceItem[];
  heading?: string;
}) {
  const sorted = [...items].sort((a, b) => a.n - b.n);

  return (
    <section
      className="not-prose mt-12 border-t-2 border-ink pt-8"
      aria-labelledby="references-heading"
    >
      <h2
        id="references-heading"
        className="font-display text-h3 font-black uppercase tracking-tight"
      >
        {heading}
      </h2>
      <ol className="mt-4 list-none space-y-3 p-0">
        {sorted.map((item) => (
          <li
            key={item.n}
            id={`ref-${item.n}`}
            className="scroll-mt-24 flex gap-3 font-mono text-sm leading-snug"
          >
            <span className="shrink-0 tabular-nums text-grey">[{item.n}]</span>
            <span>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline decoration-grey-line underline-offset-2 hover:text-red hover:decoration-red"
              >
                {item.title}
              </a>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
