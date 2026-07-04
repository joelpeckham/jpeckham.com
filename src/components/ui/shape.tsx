import type { CSSProperties } from "react";

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
 */
export function Shape({
  type = "circle",
  color = "var(--red)",
  size = 120,
  className,
  style,
}: ShapeProps) {
  const base: CSSProperties = {
    width: size,
    height: size,
    display: "inline-block",
  };

  const variants: Record<ShapeType, CSSProperties> = {
    circle: { borderRadius: "50%", background: color },
    square: { background: color },
    bar: { width: size, height: Math.round(size / 3), background: color },
    half: {
      borderRadius: `${size}px ${size}px 0 0`,
      height: size / 2,
      background: color,
    },
    quarter: { borderRadius: `${size}px 0 0 0`, background: color },
    ring: {
      borderRadius: "50%",
      background: "transparent",
      border: `${Math.max(6, size / 7)}px solid ${color}`,
    },
    triangle: {
      width: 0,
      height: 0,
      background: "transparent",
      borderLeft: `${size / 2}px solid transparent`,
      borderRight: `${size / 2}px solid transparent`,
      borderBottom: `${size}px solid ${color}`,
    },
  };

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ ...base, ...variants[type], ...style }}
    />
  );
}
