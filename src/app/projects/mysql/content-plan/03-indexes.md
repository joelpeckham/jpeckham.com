# Article 03 — Secondary Indexes

| Field | Value |
| --- | --- |
| **Number** | 03 |
| **Title** | Composite Indexes & the Left Prefix *(clarity over short; slug unchanged)* |
| **Slug** | `mysql-indexes` *(existing stub)* |
| **Tier** | Foundations (Part A) |
| **Audience** | Web app programmers; spoon-fed; real-world request/response use cases |
| **Published path** | `/posts/mysql-indexes/` |
| **Depends on** | 01 schema/types, 02 primary keys & clustered index |
| **Feeds** | 04 SELECT/filtering, 05 pagination, 10 EXPLAIN, **15 covering indexes** (tease only) |
| **Status** | Shipped draft — MDX + 3 demos 2026-07-25 |

---

## Author decisions (locked)

| Call | Decision |
| --- | --- |
| **Open** | Cold open on the tenant inbox / list API (no BetterRX anecdote this article). |
| **Main schema** | Multi-tenant **tickets**. Secondary short example: “my orders” (`customer_id`, `created_at`). |
| **Tenant lead** | Almost every tickets composite starts with `org_id`. Orders example shows the non-tenant twin of the same pattern. |
| **Teaching style** | Prose stays tight; **demos carry** left-prefix / selectivity / composite-vs-singles muscle memory. |
| **Optional filters** | **Nuanced:** design for the common path; name when a second index earns its keep vs when one workhorse + accept weaker optional paths. |
| **Teasers (04/05/10/15)** | Explain the idea clearly in a short beat; do **not** deep-dive covering, EXPLAIN literacy, or keyset pagination. |
| **ORM** | **Eloquent / Laravel first** (day job). Short contrasts for Prisma / Rails / Django. |
| **ORM footguns (dealer’s)** | Eloquent `$table->index()` / `foreignId()->index()` pile-up; wrong `index([...])` order vs query scopes; `whereDate` / `whereYear` (functions); `LIKE '%…%'`; redundant singles that Index Merge won’t save. |
| **Demos (ship)** | (1) Left-prefix matcher w/ equality-before-range preset, (2) Selectivity scrubber, (3) Composite vs singles. **Cut** secondary bounce meter (art. 02 already owns it — one prose callback + link). |
| **Tone** | Match article 02 — casual/jokey, first person. |
| **Title** | Lean clarity: **Composite Indexes & the Left Prefix** (hub blurb can keep “Secondary Indexes” as series name). |
| **Length** | Allow longer than a 10-minute skim when composite / optional-filter nuance needs worked examples. |

---

## Authoring contract

- **Status:** Shipped draft — MDX + demos landed; humanizer pass done 2026-07-25.
- **Voice:** First person, casual/jokey, flowing prose (art. 02 level). Run humanizer pass (`~/.cursor/skills/humanizer`) before publish.
- **No formulaic stamps:** No `**Why bother:**`, “App consequence:”, or “Things to Play With” laundry lists — weave motivation into paragraphs.
- **Citations:** IEEE `<Cite n={…} />` in prose + `<References items={[…]} />` at bottom. Source technical claims; paraphrase refman only.
- **Interactives:** Exactly the three shipped demos above, mid-article next to their beat (motivate → explain → embed). Keep UI playful; label math as illustrative.
- **House defaults:** Integer cents for money; ULID `CHAR(26)` public ids; `utf8mb4` / `utf8mb4_0900_ai_ci`. **This article:** Eloquent snippets primary; Prisma/Rails/Django one-liners for contrast.
- **Length:** Prefer complete teaching over arbitrary skim time; still cut anything that doesn’t earn space.

---

## Intent

Teach the everyday performance lever: **InnoDB B-tree secondary indexes** — what they store, how the optimizer uses them, and how to design **composite** indexes that match real API filters without drowning writes.

After this article, a reader should be able to:

1. Explain why a secondary index entry carries the **primary key** (and why a fat PK makes every secondary index heavier — callback to article 02).
2. Design a composite index column order for a multi-filter list endpoint using the **leftmost-prefix** rule.
3. Judge **selectivity** at a gut level (status flags vs. user_id) and resist “index every column the ORM touched.”
4. Name the write/space/optimizer costs of **over-indexing**, and know that invisible indexes exist for safe removal experiments.
5. Spot common ORM footguns (wrong column order, leading wildcards, functions on columns, redundant single-column indexes).

**Explicitly out of scope (deep dives elsewhere):** covering indexes / ICP → **15**; full `EXPLAIN` literacy → **10**; keyset pagination & deep `ORDER BY` → **05**. Each gets a clear short teaser so readers know the name and why they’ll care later — not a half-article.

---

## Real-world hook

**Cold open** with the inbox/list story (then series beat + what today owns). No day-job anecdote this piece.

**Opening scenario — tenant inbox / admin list API:**

A SaaS app (think Intercom-style inbox, Linear issue list, Shopify admin orders, Stripe Dashboard payments) exposes:

`GET /api/orgs/:orgId/tickets?status=open&assigneeId=…&q=…&cursor=…`

At 50 rows this is instant with a table scan. At 5M tickets it becomes the p99 that pages ops. The ORM (Eloquent, ActiveRecord, Prisma, Django ORM, Hibernate) happily emits:

```sql
WHERE organization_id = ? AND status = ? AND assignee_id = ?
ORDER BY updated_at DESC
LIMIT 50
```

Teams then “fix” it by adding three single-column indexes (`organization_id`, `status`, `assignee_id`) because the migration generator or a well-meaning teammate indexed every foreign key. Reads stay mediocre; every ticket update now maintains three extra B-trees; `status` alone is nearly useless (two or three values).

**The insight this article owns:** one composite index with the right left-prefix — e.g. `(organization_id, status, assignee_id, updated_at)` — usually beats a pile of skinny indexes for that endpoint. Column order is a product decision: which filters are always present vs. optional.

**Secondary hooks (short callouts later in the piece):**

- **GitHub / GitLab issue boards** — filter by project + state + labels; wrong prefix means “filter by label alone” never uses the index.
- **E-commerce order history** (`customer_id` + `created_at`) — classic web pattern; indexing only `created_at` helps nobody’s “my orders” page.
- **Auth session / API key lookup** by `token_hash` — high-selectivity single-column index; contrast with low-selectivity `is_active` boolean indexes ORMs love to create.
- **Multi-tenant SaaS** (Heroku add-ons, Render, Fly apps with per-tenant rows) — almost every secondary index should *start* with `tenant_id` / `org_id` if every query scopes that way.

---

## Primary documentation sources

Local corpus: `sources/mysql-refman-9.7/nodes/<id>.md`. Cite public HTML in the published post.

### Core (must read while drafting)

| Node id | Title | URL |
| --- | --- | --- |
| `innodb-index-types` | Clustered and Secondary Indexes | https://dev.mysql.com/doc/refman/9.7/en/innodb-index-types.html |
| `mysql-indexes` | How MySQL Uses Indexes | https://dev.mysql.com/doc/refman/9.7/en/mysql-indexes.html |
| `multiple-column-indexes` | Multiple-Column Indexes | https://dev.mysql.com/doc/refman/9.7/en/multiple-column-indexes.html |
| `optimization-indexes` | Optimization and Indexes | https://dev.mysql.com/doc/refman/9.7/en/optimization-indexes.html |
| `column-indexes` | Column Indexes | https://dev.mysql.com/doc/refman/9.7/en/column-indexes.html |
| `index-btree-hash` | Comparison of B-Tree and Hash Indexes | https://dev.mysql.com/doc/refman/9.7/en/index-btree-hash.html |
| `create-index` | CREATE INDEX Statement | https://dev.mysql.com/doc/refman/9.7/en/create-index.html |
| `index-extensions` | Use of Index Extensions | https://dev.mysql.com/doc/refman/9.7/en/index-extensions.html |

### Supporting (cite selectively)

| Node id | Title | URL | Why |
| --- | --- | --- | --- |
| `where-optimization` | WHERE Clause Optimization | https://dev.mysql.com/doc/refman/9.7/en/where-optimization.html | When indexes beat scans; constant tables; index-only teaser |
| `index-statistics` | Index Statistics Collection | https://dev.mysql.com/doc/refman/9.7/en/index-statistics.html | Selectivity / value-group size intuition; `SHOW INDEX` cardinality |
| `index-merge-optimization` | Index Merge Optimization | https://dev.mysql.com/doc/refman/9.7/en/index-merge-optimization.html | Why multiple single-column indexes ≠ a good composite |
| `invisible-indexes` | Invisible Indexes | https://dev.mysql.com/doc/refman/9.7/en/invisible-indexes.html | Safe way to test dropping over-indexes in prod |
| `verifying-index-usage` | Verifying Index Usage | https://dev.mysql.com/doc/refman/9.7/en/verifying-index-usage.html | Bridge to EXPLAIN (article 10) |
| `innodb-indexes` | InnoDB Indexes (section hub) | https://dev.mysql.com/doc/refman/9.7/en/innodb-indexes.html | Parent section context |

### Deliberately light / defer

- `index-condition-pushdown-optimization`, covering-index discussion in `mysql-indexes` → **article 15**
- Full `EXPLAIN` / `using-explain` → **article 10**
- Fulltext / spatial / multi-valued JSON indexes → later articles (17+)
- Online DDL cost of `ADD INDEX` → **article 18** (one-line mention: adding indexes isn’t free in production)

**Citation rule:** paraphrase mechanisms; cite with `<Cite />` / `<References />`; **never paste Oracle manual prose**.

---

## Article structure

Suggested H2 spine for `page.mdx` — sentence-case, conversational. Scatter the **three** demos mid-article; no mega-lab at the top.

1. **Cold open: the list endpoint that got slow** — inbox hook + the three-skinny-indexes “fix”; thesis that column order is a product decision.
2. **Series beat + what today covers** — secondary indexes as the daily lever; one-paragraph callback to 02 (clustered leaf, bounce, fat PK tax) with link — no bounce demo.
3. **Refresh: clustered vs secondary** — secondary leaf = indexed cols + PK; two-hop lookup; short PK ⇒ cheaper secondaries (prose only).
4. **What a B-tree secondary index is good for** — equality, ranges, `IN`, prefix `LIKE`; short preview that matching `ORDER BY` avoids filesort (→ 05).
5. **Composite indexes and the leftmost-prefix rule** *(heart)* — sorted concatenation; works/fails; range freezes suffix. *(Embed **Left-prefix matcher** + equality-before-range preset.)*
6. **Optional filters without lying to yourself** — common path vs optional `assigneeId`; when one workhorse index is enough; when a second index with a clear role is worth the write tax. Nuance over slogans.
7. **Selectivity: why `status` alone is a trap** — cardinality intuition; tenant scope first. *(Embed **Selectivity scrubber**.)*
8. **One composite vs many single-column indexes** — Index Merge as consolation prize; Eloquent FK indexing habits. *(Embed **Composite vs singles**.)*
9. **The cost of indexes you don’t need** — write amplification; invisible indexes for safe drops; one-line online DDL → 18.
10. **How ORMs create bad indexes** — Eloquent-first gallery; Prisma / Rails / Django contrasts.
11. **Teasers (short, clear)** — covering (15); “is my index used?” via `EXPLAIN` key/key_len (10); list `ORDER BY`+`LIMIT` alignment (05).
12. **Worked schema: tickets + short orders** — copy-pasteable examples from below.
13. **Tie-back checklist** — practical review questions.
14. **References** — IEEE list; bridge to 04.

Length: as long as the composite / optional-filter teaching needs; cut padding, not examples.

---

## Deep-dive beats

Mechanisms and pitfalls that elevate this beyond “add an index”:

- **Secondary → clustered double lookup.** Every non-covering secondary access pays: find keys in secondary tree, then fetch rows by PK. Readers should *feel* why selecting `*` on a wide table amplifies cost (without fully teaching covering indexes yet).
- **PK columns are silently appended** (`index-extensions`). An index on `(status)` is internally like `(status, id)` (or the full PK). Sometimes `WHERE status = ? AND id = ?` can use that extension — neat, but don’t design around it; design explicit composites for real filters.
- **Left-prefix is not “any subset.”** Skipping the leading column breaks the range walk. Optional filters in APIs are the hard case: if `assigneeId` is optional, you may need `(org_id, status, updated_at)` as the workhorse and accept less help when assignee is present — or two indexes with clear roles, not five.
- **Range columns freeze the suffix.** `WHERE org_id = ? AND created_at > ? AND status = ?` with index `(org_id, created_at, status)` — `status` may not narrow the index range the way people hope. Teach “equalities first, range last” as a default heuristic for web list queries.
- **OR across different columns** often cannot use one composite (`last_name = x OR first_name = y`). Point at Index Merge / redesign / application split; don’t deep-dive merge algorithms.
- **Selectivity is relative to the query.** `status = 'open'` might be 5% globally but 80% inside one org’s open queue — stats and histograms matter later; for Foundations, teach “measure with production-shaped data,” not magic percentages. Note that the old “30% of rows” scan rule is obsolete (`where-optimization`).
- **Functions and type mismatches disable indexes.** `WHERE YEAR(created_at) = 2026`, `WHERE LOWER(email) = ?`, comparing INT to quoted strings inconsistently, mismatched charsets on join keys — classic ORM/raw-SQL footguns.
- **Leading wildcard / non-constant `LIKE`** → no B-tree range.
- **Prefix indexes on strings** (`email(20)`) shrink index size but can hurt uniqueness and selectivity; mention briefly via `create-index` / `column-indexes`; don’t center the article on them.
- **Over-indexing write amplification.** Every secondary index is another tree to update on INSERT and on UPDATE of indexed columns — ties to article 07 writes.
- **Invisible indexes** as the production-safe “what if we drop this?” tool before article 18 DDL drama.
- **ANALYZE TABLE after adding indexes** when persistent stats are on (`create-index` note) — one practical ops sentence.
- **Small tables lie.** Indexes matter less until cardinality and working set grow; encourage testing with realistic volumes (seed scripts, not 20-row fixtures).

---

## Interactive feature

**Folder:** `src/components/interactive/mysql-indexes/` (re-export shared chrome from `schema-byte-budget/shared.tsx` as needed).

**Ship three demos** — fun, single-focus, mid-article. Client-only; label math as illustrative (≠ `INFORMATION_SCHEMA` / real optimizer).

### 1. Left-prefix matcher *(must — the toy people will poke)*

- **Goal:** Muscle memory for which `WHERE` shapes use a composite’s left prefix; bake in equality-before-range.
- **Placement:** Composite / left-prefix section.
- **UX:** Fixed `tickets` table; drag/reorder index columns (chips); toggle predicates (`=`, `>`, `IN`, `LIKE 'x%'`, `LIKE '%x'`). Verdict: uses index / partial prefix / cannot use — highlight usable prefix segments + one-line reason. Include a **preset**: `org_id = ? AND updated_at > ? AND status = ?` on `(org_id, updated_at, status)` so `status` freezes after the range.
- **Keep simple:** Pure TS rules engine; unit-test matcher; no covering / “Using index” UI (article 15).

### 2. Selectivity scrubber *(slider candy)*

- **Goal:** Feel why low-cardinality `status` alone is weak vs scoped under `org_id`.
- **Placement:** Selectivity section.
- **UX:** Sliders for distinctness of `status` vs `assignee_id` (and org scope on/off); toy “rows touched” estimate. Label as illustrative.

### 3. Composite vs singles *(cartoon fight)*

- **Goal:** Three FK indexes ≠ one composite for the inbox query shape.
- **Placement:** Composite vs singles section.
- **UX:** Toggle “three single-column indexes” vs “one composite”; qualitative Index Merge vs single range scan — playful, not an optimizer sim.

### Cut

- **Secondary bounce meter** — art. 02 already has `SecondaryBounceDemo` / `PkWidthTaxDemo`. Prose callback + link only.

**Implementation notes:** `"use client"`; shared ink/mono visual language; motivate in prose before each embed; 2–3 intentional motions per demo max.

---

## Example queries / schemas

Original teaching examples (do **not** copy Oracle’s `test(last_name, first_name)` verbatim; same *ideas*, different domain).

### Schema A — multi-tenant tickets

```sql
CREATE TABLE tickets (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id        BIGINT UNSIGNED NOT NULL,
  status        ENUM('open','pending','resolved') NOT NULL,
  assignee_id   BIGINT UNSIGNED NULL,
  subject       VARCHAR(200) NOT NULL,
  updated_at    DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_org_status_assignee_updated
    (org_id, status, assignee_id, updated_at)
) ENGINE=InnoDB;
```

**Uses the index (left prefixes):**

```sql
-- list open tickets for an org
SELECT id, subject, assignee_id, updated_at
FROM tickets
WHERE org_id = 42 AND status = 'open'
ORDER BY updated_at DESC
LIMIT 50;

-- same + assignee
SELECT id, subject, updated_at
FROM tickets
WHERE org_id = 42 AND status = 'open' AND assignee_id = 7
ORDER BY updated_at DESC
LIMIT 50;
```

**Does not use that index for lookup:**

```sql
-- missing leading org_id
SELECT id FROM tickets WHERE status = 'open' AND assignee_id = 7;

-- OR across non-prefix shapes
SELECT id FROM tickets
WHERE org_id = 42 AND (status = 'open' OR assignee_id = 7);
```

### Schema B — “my orders” (equality + range)

```sql
CREATE TABLE orders (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id  BIGINT UNSIGNED NOT NULL,
  created_at   DATETIME(6) NOT NULL,
  total_cents  INT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_customer_created (customer_id, created_at)
) ENGINE=InnoDB;

-- good: equality then range on trailing column
SELECT id, created_at, total_cents
FROM orders
WHERE customer_id = 1001
  AND created_at >= '2026-01-01'
ORDER BY created_at DESC
LIMIT 20;
```

### Anti-patterns gallery (short SQL + ORM pseudocode)

```sql
-- low-selectivity solo index (often worse than useless under write load)
KEY idx_status (status)

-- function disables index
WHERE DATE(updated_at) = '2026-07-24'

-- leading wildcard
WHERE subject LIKE '%refund%'
```

```php
// Eloquent / Laravel — the day-job default for this article
// Bad: foreignId() / $table->index() per column because the migration generator said so
$table->foreignId('org_id')->constrained()->index();
$table->index('status');
$table->index('assignee_id');
// Better: one composite that matches the list query / scope
$table->index(['org_id', 'status', 'assignee_id', 'updated_at']);
// Footgun: whereDate('updated_at', $day) → DATE(updated_at) = ? (index-unfriendly)
```

```prisma
// Prisma contrast: @@index order must match filter order
@@index([orgId, status, assigneeId, updatedAt])
```

```ruby
# Rails contrast
add_index :tickets, [:org_id, :status, :assignee_id, :updated_at]
```

```python
# Django contrast: Meta.indexes / Index() should match filter() order
# Bad: relying only on ForeignKey(db_index=True) defaults
```

### Tiny verification snippet (pointer to article 10)

```sql
EXPLAIN
SELECT id FROM tickets
WHERE org_id = 42 AND status = 'open';
-- Teach: look at key / key_len for now; full decode later
```

---

## Tie-back checklist

Close the article by forcing internals → app outcomes:

- [ ] **List/detail endpoints:** For every hot `WHERE` + `ORDER BY` + `LIMIT` query, write down the composite that matches it — before adding three random indexes.
- [ ] **Multi-tenant scope first:** If every query includes `org_id` / `tenant_id`, it almost always leads the index.
- [ ] **ORM defaults are not a strategy:** `ForeignKey`/`belongs_to` auto-indexes are starting points; audit them against actual routes.
- [ ] **Optional filters:** Design for the common path; don’t expect one index to perfect every query-string combination.
- [ ] **Writes pay rent:** Each secondary index slows inserts/updates of indexed columns — measure on write-heavy tables (sessions, events, tickets).
- [ ] **Fat PKs tax every secondary index** — link back to article 02 UUID-vs-BIGINT choice.
- [ ] **Verify with EXPLAIN** on staging data that looks like prod (article 10); use **invisible indexes** before dropping suspects in prod.
- [ ] **Covering indexes later:** If the index is used but p99 is still high because every hit bounces to the clustered row, that’s the door into article 15 — not a reason to spam more skinny indexes today.

---

## Author notes (still true; not open)

1. **`content.ts`:** Publish with title **Composite Indexes & the Left Prefix**; description already points at composites / left-prefix / selectivity — tweak if needed. EXPLAIN stays article 10.
2. **Assumes art. 02 published:** Short clustered/secondary primer + link; do not rebuild B-tree school.
3. **ORDER BY:** One example that matching a usable prefix avoids filesort; keyset → 05.
4. **Index Merge tone:** Consolation prize, not schema design. No algorithm deep dive.
5. **Histograms / `innodb_stats_*`:** Cardinality intuition only; defer to 10.
6. **UNIQUE secondaries:** Short callout for `email` / `token_hash` (correctness + lookup) vs performance composites.
7. **DESC indexes:** One sentence; real `ORDER BY updated_at DESC` → 05.
8. **Legal:** Paraphrase only; IEEE cites; no Oracle prose blocks.
9. **Demo honesty:** Label simplified rules — real optimizer may still scan (stats, `LIMIT`, buffering).
10. **Migrations:** `CREATE INDEX` ≈ `ALTER TABLE`; online cost → 18; don’t promise free prod adds.

---

## Drafting checklist (when writing the post)

- [ ] Replace stub MDX; scatter the three demos mid-article (motivate → explain → embed)
- [ ] Cold open = inbox list API; Eloquent-first ORM gallery
- [ ] Optional-filters section with nuance (common path vs second index)
- [ ] Clear short teasers for 05 / 10 / 15 — no deep dives
- [ ] Humanizer pass on prose before publish
- [ ] First-person voice check; no formulaic section stamps
- [ ] `<Cite />` + `<References />` for technical claims
- [ ] Update `content.ts` title to **Composite Indexes & the Left Prefix**
- [ ] Cross-link 02, 04, 05, 10, 15, 18
- [ ] Unit-test prefix-matching rules (incl. range-freezes-suffix preset)
- [ ] Manual pass: mobile layout of chip/reorder UI
- [ ] README arc row: working title + status when shipped
