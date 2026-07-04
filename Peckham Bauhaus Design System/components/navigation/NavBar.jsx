import React from "react";

/**
 * NavBar — fixed-feel top bar: wordmark left, mono links right,
 * heavy ink bottom rule. Static/presentational.
 */
export function NavBar({ brand = "JOEL PECKHAM", items = ["Work", "About", "Contact"], active, style = {}, ...rest }) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-4) var(--space-6)",
        background: "var(--bg-page)",
        borderBottom: "3px solid var(--ink)",
        ...style,
      }}
      {...rest}
    >
      <a href="#" style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6em",
        fontFamily: "var(--font-display)",
        fontWeight: "var(--w-black)",
        fontSize: "var(--text-h4)",
        letterSpacing: "var(--track-tight)",
        textTransform: "uppercase",
      }}>
        <span style={{ width: 16, height: 16, background: "var(--red)", borderRadius: "var(--radius-full)", border: "2px solid var(--ink)" }} />
        {brand}
      </a>
      <div style={{ display: "flex", gap: "var(--space-5)" }}>
        {items.map((it) => (
          <a key={it} href="#" style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: active === it ? "var(--red)" : "var(--ink)",
            borderBottom: active === it ? "2px solid var(--red)" : "2px solid transparent",
            paddingBottom: 2,
          }}>{it}</a>
        ))}
      </div>
    </nav>
  );
}
