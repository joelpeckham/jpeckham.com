import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Accent = "red" | "blue" | "yellow" | "ink";

const accentBar: Record<Accent, string> = {
  red: "bg-red",
  blue: "bg-blue",
  yellow: "bg-yellow",
  ink: "bg-ink",
};

type CardProps = ComponentProps<"div"> & {
  accent?: Accent;
  interactive?: boolean;
};

export function Card({
  className,
  accent,
  interactive = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden border-2 border-ink bg-white shadow-hard transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        interactive &&
          "[@media(hover:hover)]:hover:-translate-x-[3px] [@media(hover:hover)]:hover:-translate-y-[3px] [@media(hover:hover)]:hover:shadow-hard-lg",
        className,
      )}
      {...props}
    >
      {accent ? (
        <div className={cn("h-2.5 border-b-2 border-ink", accentBar[accent])} />
      ) : null}
      {children}
    </div>
  );
}
