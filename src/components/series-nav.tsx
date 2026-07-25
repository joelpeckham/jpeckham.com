import Link from "next/link";
import { ArrowLink } from "@/components/ui/arrow-link";
import type { SeriesAdjacent } from "@/lib/content";

export function SeriesNav({ adjacent }: { adjacent: SeriesAdjacent }) {
  const { series, hub, prev, next } = adjacent;

  return (
    <nav
      aria-label={`${series.title} series`}
      className="mt-14 border-t-4 border-ink pt-8"
    >
      <p className="font-mono text-meta uppercase tracking-[0.18em] text-grey">
        {series.title}
      </p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-[1.5em]">
          {prev ? (
            <Link
              href={prev.href}
              className="group inline-flex items-center gap-[0.5em] border-b-2 border-transparent pb-0.5 font-mono text-sm font-medium uppercase tracking-[0.04em] transition-colors hover:border-ink"
            >
              <span className="inline-block transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-x-[5px]">
                ←
              </span>
              {prev.title}
            </Link>
          ) : (
            <span className="font-mono text-sm uppercase tracking-[0.04em] text-ink/35">
              ← Previous
            </span>
          )}
        </div>
        <ArrowLink href={hub.href} className="self-start sm:self-auto">
          Series home
        </ArrowLink>
        <div className="min-h-[1.5em] sm:text-right">
          {next ? (
            <ArrowLink href={next.href}>{next.title}</ArrowLink>
          ) : (
            <span className="font-mono text-sm uppercase tracking-[0.04em] text-ink/35">
              Next →
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
