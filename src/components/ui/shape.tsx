import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type ShapeType =
  | "circle"
  | "square"
  | "bar"
  | "half"
  | "quarter"
  | "ring"
  | "triangle";

type ShapeProps = {
  type?: ShapeType;
  color?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Decorative Bauhaus geometric primitive. Pure ornament — give it a size and
 * position it absolutely to bleed off edges. Color accepts any CSS color.
 *
 * The `size` prop sets a `--shape-size` custom property and every dimension is
 * derived from it with calc(), so callers can override the size responsively by
 * setting `--shape-size` via a class (e.g. `[--shape-size:160px] sm:[--shape-size:260px]`).
 */
export function Shape({
  type = "circle",
  color = "var(--red)",
  size = 120,
  className,
  style,
}: ShapeProps) {
  // The default comes from the `size` prop but stays a var() fallback (not an
  // inline custom property) so a `--shape-size` set via className still wins.
  const s = `var(--shape-size, ${size}px)`;
  // `display` lives in a class (not inline) so callers can toggle visibility
  // with utilities like `hidden lg:block` — an inline display would override
  // them. cn()/tailwind-merge resolves the conflict, keeping the caller's.
  const base: CSSProperties = {
    width: s,
    height: s,
  };

  const variants: Record<ShapeType, CSSProperties> = {
    circle: { borderRadius: "50%", background: color },
    square: { background: color },
    bar: { width: s, height: `calc(${s} / 3)`, background: color },
    half: {
      borderRadius: `${s} ${s} 0 0`,
      height: `calc(${s} / 2)`,
      background: color,
    },
    quarter: { borderRadius: `${s} 0 0 0`, background: color },
    ring: {
      borderRadius: "50%",
      background: "transparent",
      border: `max(6px, calc(${s} / 7)) solid ${color}`,
    },
    triangle: {
      width: 0,
      height: 0,
      background: "transparent",
      borderLeft: `calc(${s} / 2) solid transparent`,
      borderRight: `calc(${s} / 2) solid transparent`,
      borderBottom: `${s} solid ${color}`,
    },
  };

  return (
    <span
      aria-hidden="true"
      className={cn("inline-block", className)}
      style={{ ...base, ...variants[type], ...style }}
    />
  );
}
