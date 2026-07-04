import React from "react";

/**
 * Badge — a filled square/number marker used to index sections
 * ("01", "02") or flag status. Bauhaus geometric block.
 */
export function Badge({ children, variant = "red", shape = "square", style = {}, ...rest }) {
  const palettes = {
    red:    { bg: "var(--red)",    fg: "var(--white)" },
    blue:   { bg: "var(--blue)",   fg: "var(--white)" },
    yellow: { bg: "var(--yellow)", fg: "var(--ink)" },
    ink:    { bg: "var(--ink)",    fg: "var(--paper)" },
  };
  const p = palettes[variant] || palettes.red;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "2em",
        height: "2em",
        padding: "0 0.5em",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        fontWeight: 700,
        color: p.fg,
        background: p.bg,
        border: "2px solid var(--ink)",
        borderRadius: shape === "circle" ? "var(--radius-full)" : "var(--radius-0)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
