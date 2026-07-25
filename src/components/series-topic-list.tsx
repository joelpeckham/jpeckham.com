import Link from "next/link";
import { getSeriesPosts } from "@/lib/content";

export function SeriesTopicList({ seriesId }: { seriesId: string }) {
  const topics = getSeriesPosts(seriesId);

  return (
    <ol className="not-prose mt-8 list-none space-y-0 border-2 border-ink p-0">
      {topics.map((topic, i) => (
        <li key={topic.slug} className="border-b-2 border-ink last:border-b-0">
          <Link
            href={topic.href}
            className="group flex items-baseline gap-4 px-5 py-4 transition-colors hover:bg-ink hover:text-paper sm:px-6"
          >
            <span className="shrink-0 font-mono text-meta uppercase tracking-[0.18em] text-grey group-hover:text-paper/60">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-h4 font-black uppercase tracking-[-0.02em]">
                {topic.title}
              </span>
              <span className="mt-1 block text-base font-normal normal-case tracking-normal text-ink/70 group-hover:text-paper/75">
                {topic.description}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
