/* global React */
function Footer() {
  return (
    <footer style={{ background: "var(--ink)", color: "var(--paper)", borderTop: "3px solid var(--red)", padding: "var(--space-7) var(--space-6)" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.6em", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "var(--text-h4)", textTransform: "uppercase", letterSpacing: "var(--track-tight)" }}>
          <span style={{ width: 16, height: 16, background: "var(--yellow)", borderRadius: "50%", border: "2px solid var(--paper)" }} />
          Joel Peckham
        </span>
        <div style={{ display: "flex", gap: "var(--space-5)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          <a href="#">GitHub</a><a href="#">LinkedIn</a><a href="#">Email</a>
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--grey)" }}>© 2026 · Built by hand</span>
      </div>
    </footer>
  );
}
window.Footer = Footer;
