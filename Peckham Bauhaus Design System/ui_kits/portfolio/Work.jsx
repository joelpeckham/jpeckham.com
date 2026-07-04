/* global React */
const { SectionHeading, Card, Tag, ArrowLink } = window.PeckhamBauhausDesignSystem_b025da;

const PROJECTS = [
  { n: "01", title: "Ledger", accent: "var(--red)", desc: "Realtime finance dashboard with a keyboard-first ledger and audit trail.", tags: ["TypeScript", "React", "Postgres"] },
  { n: "02", title: "Foundry", accent: "var(--blue)", desc: "Variable-font playground and specimen generator for type designers.", tags: ["WebGL", "Rust/WASM"] },
  { n: "03", title: "Signal", accent: "var(--yellow)", desc: "Self-hosted uptime + log aggregation with a zero-config agent.", tags: ["Go", "ClickHouse"] },
  { n: "04", title: "Atlas", accent: "var(--ink)", desc: "Map-based routing tool for field teams, offline-first PWA.", tags: ["Svelte", "MapLibre"] },
];

function Work() {
  return (
    <section id="work" style={{ background: "var(--paper)", padding: "var(--space-9) var(--space-6)" }}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto" }}>
        <SectionHeading index="02" eyebrow="Selected work" title="Projects" accent="var(--blue)" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--space-5)", marginTop: "var(--space-7)" }}>
          {PROJECTS.map((p) => (
            <Card key={p.n} accent={p.accent} interactive style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ fontSize: "var(--text-h3)", textTransform: "uppercase", margin: 0 }}>{p.title}</h3>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--grey)" }}>{p.n}</span>
              </div>
              <p style={{ color: "#3a352e", margin: "var(--space-3) 0 var(--space-4)", flex: 1 }}>{p.desc}</p>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
                {p.tags.map((t) => <Tag key={t}>{t}</Tag>)}
              </div>
              <ArrowLink href="#" color="var(--ink)">Case study</ArrowLink>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
window.Work = Work;
