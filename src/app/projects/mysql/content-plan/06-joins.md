# Article 06 — JOINs That Scale

| Field | Value |
| --- | --- |
| **Number** | 06 |
| **Title** | JOINs That Scale |
| **Slug** | `mysql-joins` *(existing stub at `/posts/mysql-joins/`)* |
| **Tier** | Foundations (Part A) |
| **Series home** | `/projects/mysql/` |
| **Depends on** | 03 Secondary Indexes, 04 SELECT / Filtering (join keys must be indexable; projection matters when joins multiply columns) |
| **Feeds into** | 05 Pagination (join + `ORDER BY`/`LIMIT`), 10 EXPLAIN (full literacy), 15 Covering Indexes (join without PK lookups) |
| **Estimated length** | ~2,500–3,200 words + top-of-page interactive |

---

## Intent

Teach web app programmers to **choose and write joins that stay cheap under real API traffic** — not SQL-textbook join taxonomy.

After this article, a reader should be able to:

1. Explain **INNER vs LEFT** join semantics in API terms (required related row vs optional related row / “include nulls”).
2. Picture MySQL’s default execution model as **nested loops with row fanout** (outer row → probe inner table), and know when **hash join** shows up instead.
3. Predict that **join order + indexes on join keys** dominate cost more than “how many JOINs I wrote.”
4. Recognize **ORM N+1** as many tiny nested loops in the app process, and know when one SQL join (or a controlled batch) is the fix.
5. Know the **denormalize escape hatch**: when fanout / multi-join API payloads stop being worth it.

Tone: spoon-fed. Every mechanism beat returns to a request handler (order list, issue board, inbox thread). No catalog of every join syntax variant.

---

## Real-world hook

**Scene:** A SaaS “Projects” dashboard endpoint — `GET /api/projects?include=owner,latest_activity`.

Two implementations ship in the same week:

| Approach | What happens under load |
| --- | --- |
| **ORM default** | Load 50 projects, then N queries for owners, then N for latest activity → **N+1** (or N+2). Latency spikes with page size; connection pool saturates. |
| **One join (or two)** | `projects LEFT JOIN users … LEFT JOIN activities …` with indexes on FKs. One round-trip; MySQL nested-loops (or hash join) over indexed probes. |

Same JSON shape. Different cost curve.

Widen the hook with recognizable patterns:

- **Shopify-style order admin:** orders → customer → line items (1:N fanout — join multiplies rows; apps often join then collapse in code, or use two queries).
- **GitHub-style issue list:** issues INNER JOIN repositories (must exist) + LEFT JOIN assignees (optional).
- **Stripe-ish customer portal:** invoices LEFT JOIN payment_methods (customer may have none yet).

Open question for the reader (answer later in the piece): *If LEFT JOIN is “safer,” why does putting `WHERE right.id IS NOT NULL` or filtering on a right-table column often make MySQL rewrite it to an INNER JOIN anyway?*

---

## Primary documentation sources

Cite local nodes under `sources/mysql-refman-9.7/nodes/` and link the public HTML in the published post. Do **not** paste Oracle prose.

### Core (must cite)

| Node id | Public URL | Use in article |
| --- | --- | --- |
| `join` | https://dev.mysql.com/doc/refman/9.7/en/join.html | INNER/LEFT/RIGHT/CROSS/`STRAIGHT_JOIN` syntax; ON vs WHERE; LEFT → NULL-extended right row; anti-join `WHERE right.key IS NULL` pattern; max 61 tables; comma vs JOIN precedence |
| `nested-loop-joins` | https://dev.mysql.com/doc/refman/9.7/en/nested-loop-joins.html | Simple nested-loop algorithm; inner tables re-read per outer row — the mental model for fanout |
| `outer-join-optimization` | https://dev.mysql.com/doc/refman/9.7/en/outer-join-optimization.html | How LEFT JOIN dependency constrains order; ON vs WHERE roles; NULL-complemented rows; conversion to inner when WHERE rejects NULLs |
| `explain` | https://dev.mysql.com/doc/refman/9.7/en/explain.html | Statement entry point; FORMAT options |
| `select` | https://dev.mysql.com/doc/refman/9.7/en/select.html | `TABLE_REFERENCES` → join syntax; `STRAIGHT_JOIN` modifier; multi-table SELECT shape |

### Strong supporting (cite as needed)

| Node id | Public URL | Use in article |
| --- | --- | --- |
| `explain-output` | https://dev.mysql.com/doc/refman/9.7/en/explain-output.html | Join **access types** ladder (`eq_ref`, `ref`, `range`, `ALL`); `rows` × `filtered` fanout estimate; Extra `Using join buffer (hash join)` |
| `using-explain` | https://dev.mysql.com/doc/refman/9.7/en/using-explain.html | Checking join order; `STRAIGHT_JOIN` as order hint (with caveats) |
| `hash-joins` | https://dev.mysql.com/doc/refman/9.7/en/hash-joins.html | Modern MySQL default when equi-join + no usable index; `join_buffer_size`; TREE EXPLAIN “Inner hash join” |
| `outer-join-simplification` | https://dev.mysql.com/doc/refman/9.7/en/outer-join-simplification.html | RIGHT → LEFT rewrite; null-rejecting WHERE → outer becomes inner (unlocks better join order) |
| `nested-join-optimization` | https://dev.mysql.com/doc/refman/9.7/en/nested-join-optimization.html | Parentheses / nesting are not free sugar with outer joins; light mention only |
| `select-optimization` | https://dev.mysql.com/doc/refman/9.7/en/select-optimization.html | Indexes matter *especially* for multi-table queries; EXPLAIN as first tool |

### Intentionally light / defer

| Topic | Deferred to |
| --- | --- |
| Full EXPLAIN literacy, optimizer traces | Article **10** |
| Covering indexes / avoiding PK lookups after `ref` | Article **15** |
| Semijoin / antijoin rewrite of `IN`/`EXISTS` | Mention only; deeper later if needed |
| Window functions / CTEs as join alternatives | Deferred (series README) |

---

## Article structure

Suggested H2/H3 outline for the MDX post (interactive imported at top, like RAID / neural-net):

1. **Hook — One dashboard, two cost curves**  
   ORM N+1 vs one join; promise of the piece.

2. **Interactive: Nested-loop join stepper**  
   Short caption: “Watch outer rows probe the inner table — this is why indexes on join keys matter.”

3. **INNER vs LEFT in API English**  
   Required association vs optional; NULL columns in JSON; anti-join pattern for “projects with no owner assigned.” Prefer LEFT over RIGHT for portability (`join` docs).

4. **How MySQL actually runs a join**  
   Nested-loop mental model (`nested-loop-joins`).  
   Side box: hash join when no index (`hash-joins`) — still “probe,” different structure.  
   EXPLAIN columns that matter now: table order, `type`, `key`, `ref`, `rows` (`explain-output`).

5. **Join order is a performance dial**  
   Small/filtered driving table first when legal; LEFT JOIN freezes outer-before-inner (`outer-join-optimization`).  
   Accidental INNER via WHERE on right table (`outer-join-simplification`).  
   `STRAIGHT_JOIN` as last-resort order club (`select` / `using-explain`) — rarely needed if indexes are right.

6. **Indexes make joins scale**  
   FK / join column indexes → `eq_ref` / `ref` instead of `ALL`.  
   Tie back to article 03 without re-teaching composites.

7. **ORM N+1 vs one fat join vs batched `IN`**  
   Three patterns with tradeoffs (row explosion, payload shape, cacheability).

8. **When to denormalize (or split queries)**  
   Hot list endpoints, wide 1:N fanout, read-mostly counters / display names.

9. **Checklist + what EXPLAIN should look like**  
   Before shipping the endpoint.

10. **Next in series**  
    Pagination (05) often wraps these joins; EXPLAIN deep dive (10) sharpens the same skills.

---

## Deep-dive beats

Each beat: mechanism → app consequence → what to do.

### Beat A — INNER means “drop the parent if the child is missing”

- **Mechanism:** Only combinations that satisfy the join condition survive.
- **App:** `issues INNER JOIN repositories` is correct if orphan issues are impossible (FK) or unacceptable in the API.
- **Trap:** Accidental INNER by writing `LEFT JOIN` then `WHERE assignee.id = ?` or `WHERE assignee.name = '…'` — null-complemented rows fail the WHERE, optimizer may rewrite to inner (`outer-join-optimization`, `outer-join-simplification`).
- **Teach:** Filters that must allow “no match” belong in `ON` (or stay LEFT and filter only left-table columns in `WHERE`).

### Beat B — LEFT means “keep the parent; pad the right with NULL”

- **Mechanism:** For each left row with no match, MySQL synthesizes a right row of NULLs (`join`, `outer-join-optimization`).
- **App:** Optional `owner`, optional `default_payment_method`, optional `latest_comment`.
- **Anti-join:** `LEFT JOIN … WHERE right.pk IS NULL` finds parents without children (classic “users with no orders”).
- **Portability:** Prefer LEFT over RIGHT; MySQL rewrites RIGHT to LEFT anyway (`outer-join-simplification`).

### Beat C — Nested-loop reality (the series’ core picture)

- **Mechanism:** For each qualifying row in table 1, probe table 2; for each match, probe table 3… (`nested-loop-joins`). Inner tables are visited **many times**.
- **Cost intuition:**  
  `cost ≈ rows₁ × (cost to find matches in ₂) × …`  
  EXPLAIN’s `rows` (and `rows × filtered`) is the fanout estimate into the next table (`explain-output`).
- **App translation:** 10,000 orders scanning customers with no index ≈ disaster; 10,000 orders `eq_ref` into `customers` PK ≈ fine.
- **Interactive anchors here:** stepper shows one outer row lighting up N inner probes.

### Beat D — Hash join is the “no index” (or buffer) cousin — don’t ignore it

- **Mechanism:** With equi-join conditions and no usable index, MySQL often builds a hash table (`hash-joins`); EXPLAIN Extra shows `Using join buffer (hash join)`.
- **App:** Missing FK index may not always show as nested-loop `ALL`×`ALL` — you might see hash join. Still usually worse than indexed `ref`/`eq_ref` on large tables; memory bounded by `join_buffer_size` (disk spill possible).
- **Pedagogy:** Lead with nested-loop; dedicate one short subsection so readers aren’t confused by modern EXPLAIN output.

### Beat E — Join order: optimizer vs outer-join handcuffs

- **Mechanism:** For inner joins, optimizer may reorder. For LEFT JOIN, the outer table must be read before the inner (`outer-join-optimization`) — dependency edges constrain the search space.
- **App:** Driving from a highly selective filter (`WHERE org_id = ? AND status = 'open'`) then joining out is the usual win — **if** indexes support that access path (articles 03–04).
- **Hints:** `STRAIGHT_JOIN` forces left-to-right table order (`join`, `select`) but can disable useful semijoin transforms (`using-explain`) — treat as debug/last resort, not style.

### Beat F — N+1 is nested loops in the wrong process

| Pattern | Round-trips | Row risk | When it wins |
| --- | --- | --- | --- |
| **N+1 (lazy ORM)** | 1 + N (+ M) | Low per query | Tiny N, hot entity cache, or graph too irregular |
| **Single join** | 1 | Can explode on 1:N | 1:1 or small fanout; DB has indexes |
| **Batched `WHERE id IN (…)``** | 2–3 | Controlled | List + hydrate associations; easy to map in app |
| **Two-step: keys then join** | 2 | Controlled | Huge parent filter first, then join children |

- Show ActiveRecord / Prisma / Django-flavored pseudo: `Project.includes(:owner)` (good) vs `projects.each { \|p\| p.owner }` (bad).
- Mention **dataloader / `IN` batching** as the sane middle when a single mega-join returns a Cartesian mess (order × line_items × tags).

### Beat G — Row explosion and “fat join” payloads

- Join that multiplies rows (order → items → tags) then `SELECT *` ships duplicate parent columns × fanout.
- Fixes: (1) separate queries per association, (2) JSON aggregation / app-side grouping, (3) narrower projection (article 04), (4) denormalized list columns for the hot path.

### Beat H — When to denormalize

Denormalize (or maintain a summary table / cached column) when:

1. The same join runs on **every list request** (home feed, admin index).
2. Fanout is large or unstable (tags, events, comment counts).
3. You only need **display fields** (owner display name, item count), not full related entities.
4. Consistency can be **eventual** (counter cache, `owner_name` updated on write).

Keep normalized joins for detail views, writes, and anything needing fresh relational truth.

### Beat I — EXPLAIN cheat sheet for this article only

Readers should recognize:

- Table order in EXPLAIN ≈ join order.
- `type: eq_ref` / `ref` on join key → healthy nested-loop probe.
- `type: ALL` on a large inner table → missing index or bad order.
- `Extra: Using join buffer (hash join)` → know what it means; ask “should this key be indexed?”
- Product of `rows` estimates climbing table-to-table → fanout story (tease article 10 for depth).

---

## Interactive feature

### Name

**Nested-Loop Join Stepper** (row fanout visualizer)

### Placement

Top of MDX, client component under `src/components/interactive/` (same pattern as `raid-visualizer`, `neural-net`, `puzzle-solver`).

### Pedagogy goal

Make “for each outer row, probe inner” visceral, and show why **indexed probes** beat **scans**, and why **1:N fanout** multiplies work/output.

### UI sketch

**Controls**

- Scenario preset: `projects → owners` (1:1 / many:1), `orders → line_items` (1:N), `issues → assignees` (LEFT / optional).
- Inner access mode toggle: **Indexed `ref`/`eq_ref`** vs **Table scan (`ALL`)** vs **Hash join** (simplified).
- Outer row count scrubber (e.g. 5–50) and average matches per outer row (fanout 0–8).
- Step / Play / Reset (phased workflow like RAID).

**Canvas**

- Left column: outer table rows (highlight current).
- Right column: inner table; matching rows light up on each probe.
- Center: running counters — `probes`, `rows examined (est.)`, `rows emitted`, `round-trips if this were N+1`.
- Optional mini EXPLAIN strip updating live: `type`, `rows`, Extra.

**Phases**

1. **Pick driving row** — highlight one outer row.  
2. **Probe** — animate lookup (index B-tree hint vs full scan sweep).  
3. **Emit** — show joined output row(s); for LEFT with 0 matches, emit NULL-padded row.  
4. **Accumulate cost** — counters tick; compare sidebar “ORM N+1 equivalent.”

**Compare mode (toggle)**

- Side-by-side: **SQL join** (1 trip, probes inside MySQL) vs **N+1** (1 + N trips, same logical probes in the app).

### Implementation notes

- Pure client simulation; no live MySQL.
- Keep state in a small pure module (`join-stepper.ts`) + tests for cost math (mirrors `raid.ts` / `search.test.ts` pattern).
- Respect site interactive look: ink borders, mono stats, stepped workflow — not a dashboard of cards.
- Accessibility: keyboard Step/Play; text summary of current phase for screen readers.

### Caption copy (draft)

> MySQL’s nested-loop join walks outer rows and probes the next table for matches. Drag fanout and watch examined rows explode when the inner probe is a scan — then flip on an index.

---

## Example queries / schemas

Concrete schema for the article and interactive presets. Keep types consistent with article 01 guidance once that lands (`BIGINT` PKs, `DATETIME(3)`, etc.).

```sql
CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE projects (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  owner_id BIGINT UNSIGNED NULL,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  updated_at DATETIME(3) NOT NULL,
  KEY idx_projects_org_status_updated (org_id, status, updated_at),
  KEY idx_projects_owner (owner_id),
  CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE activities (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY idx_activities_project_created (project_id, created_at),
  CONSTRAINT fk_activities_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE=InnoDB;

CREATE TABLE order_headers (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  KEY idx_orders_customer (customer_id)
) ENGINE=InnoDB;

CREATE TABLE order_lines (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(64) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  KEY idx_lines_order (order_id),
  CONSTRAINT fk_lines_order FOREIGN KEY (order_id) REFERENCES order_headers (id)
) ENGINE=InnoDB;
```

### Query A — Dashboard list with optional owner (LEFT)

```sql
SELECT
  p.id,
  p.name,
  p.status,
  u.id AS owner_id,
  u.display_name AS owner_name
FROM projects AS p
LEFT JOIN users AS u ON u.id = p.owner_id
WHERE p.org_id = 42
  AND p.status = 'active'
ORDER BY p.updated_at DESC
LIMIT 50;
```

**Teaching points:** LEFT keeps unowned projects; `WHERE` filters only left-side columns so the outer join stays outer; needs `idx_projects_org_status_updated` + `users` PK for `eq_ref`.

### Query B — Accidental INNER (contrast with A)

```sql
-- Looks like LEFT, behaves like INNER for filtering:
SELECT p.id, p.name, u.display_name
FROM projects AS p
LEFT JOIN users AS u ON u.id = p.owner_id
WHERE p.org_id = 42
  AND u.display_name LIKE 'A%';   -- rejects NULL-padded non-matches
```

Show rewrite intuition / EXPLAIN becoming inner join when the predicate is null-rejecting.

### Query C — Anti-join: projects with no owner

```sql
SELECT p.id, p.name
FROM projects AS p
LEFT JOIN users AS u ON u.id = p.owner_id
WHERE p.org_id = 42
  AND u.id IS NULL;
```

### Query D — Healthy many:1 nested loop (`eq_ref`)

```sql
EXPLAIN
SELECT o.id, c.email
FROM order_headers AS o
INNER JOIN users AS c ON c.id = o.customer_id
WHERE o.customer_id = 1001;
```

Expect something in the spirit of: driving `order_headers` via index/ref, `users` as `eq_ref` on PRIMARY.

### Query E — 1:N fanout hazard

```sql
SELECT o.id AS order_id, l.sku, l.qty
FROM order_headers AS o
INNER JOIN order_lines AS l ON l.order_id = o.id
WHERE o.customer_id = 1001;
```

Then contrast with batched pattern:

```sql
SELECT id FROM order_headers WHERE customer_id = 1001;  -- app collects ids
SELECT order_id, sku, qty FROM order_lines WHERE order_id IN (...);
```

### Query F — N+1 vs join (pseudo-ORM)

```text
# Bad
projects = Project.where(org_id: 42).limit(50)
projects.map { |p| { project: p, owner: p.owner } }  # query per owner

# Better (ORM include / join)
projects = Project.where(org_id: 42).includes(:owner).limit(50)

# Also fine (explicit)
# single SQL as in Query A
```

### Query G — Hash join “missing index” exhibit (optional demo schema)

```sql
-- Intentionally weak: join columns not indexed
EXPLAIN FORMAT=TREE
SELECT *
FROM t1
JOIN t2 ON t1.c1 = t2.c1;
-- Extra / TREE: hash join (see hash-joins node)
```

Use only as a contrast lab — production teaching schema should show the indexed path.

---

## Tie-back checklist

Ship-ready questions for the reader (and for the end of the post):

- [ ] **Semantics:** For each association in the endpoint, did I pick INNER (required) vs LEFT (optional) on purpose?
- [ ] **ON vs WHERE:** Are optional-match filters in `ON`? Do `WHERE` predicates on the right table intentionally convert to INNER?
- [ ] **Indexes:** Is every join key / FK indexed so EXPLAIN shows `eq_ref` / `ref` (or a justified hash join on small sets)?
- [ ] **Driving filter:** Does the query start from a selective, indexed WHERE (org, user, status) rather than scanning a large fact table?
- [ ] **Fanout:** If any hop is 1:N, have I checked row multiplication and payload size? Split query or aggregate if needed?
- [ ] **N+1:** Did I search logs/APM for repeated identical SELECTs per request? Replaced with join, `includes`/`select_related`, or `IN` batch?
- [ ] **EXPLAIN smoke test:** Table order sensible? No unexpected `ALL` on large tables? `rows` product not absurd for the page size?
- [ ] **Denormalize decision:** If this join is on the hottest list path and only needs a display field/count, is a cached column cheaper than perpetual joining?
- [ ] **Pagination (forward ref):** If I `ORDER BY` / `LIMIT` after joins, will article 05’s rules still hold with my indexes?
- [ ] **Avoid RIGHT JOIN** unless translating SQL from elsewhere — write LEFT for clarity.

---

## Open questions / author notes

1. **Article 05 ordering:** Series README lists Pagination as 05 and Joins as 06, but joins often appear *inside* paginated list queries. This plan assumes 05 may publish around the same time — use light forward/back refs; don’t steal keyset pagination depth here. Confirm hub `seriesList` order matches README.

2. **Hash join prominence:** Nested-loop is the teaching spine (matches title + interactive). How much screen time for hash join? Recommendation: one tight subsection + EXPLAIN Extra callout so 9.x EXPLAIN doesn’t surprise readers. Avoid turning the piece into a join-algorithm catalog.

3. **Existing stub:** `/posts/mysql-joins/` is a “Coming soon” MDX. Replace in place; keep layout/series nav wiring. Confirm `seriesList.postSlugs` already includes `mysql-joins`.

4. **ORM examples:** Pick **two** ecosystems for concrete snippets (e.g. Prisma + Rails, or Django + Prisma) rather than four shallow dialects. Prefer patterns (`includes` / `select_related` / `join`) over version-specific APIs.

5. **Foreign keys:** Schema examples use FKs for clarity; article 16 owns FK deep dive. Note that indexes on join columns matter even when FKs are enforced only in the app.

6. **`STRAIGHT_JOIN`:** Document as escape hatch with warnings (semijoin disable). Don’t recommend it as everyday style.

7. **Interactive scope control:** THREE presets max; hash-join mode can be schematic (build bucket → probe) rather than a full hash-table simulation.

8. **Denormalization ethics:** Keep the section short and pragmatic — counters / display-name caches — not a data-warehousing digression.

9. **Semijoins:** `IN (SELECT …)` often becomes semijoin/hash semijoin (`hash-joins`, `semijoins-antijoins`). One sentence + “exists-check ≠ join for hydration” is enough; don’t derail.

10. **Comma joins:** Mention precedence footgun from `join` docs briefly (“don’t mix `,` with explicit JOIN”) then move on — style guide: always write `INNER JOIN` / `LEFT JOIN`.

11. **VERIFY before publish:** Re-run example `EXPLAIN` / `EXPLAIN FORMAT=TREE` on MySQL 9.7 (or closest) so access types match screenshots; optimizer details drift.

12. **Cross-links:** Explicit links to stubs/posts for `mysql-indexes`, `mysql-select`, future `mysql-pagination`, `mysql-explain`.

---

## Writing checklist (when drafting the post)

- [ ] Open with web-app scenario; close with checklist — no floating theory.
- [ ] Cite refman via node id + URL; paraphrase only.
- [ ] Interactive at top; caption states the learning outcome in one sentence.
- [ ] INNER/LEFT, nested-loop fanout, join order, N+1, denormalize — all five focus items covered.
- [ ] Spoon-fed: one idea per section; worked schema reused throughout.
- [ ] No steal of full EXPLAIN course (10) or covering-index course (15).
)
