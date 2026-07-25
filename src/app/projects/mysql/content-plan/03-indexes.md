# Article 03 — Secondary Indexes

| Field | Value |
| --- | --- |
| **Number** | 03 |
| **Title** | Secondary Indexes |
| **Slug** | `mysql-indexes` *(existing stub)* |
| **Tier** | Foundations (Part A) |
| **Audience** | Web app programmers; spoon-fed; real-world request/response use cases |
| **Published path** | `/posts/mysql-indexes/` |
| **Depends on** | 01 schema/types, 02 primary keys & clustered index |
| **Feeds** | 04 SELECT/filtering, 05 pagination, 10 EXPLAIN, **15 covering indexes** (tease only) |

---

## Intent

Teach the everyday performance lever: **InnoDB B-tree secondary indexes** — what they store, how the optimizer uses them, and how to design **composite** indexes that match real API filters without drowning writes.

After this article, a reader should be able to:

1. Explain why a secondary index entry carries the **primary key** (and why a fat PK makes every secondary index heavier — callback to article 02).
2. Design a composite index column order for a multi-filter list endpoint using the **leftmost-prefix** rule.
3. Judge **selectivity** at a gut level (status flags vs. user_id) and resist “index every column the ORM touched.”
4. Name the write/space/optimizer costs of **over-indexing**, and know that invisible indexes exist for safe removal experiments.
5. Spot common ORM footguns (wrong column order, leading wildcards, functions on columns, redundant single-column indexes).

**Explicitly out of scope (tease, don’t steal):** covering indexes, index-only scans, and Index Condition Pushdown — those are article **15**. Mention once as “next level: sometimes the index can answer the query without visiting the row.” Full `EXPLAIN` literacy is article **10**; here we only show enough to verify “is my index used?”

---

## Real-world hook

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

**Citation rule:** paraphrase mechanisms; link node URLs; **never paste Oracle manual prose**.

---

## Article structure

Suggested H2/H3 progression for `page.mdx`. Interactive component imports **first**, matching RAID / neural-net / 8-puzzle.

1. **Interactive: Composite Index Prefix Matcher** (client demo at top)
2. **The list endpoint that got slow** — hook; show the ORM SQL; state the promise of the article
3. **Refresh: clustered vs secondary** (tight callback to 02)
   - Secondary leaf = indexed columns + PK columns
   - Lookup path: secondary B-tree → PK → clustered row
   - Short PK ⇒ cheaper secondaries
4. **What a B-tree secondary index is good for**
   - Equality, ranges, `IN`, `BETWEEN`, `IS NULL`
   - `LIKE 'foo%'` yes; `LIKE '%foo'` no (from B-tree characteristics)
   - Sorting/grouping on a leftmost prefix (preview of article 05)
5. **Composite indexes & the leftmost-prefix rule** *(heart of the article)*
   - Sorted concatenation mental model
   - Works: `(a)`, `(a,b)`, `(a,b,c)` for index on `(a,b,c)`
   - Fails: filter on `b` alone, or `b`+`c` without `a`
   - Range on a middle column “stops” useful use of later columns (teach with examples; keep EXPLAIN light)
6. **Selectivity: why `status` alone is a trap**
   - Value-group / cardinality intuition (`SHOW INDEX`, article 10 for plans)
   - Put equality high-selectivity / always-present filters left; low-cardinality flags after tenant/user scope
7. **One composite vs many single-column indexes**
   - Index Merge exists but is often a consolation prize
   - ORM “index every FK” migrations
8. **The cost of indexes you don’t need**
   - Extra space; slower INSERT/UPDATE/DELETE; optimizer choice overhead
   - Invisible indexes for removal experiments
9. **How ORMs create bad indexes** (practical gallery)
10. **Teaser: covering indexes** (½ paragraph → article 15)
11. **Worked schema: tickets / orders** (copy-pasteable)
12. **Tie-back checklist** + next: article 04 (filters/projection) and 05 (ORDER BY + LIMIT need index alignment)

Target length: medium essay — deeper than a cheat sheet, not an InnoDB internals tome.

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

### Name

**Composite Index Prefix Matcher** (working title)  
Path: `src/components/interactive/mysql-index-prefix/` (or `mysql-composite-index/`)  
Import at top of `src/app/posts/mysql-indexes/page.mdx`, same pattern as:

```mdx
import { MysqlIndexPrefixMatcher } from "@/components/interactive/mysql-index-prefix";

<MysqlIndexPrefixMatcher />
```

### What the user does

1. Sees a fixed example table `tickets` with columns: `org_id`, `status`, `assignee_id`, `updated_at`, `id` (PK).
2. Chooses a **composite index** by reordering 2–4 columns (drag chips or click-to-build), e.g. `(org_id, status, assignee_id, updated_at)`.
3. Toggles **WHERE predicates** on/off and sets operators (`=`, `>`, `IN`, `LIKE 'x%'`, `LIKE '%x'`).
4. Optionally toggles an **ORDER BY** matching trailing columns (light touch toward article 05).

### What they see

- A clear verdict: **Uses index** / **Partial prefix (N of M parts)** / **Cannot use this index for lookup**.
- Highlighted leftmost usable prefix vs. “skipped” or unused suffix columns.
- A one-line plain-English reason (“`assignee_id` is filtered but `org_id` is missing — not a left prefix”).
- Optional **selectivity scrubber** (secondary control): slider for distinctness of `status` vs `assignee_id` showing a toy “rows touched” estimate — reinforces why low-cardinality leading columns are weak, without pretending to be the real optimizer.

### Insight produced

Muscle memory for left-prefix + equality-before-range, before they read EXPLAIN. Fits the site’s “play first, then theory” pattern (RAID phases, puzzle scrubber, neural-net sliders).

### Implementation notes

- `"use client"` top-level component; pure TypeScript rules engine (unit-test the matcher like `raid.test.ts` / `search.test.ts`).
- No live MySQL — deterministic teaching model; label it as a simplified prefix rule, not the full cost-based optimizer.
- Visual language: match existing interactives (bordered ink controls, mono readouts, restrained motion — highlight prefix segments, don’t purple-glow).
- Keep covering-index / “Using index” out of the demo UI (article 15).

### Stretch (only if cheap)

Toggle “three single-column indexes” vs “one composite” and show a cartoon cost: Index Merge path vs single range scan — qualitative, not a benchmark.

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

```ruby
# Rails-ish: add_index per FK without thinking about query shapes
add_index :tickets, :org_id
add_index :tickets, :status
add_index :tickets, :assignee_id
# better: add_index :tickets, [:org_id, :status, :assignee_id, :updated_at]
```

```python
# Django: index_together / Meta.indexes should match filter() order
# Bad: separate indexes only because ForeignKey(db_index=True) defaults
```

Show one Prisma `@@index([orgId, status, assigneeId, updatedAt])` vs multiple `@id`/`@index` on each field.

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

## Open questions / author notes

1. **Title vs stub metadata:** Stub/`content.ts` still says “Indexes” / EXPLAIN-heavy blurb. When publishing, retitle toward **Secondary Indexes** and rewrite description to match (composite, selectivity, left-prefix); move EXPLAIN emphasis to article 10.
2. **Series order vs current stubs:** Hub currently lists `mysql-select` → `mysql-indexes` → `mysql-joins`. Master plan wants 01→02→**03 indexes**→04 select. Decide whether this post assumes 02 already published or needs a self-contained clustered/secondary primer paragraph (recommend: short primer + link).
3. **Interactive scope freeze:** Prefix matcher alone is enough for v1. Selectivity scrubber is high value but can ship as a second control in the same component — avoid building a fake optimizer.
4. **ORDER BY depth:** Article 05 owns pagination; here only show that `ORDER BY` matching a usable index prefix avoids filesort — one example, no keyset deep dive.
5. **Index Merge tone:** Mention as “sometimes MySQL intersects/unions multiple indexes; don’t rely on it as your schema design.” Resist algorithm detail.
6. **Histogram / `innodb_stats_*`:** Tempting rabbit hole via `index-statistics`. Keep to cardinality intuition; defer histograms to article 10 or a later ops note.
7. **UNIQUE secondary indexes:** Worth a short callout for `email` / `token_hash` (correctness + lookup), distinct from performance composites.
8. **Descending indexes / `ASC`/`DESC` mixes:** One sentence + link; real `ORDER BY updated_at DESC` behavior is clearer in article 05.
9. **Legal/tone:** Paraphrase only; link refman URLs; no Oracle text blocks.
10. **Demo copy:** Label simplified rules so pedants don’t file bugs when real optimizer picks a scan anyway (stats, row estimates, `LIMIT`, buffering).
11. **Migration story:** `CREATE INDEX` ≈ `ALTER TABLE`; online DDL cost → article 18. Don’t promise “just add an index in prod” without that caveat.
12. **Working title alternatives if SEO matters:** “Secondary Indexes in MySQL,” “Composite Indexes & Left Prefix” — slug stays `mysql-indexes`.

---

## Drafting checklist (when writing the post)

- [ ] Replace stub MDX; import interactive at top
- [ ] Update `content.ts` title/description/art if needed
- [ ] Cross-link 02 (PK/clustered), 04 (SELECT), 05 (pagination), 10 (EXPLAIN), 15 (covering)
- [ ] Cite 6–10 refman URLs inline where claims are made
- [ ] Unit-test prefix-matching rules
- [ ] Manual pass: mobile layout of chip/reorder UI
- [ ] No covering-index deep dive; no EXPLAIN encyclopedia
`)
