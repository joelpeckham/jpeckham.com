import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tagVariants = cva(
  "inline-flex items-center whitespace-nowrap border-2 border-ink px-3 py-[5px] font-mono text-xs font-medium tracking-[0.04em] transition-colors duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
  {
    variants: {
      variant: {
        outline:
          "bg-transparent text-ink [@media(hover:hover)]:hover:border-red [@media(hover:hover)]:hover:text-red",
        ink: "bg-ink text-paper",
        red: "bg-red text-white",
        blue: "bg-blue text-white",
        yellow: "bg-yellow text-ink",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

type TagProps = ComponentProps<"span"> & VariantProps<typeof tagVariants>;

export function Tag({ className, variant, ...props }: TagProps) {
  return <span className={cn(tagVariants({ variant, className }))} {...props} />;
}
