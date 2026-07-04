import React from "react";

/**
 * Card — bordered surface with a hard offset shadow. Used for
 * projects, notes, contact blocks. Optional accent top-bar.
 */
export function Card({ children, accent, interactive = false, style = {}, ...rest }) {
  const [lift, setLift] = React.useState(false);
  return (
    <div
      onMouseEnter={() => interactive && setLift(true)}
      onMouseLeave={() => interactive && setLift(false)}
      style={{
        background: "var(--bg-surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--radius-0)",
        boxShadow: lift ? "var(--shadow-hard-lg)" : "var(--shadow-hard)",
        transform: lift ? "translate(-3px,-3px)" : "translate(0,0)",
        transition: "transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out)",
        overflow: "hidden",
        ...style,
      }}
      {...rest}
    >
      {accent && (
        <div style={{ height: 10, background: accent, borderBottom: "2px solid var(--ink)" }} />
      )}
      <div style={{ padding: "var(--space-5)" }}>{children}</div>
    </div>
  );
}
