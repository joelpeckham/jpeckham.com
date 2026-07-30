# Series & posts authoring

Posts live here as MDX. A **series** is a project hub plus an ordered list of topic posts, wired together in [`src/lib/content.ts`](../../lib/content.ts).

| Piece | Route | Role |
| --- | --- | --- |
| Hub project | `/projects/<hub>/` | Series homepage (outline + intro) |
| Topic post | `/posts/<slug>/` | One article (optional interactive demo) |
| Catalog | `src/lib/content.ts` | Metadata, order, prev/next |

Prev/next and “Series home” come from `seriesId` + `seriesList.postSlugs` — you do not hardcode them in MDX.

## Add a topic to an existing series (e.g. Learn MySQL)

1. **Catalog** — in `src/lib/content.ts`, append a `ContentItem` to `posts`:
   - `kind: "post"`
   - `seriesId: "mysql"` (or the series id)
   - Unique `slug` / `href` (e.g. `/posts/mysql-transactions/`)
   - Cover `art`, `title`, `description`, `date`, optional `tags`
2. **Order** — append that slug to the matching entry in `seriesList` → `postSlugs`.
3. **Page** — create:
   - `src/app/posts/<slug>/layout.tsx` — `createArticleLayout("<slug>")`
   - `src/app/posts/<slug>/page.mdx` — article body
4. **Demo (optional)** — put a client component under `src/components/interactive/…` and import it at the top of the MDX (same pattern as RAID / neural-net projects).

Layout stub:

```tsx
import { createArticleLayout } from "@/components/article-shell";

const { metadata, Layout } = createArticleLayout("mysql-transactions");
export { metadata };
export default Layout;
```

## Start a new series

1. Add a **hub** project to `projects` (`href: "/projects/<hub>/"`).
2. Add a `seriesList` entry: `id`, `title`, `description`, `hubSlug`, `postSlugs`.
3. Add `src/app/projects/<hub>/layout.tsx` + `page.mdx`. On the hub page, render the outline with:

```mdx
import { SeriesTopicList } from "@/components/series-topic-list";

<SeriesTopicList seriesId="your-series-id" />
```

4. Add topic posts as above.

Standalone posts (no series) work the same way without `seriesId` — they only get the normal “← All Posts” breadcrumb.

## Writing voice (Learn MySQL)

House style for this series — **STE-adapted**, not strict ASD-STE100. Keep personality; enforce clarity and tight vocabulary.

### Voice

- Write almost entirely in **first person** (“I”, not “we”). Reader “you” is fine for teaching.
- Casual, story-driven, a little jokey. Fun to read — not a sterile flight manual.
- Hand-hold on *why this matters*, but weave that into the paragraph. Do **not** use formulaic section endings like `**Why bother:** …` or repeated “App consequence” stamps.
- Don’t narrate obvious site chrome (e.g. “prev/next links at the bottom”). Readers will find them.

### Clarity (STE-inspired)

- Prefer **short sentences** (one main idea; aim ≤ ~25 words).
- Prefer **active voice** and direct verbs.
- Prefer simple connectors: `and`, `but`, `so`, `then`, `if`, `when`, `because`.
- Prefer concrete nouns/verbs. Avoid filler (`leverage`, `robust`, `seamless`, `empower`, `utilize`, etc.).
- Prefer **one term per concept** across the series (`clustered index`, `secondary index`, `leftmost prefix` / `left prefix`, `sargable`, `projection`). No synonym churn.
- Avoid stacked clauses, noun piles, and multi-hedge phrases (“it might be somewhat helpful to…”).

### Structure

- **Series openers** (especially article 1): welcome people to the series, say what today covers, and why the topic is worth an article — before diving into war stories or demos.
- Personal day-job anecdotes (BetterRx, etc.) are great when they earn their place in the *relevant* section. Clarify that it’s your day job for readers who don’t know you. Don’t force the anecdote as the cold open unless it’s the best hook.
- Aim ~10 minutes for a skimming casual reader unless the topic truly needs more.

### Citations

- Prefer **IEEE-style superscript cites** over inline doc hyperlinks (links on `code` look awful).
- Use [`Cite`](../../components/cite.tsx) / [`References`](../../components/cite.tsx): `<Cite n={1} />` in prose, `<References items={[…]} />` at the bottom.
- Number in order of first appearance. External docs only in the list; keep in-site series links as normal markdown links.
- Source technical claims (JS number precision, MySQL type semantics, etc.) with authoritative docs (MDN, MySQL refman, Stripe, etc.) — don’t assert footguns without a cite.
- Original teaching only. Local refman under `sources/mysql-refman-*/` is gitignored research; paraphrase and link the public HTML. See [`sources/README.md`](../../../sources/README.md).

### Interactives

- Client demos live under `src/components/interactive/…`.
- Prefer **several small demos** scattered through the article next to the section they teach — not one mega-lab at the top (articles 1–2 set this pattern).
- Don’t drop a toy with a “Things to Play With” laundry list. **Motivate** why the visual matters, **explain** the UI in prose, then embed.
- Keep each demo single-focus and visually simple. Cut demos that don’t earn their keep.
- Keep math honest but labeled (illustrative ≠ `INFORMATION_SCHEMA`).
- Before publish, run a **humanizer** pass on the prose (`~/.cursor/skills/humanizer`) so the piece doesn’t sound like chatbot output.
