import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-[2em] min-w-[2em] items-center justify-center border-2 border-ink px-[0.5em] font-mono text-sm font-bold",
  {
    variants: {
      variant: {
        red: "bg-red text-white",
        blue: "bg-blue text-white",
        yellow: "bg-yellow text-ink",
        ink: "bg-ink text-paper",
      },
      shape: {
        square: "rounded-none",
        circle: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "red",
      shape: "square",
    },
  },
);

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, shape, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, shape, className }))} {...props} />
  );
}
