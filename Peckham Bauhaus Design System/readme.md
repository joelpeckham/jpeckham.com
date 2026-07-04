# Peckham Bauhaus Design System

A bold, Bauhaus-inspired design system for **Joel Peckham** — a developer
portfolio / personal site. Bright primary palette, heavy black rules, large
graphic type, and geometric shapes.

> **Sources.** This system was built from a written brief only — no codebase or
> Figma file was attached. Direction given: *"Personal website for Joel Peckham
> (developer portfolio), in the style of https://www.rudlundschwarm.at/ — bright
> color palette, bold shapes, large graphic text, Bauhaus inspired."* The
> reference site was used as visual inspiration, not copied. No real logo or
> brand assets were provided, so the mark is set in type (see Iconography).

---

## Content Fundamentals

**Voice** — first person, confident, plain-spoken. Joel talks about the work,
not himself. Short declarative sentences; the occasional fragment for punch.

- **Person:** "I build things that ship." "I work end-to-end." Visitors are
  addressed directly in CTAs ("Get in touch", "Tell me about the project").
- **Casing:** Display headlines and all mono labels/buttons are **UPPERCASE**.
  Body copy is sentence case. Never title-case running text.
- **Tone:** craftsman, not salesman — "code that reads like prose", "I care as
  much about the seams as the surface". Specific over generic.
- **Numbers as structure:** sections are indexed `01 / 02 / 03` in mono, used as
  a design device (see `Badge`, `SectionHeading`).
- **Emoji:** avoided. A single geometric glyph (`✱`, `→`) may stand in for an
  icon. Arrows (`→`) are the one recurring symbol — they live in links/buttons.
- **Micro-copy examples:** "View work →", "Case study", "Send it →",
  "Start a project", "Say hello", "© 2026 · Built by hand".

## Visual Foundations

- **Color:** Bauhaus primaries — red `#E1352A`, blue `#1F45D8`, yellow `#F7C000`
  — on a warm paper ground `#F1EBDD` with near-black ink `#141210`. Color is
  used in confident flat blocks, never gradients. One dark section (ink bg) per
  page provides contrast rhythm. See `tokens/colors.css`.
- **Type:** `Jost` (geometric grotesque, Futura lineage) for everything visible;
  `JetBrains Mono` for labels, eyebrows, buttons, tags, and code. Display runs
  at 900 weight, uppercase, tight tracking (`-0.02em`), line-height `0.9`. Body
  is Jost 400 at generous line-height. See `tokens/typography.css`.
- **Shapes:** circles, half-circles, quarter-circles, triangles, rings and bars
  are scattered as composition elements (`Shape` component). They bleed off
  edges and overlap. This is the system's signature energy.
- **Backgrounds:** flat paper or flat ink. No images, textures, or gradients.
  Depth comes from layered flat shapes and hard shadows, not blur.
- **Borders:** heavy ink rules are core — `2px` default, `3–4px` for structural
  dividers (nav, section bottoms, footer top). Everything is outlined.
- **Corners:** sharp. `--radius-0` everywhere except pills and true circles
  (`Badge shape="circle"`, decorative dots, shapes).
- **Shadows:** hard offset blocks with **no blur** (`4px 4px 0 ink`). This is
  the only shadow language — cards and buttons "lift" as solid blocks.
- **Motion:** quick and mechanical. Buttons *press* into their shadow on
  active (translate + shadow collapse, 120ms). Cards lift on hover. Arrows
  slide on link hover. Easing `cubic-bezier(0.2,0.8,0.2,1)`. No bounces, no
  parallax, no ambient loops.
- **Hover / press:** hover = lift (shadow grows, element moves up-left) or an
  ink underline slides in. Press = element moves *into* its shadow. Focus on
  fields flips the border to an accent color + drops a hard accent shadow.
- **Transparency / blur:** none. The system is opaque and flat by design.
- **Layout:** 12-col mental grid, `1240px` max page width, `2rem` gutters,
  `760px` reading measure. Big vertical rhythm between sections (`--space-9`).

## Iconography

- **No icon font or SVG icon set is used.** The brand is deliberately
  typographic + geometric. Where an icon would appear, use either a `Shape`
  primitive (geometric block) or a mono glyph.
- **Recurring glyphs:** the arrow `→` (links, buttons) and occasionally `✱`
  (accent/asterisk). These are typed characters, not images.
- **No logo asset provided.** The mark is the wordmark **JOEL PECKHAM** in Jost
  900 with a colored dot (`•`) preceding it — see `guidelines/brand-wordmark.card.html`
  and the `NavBar` / `Footer` components. Do not fabricate a logo; render the
  wordmark in type. If a real mark is later supplied, drop it into `assets/`.
- If a consumer genuinely needs UI glyphs (e.g. a settings screen), substitute
  **Lucide** (`https://unpkg.com/lucide-static`) — matching stroke weight to the
  2px border language — and note the substitution.

---

## Intentional additions

Because no source component inventory existed, a standard-but-minimal set was
authored, sized to a portfolio site rather than an app:

- **`Shape`** — the decorative geometric primitive; central to the aesthetic.
- **`SectionHeading`** — codifies the numbered-badge + eyebrow + rule pattern.
- **`ArrowLink`** / **`NavBar`** — the site's navigation vocabulary.
- Core: `Button`, `Tag`, `Badge`, `Card`, `Input`, `Textarea`.

## Fonts — substitution flag

⚠️ No brand font files were provided. **Jost** (Google Fonts) stands in for a
Futura-style geometric grotesque, and **JetBrains Mono** for the code voice.
If you have licensed brand fonts (e.g. real Futura, or a specific mono),
send them and we'll swap the `@font-face` sources in `tokens/fonts.css`.

---

## Index / Manifest

**Global CSS** — link `styles.css` (imports everything below):
- `tokens/fonts.css` — `@font-face` / webfont imports
- `tokens/colors.css` — palette + semantic color aliases
- `tokens/typography.css` — families, weights, type scale, tracking
- `tokens/spacing.css` — 8px spacing scale + layout tokens
- `tokens/effects.css` — radii, borders, hard shadows, motion
- `tokens/base.css` — element defaults

**Components** (`components/`, namespace `PeckhamBauhausDesignSystem_b025da`)
- `core/` — `Button`, `Tag`, `Badge`
- `layout/` — `Card`, `Shape`, `SectionHeading`
- `navigation/` — `NavBar`, `ArrowLink`
- `forms/` — `Input`, `Textarea`

**UI kits** (`ui_kits/`)
- `portfolio/` — single-page developer portfolio (Hero, Work, About, Contact,
  Footer) → `index.html`

**Guidelines / specimen cards** (`guidelines/`) — populate the Design System tab
(Colors, Type, Spacing, Brand groups).

**`SKILL.md`** — Agent-Skills-compatible entry point.
