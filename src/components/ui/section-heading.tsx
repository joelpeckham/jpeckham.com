import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type SectionHeadingProps = {
  index?: string;
  eyebrow?: string;
  title: string;
  titleAs?: "h1" | "h2";
  titleId?: string;
  accent?: "red" | "blue" | "yellow";
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  index,
  eyebrow,
  title,
  titleAs: Title = "h2",
  titleId,
  accent = "red",
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <div
        className={cn(
          "mb-3 flex items-center gap-3",
          align === "center" && "justify-center",
        )}
      >
        {index ? <Badge variant={accent}>{index}</Badge> : null}
        {eyebrow ? (
          <span className="font-mono text-meta uppercase tracking-[0.18em] text-grey">
            {eyebrow}
          </span>
        ) : null}
      </div>
      <Title
        id={titleId}
        className="m-0 font-display text-h1 font-black uppercase leading-[1.05] tracking-[-0.02em]"
      >
        {title}
      </Title>
      <div data-rule className="mt-4 h-1 bg-ink" />
    </div>
  );
}
