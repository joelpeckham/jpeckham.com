import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { formatDate, type ContentItem } from "@/lib/content";

const accents = ["red", "blue", "yellow", "ink"] as const;

export function ContentCard({
  item,
  index,
}: {
  item: ContentItem;
  index?: number;
}) {
  const accent = accents[((index ?? 1) - 1) % accents.length];
  const marker = String(index ?? 1).padStart(2, "0");

  return (
    <Link href={item.href} className="group block">
      <Card accent={accent} interactive className="flex h-full flex-col">
        {item.cover ? (
          <div className="aspect-video overflow-hidden border-b-2 border-ink bg-paper-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.cover}
              alt=""
              className="size-full object-cover"
            />
          </div>
        ) : null}

        <div className="flex flex-1 flex-col p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-meta uppercase tracking-[0.18em] text-grey">
              <span>{item.kind === "post" ? "Writing" : "Project"}</span>
              {item.interactive ? (
                <span className="text-red">· Interactive</span>
              ) : null}
            </div>
            <span className="font-mono text-sm text-grey">{marker}</span>
          </div>

          <h3 className="text-balance font-display text-h3 font-black uppercase leading-[1.05] tracking-[-0.02em]">
            {item.title}
          </h3>

          <p className="mt-3 flex-1 leading-normal text-ink/80">
            {item.description}
          </p>

          {item.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.slice(0, 3).map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-[0.5em] border-b-2 border-transparent pb-0.5 font-mono text-sm font-medium uppercase tracking-[0.04em] transition-colors group-hover:border-ink">
              {item.kind === "post" ? "Read post" : "Case study"}
              <span className="inline-block transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-[5px]">
                →
              </span>
            </span>
            <time dateTime={item.date} className="font-mono text-xs text-grey">
              {formatDate(item.date)}
            </time>
          </div>
        </div>
      </Card>
    </Link>
  );
}
