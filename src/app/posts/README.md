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
