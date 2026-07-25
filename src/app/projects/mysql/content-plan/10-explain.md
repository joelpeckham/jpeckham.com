# Article 10 — EXPLAIN & Reading the Optimizer

| Field | Value |
| --- | --- |
| **Number** | 10 |
| **Title** | EXPLAIN & Reading the Optimizer |
| **Slug** | `mysql-explain` |
| **Tier** | Foundations (Part A capstone) |
| **Role in arc** | Literacy tool that closes Part A — readers should leave able to diagnose the plans behind the schema/index/query/join/pagination patterns from articles 1–9 before Part B internals. |
| **Published path** | `/posts/mysql-explain/` |
| **Interactive** | Annotated EXPLAIN explorer (sample plans + hover decode; before/after index compare) |

---

## Intent

Teach web developers to **read** `EXPLAIN` and `EXPLAIN ANALYZE` as a daily debugging skill—not as an optimizer internals thesis.

After this article, a reader should be able to:

1. Run the right flavor of EXPLAIN (`TRADITIONAL` table, `FORMAT=TREE`, `EXPLAIN ANALYZE`) for a slow list/detail/join endpoint.
2. Decode the columns that matter for app work: **access type** (`type`), **key** / `possible_keys` / `key_len`, **rows** (+ `filtered`), and **Extra**.
3. Spot common plan smells in ORM-generated SQL (full scans, wrong index, filesort, temp table, join order blow-ups).
4. Decide the next fix: index, rewrite, pagination shape, or “estimates are lying—refresh stats / use ANALYZE.”
5. Use EXPLAIN as the **capstone checklist** for everything learned in Part A (schema → indexes → SELECT → sort/limit → joins → writes lightly).

**Out of scope (defer):** full cost-model math, optimizer trace deep dive, histogram authoring, covering-index / ICP as primary topics (tease → articles 15 / later), Performance Schema forensics (article 20), lock/MVCC interpretation of plans (11–12).

---

## Real-world hook

**Scene:** A SaaS inbox / orders admin page. Staging is fine; production p95 for `GET /api/orders?status=open&sort=-created_at&page=40` is 800ms–2s. The ORM (Prisma / Rails ActiveRecord / Django) “looks fine”—eager-loaded associations, one query for the list. Someone pastes `EXPLAIN` into Slack. Nobody knows which columns to fear.

**Companies / surfaces that make this concrete:**

- **Shopify-style order admin** — filter by shop + status, sort by created_at, offset page deep into history.
- **GitHub-style issue list** — composite filters (`repo_id`, `state`, `updated_at`) where the ORM picks a weak single-column index.
- **Stripe-style dashboard** — joins customer → invoices → line items; nested-loop fanout when the inner table is `type: ALL`.
- **Internal Rails admin** — `includes` that becomes a join with `ORDER BY` on a non-indexed column → `Using filesort` + large `rows`.

**The emotional beat:** EXPLAIN is not “DBA magic.” It is the same skill as reading a flamegraph—except the “frames” are access methods and estimated row counts. Part A ends when you can open a plan and say, with confidence: *this is scanning too much, sorting in memory/disk, or joining in the wrong order—and here’s the index/query change to try.*

---

## Primary documentation sources

Cite the public HTML from published posts. Local research corpus: `sources/mysql-refman-9.7/nodes/<id>.md` (gitignored; do not paste Oracle prose into MDX).

### Core (must cite / teach from)

| Node id | Public URL | Why it matters for this article |
| --- | --- | --- |
| `explain` | https://dev.mysql.com/doc/refman/9.7/en/explain.html | Statement forms: plan EXPLAIN vs DESCRIBE-table; `FORMAT` (`TRADITIONAL` / `JSON` / `TREE`); `EXPLAIN ANALYZE`; what statements are explainable; `explain_format` defaults in 9.7. |
| `explain-output` | https://dev.mysql.com/doc/refman/9.7/en/explain-output.html | Column dictionary (`type`/`access_type`, `key`, `rows`, `filtered`, `Extra`); join-type ladder (`system` → `ALL`); Extra values web-devs hit daily. |
| `using-explain` | https://dev.mysql.com/doc/refman/9.7/en/using-explain.html | Practical “why EXPLAIN”: add indexes, check join order; pointer to `ANALYZE TABLE` when indexes “should” be used but aren’t. |
| `select-optimization` | https://dev.mysql.com/doc/refman/9.7/en/select-optimization.html | Framing: SELECT tuning is the top priority for dynamic web pages; EXPLAIN as the investigation tool once basics fail. |
| `nested-loop-joins` | https://dev.mysql.com/doc/refman/9.7/en/nested-loop-joins.html | Mental model for reading multi-row EXPLAIN: outer → inner loops; why inner `ALL` is catastrophic. |

### Supporting (cite lightly; don’t derail)

| Node id | Public URL | Use |
| --- | --- | --- |
| `optimization` | https://dev.mysql.com/doc/refman/9.7/en/optimization.html | Chapter umbrella — “optimize statements before server knobs.” |
| `order-by-optimization` | https://dev.mysql.com/doc/refman/9.7/en/order-by-optimization.html | Decode `Using filesort`; when indexes satisfy `ORDER BY` (ties to article 05). |
| `hash-joins` | https://dev.mysql.com/doc/refman/9.7/en/hash-joins.html | TREE/`EXPLAIN ANALYZE` show hash joins; traditional table often hides them—teach “use TREE when joins look weird.” |
| `analyze-table` | https://dev.mysql.com/doc/refman/9.7/en/analyze-table.html | Stale stats → bad `rows` estimates → wrong plans; one paragraph + checklist item. |
| `explain-extended` | https://dev.mysql.com/doc/refman/9.7/en/explain-extended.html | Optional: `SHOW WARNINGS` after EXPLAIN for rewritten form (ORM opacity). |
| `explain-for-connection` | https://dev.mysql.com/doc/refman/9.7/en/explain-for-connection.html | Optional ops note: plan for a running connection (prod caution). |
| `controlling-optimizer` | https://dev.mysql.com/doc/refman/9.7/en/controlling-optimizer.html | Mention-only: hints / `optimizer_switch` exist; not the default app fix. |
| `index-condition-pushdown-optimization` | https://dev.mysql.com/doc/refman/9.7/en/index-condition-pushdown-optimization.html | Decode `Using index condition` as a teaser → article 15. |
| `where-optimization` | https://dev.mysql.com/doc/refman/9.7/en/where-optimization.html | Tie sargability failures (article 04) to `type: ALL` / unused `possible_keys`. |

**Citation rule:** paraphrase + link; never paste Oracle wording into the published post.

---

## Article structure

Proposed MDX flow (top interactive, then narrative). Keep spoon-fed: one new EXPLAIN idea per section, always with a web-app SQL example.

1. **Hook** — Slow orders list; paste EXPLAIN; what “good enough” looks like for an API handler.
2. **Interactive** — Annotated EXPLAIN explorer (see below); invite readers to hover columns before reading the essay.
3. **What EXPLAIN is (and isn’t)** — Planned access path vs measured runtime; DESCRIBE-table synonym trap; EXPLAIN does not “make it fast.”
4. **Three output modes you’ll actually use**
   - Default / `FORMAT=TRADITIONAL` — tabular, one row per table (join order = read order).
   - `FORMAT=TREE` — iterator tree; hash joins visible.
   - `EXPLAIN ANALYZE` — runs the query; estimated vs actual rows/time (use carefully in prod).
5. **Column decoder (the literacy core)** — walk `type`, keys, `rows`/`filtered`, `Extra` with a single running example that gets fixed mid-article.
6. **Access-type ladder for apps** — focus `const` / `eq_ref` / `ref` / `range` / `index` / `ALL` (mention others exist; don’t catalog everything).
7. **Extra flags that mean money** — `Using filesort`, `Using temporary`, `Using index`, `Using where`, `Using index condition`, join buffer / hash join notes.
8. **EXPLAIN ANALYZE: estimates vs reality** — when `rows` lies; loops; “actual time”; when to trust ANALYZE over EXPLAIN.
9. **ORM plan smells gallery** — 5–6 annotated before/after plans (ActiveRecord / Prisma / Django-flavored SQL, engine-agnostic).
10. **Part A capstone checklist** — map symptoms back to articles 1–9.
11. **What not to do yet** — hints, optimizer trace, covering-index rabbit holes → Part B / 15 / 20.
12. **Further reading** — linked refman nodes.

**Length target:** long-form tutorial (~2.5–4k words) + interactive; denser than early Part A posts because it’s a synthesis piece.

---

## Deep-dive beats

Teach these ideas in order. Each beat should end with “so in your app…”

### Beat A — EXPLAIN is a plan, ANALYZE is a rehearsal

- Plain `EXPLAIN` asks the optimizer what it *would* do; it does not execute the statement (aside from planning).
- `EXPLAIN ANALYZE` **executes** and reports iterator timing + actual rows vs estimates (`explain`).
- App implication: use EXPLAIN freely in staging; treat ANALYZE like running the query (lock/IO/cache warming). Prefer a sampled prod replica for scary queries.
- Formats: traditional table is the literacy UI; TREE/ANALYZE for joins and hash joins (`explain`, `hash-joins`).

### Beat B — Read join order top-to-bottom

- From `explain-output`: tables appear in the order MySQL reads them (nested-loop mental model from `nested-loop-joins`).
- Multiply estimated `rows` (adjusted by `filtered`) down the stack to feel fanout.
- App implication: an ORM join that puts the large table first with `type: ALL` is the classic “admin page death.”

### Beat C — Access type (`type` / `access_type`) as a severity scale

Teach a short, opinionated ladder for web apps (best → worst among common cases):

| type | App English | Typical cause |
| --- | --- | --- |
| `const` / `system` | Point lookup by PK/UNIQUE constants | Detail-by-id endpoint done right |
| `eq_ref` | At most one row per outer row via PK/UNIQUE | FK join to parent |
| `ref` | Equality on non-unique (or prefix) index | `WHERE user_id = ?` |
| `range` | Bounded index scan | `BETWEEN`, `IN (...)`, `>`, status enums with range |
| `index` | Full index tree walk (sometimes covering) | “Better than ALL, still suspicious on big tables” |
| `ALL` | Full table scan | Missing/unusable index, function-wrapped column, low selectivity choice |

Skip deep treatment of `fulltext`, `index_merge`, `unique_subquery`, etc.—footnote “exists; search when you see it.”

### Beat D — Keys: possible vs chosen vs prefix length

- `possible_keys` = candidates; `key` = chosen (or `NULL` = no index help).
- `key` not in `possible_keys` can mean covering/index-only path (`explain-output`)—tease article 15; don’t expand.
- `key_len` ≈ how much of a composite index was used (left-prefix story from article 03).
- App implication: ORM filter order / column order mismatches → short `key_len`, residual filter, high `rows`.

### Beat E — `rows` and `filtered` are guesses (InnoDB)

- `rows` = estimated rows examined; InnoDB estimates are approximate (`explain-output`).
- `filtered` % → rows passed to next table ≈ `rows × filtered / 100`.
- When the plan looks “fine” but the app is slow: run `EXPLAIN ANALYZE` and compare estimated vs actual; consider `ANALYZE TABLE` (`using-explain`, `analyze-table`).
- App implication: empty-vs-prod data skew in local Docker is why “works on my machine” plans differ.

### Beat F — Extra: the three red flags + two green ones

**Red (investigate):**

- `Using filesort` — extra sort pass; usually `ORDER BY` not satisfied by index (`order-by-optimization`, article 05).
- `Using temporary` — temp table (often `GROUP BY`/`ORDER BY` shape mismatch, distinct, some unions).
- Inner-table `ALL` or huge `rows` with join buffer messages — nested-loop / hash-join cost bombs.

**Green / nuanced:**

- `Using index` — index-only (covering); good signal, full story in article 15.
- `Using where` — residual filter after access method; normal, but alarming if paired with `ALL`/`index` when you expected selectivity (`explain-output` warning).
- `Using index condition` — ICP; mention, defer depth.

Manual’s own advice to watch for filesort + temporary (`explain-output`) should become a sticky callout in the post.

### Beat G — ORM-generated plan smells (gallery)

Concrete smells to annotate (SQL shape, not framework fanfic):

1. **`SELECT *` list + sort** — wide rows, filesort, no covering; fix projection + composite `(filter…, sort_col)`.
2. **Offset pagination page N** — high `rows` examined; EXPLAIN looks “same” as page 1 but ANALYZE time grows (article 05).
3. **N+1 that became one fat join** — still bad if join order + missing FK index → nested `ALL`.
4. **OR across columns** — `index_merge` or `ALL`; sometimes rewrite to `UNION`.
5. **Function on column** — `WHERE DATE(created_at) = ?` → can’t use index → `ALL`/`range` fail.
6. **Implicit cast / charset mismatch** — index present in `possible_keys` but not chosen; `key NULL`.
7. **`EXISTS` / correlated subquery** — `DEPENDENT SUBQUERY` in `select_type`; sometimes rewrite to join (light touch; joins were article 06).

### Beat H — Capstone: the Part A diagnostic loop

Close with a ritual:

1. Capture SQL (ORM log / `to_sql` / slow query log).
2. `EXPLAIN` → decode type/key/rows/Extra.
3. If estimates dubious → `EXPLAIN ANALYZE` on safe data.
4. Fix the earliest Part A lever that matches the smell (index → query shape → pagination → join).
5. Re-EXPLAIN; compare before/after (interactive supports this).
6. Only then consider hints / server knobs / Part B tools.

---

## Interactive feature

### Name

**Annotated EXPLAIN Explorer**  
Suggested component path: `src/components/interactive/explain-explorer/` (mirror RAID / puzzle-solver pattern: `"use client"`, imported at top of MDX).

### Primary UX (ship this)

1. **Plan picker** — 4–6 curated sample plans (traditional tabular JSON fixtures), each labeled with a web scenario:
   - “Orders list, no index”
   - “Orders list, composite index”
   - “Join without FK index”
   - “Join with `eq_ref`”
   - “Sorted inbox with filesort”
   - “Same query, index avoids filesort”
2. **Rendered EXPLAIN table** — monospace grid matching MySQL traditional output (`id`, `select_type`, `table`, `type`, `possible_keys`, `key`, `key_len`, `ref`, `rows`, `filtered`, `Extra`).
3. **Hover / focus decode** — hovering a cell or column header opens a short plain-English tooltip (from a local glossary object—**our** wording, not Oracle paste). Severity tint: green / amber / red for access types and Extra flags.
4. **Before / after toggle** — paired plans share a scenario; toggle or split view shows index added / query rewritten; callout summarizes what changed (`type ALL→ref`, Extra lost `Using filesort`, `rows` drop).
5. **Optional paste mode (v1 or v1.1)** — textarea accepts tab-separated or JSON EXPLAIN; best-effort parse into the grid. If parse fails, keep samples as the reliable path. Do **not** require a live MySQL connection.

### Secondary mode (nice-to-have in same component)

- Mini **TREE view** for one sample that includes a hash join, so readers see why TREE matters (`hash-joins`).
- Fake **ANALYZE** overlay on one sample: show `estimated rows` vs `actual rows` mismatch to motivate ANALYZE without executing SQL in the browser.

### Interaction / motion notes (site pattern)

- Intentional motion: column highlight on hover, before→after morph or cross-fade of the changing cells, brief “severity pulse” when switching to a bad plan.
- No dashboard chrome; one composition: scenario label + plan table + glossary panel.
- Keyboard: arrow between sample plans; focusable cells for a11y tooltips.

### Data shape (implementation sketch)

```ts
type ExplainRow = {
  id: number;
  select_type: string;
  table: string;
  type: string;
  possible_keys: string | null;
  key: string | null;
  key_len: string | null;
  ref: string | null;
  rows: number;
  filtered: number;
  Extra: string | null;
};

type ExplainSample = {
  id: string;
  title: string;
  scenario: string; // web-app story
  sql: string;
  format: "traditional";
  rows: ExplainRow[];
  pairId?: string; // links before/after
  pairRole?: "before" | "after";
  takeaway: string;
};
```

Glossary keyed by column name + known `type` / Extra tokens.

---

## Example queries / schemas

Use one coherent schema through the article + interactive fixtures (orders admin). Keep types aligned with article 01 guidance (no hand-wavy `INT` money, etc.—but this article isn’t about types; stay simple).

```sql
CREATE TABLE shops (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  status ENUM('open', 'paid', 'canceled') NOT NULL,
  created_at DATETIME(6) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  -- initially: KEY (shop_id) only, or even no secondary indexes
  KEY idx_orders_shop (shop_id),
  CONSTRAINT fk_orders_shop FOREIGN KEY (shop_id) REFERENCES shops (id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(64) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  KEY idx_items_order (order_id),
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE=InnoDB;
```

### Scenario queries (each gets an EXPLAIN story)

**1. List endpoint — missing composite index (smell)**

```sql
EXPLAIN
SELECT id, status, created_at, customer_email
FROM orders
WHERE shop_id = 42 AND status = 'open'
ORDER BY created_at DESC
LIMIT 50 OFFSET 2000;
```

Expected teaching plan (illustrative): `type: ref` or `ALL` on `shop_id` only, `Using filesort`, large `rows` from offset.  
**Fix direction:** composite `(shop_id, status, created_at)` + keyset pagination (articles 03 + 05)—show EXPLAIN after index even if OFFSET remains for contrast.

**2. After index (better)**

```sql
ALTER TABLE orders
  ADD KEY idx_orders_shop_status_created (shop_id, status, created_at);

EXPLAIN
SELECT id, status, created_at, customer_email
FROM orders
WHERE shop_id = 42 AND status = 'open'
ORDER BY created_at DESC
LIMIT 50;
```

Teach: `type: range`/`ref`, longer `key_len`, Extra loses filesort when the index satisfies order.

**3. Detail + join (eq_ref vs ALL)**

```sql
EXPLAIN
SELECT o.id, o.status, i.sku, i.qty
FROM orders o
JOIN order_items i ON i.order_id = o.id
WHERE o.id = 1001;
```

With FK/index on `order_items.order_id`: outer `const`, inner `ref`.  
Drop/ignore index for the “before” fixture: inner `ALL` — nested-loop horror for a line-items drawer.

**4. ORM-ish OR filter**

```sql
EXPLAIN
SELECT id FROM orders
WHERE shop_id = 42
  AND (customer_email = 'a@example.com' OR status = 'open');
```

Discuss `index_merge` / suboptimal choice; rewrite patterns briefly.

**5. Sargability fail (tie to article 04)**

```sql
EXPLAIN
SELECT id FROM orders
WHERE shop_id = 42
  AND DATE(created_at) = '2026-07-01';
```

Show index on `created_at` unused → rewrite to range on `created_at`.

**6. ANALYZE contrast (narrative + optional TREE fixture)**

```sql
EXPLAIN ANALYZE
SELECT o.id
FROM orders o
JOIN order_items i ON i.order_id = o.id
WHERE o.shop_id = 42 AND o.status = 'open';
```

Call out `actual time` / `actual rows` vs `cost=… rows=…` (`explain`).

**Seed guidance for local repro (author notes):** tens of thousands of orders per shop so `ALL` vs `ref` is obvious; tiny fixtures in the interactive can use fabricated `rows` numbers that match the story.

---

## Tie-back checklist

Use as the article’s closing “Part A graduation” list. Each item: symptom in EXPLAIN → which earlier article → action.

| If you see… | Remember from… | Do this |
| --- | --- | --- |
| Wrong types / unindexable expressions, useless indexes | **01 Schema & types** | Fix column types/nullability before chasing plans |
| Secondary lookups exploding after PK choice | **02 Primary keys / clustered index** | Revisit PK width & join keys |
| `possible_keys` filled but `key` NULL or tiny `key_len` | **03 Secondary indexes** | Left-prefix / composite order; drop unused indexes |
| `ALL` because `WHERE YEAR(col)` / non-sargable predicate | **04 SELECT & filtering** | Rewrite predicates; project fewer columns |
| `Using filesort` + deep `OFFSET` | **05 Pagination** | Index-aligned `ORDER BY`; keyset/seek pagination |
| Multi-table plan, inner `ALL`, huge fanout | **06 JOINs** | Index join keys; watch ORM join vs N+1 tradeoffs |
| Write path slow after “read” index binge | **07 Writes** | Every extra index shows up on INSERT/UPDATE (light reminder) |
| Plan fine in isolation, timeouts under concurrency | **08–09 Transactions / isolation** | Don’t mistake lock waits for bad plans—Part B (11–12, 20) |
| Estimates absurd vs production cardinality | **This article + `ANALYZE TABLE`** | Refresh stats; confirm with `EXPLAIN ANALYZE` on realistic data |

**Capstone definition of done for Part A:** reader can take an ORM query from their app, EXPLAIN it, name the access type and Extra flags in plain English, and pick the correct earlier lever—without needing optimizer-trace fluency.

**Forward links:** covering / ICP (`Using index`, `Using index condition`) → article **15**; wait/lock forensics → **12** / **20**; buffer pool “plan looks good, still cold” → **13**.

---

## Open questions / author notes

1. **MySQL version framing:** Series corpus is 8.x/9.7-shaped. Call out that `EXPLAIN ANALYZE` and TREE/hash-join visibility matter on modern servers; if readers are on ancient 5.7, traditional EXPLAIN still teaches the same literacy (hash join / ANALYZE sections become “upgrade notes”).
2. **Interactive parse scope:** Full fidelity paste-parse of every EXPLAIN dialect (horizontal `\G`, TREE text, JSON v1 vs v2) is a rabbit hole. Ship curated samples + before/after first; paste as progressive enhancement.
3. **JSON format version:** 9.7 `EXPLAIN ANALYZE FORMAT=JSON` needs `explain_json_format_version=2` (`explain`). Probably skip teaching JSON schema; stick to traditional + TREE in the UI.
4. **Don’t steal article 15:** `Using index` gets a positive cameo only. No covering-index design workshop here.
5. **Don’t steal article 20:** Slow query log / Performance Schema are “where plans come from in prod,” one paragraph max.
6. **ORM brand balance:** Use neutral SQL in fixtures; name Prisma/Rails/Django as producers of SQL, not as the subject. Avoid implying one ORM is uniquely bad.
7. **Safety callout:** `EXPLAIN ANALYZE` on a huge prod `UPDATE`/`DELETE` is hostile—article should state ANALYZE supports SELECT and multi-table UPDATE/DELETE (`explain`) and recommend SELECT-shaped reproductions.
8. **Stats & histograms:** Mention `ANALYZE TABLE` when estimates are wrong; histogram deep dive is optional footnote via `controlling-optimizer` / `analyze-table`, not a section.
9. **Coordination with article 06:** Nested-loop stepper (joins) vs EXPLAIN explorer (this post)—shared vocabulary (`eq_ref`, fanout) but different toys. Cross-link heavily; don’t duplicate the join visualizer.
10. **Legal:** Original teaching prose only; link refman nodes; local `sources/mysql-refman-9.7/` stays gitignored (`sources/README.md`).
11. **Series glue:** Register slug `mysql-explain` in hub `seriesList.postSlugs` when publishing; place after isolation (09), before MVCC (11).
12. **Tone check:** Capstone energy—celebrate literacy (“you can read the map now”) rather than dumping every Extra enum from the manual.

---

## Draft success metrics (for later editing)

- A reader can decode a 2-table traditional EXPLAIN aloud in under a minute.
- Before/after interactive makes the index win *visually* obvious (type + Extra + rows).
- Zero sections that require knowing the optimizer cost model.
- Every major smell maps back to a Part A article number.
