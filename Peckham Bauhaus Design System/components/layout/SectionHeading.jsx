import React from "react";
import { Badge } from "../core/Badge.jsx";

/**
 * SectionHeading — the brand's large graphic section title with a
 * numbered badge, mono eyebrow, and a heavy ink rule beneath.
 */
export function SectionHeading({ index, eyebrow, title, accent = "var(--red)", align = "left", style = {}, ...rest }) {
  return (
    <div style={{ textAlign: align, ...style }} {...rest}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        justifyContent: align === "center" ? "center" : "flex-start",
        marginBottom: "var(--space-3)",
      }}>
        {index && <Badge variant={accent === "var(--blue)" ? "blue" : accent === "var(--yellow)" ? "yellow" : "red"}>{index}</Badge>}
        {eyebrow && (
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-meta)",
            letterSpacing: "var(--track-label)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}>{eyebrow}</span>
        )}
      </div>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontWeight: "var(--w-black)",
        fontSize: "var(--text-h1)",
        lineHeight: "var(--lh-snug)",
        letterSpacing: "var(--track-tight)",
        textTransform: "uppercase",
        margin: 0,
      }}>{title}</h2>
      <div style={{ height: 4, background: "var(--ink)", marginTop: "var(--space-4)" }} />
    </div>
  );
}
