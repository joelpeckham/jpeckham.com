import React from "react";

/**
 * Button — Bauhaus block button with a hard offset shadow that
 * "presses" on active. Variants map to the primary palette.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  as = "button",
  disabled = false,
  block = false,
  style = {},
  ...rest
}) {
  const palettes = {
    primary:   { bg: "var(--ink)",   fg: "var(--paper)",  bd: "var(--ink)" },
    red:       { bg: "var(--red)",   fg: "var(--white)",  bd: "var(--ink)" },
    blue:      { bg: "var(--blue)",  fg: "var(--white)",  bd: "var(--ink)" },
    yellow:    { bg: "var(--yellow)",fg: "var(--ink)",    bd: "var(--ink)" },
    outline:   { bg: "transparent",  fg: "var(--ink)",    bd: "var(--ink)" },
  };
  const sizes = {
    sm: { pad: "8px 16px",  fs: "var(--text-sm)" },
    md: { pad: "13px 26px", fs: "var(--text-body)" },
    lg: { pad: "18px 38px", fs: "var(--text-lg)" },
  };
  const p = palettes[variant] || palettes.primary;
  const s = sizes[size] || sizes.md;
  const Tag = as;

  return (
    <Tag
      disabled={as === "button" ? disabled : undefined}
      style={{
        display: block ? "flex" : "inline-flex",
        width: block ? "100%" : "auto",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.6em",
        padding: s.pad,
        fontFamily: "var(--font-mono)",
        fontSize: s.fs,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: p.fg,
        background: p.bg,
        border: `2px solid ${p.bd}`,
        borderRadius: "var(--radius-0)",
        boxShadow: "var(--shadow-hard)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
        transform: "translate(0,0)",
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) { e.currentTarget.style.transform = "translate(4px,4px)"; e.currentTarget.style.boxShadow = "0 0 0 var(--ink)"; } }}
      onMouseUp={(e) => { if (!disabled) { e.currentTarget.style.transform = "translate(0,0)"; e.currentTarget.style.boxShadow = "var(--shadow-hard)"; } }}
      onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.transform = "translate(0,0)"; e.currentTarget.style.boxShadow = "var(--shadow-hard)"; } }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
