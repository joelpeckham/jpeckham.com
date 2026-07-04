import React from "react";

/**
 * ArrowLink — inline link with a mono label and a sliding arrow.
 * Underlines via an animated ink bar on hover.
 */
export function ArrowLink({ children, href = "#", color = "var(--ink)", style = {}, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5em",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color,
        borderBottom: `2px solid ${hover ? color : "transparent"}`,
        paddingBottom: 2,
        transition: "border-color var(--dur) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      {children}
      <span style={{
        display: "inline-block",
        transform: hover ? "translateX(5px)" : "translateX(0)",
        transition: "transform var(--dur) var(--ease-out)",
      }}>→</span>
    </a>
  );
}
