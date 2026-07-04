import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type ArrowLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  external?: boolean;
};

/**
 * Inline mono link with a sliding arrow and an ink underline that grows on
 * hover. Inherits color from `currentColor` unless overridden with a class.
 */
export function ArrowLink({
  href,
  external,
  className,
  children,
  ...props
}: ArrowLinkProps) {
  const externalProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-[0.5em] border-b-2 border-transparent pb-0.5 font-mono text-sm font-medium uppercase tracking-[0.04em] transition-colors duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-current",
        className,
      )}
      {...externalProps}
      {...props}
    >
      {children}
      <span className="inline-block transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-[5px]">
        →
      </span>
    </Link>
  );
}
