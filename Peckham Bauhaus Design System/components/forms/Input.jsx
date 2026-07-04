import React from "react";

/**
 * Input — bordered text field with mono label. Sharp corners,
 * ink border, focus flips the border to an accent color.
 */
export function Input({ label, id, accent = "var(--blue)", style = {}, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", ...style }}>
      {label && (
        <label htmlFor={inputId} style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-meta)",
          letterSpacing: "var(--track-label)",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}>{label}</label>
      )}
      <input
        id={inputId}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-body)",
          color: "var(--ink)",
          background: "var(--white)",
          padding: "12px 14px",
          border: `2px solid ${focus ? accent : "var(--ink)"}`,
          borderRadius: "var(--radius-0)",
          outline: "none",
          boxShadow: focus ? `3px 3px 0 ${accent}` : "none",
          transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
        }}
        {...rest}
      />
    </div>
  );
}
