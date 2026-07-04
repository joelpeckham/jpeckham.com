/* global React */
const { Shape } = window.PeckhamBauhausDesignSystem_b025da;

function Hero() {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: "var(--paper)", borderBottom: "3px solid var(--ink)" }}>
      {/* decorative shapes */}
      <div style={{ position: "absolute", right: -60, top: -60, width: 260, height: 260, borderRadius: "50%", background: "var(--blue)" }} />
      <div style={{ position: "absolute", right: 200, bottom: -80, width: 220, height: 110, borderRadius: "220px 220px 0 0", background: "var(--yellow)", border: "3px solid var(--ink)" }} />
      <div style={{ position: "absolute", left: "42%", top: 40, width: 0, height: 0, borderLeft: "44px solid transparent", borderRight: "44px solid transparent", borderBottom: "80px solid var(--red)" }} />

      <div style={{ position: "relative", maxWidth: "var(--page-max)", margin: "0 auto", padding: "var(--space-9) var(--space-6)" }}>
        <span className="label" style={{ color: "var(--grey)" }}>Developer · Designer · Huntington, WV</span>
        <h1 style={{
          fontFamily: "var(--font-display)", fontWeight: "var(--w-black)",
          fontSize: "var(--text-mega)", lineHeight: "var(--lh-tight)",
          letterSpacing: "var(--track-tight)", textTransform: "uppercase",
          margin: "var(--space-3) 0 var(--space-5)", maxWidth: 900,
        }}>
          I build<br />things that<br /><span style={{ color: "var(--red)" }}>ship.</span>
        </h1>
        <p style={{ maxWidth: 520, fontSize: "var(--text-lg)", lineHeight: "var(--lh-normal)" }}>
          Joel Peckham — full-stack engineer crafting fast, legible interfaces
          and the systems behind them.
        </p>
        <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-6)", flexWrap: "wrap" }}>
          <a href="#work" style={btn("var(--ink)", "var(--paper)")}>View work →</a>
          <a href="#contact" style={btn("transparent", "var(--ink)")}>Get in touch</a>
        </div>
      </div>
    </section>
  );
}

function btn(bg, fg) {
  return {
    display: "inline-flex", alignItems: "center", gap: "0.6em",
    padding: "16px 34px", fontFamily: "var(--font-mono)", fontSize: "var(--text-body)",
    fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
    color: fg, background: bg, border: "2px solid var(--ink)",
    boxShadow: "var(--shadow-hard)",
  };
}
window.Hero = Hero;
