import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[0.6em] whitespace-nowrap border-2 border-ink font-mono font-medium uppercase tracking-[0.06em] transition-[transform,box-shadow] duration-[120ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-hard active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        ink: "bg-ink text-paper",
        red: "bg-red text-white",
        blue: "bg-blue text-white",
        yellow: "bg-yellow text-ink",
        outline: "bg-transparent text-ink",
      },
      size: {
        sm: "px-4 py-2 text-sm",
        md: "px-[26px] py-[13px] text-body",
        lg: "px-[38px] py-[18px] text-lg",
      },
    },
    defaultVariants: {
      variant: "ink",
      size: "md",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
