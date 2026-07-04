/* global React */
const { SectionHeading, Input, Textarea, Button } = window.PeckhamBauhausDesignSystem_b025da;

function Contact() {
  const [sent, setSent] = React.useState(false);
  return (
    <section id="contact" style={{ background: "var(--paper)", padding: "var(--space-9) var(--space-6)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <SectionHeading index="04" eyebrow="Say hello" title="Start a project" accent="var(--red)" align="center" />
        <div style={{ marginTop: "var(--space-7)" }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", border: "3px solid var(--ink)", background: "var(--yellow)", boxShadow: "var(--shadow-hard-lg)" }}>
              <h3 style={{ textTransform: "uppercase", margin: 0 }}>Message sent ✱</h3>
              <p style={{ margin: "var(--space-2) 0 0" }}>I&rsquo;ll reply within a day or two.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
              <Input label="Name" placeholder="Ada Lovelace" accent="var(--red)" required />
              <Input label="Email" type="email" placeholder="you@studio.com" accent="var(--blue)" required />
              <div style={{ gridColumn: "1 / -1" }}>
                <Textarea label="Message" rows={5} placeholder="Tell me about the project…" accent="var(--red)" required />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                <Button as="button" variant="red" size="lg">Send it →</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
window.Contact = Contact;
