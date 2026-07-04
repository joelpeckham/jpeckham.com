import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tagVariants = cva(
  "inline-flex items-center whitespace-nowrap border-2 border-ink px-3 py-[5px] font-mono text-xs font-medium tracking-[0.04em]",
  {
    variants: {
      variant: {
        outline: "bg-transparent text-ink",
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
