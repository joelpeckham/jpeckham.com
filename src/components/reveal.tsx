"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

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
  }, [threshold, visible]);

  return (
    <Component
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={delay ? cssVars({ "--reveal-delay": `${delay}ms` }) : undefined}
    >
      {children}
    </Component>
  );
}
