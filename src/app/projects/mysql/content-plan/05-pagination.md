# 05 — Sorting, LIMIT & Pagination

| Field | Value |
| --- | --- |
| **Number** | 05 |
| **Title** | Sorting, LIMIT & Pagination |
| **Slug** | `mysql-pagination` |
| **Tier** | Foundations (Part A) |
| **Series position** | After SELECT/filtering (04); before JOINs (06). Depends on secondary indexes (03) and PK/clustered index (02). |
| **Published path** | `/posts/mysql-pagination/` |
| **Status** | Plan only |

---

## Authoring contract

- **Status:** Plan only — stub wired; article not written yet.
- **Voice:** First person, casual/jokey, flowing prose. Run humanizer pass (`~/.cursor/skills/humanizer`) before publish.
- **No formulaic stamps:** No `**Why bother:**`, “App consequence:”, or “Things to Play With” laundry lists — weave motivation into paragraphs.
- **Citations:** IEEE `<Cite n={…} />` in prose + `<References items={[…]} />` at bottom. Source technical claims; paraphrase refman only.
- **Interactives:** 3–5 small demos embedded **mid-article** next to the beat they teach (motivate → explain → embed). Cut demos that don’t clarify a tradeoff.
- **House defaults:** Integer cents for money; ULID `CHAR(26)` public ids; `utf8mb4` / `utf8mb4_0900_ai_ci`; Prisma as primary ORM in snippets.
- **Length:** ~10 minutes for a casual skim unless the topic truly needs more.

---

## Intent

Teach web app programmers why `ORDER BY … LIMIT offset, n` feels fine on page 1 and dies on page 10,000 — and how to replace it with index-backed keyset (seek) pagination that stays O(page size).

The reader should leave able to:

1. Design a composite index that satisfies both `WHERE` and `ORDER BY` so MySQL can avoid `filesort`.
2. Read `EXPLAIN` Extra for `Using filesort` vs index-ordered scan.
3. Explain why large `OFFSET` is slow even with a perfect index (discard work).
4. Implement stable keyset cursors for infinite-scroll / “load more” APIs, including ties on non-unique sort keys.
5. Know when classic page numbers are still acceptable (admin UIs, small result sets) vs when they are a production footgun.

**Non-goals:** full EXPLAIN literacy (article 10), covering indexes / ICP deep dive (15), isolation quirks of concurrent inserts during pagination (09/11 — mention briefly, defer).

---

## Real-world hook

Place the page-1 vs page-500 feed story in the section where OFFSET cost lands — not forced as a cold open unless it’s the best hook.

**Scenario:** A product feed / activity timeline / admin “Users” table.

```http
GET /api/posts?page=1&pageSize=20   → snappy
GET /api/posts?page=500&pageSize=20 → 10s, replica CPU pegged
```

ORM default:

```ts
// Prisma-ish / TypeORM-ish pattern everyone ships first
prisma.post.findMany({
  where: { status: "published" },
  orderBy: { createdAt: "desc" },
  skip: (page - 1) * pageSize,  // OFFSET
  take: pageSize,
});
```

**What the user feels:** Deep links to page 500, SEO “page=” crawlers, or an infinite scroll that secretly uses rising offsets after many “Load more” taps. Latency grows roughly with `offset + limit` rows examined, not with `limit`.

**Punchline for the open:** MySQL is not “slow at sorting page 500.” It is *obediently throwing away* the first 9,980 rows every request — and if the sort isn’t index-backed, it may sort a huge matching set first.

---

## Primary documentation sources

Cite with `<Cite />` / `<References />`. Local research corpus: `sources/mysql-refman-9.7/nodes/<id>.md` (gitignored; do not paste Oracle text into MDX).

### Core (must cite in article)

| Node id | Local file | Public URL | Why it matters for this post |
| --- | --- | --- | --- |
| `order-by-optimization` | `nodes/order-by-optimization.md` | https://dev.mysql.com/doc/refman/9.7/en/order-by-optimization.html | When an index satisfies `ORDER BY`; when a **filesort** is required; `sort_buffer_size`; EXPLAIN `Using filesort`; in-memory priority-queue filesort for `ORDER BY … LIMIT`. **There is no separate `filesort` node** — filesort is a subsection of this page. |
| `limit-optimization` | `nodes/limit-optimization.md` | https://dev.mysql.com/doc/refman/9.7/en/limit-optimization.html | Early-stop with `LIMIT`; filesort still materializes matching rows before taking top-N when sort isn’t indexed; **nondeterministic order** among ties with/without `LIMIT`; `prefer_ordering_index`. |
| `select` | `nodes/select.md` | https://dev.mysql.com/doc/refman/9.7/en/select.html | Syntax of `ORDER BY`, `LIMIT {[OFFSET,] row_count}` / `LIMIT row_count OFFSET offset`; offset is 0-based; prepared-statement placeholders for LIMIT. |
| `optimization-indexes` | `nodes/optimization-indexes.md` | https://dev.mysql.com/doc/refman/9.7/en/optimization-indexes.html | Chapter frame: indexes as the primary lever for SELECT performance (and the cost of over-indexing). |

### Supporting (cite where relevant)

| Node id | Public URL | Use in article |
| --- | --- | --- |
| `mysql-indexes` | https://dev.mysql.com/doc/refman/9.7/en/mysql-indexes.html | Indexes used **to sort/group** on a leftmost prefix — bridge from article 03. |
| `multiple-column-indexes` | https://dev.mysql.com/doc/refman/9.7/en/multiple-column-indexes.html | Composite `(filter…, sort…)` design for list endpoints. |
| `descending-indexes` | https://dev.mysql.com/doc/refman/9.7/en/descending-indexes.html | Mixed `ASC`/`DESC` `ORDER BY` and matching index definitions (feeds sorted `created_at DESC, id DESC`). |
| `explain` / `explain-output` | https://dev.mysql.com/doc/refman/9.7/en/explain.html · https://dev.mysql.com/doc/refman/9.7/en/explain-output.html | Reading Extra for filesort; preview of article 10. |
| `select-optimization` | https://dev.mysql.com/doc/refman/9.7/en/select-optimization.html | Parent chapter orientation (optional one-liner). |

### Teaching note on “filesort” naming

Readers see `Using filesort` in EXPLAIN and assume disk I/O. Clarify: filesort is the **extra sorting phase**; it may be fully in-memory (especially `ORDER BY non_indexed LIMIT n` with priority-queue optimization). Disk merge files appear when the sort does not fit (`Sort_merge_passes`, optimizer trace `filesort_summary`).

---

## Article structure

Suggested H2 outline — sentence-case, conversational. Scatter **named mini-demos** mid-article; no mega-scrubber at the top.

1. **Series beat + what today covers** — why `ORDER BY … LIMIT offset, n` dies on deep pages; bridge from 03/04 index alignment.
2. **Hook** — page 1 vs page 500; ORM `skip`/`offset` trap.
3. **What `ORDER BY` + `LIMIT` actually promise** — syntax; deterministic sort keys need a tie-breaker.
4. **Index-ordered scan vs filesort** — when MySQL can walk an index; `Using filesort` in Extra. *(Embed **Filesort vs index-ordered** toggle here.)*
5. **Why OFFSET pagination costs `offset + limit`** — discard semantics; crawlers. *(Embed **Offset vs keyset cost scrubber** here.)*
6. **Keyset / seek pagination** — `(sort_cols, id)` cursor; stable ties. *(Embed **Unstable sort ties** demo here.)*
7. **Indexes that make keyset fly** — composite left-prefix; `DESC` indexes. *(Optional **Feed index builder** preset — show `(status, created_at, id)`.)*
8. **API shapes** — page numbers vs cursors vs infinite scroll; total counts; `SQL_CALC_FOUND_ROWS` caution.
9. **Failure modes** — duplicates/skips under concurrent writes; ORM gotchas.
10. **Tie-back checklist** — when to keep OFFSET, when to migrate.
11. **References** — IEEE list; bridge to 06 (joins + pagination).

Target length: ~10 minutes skim; denser only on keyset SQL and index alignment.

---

## Deep-dive beats

Teach these mechanisms in order; weave web-app takeaways into the prose (no “App consequence:” stamps).

### Beat 1 — Deterministic sort keys

- SQL does **not** guarantee a total order unless `ORDER BY` columns uniquely identify rows.
- Refman point (`limit-optimization`): with ties, order of non-ordered columns is nondeterministic; **adding `LIMIT` can change which tied rows appear and in what order**.
- App takeaway: always append a unique tie-breaker (`id`, or PK) for pagination — `ORDER BY created_at DESC, id DESC`.

### Beat 2 — Index satisfies ORDER BY

From `order-by-optimization`, emphasize patterns that matter for list endpoints:

| Pattern | Index idea | Avoids filesort? |
| --- | --- | --- |
| `ORDER BY a, b` | `(a, b)` | Often yes (if cheaper than scan+sort) |
| `WHERE a = ? ORDER BY b` | `(a, b)` | Yes when range/ref on `a` is selective |
| `WHERE a = ? AND b > ? ORDER BY b` | `(a, b)` | Yes — classic keyset shape |
| `ORDER BY a DESC, b ASC` (mixed) | Matching descending index | Yes with `descending-indexes` |
| `ORDER BY ABS(x)` / expression | — | Filesort |
| Different indexes for WHERE vs ORDER BY | — | Often filesort after filter |

Also: InnoDB secondary indexes implicitly include PK columns — useful when projecting `id` + sort keys (tie to article 02/03).

App takeaway: the index for a feed is usually `(tenant_id, created_at, id)` or `(status, created_at, id)`, not a lonely `created_at` index.

### Beat 3 — Filesort mechanics (enough, not a buffer-pool essay)

- Extra phase: read rows → sort tuples → return.
- Sort buffer grows up to `sort_buffer_size`; may spill to temp files.
- Tuple modes (from optimizer trace / refman): `<sort_key, rowid>` vs packed additional fields — motivates **narrow SELECT lists** for sort-heavy queries.
- Priority-queue optimization: `ORDER BY … LIMIT n` can keep only top-n in memory — still must **examine** matching rows if the sort isn’t index-ordered.
- EXPLAIN: Extra contains `Using filesort` ⇔ index did not satisfy ORDER BY.

App takeaway: fixing filesort with an index helps page 1; it does **not** fix deep OFFSET by itself.

### Beat 4 — LIMIT early-stop vs OFFSET discard

From `limit-optimization`:

- With index order + `LIMIT n`, MySQL can stop after n rows — very fast.
- With filesort + `LIMIT n`, matching rows are largely gathered/sorted before top-n.
- With `LIMIT offset, n` on an index-ordered plan, the engine still **walks/skips `offset` rows** then returns `n`. Cost ≈ f(offset + n), not f(n).

**Why page 10000 is slow (the headline):**

```
pageSize = 20
page     = 10000
OFFSET   = 199980

Work ≈ examine/skip 199980 + return 20
```

Even at microseconds per row, that’s milliseconds-to-seconds of pure discard — amplified by secondary→PK lookups, buffer pool misses, and replica load. Keyset jumps to the seek position in the B-tree and reads ~20 rows.

### Beat 5 — Keyset / seek pagination

**Cursor** = last row’s sort tuple from the previous page.

Descending “newest first” feed:

```sql
-- page 1
SELECT id, title, created_at
FROM posts
WHERE status = 'published'
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- page 2+ (cursor = last row's created_at, id)
SELECT id, title, created_at
FROM posts
WHERE status = 'published'
  AND (
    created_at < ?
    OR (created_at = ? AND id < ?)
  )
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Equivalent row-constructor form (often clearer; verify plan):

```sql
WHERE status = 'published'
  AND (created_at, id) < (?, ?)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

(Document collation/direction carefully; tuple comparison must match ASC/DESC. Teaching preference: expanded `OR` form first for clarity, then tuple form.)

**Stable cursors for infinite scroll APIs:**

- Return `nextCursor` opaque token (base64 of `{createdAt, id}`), not page numbers.
- Client sends `?cursor=…&limit=20`.
- Cursor is **stable** under inserts *ahead* of the cursor (new posts appear on a refresh of page 1, not as dupes mid-scroll) — mention MVCC/isolation lightly; deep dive later.
- Deletes/updates of already-seen rows can still create gaps; usually acceptable for feeds. For exact “page 5 of 12” admin UIs, OFFSET may be the product requirement despite cost.

### Beat 6 — Total counts and “page N of M”

- `COUNT(*)` over the same filter is a separate (often expensive) query — cache or approximate for large feeds.
- Historical `SQL_CALC_FOUND_ROWS` / `FOUND_ROWS()`: mention as deprecated/discouraged pattern; prefer explicit count or omit totals for infinite scroll.
- UI: prefer “Load more” / cursor over numbered pages once datasets are large.

### Beat 7 — `prefer_ordering_index` cameo

Short aside from `limit-optimization`: with `LIMIT`, optimizer may prefer an ordered index (e.g. PRIMARY) over a filtering index + filesort. Sometimes wrong for selective filters. Point at `optimizer_switch=prefer_ordering_index`; don’t derail — link forward to EXPLAIN article.

---

## Interactive feature

**Folder:** `src/components/interactive/mysql-pagination/` (shared chrome from `schema-byte-budget/shared.tsx` as needed).

**Rule:** If a demo doesn’t clarify a tradeoff, cut it and let prose carry the beat. Client-only; label cost model as illustrative (≠ benchmark).

### 1. Offset vs keyset cost scrubber

- **Goal:** Make asymptotic difference felt — offset work grows linearly; keyset stays ~flat.
- **Placement:** Section 5 (OFFSET discard semantics).
- **UX:** Row strip + page/offset scrubber; side-by-side lanes for offset (growing skip region) vs keyset (seek + short scan). Live counters: `rows examined ≈ offset + limit` vs `≈ limit`.

### 2. Filesort vs index-ordered

- **Goal:** Teach that fixing filesort helps page 1 but doesn’t fix deep OFFSET alone.
- **Placement:** Section 4 (index-ordered scan vs filesort).
- **UX:** Toggle “index-ordered” vs “filesort first”; show pre-pass over matching rows before either strategy returns a page.

### 3. Unstable sort ties

- **Goal:** Show duplicates/skips when `ORDER BY created_at` lacks unique tie-breaker.
- **Placement:** Section 6 (keyset / stable cursors).
- **UX:** Two pages of toy rows with tied timestamps; flip between bad vs `ORDER BY created_at DESC, id DESC`.

### 4. Feed index preset (optional)

- **Goal:** Connect `(status, created_at, id)` composite to feed + keyset shape.
- **Placement:** Section 7 (indexes for keyset).
- **UX:** Static or lightly interactive index diagram aligned to the article’s `posts` schema.

**Implementation notes:** Pure client math; unit-test cost functions; a11y on scrubber; cap conceptual N at 100k.

---

## Example queries / schemas

### Schema (blog / activity feed)

```sql
CREATE TABLE posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_id BIGINT UNSIGNED NOT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  title VARCHAR(200) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_feed (status, created_at, id),
  KEY idx_author_feed (author_id, created_at, id)
) ENGINE=InnoDB;
```

Rationale: `idx_feed` supports `WHERE status = ? ORDER BY created_at DESC, id DESC` and keyset predicates on `(created_at, id)` under a status equality. Mention DESC index variant if teaching mixed/reverse scans:

```sql
KEY idx_feed_desc (status, created_at DESC, id DESC)
```

### Offset pagination (anti-pattern at scale)

```sql
SELECT id, title, created_at
FROM posts
WHERE status = 'published'
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 199980;   -- page 10000 @ 20/page
```

### Keyset pagination

```sql
SELECT id, title, created_at
FROM posts
WHERE status = 'published'
  AND (
    created_at < @cursor_created_at
    OR (
      created_at = @cursor_created_at
      AND id < @cursor_id
    )
  )
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

### EXPLAIN checkpoints (for prose / screenshots)

```sql
EXPLAIN
SELECT id, title, created_at
FROM posts
WHERE status = 'published'
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- Hope: key = idx_feed (or idx_feed_desc), Extra without Using filesort

EXPLAIN
SELECT id, title, created_at
FROM posts
WHERE status = 'published'
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 199980;
-- Same plan shape often — but runtime still skips OFFSET rows

EXPLAIN
SELECT id, title, created_at
FROM posts
WHERE status = 'published'
ORDER BY title   -- not leading in idx_feed
LIMIT 20;
-- Expect: Using filesort (unless another index helps)
```

### App-layer cursor sketch

```ts
type Cursor = { createdAt: string; id: string };

// encode/decode opaque cursor; never trust client fields without re-validating types
function nextPage(rows: Post[], limit: number): { items: Post[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor =
    rows.length === limit && last
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: String(last.id) })
      : null;
  return { items, nextCursor };
}
```

### Unstable sort demo (include in article)

```sql
-- Bad: ties on created_at → duplicates/skips across pages
ORDER BY created_at DESC
LIMIT 20 OFFSET 20;

-- Good
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 20;
```

---

## Tie-back checklist

Reader / author verification before shipping the post:

- [ ] Opened with a real list/feed/API latency story, not abstract SQL.
- [ ] Explained index-ordered `ORDER BY` vs `Using filesort` with EXPLAIN Extra.
- [ ] Cited `order-by-optimization` (including filesort subsection), `limit-optimization`, `select`, and `optimization-indexes` with public 9.7 URLs.
- [ ] Made “page 10000 is slow” concrete: discard `offset` rows, not “MySQL can’t sort.”
- [ ] Showed keyset SQL with **unique tie-breaker** and matching composite index.
- [ ] Covered infinite-scroll cursor token shape (opaque, stable, `nextCursor`).
- [ ] Called out nondeterministic ties when `ORDER BY` is incomplete.
- [ ] Noted when OFFSET is still fine (small admin tables, true page-number UX, rare deep links).
- [ ] Scattered mini-demos mid-article (offset scrubber, filesort toggle, tie-breaker at minimum)
- [ ] Humanizer pass; first-person voice; `<Cite />` + `<References />`
- [ ] Forward-links: indexes (03), SELECT (04), EXPLAIN (10); no orphaned jargon.
- [ ] No verbatim Oracle manual text in MDX; original teaching voice only.
- [ ] ORM section mentions `skip`/`offset` defaults and how to express keyset in raw SQL / cursor APIs.

---

## Open questions / author notes

1. **Tuple compare vs expanded OR:** Prefer teaching expanded `OR` for DESC keysets first (fewer “does `(a,b) < (?,?)` match DESC?” footguns), then show tuple form once readers have EXPLAIN confidence. Confirm chosen form’s plan on MySQL 9.7 before publishing screenshots.

2. **Descending indexes:** Article 03 may already introduce them. Here, only as much as needed for `created_at DESC, id DESC` feeds — avoid duplicating the full descending-indexes essay; link back.

3. **`SQL_CALC_FOUND_ROWS`:** Deprecated; worth a callout box so copy-paste Stack Overflow doesn’t sneak in. Confirm current 9.7 status/language in `select` / release notes when writing.

4. **Concurrent writes during scroll:** How much isolation detail? Recommendation: one short “new rows show up on refresh, not mid-cursor” paragraph; point to 09/11 for phantoms/MVCC. Don’t promise perfect snapshot pagination without `REPEATABLE READ` transaction spanning pages (usually wrong for APIs anyway).

5. **Interactive scale:** Cap conceptual N at 100k; label as model; scatter demos — don’t merge into one top mega-scrubber.

6. **Prisma / Drizzle / SQLAlchemy examples:** Pick one primary ORM for snippets (site audience lean?) + one raw SQL. Avoid boiling the ocean of client libraries.

7. **Seek method naming:** Use “keyset pagination” in H2s; mention aliases “seek method,” “cursor pagination” in the intro so search lands.

8. **Filesort node gap:** Research list asked for `filesort` — **no standalone node exists** in 9.7 Info split; content lives under `order-by-optimization`. Cite that URL; optionally note the Info anchor/section title “Use of filesort to Satisfy ORDER BY.”

9. **Series hub:** Ensure `seriesList` / hub eventually includes `mysql-pagination` at position 5 (per master README); out of scope for this plan file alone but don’t forget at publish time.

10. **Optional stretch:** Tiny optimizer-trace JSON excerpt (`filesort_summary`) as an advanced callout — only if it doesn’t require article 10 first. Otherwise defer.

---

## Drafting checklist (when writing the post)

- [ ] Replace stub MDX; scatter 3–4 mini-demos mid-article
- [ ] Humanizer pass; first-person voice; `<Cite />` + `<References />`
- [ ] Prisma-primary ORM snippets; keyset SQL with unique tie-breaker
- [ ] Cross-link 03, 04, 06, 10; defer full EXPLAIN depth

---

## Draft metadata (for frontmatter when publishing)

```yaml
title: "Sorting, LIMIT & Pagination"
description: "Why OFFSET pagination dies on deep pages, how ORDER BY uses indexes or filesort, and how keyset cursors keep infinite-scroll APIs fast."
series: mysql
order: 5
# interactive: scattered mini-demos (offset-scrubber, filesort-toggle, tie-breaker)
```
