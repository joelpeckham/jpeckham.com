import React from "react";

/**
 * Tag — compact mono skill/keyword chip. Outlined by default,
 * filled variants pick up a primary color.
 */
export function Tag({ children, variant = "outline", style = {}, ...rest }) {
  const palettes = {
    outline: { bg: "transparent",   fg: "var(--ink)",   bd: "var(--ink)" },
    ink:     { bg: "var(--ink)",    fg: "var(--paper)", bd: "var(--ink)" },
    red:     { bg: "var(--red)",    fg: "var(--white)", bd: "var(--ink)" },
    blue:    { bg: "var(--blue)",   fg: "var(--white)", bd: "var(--ink)" },
    yellow:  { bg: "var(--yellow)", fg: "var(--ink)",   bd: "var(--ink)" },
  };
  const p = palettes[variant] || palettes.outline;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        fontWeight: 500,
        letterSpacing: "0.04em",
        color: p.fg,
        background: p.bg,
        border: `2px solid ${p.bd}`,
        borderRadius: "var(--radius-0)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
