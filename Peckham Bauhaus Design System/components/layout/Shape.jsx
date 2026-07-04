import React from "react";

/**
 * Shape — decorative Bauhaus geometric primitive (circle, half-circle,
 * quarter-circle, square, triangle, bar). Pure ornament; give it a size.
 */
export function Shape({ type = "circle", color = "var(--red)", size = 120, style = {}, ...rest }) {
  const base = {
    width: size,
    height: size,
    display: "inline-block",
    ...style,
  };
  const map = {
    circle:   { borderRadius: "var(--radius-full)", background: color },
    square:   { background: color },
    bar:      { width: size, height: Math.round(size / 3), background: color },
    half:     { borderRadius: `${size}px ${size}px 0 0`, height: size / 2, background: color },
    quarter:  { borderRadius: `${size}px 0 0 0`, background: color },
    ring:     { borderRadius: "var(--radius-full)", background: "transparent", border: `${Math.max(6, size / 7)}px solid ${color}` },
    triangle: {
      width: 0,
      height: 0,
      background: "transparent",
      borderLeft: `${size / 2}px solid transparent`,
      borderRight: `${size / 2}px solid transparent`,
      borderBottom: `${size}px solid ${color}`,
    },
  };
  return <span aria-hidden="true" style={{ ...base, ...(map[type] || map.circle) }} {...rest} />;
}
