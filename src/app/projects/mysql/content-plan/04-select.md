# Article 04 — SELECT, Filtering & Projection

| Field | Value |
| --- | --- |
| **Number** | 04 |
| **Title** | SELECT, Filtering & Projection |
| **Slug** | `mysql-select` *(existing stub at `/posts/mysql-select/`)* |
| **Tier** | Foundations (Part A) |
| **Series position** | After Secondary Indexes (03); before Sorting, LIMIT & Pagination (05) |
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

Teach web-app programmers that every list/detail endpoint is really two design choices: **which rows** (`WHERE`) and **which columns** (the select list / projection). Those choices — not “SQL in general” — decide whether MySQL can use the indexes from article 03, whether it does a range scan or a table scan, and how much I/O and network work each request burns.

Readers should leave able to:

1. Rewrite a typical ORM/list-handler query so the `WHERE` is **sargable** (index-friendly).
2. Explain why wrapping a column in a function kills range access, and how to fix it without changing product behavior.
3. Prefer explicit projection over `SELECT *` for API payloads, and understand *why* (row width, covering-index eligibility later, schema-churn safety) — without stealing the full covering-index deep dive from article 15.
4. Mentally map “GitHub-style list endpoint” filters onto `ref` / `range` / `ALL` access patterns (full `EXPLAIN` literacy waits for article 10; this article plants the seed with light `EXPLAIN` glimpses).

**Hard boundaries (do not steal):**

| Topic | Owns it |
| --- | --- |
| `ORDER BY`, `LIMIT`, offset vs keyset pagination | Article 05 |
| Multi-table `JOIN`, N+1 vs fat join | Article 06 |
| Full covering indexes / ICP as a design technique | Article 15 (ICP gets a *light touch* here only) |
| Reading `EXPLAIN` end-to-end | Article 10 |

Stub note: the current `mysql-select` stub mentions `ORDER BY` / `LIMIT`. Rewrite that copy when publishing so pagination is clearly deferred to 05.

---

## Real-world hook

Place the orders list/detail story in the section where filter × projection land — not forced as a cold open unless it’s the best hook.

Open with a concrete API shape every reader has shipped or consumed:

**`GET /api/orders?status=open&customer_id=42&created_after=2026-01-01`**  
and the sibling detail: **`GET /api/orders/:id`**.

Walk through what the handler usually does wrong:

- ActiveRecord / Prisma / Eloquent default: `SELECT *` + `WHERE YEAR(created_at) = 2026` or `WHERE LOWER(email) = ?`.
- Admin filters that OR many columns (`q` search) and silently disable indexes.
- “Detail” endpoints that are PK lookups (fast) vs “list” endpoints that are the real cost center.

**Company / product patterns to name (teaching, not endorsement):**

| Pattern | Example | SELECT lesson |
| --- | --- | --- |
| Order / invoice list | Shopify-style admin, Stripe Dashboard payment list | Equality + range on status / created_at; project only columns the table UI needs |
| Issue / ticket list | GitHub Issues, Linear, Jira filters | Multi-filter left-prefix: `repo_id = ? AND state = ? AND updated_at > ?` |
| User lookup | Auth0 / Clerk-style “user by email” | Unique index + equality; avoid `LOWER(email)` if collation already handles case |
| Catalog browse | Amazon-style category + price band | Range on indexed price; don’t apply `ABS()` / casting on the column |
| Notification inbox | Slack / Discord unread list | Narrow projection (`id`, `title`, `unread`, `created_at`); blob/body columns stay out of the list query |

Hook punchline: *Your index design from article 03 only pays rent if this article’s `WHERE` and select list let the optimizer use it.*

---

## Primary documentation sources

Local corpus: `sources/mysql-refman-9.7/nodes/<id>.md` (gitignored). Cite with `<Cite />` / `<References />` in the published post. **Do not paste Oracle prose** into MDX — paraphrase and teach.

### Core (must cite)

| Node id | Public URL | Use in this article |
| --- | --- | --- |
| `select` | https://dev.mysql.com/doc/refman/9.7/en/select.html | SELECT list, `*`, `WHERE` placement, clause order; what a result set *is* |
| `select-optimization` | https://dev.mysql.com/doc/refman/9.7/en/select-optimization.html | Framing: indexes on `WHERE` columns first; minimize full scans; function cost magnification |
| `where-optimization` | https://dev.mysql.com/doc/refman/9.7/en/where-optimization.html | Constant folding, constant tables (PK/UNIQUE equality), index vs scan choice, “read from index only” teaser |
| `range-optimization` | https://dev.mysql.com/doc/refman/9.7/en/range-optimization.html | What counts as a range condition (`=`, `IN`, `BETWEEN`, `LIKE 'ab%'`); multi-part index intervals; left-prefix stop rules after inequality |
| `index-condition-pushdown-optimization` | https://dev.mysql.com/doc/refman/9.7/en/index-condition-pushdown-optimization.html | **Light touch:** `Using index condition` vs full covering; zipcode+lastname example as “filter more before reading the row” |

### Supporting (cite when a beat needs them)

| Node id | Public URL | Use |
| --- | --- | --- |
| `selecting-rows` | https://dev.mysql.com/doc/refman/9.7/en/selecting-rows.html | Pedagogy: `WHERE` as “which rows” |
| `selecting-columns` | https://dev.mysql.com/doc/refman/9.7/en/selecting-columns.html | Pedagogy: naming columns vs `*` |
| `selecting-all` | https://dev.mysql.com/doc/refman/9.7/en/selecting-all.html | Contrast: when `SELECT *` is fine (exploration) vs APIs |
| `function-optimization` | https://dev.mysql.com/doc/refman/9.7/en/function-optimization.html | Deterministic vs nondeterministic; constant on the *right* side of `=` stays indexable |
| `optimizing-innodb-queries` | https://dev.mysql.com/doc/refman/9.7/en/optimizing-innodb-queries.html | One index per table access; covering index mention → forward-link article 15 |
| `is-null-optimization` | https://dev.mysql.com/doc/refman/9.7/en/is-null-optimization.html | Optional: `IS NULL` as range-eligible |
| `optimization-indexes` | https://dev.mysql.com/doc/refman/9.7/en/optimization-indexes.html | Bridge back to article 03 |

### Explicitly out of scope for deep citation here

`order-by-optimization`, `limit-optimization`, `join`, `nested-loop-joins` — point forward to 05/06.

---

## Article structure

Suggested MDX outline — sentence-case H2s, conversational spine. Scatter **named mini-demos** mid-article; no mega-lab at the top.

1. **Series beat + what today covers** — every list/detail endpoint is filter × projection; indexes from 03 only pay rent if `WHERE` and select list cooperate.
2. **Cold open** — broken list endpoint vs fixed one (same API contract, far less work).
3. **Mental model** — result set = filter × project; InnoDB still finds rows via indexes from 02/03.
4. **WHERE that the optimizer can use** — sargability checklist + range conditions. *(Embed **Sargability toggles** here.)*
5. **Functions on columns** — classic footguns and rewrites (`YEAR`, `DATE`, `LOWER`).
6. **Projection** — `SELECT *` cost for APIs; wide rows; schema churn; teaser for covering indexes. *(Embed **Projection width meter** here.)*
7. **List vs detail endpoints** — two query shapes, two index stories.
8. **Prefix length and composite filters** — tie to article 03 left-prefix. *(Embed **Prefix-length highlight** here — predicate-driven, not another “build an index” toy.)*
9. **ICP light touch** — when MySQL filters on index columns before fetching the full row. *(Optional mini **ICP badge** demo.)*
10. **ORM / app patterns** — Prisma-first; one-line Rails/Django contrasts.
11. **Tie-back checklist** — copy-paste for code review.
12. **References** — IEEE list; bridge to sorting & pagination (05), then joins (06).

Approximate length: ~10 minutes skim; 2.5–4k words only if every section earns it.

---

## Deep-dive beats

### Beat A — Filter × project

- A `SELECT` answers two questions: *which rows survive?* and *which attributes leave the server?*
- Apps feel latency from both: filter work (pages read) and projection work (bytes to client, buffer pool pollution from fat rows).
- Detail endpoint: usually one row by PK → clustered lookup (article 02). List endpoint: many rows by secondary predicates → article 03 indexes + this article’s `WHERE` shape.

### Beat B — Sargability (teach the word, then drop it)

Define simply: *can the engine compare the indexed column to a known constant/range without transforming every row’s column value first?*

**Index-friendly (range-eligible) patterns** — paraphrase from `range-optimization`:

- `col = const`, `col <=> const`, `IN (...)`, `IS NULL` / `IS NOT NULL`
- For B-tree: `<`, `>`, `<=`, `>=`, `BETWEEN`, `!=` / `<>`
- `LIKE 'prefix%'` (constant pattern that does **not** start with `%`)
- AND/OR combinations that still form intervals; optimizer may *widen* the range and re-check the full `WHERE`

**Not index-friendly as a range driver:**

- `LIKE '%suffix'`, `LIKE '%mid%'`
- `YEAR(created_at) = 2026`, `DATE(ts) = '...'`, `LOWER(email) = ...` on the **column** side
- Casting / arithmetic on the column: `col + 0 = 1`, `CAST(col AS ...)`
- Leading-wildcard full-text style filters (full-text is deferred; mention only as “different tool”)

**Composite / left-prefix stop rule** (tie to article 03, cite multi-part range section):

- Equality on left parts, then one range on the next part; further parts don’t extend the interval.
- Example teaching line: `INDEX (customer_id, status, created_at)`  
  - `customer_id = ? AND status = ? AND created_at > ?` → strong  
  - `status = ?` alone → weak / unused for that index  
  - `customer_id = ? AND created_at > ?` (skipping `status`) → uses only `customer_id` prefix for the range construction story

### Beat C — Constant on the right, function on the constant

From `function-optimization` + app practice:

- `WHERE id = POW(1, 2)` can still be a PK lookup (constant folds).
- `WHERE id = FLOOR(1 + RAND() * 49)` cannot (nondeterministic per row).
- App rewrite pattern: compute in the app or `SET @x = ...` / bind parameter; compare `col = ?`.
- Date rewrite table for readers:

| Bad | Better |
| --- | --- |
| `YEAR(created_at) = 2026` | `created_at >= '2026-01-01' AND created_at < '2027-01-01'` |
| `DATE(created_at) = '2026-07-24'` | `created_at >= '2026-07-24' AND created_at < '2026-07-25'` |
| `LOWER(email) = LOWER(?)` | store canonical form *or* use a case-insensitive collation and `email = ?` |
| `WHERE CONCAT(first, ' ', last) = ?` | separate columns / generated column (tease article 17) |

### Beat D — Projection cost (`SELECT *`)

Teaching points (original prose; tutorial nodes only for “naming columns” intuition):

- List APIs rarely need `TEXT`/`JSON` bodies, password hashes, or wide audit blobs.
- Wider rows → fewer rows per InnoDB page → more I/O for the same filter.
- `SELECT *` couples API responses to schema migrations (new column leaks; renamed columns break clients).
- ORM `include` / `select` APIs: show the good form (`select: { id, status, total_cents }`) vs default star.
- Forward link: if the select list ⊆ index columns, you may get index-only / covering access — **article 15**. Here: just “why listing columns unlocks that later.”

### Beat E — List vs detail

| Endpoint | Typical SQL shape | Access hope |
| --- | --- | --- |
| `GET /resource/:id` | `WHERE id = ?` + narrow or full row | `const` / `eq_ref` on PK |
| `GET /resources?...` | Equality filters + optional range + **projection for cards** | `ref` / `range` on composite secondary index |

Show one schema serving both (see examples below). Emphasize: don’t make the list query pull the detail payload.

### Beat F — ICP (light touch only)

Paraphrase the zipcode example from `index-condition-pushdown-optimization`:

- Index `(zipcode, lastname, firstname)`, filter `zipcode = ? AND lastname LIKE '%etrunia%' AND address LIKE '%Main%'`.
- Range/ref on `zipcode`; ICP can test `lastname LIKE ...` on the **index tuple** before reading the full row; `address` still needs the row.
- `EXPLAIN Extra: Using index condition` ≠ `Using index` (covering).
- Promise article 15 for designing indexes so fewer full-row reads are needed at all.

### Beat G — Optimizer cheerleading without EXPLAIN mastery

From `where-optimization` / `select-optimization`, keep it practical:

- PK/UNIQUE full equality → “constant table” / cheap point lookup.
- Indexes help `WHERE` first; if still slow, look at functions and selectivity before adding more indexes.
- `ANALYZE TABLE` keeps stats honest (one sentence; ops depth later).
- Tease article 10: “we’ll read `type`, `key`, `key_len`, `rows`, `Extra` for real.”

### Beat H — What this article will not solve

One short box: even a perfect `WHERE` + projection still hurts if you `ORDER BY` unindexed columns or `OFFSET 100000` — that’s 05. Multi-table filters belong in 06.

---

## Interactive feature

**Folder:** `src/components/interactive/mysql-select/` (shared chrome from `schema-byte-budget/shared.tsx` as needed).

**Rule:** If a demo doesn’t clarify a tradeoff, cut it and let prose carry the beat. Client-only; label math as illustrative. Coordinate with article 03: **predicate-driven** demos here, not duplicate “build an index” toys.

### 1. Sargability toggles

- **Goal:** Make “function on column ⇒ no range” visceral in under 30 seconds.
- **Placement:** Section 4 (WHERE / sargability).
- **UX:** Fixed `orders` schema + composite index; filter chips rewrite live `WHERE`. Footgun mode: `YEAR(created_at) = 2026` vs sargable range; `LIKE 'alex%'` vs `LIKE '%@gmail.com'`. Highlight collapses to scan with plain-language reason.

### 2. Prefix-length highlight

- **Goal:** Show which composite prefix is usable for active predicates (`key_len` metaphor without EXPLAIN literacy).
- **Placement:** Section 8 (prefix length / composite filters).
- **UX:** Index strip for `idx_orders_customer_status_created`; prefix segments light up as filters toggle; pseudo access label (`ref` / `range` / `ALL`).

### 3. Projection width meter

- **Goal:** Feel that projection doesn’t usually change index match but changes work after the match.
- **Placement:** Section 6 (projection).
- **UX:** Toggle `SELECT *` vs narrow list; “bytes projected / row” and optional “fetch full row” pulse for non-covered columns.

### 4. ICP badge (optional — cut if section stays prose-only)

- **Goal:** Distinguish `Using index condition` from covering `Using index`.
- **Placement:** Section 9 (ICP light touch).
- **UX:** Single preset query; badge shows which filters run on index tuple vs need row fetch.

**Implementation notes:** Pure client rule engine; 2–3 intentional motions; no dashboard chrome.

---

## Example queries / schemas

### Schema (running example)

```sql
CREATE TABLE customers (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  created_at    DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_email (email)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id   BIGINT UNSIGNED NOT NULL,
  status        ENUM('open','paid','canceled','refunded') NOT NULL,
  total_cents   INT UNSIGNED NOT NULL,
  currency      CHAR(3) NOT NULL,
  notes         TEXT NULL,          -- fat; list endpoints must not pull this
  created_at    DATETIME(3) NOT NULL,
  updated_at    DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_orders_customer_status_created (customer_id, status, created_at),
  KEY idx_orders_status_created (status, created_at),
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB;
```

*(FK deep dive deferred to article 16; here FKs are optional flavor.)*

### Detail — good

```sql
SELECT id, customer_id, status, total_cents, currency, notes, created_at, updated_at
FROM orders
WHERE id = ?;
```

### List — bad (common ORM output)

```sql
SELECT *
FROM orders
WHERE customer_id = ?
  AND YEAR(created_at) = ?
  AND status = ?;
```

### List — good (same API filters)

```sql
SELECT id, status, total_cents, currency, created_at
FROM orders
WHERE customer_id = ?
  AND status = ?
  AND created_at >= ?
  AND created_at < ?;
```

### Range / IN patterns worth showing

```sql
-- status inbox for ops tools
SELECT id, customer_id, total_cents, created_at
FROM orders
WHERE status IN ('open', 'paid')
  AND created_at >= ?;

-- prefix LIKE can use an index; leading % generally cannot as a range
SELECT id, email, name
FROM customers
WHERE email LIKE 'alex%@example.com';   -- often OK as range on email
-- vs
SELECT id, email, name
FROM customers
WHERE email LIKE '%@example.com';       -- not a range on email
```

### ICP teaching query (light)

```sql
-- Illustrative people table from the ICP docs idea (paraphrase in prose)
SELECT id, zipcode, lastname, firstname, address
FROM people
WHERE zipcode = '95054'
  AND lastname LIKE '%etrunia%'
  AND address LIKE '%Main Street%';
```

Show (in prose) that `zipcode` drives access; `lastname LIKE '%…%'` may be index-condition-checked; `address` needs the row.

### Tiny seed data idea (for screenshots / demo)

~20 orders across 3 customers, mixed statuses, dates spanning two years — enough for the visualizer’s “rows touched” intuition without pretending to be a benchmark.

---

## Tie-back checklist

Publish as a short, scannable list near the end (and optionally as a callout midway):

**When reviewing a list/detail handler**

1. **Detail by id?** Prefer PK equality; don’t reinvent with unique secondary lookups unless needed.
2. **List filters sargable?** Column bare on the left; constants / bind params on the right; rewrite `YEAR`/`DATE`/`LOWER` patterns.
3. **Composite order matches filters?** Equality columns leftmost; range last among used parts (article 03).
4. **Projection intentional?** No `SELECT *` in app SQL for list endpoints; exclude `TEXT`/`BLOB`/secrets.
5. **One query, one job?** List payload ≠ detail payload.
6. **OR / search boxes?** Know they may disable a single clean range — design a dedicated strategy (later: full-text / generated columns), don’t pretend a random composite saves you.
7. **ORM defaults audited?** Log SQL in dev; override `select` / `pluck` / `selectRaw` consciously.
8. **Don’t “fix” slowness with `LIMIT` alone** — pagination semantics are article 05; fixing `WHERE` first still matters.
9. **Seen `Using index condition`?** Understand it; design for covering in article 15 if this path is hot.
10. **Still mysterious?** Capture `EXPLAIN` and continue in article 10.

**API design echoes**

- Query-string filters should map to indexed columns you actually intend to support.
- Unsupported filter combos → 400, not a table scan.
- Response DTOs should drive the select list, not the other way around.

---

## Open questions / author notes

1. **How much `EXPLAIN` in 04?** Recommendation: show 2–3 annotated outputs (`type`, `key`, `key_len`, `Extra`) as “previews,” and explicitly defer fluency to article 10 so this post doesn’t become an EXPLAIN essay.
2. **ICP depth:** Keep to one section + demo badge. Resist the urge to design covering indexes here — article 15’s thunder.
3. **Stub cleanup:** Current stub promises `ORDER BY` / `LIMIT`. On publish, rewrite the intro and series blurb so 05 owns pagination; update hub copy if it still groups them.
4. **Collations vs `LOWER(email)`:** Worth a precise sidebar — functional indexes / generated columns exist, but generated columns are article 17. For 04, prefer “canonicalize on write + CI collation” as the default advice.
5. **`SQL_CALC_FOUND_ROWS`:** Deprecated/removed path; if mentioned at all, only as “don’t use this; count strategies live near pagination (05).”
6. **Interactive vs article 03 overlap:** Article 03 visualizes left-prefix on index *shape*; 04’s demos are **predicate-driven** (toggle filters → match). Coordinate naming so they don’t feel duplicate.
7. **ORM samples:** Pick one primary (Prisma *or* Eloquent) for snippets, mention others in prose — avoid three parallel dialect dumps.
8. **Invisible columns / `*`:** Optional one-liner from `select` node ( `*` skips invisible columns) — only if it earns its keep; easy rabbit hole.
9. **Benchmark claims:** Prefer qualitative “pages read / bytes returned” in the demo; no fake ms numbers unless measured on a real fixture later.
10. **Series glue:** Ensure `seriesList` / hub lists article 04 as Foundations and prev/next = indexes → **select** → pagination.

---

## Success criteria (for the drafted MDX later)

- A mid-level web dev can fix a non-sargable list query and justify the rewrite.
- Scattered demos make “function on column ⇒ no range” visceral without a top mega-lab.
- Pagination and joins are mentioned only as forward links, not taught.
- Every factual optimizer claim uses `<Cite />` / `<References />`, with original teaching prose only.

## Drafting checklist (when writing the post)

- [ ] Replace stub MDX; scatter 3–4 mini-demos mid-article
- [ ] Humanizer pass; first-person voice check
- [ ] `<Cite />` + `<References />` for technical claims
- [ ] Prisma-primary ORM snippets; house defaults (cents, ULID public ids, utf8mb4_0900_ai_ci)
- [ ] Cross-link 03, 05, 10, 15; defer pagination/joins depth
- [ ] Unit-test client rule engine if non-trivial
