import React from "react";

/**
 * Textarea — multi-line sibling of Input. Same bordered treatment
 * and accent focus behavior.
 */
export function Textarea({ label, id, accent = "var(--blue)", rows = 5, style = {}, ...rest }) {
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
      <textarea
        id={inputId}
        rows={rows}
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
          resize: "vertical",
          boxShadow: focus ? `3px 3px 0 ${accent}` : "none",
          transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
        }}
        {...rest}
      />
    </div>
  );
}
