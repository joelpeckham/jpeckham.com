"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { isReturningToList } from "@/components/scroll-to-top";
import { cn, cssVars } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  /** Element to render. Defaults to a `div`. */
  as?: ElementType;
  className?: string;
  /** Stagger offset in milliseconds. */
  delay?: number;
  /** Fraction of the element that must be visible before revealing. */
  threshold?: number;
};

/**
 * Reveals its children with a rise-in animation the first time they scroll into
 * view. Content is always rendered (SSR-safe); only its opacity/transform are
 * animated, and everything is disabled under prefers-reduced-motion via CSS.
 */
export function Reveal({
  children,
  as,
  className,
  delay = 0,
  threshold = 0.15,
}: RevealProps) {
  const Component = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  // When arriving via a back-to-list navigation, skip the entrance animation so
  // the page matches how the user left it and the cover morph has a visible
  // target. Captured once at mount; on SPA back-navigation there is no
  // hydration, so this cannot cause a server/client mismatch.
  const [instant] = useState(isReturningToList);
  const [visible, setVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (instant) return;
    const node = ref.current;
    if (!node || visible) return;

    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, visible, instant]);

  return (
    <Component
      ref={ref}
      className={cn(
        "reveal",
        instant ? "reveal-shown" : visible && "is-visible",
        className,
      )}
      style={!instant && delay ? cssVars({ "--reveal-delay": `${delay}ms` }) : undefined}
    >
      {children}
    </Component>
  );
}
