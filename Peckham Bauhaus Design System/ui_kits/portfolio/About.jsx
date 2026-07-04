/* global React */
const { SectionHeading, Tag, Shape } = window.PeckhamBauhausDesignSystem_b025da;

const STACK = ["TypeScript", "React", "Node", "Rust", "Go", "Postgres", "WASM", "CSS", "Figma"];

function About() {
  return (
    <section id="about" style={{ background: "var(--ink)", color: "var(--paper)", padding: "var(--space-9) var(--space-6)" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "var(--space-8)", alignItems: "start" }}>
        <div>
          <span className="label" style={{ color: "var(--yellow)" }}>03 · About</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: "var(--w-black)", fontSize: "var(--text-h1)", textTransform: "uppercase", letterSpacing: "var(--track-tight)", lineHeight: "var(--lh-snug)", margin: "var(--space-3) 0 var(--space-5)" }}>
            A decade of<br /> shipping software.
          </h2>
          <p style={{ fontSize: "var(--text-lg)", lineHeight: "var(--lh-normal)", maxWidth: 560, color: "var(--paper)" }}>
            I&rsquo;m Joel — an engineer who cares as much about the seams as the surface.
            I work end-to-end: design systems, front-of-stack interfaces, and the
            services that feed them. I like small teams, sharp constraints, and code
            that reads like prose.
          </p>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-6)" }}>
            {STACK.map((t) => <Tag key={t} variant="outline" style={{ color: "var(--paper)", borderColor: "var(--paper)" }}>{t}</Tag>)}
          </div>
        </div>
        <div style={{ position: "relative", height: 320 }}>
          <div style={{ position: "absolute", right: 0, top: 0, width: 200, height: 200, borderRadius: "50%", background: "var(--red)" }} />
          <div style={{ position: "absolute", left: 0, bottom: 0, width: 180, height: 90, borderRadius: "0 0 180px 180px", background: "var(--blue)" }} />
          <div style={{ position: "absolute", right: 80, bottom: 40, width: 0, height: 0, borderLeft: "50px solid transparent", borderRight: "50px solid transparent", borderTop: "90px solid var(--yellow)" }} />
        </div>
      </div>
    </section>
  );
}
window.About = About;
