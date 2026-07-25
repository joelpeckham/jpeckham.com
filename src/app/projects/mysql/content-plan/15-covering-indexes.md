# Article 15 — Covering Indexes, ICP & Index-Only Access

| Field | Value |
| --- | --- |
| **Number** | 15 |
| **Title** | Covering Indexes, ICP & Index-Only Access |
| **Slug** | `mysql-covering-indexes` |
| **Tier** | Deep dive (Part B) |
| **Audience** | Web app programmers who already have Part A literacy (indexes, SELECT/projection, EXPLAIN) and now need to design indexes for hot API read paths under load |
| **Published path** | `/posts/mysql-covering-indexes/` |
| **Depends on** | 02 PK/clustered, **03 secondary indexes**, **04 SELECT/projection**, 05 pagination (ORDER BY alignment), **10 EXPLAIN** (`Using index` / `Using index condition`) |
| **Feeds** | 13 buffer pool (index leaf density / working set), 17 JSON/generated columns (covering via generated cols), 18 online DDL (cost of wider indexes), 20 perf schema (handler read stats) |
| **Status** | Plan only |

---

## Authoring contract

- **Status:** Plan only — stub wired; article not written yet.
- **Voice:** First person, casual/jokey, flowing prose. Humanizer pass before publish.
- **No formulaic stamps:** No `**Why bother:**`, “App consequence:”, or “Things to Play With” lists.
- **Citations:** IEEE `<Cite />` + `<References items={[…]} />`. Source technical claims; paraphrase refman only.
- **Interactives:** 3–5 small demos mid-article; **PK bounce avoided** must read clearly (builds on article 02 secondary-bounce demo). Shared chrome from `schema-byte-budget/shared.tsx`.
- **House defaults:** Integer cents; ULID public ids; `utf8mb4_0900_ai_ci`; Prisma primary ORM.
- **Length:** Part B — skimmable prose over encyclopedia.

---

## Intent

Teach the **next level of index design** after article 03: not “can MySQL find the rows?” but “**must InnoDB still bounce to the clustered row for every match?**”

After this article, a reader should be able to:

1. Explain the InnoDB secondary → primary key → clustered-row path, and why that “double lookup” dominates p99 on hot list/detail APIs once the working set doesn’t fit cache.
2. Define a **covering index** (index-only access): the query’s filter + projection (+ often sort) columns are all available from one index tree — EXPLAIN shows **`Using index`**.
3. Contrast covering with **Index Condition Pushdown (ICP)**: `Using index condition` means the engine filters *more* using index columns **before** reading full rows, but still needs base-table rows for the result (or remaining predicates).
4. Read the EXPLAIN Extra vocabulary precisely: `Using index` ≠ `Using index condition` ≠ `Using where` alone; know when MRR (`Using MRR`) is a related “secondary → PK bounce” optimizer, not a covering substitute.
5. Design (and intentionally widen) indexes for **specific hot API read paths** — list cards, status badges, “my recent X” — without turning every table into a write-killing index museum.
6. Use a mental cost model: *index range length × (index leaf I/O + optional PK lookups)* — then decide whether narrowing the range (better prefix / ICP-friendly predicates) or eliminating PK lookups (covering) is the lever.

**Explicitly out of scope (link, don’t steal):**

| Topic | Owns it |
| --- | --- |
| Left-prefix, selectivity, composite basics | Article 03 |
| Sargability, projection hygiene (`SELECT *`) as foundations | Article 04 |
| Keyset vs offset pagination | Article 05 |
| Full EXPLAIN literacy | Article 10 (this article *uses* that literacy) |
| Buffer pool / working-set sizing | Article 13 |
| Generated columns / JSON multi-valued indexes as covering tools | Article 17 |
| `ADD INDEX` / ONLINE DDL production cost | Article 18 |
| Handler / wait forensics in prod | Article 20 |

**Promise:** Readers leave able to take a hot Prisma/Rails/Django list query that already “uses an index” and make it **index-only** (or ICP-optimal) — and verify with EXPLAIN — without cargo-culting “include every column.”

---

## Real-world hook

**Opening scene — the index is “used” but the API is still slow.**

A SaaS admin list (Shopify-style orders, Linear-style issues, Intercom-style inbox, Stripe Dashboard payments) already has the article-03 composite:

```sql
KEY idx_org_status_updated (org_id, status, updated_at)
```

`EXPLAIN` for the list endpoint shows `type: ref` / `range`, `key: idx_org_status_updated` — teammates declare victory. Production p95 for:

`GET /api/orgs/:orgId/orders?status=open&limit=50`

is still 200–800ms under load. Why?

The handler (or ORM) still does something like:

```sql
SELECT id, org_id, status, updated_at, customer_email, total_cents, currency
FROM orders
WHERE org_id = ? AND status = 'open'
ORDER BY updated_at DESC
LIMIT 50;
```

InnoDB walks the secondary index (good), then for **each** of those ~50 (or thousands before `LIMIT` filtering in worse plans) performs a **primary-key lookup into the clustered index** to fetch `customer_email`, `total_cents`, `currency` — columns that live only in the row. At scale that is random-ish buffer-pool traffic (and disk if cold). Article 13 will name the cache pressure; **this article owns the bounce**.

**The insight this piece owns:**

- If the SELECT list fits in the secondary index (plus the PK columns InnoDB already stores there), EXPLAIN can show **`Using index`** — **zero** clustered lookups for those rows.
- If some WHERE predicates can be checked from index columns but you still need the row, ICP (`Using index condition`) cuts wasted row reads — better than filtering after every bounce, still not free.
- Widening the index to cover the **list card** (not the whole row) is a product-shaped index decision: design for the API payload, not `SELECT *`.

**Secondary hooks (short callouts):**

- **GitHub / GitLab issue boards** — board columns need `id`, `title`, `state`, `updated_at`, assignee avatar id — not the issue body `TEXT`. Covering the card columns; leave body for detail.
- **E-commerce “my orders”** — `customer_id + created_at` filter; cover `id, status, total_cents, created_at` for the list; don’t cover shipping addresses.
- **Session / API-key validation** — high QPS equality lookup where covering `token_hash → user_id, expires_at` avoids loading the full sessions row every request.
- **Read replicas under lag-tolerant dashboards** — covering indexes shrink replica I/O for the same SQL shape (tease article 19 lightly: same plan, cheaper leaf scans).

**Emotional beat:** Article 03 taught “get the right composite.” Article 04 taught “don’t `SELECT *`.” Article 10 taught “read Extra.” Article 15 is where those three meet under load: **projection + index leaf contents = whether the PK bounce happens at all.**

---

## Primary documentation sources

Local corpus: `sources/mysql-refman-9.7/nodes/<id>.md`. Cite public HTML in the published post. **Paraphrase only — never paste Oracle manual prose.**

### Core (must read / teach from)

| Node id | Title | URL | Why for this article |
| --- | --- | --- | --- |
| `index-condition-pushdown-optimization` | Index Condition Pushdown Optimization | https://dev.mysql.com/doc/refman/9.7/en/index-condition-pushdown-optimization.html | **ICP definition**, when it applies (`range`/`ref`/`eq_ref`/`ref_or_null`), InnoDB **secondary-only**, EXPLAIN `Using index condition`, `optimizer_switch` `index_condition_pushdown`, zipcode/lastname teaching shape (re-domain to app SQL) |
| `mysql-indexes` | How MySQL Uses Indexes | https://dev.mysql.com/doc/refman/9.7/en/mysql-indexes.html | Explicit **covering index** definition: retrieve values from the index tree without consulting data rows |
| `innodb-index-types` | Clustered and Secondary Indexes | https://dev.mysql.com/doc/refman/9.7/en/innodb-index-types.html | Secondary leaf = indexed cols + **PK**; PK lookup into clustered index — the bounce mechanics |
| `explain-output` | EXPLAIN Output Format | https://dev.mysql.com/doc/refman/9.7/en/explain-output.html | Extra: **`Using index`** (index-only), **`Using index condition`** (ICP), `type: index` + covering note; JSON property names |
| `optimization-indexes` | Optimization and Indexes | https://dev.mysql.com/doc/refman/9.7/en/optimization-indexes.html | Index chapter framing; balance read wins vs write/space cost of more/wider indexes |
| `optimizing-innodb-queries` | Optimizing InnoDB Queries | https://dev.mysql.com/doc/refman/9.7/en/optimizing-innodb-queries.html | InnoDB guidance: short PK; prefer few composites; **covering index** can avoid reading table data |
| `index-extensions` | Use of Index Extensions | https://dev.mysql.com/doc/refman/9.7/en/index-extensions.html | PK silently appended; covering often “works” because `id` is already in the secondary; EXPLAIN `Using index` examples with `key_len` changes |
| `mrr-optimization` | Multi-Range Read Optimization | https://dev.mysql.com/doc/refman/9.7/en/mrr-optimization.html | When row reads *are* needed: sort PK lookups to reduce random I/O; **`Using MRR`**; **not used when covering** (no base-row access) |

### Supporting (cite selectively)

| Node id | Title | URL | Use |
| --- | --- | --- | --- |
| `switchable-optimizations` | Switchable Optimizations | https://dev.mysql.com/doc/refman/9.7/en/switchable-optimizations.html | `index_condition_pushdown`, `mrr`, `mrr_cost_based` flags — for interactive ICP on/off and staging experiments |
| `where-optimization` | WHERE Clause Optimization | https://dev.mysql.com/doc/refman/9.7/en/where-optimization.html | Reinforce: indexes matter most when queries don’t need most rows; bridge from Foundations |
| `multiple-column-indexes` | Multiple-Column Indexes | https://dev.mysql.com/doc/refman/9.7/en/multiple-column-indexes.html | Left-prefix still rules covering composites — covering doesn’t repeal article 03 |
| `order-by-optimization` | ORDER BY Optimization | https://dev.mysql.com/doc/refman/9.7/en/order-by-optimization.html | Covering + avoiding filesort when ORDER BY matches index suffix (list APIs) |
| `group-by-optimization` | GROUP BY Optimization | https://dev.mysql.com/doc/refman/9.7/en/group-by-optimization.html | Light: `Using index for group-by` as cousin of covering (dashboard aggregates) |
| `explain` / `using-explain` | EXPLAIN / Using EXPLAIN | https://dev.mysql.com/doc/refman/9.7/en/explain.html · https://dev.mysql.com/doc/refman/9.7/en/using-explain.html | How to verify covering/ICP; `FORMAT=TREE` / ANALYZE when teaching measured cost |
| `create-index` | CREATE INDEX | https://dev.mysql.com/doc/refman/9.7/en/create-index.html | Syntax for adding covering columns; invisible indexes for A/B |
| `invisible-indexes` | Invisible Indexes | https://dev.mysql.com/doc/refman/9.7/en/invisible-indexes.html | Safe prod experiment: new covering index vs old filter-only index |
| `engine-condition-pushdown-optimization` | Engine Condition Pushdown | https://dev.mysql.com/doc/refman/9.7/en/engine-condition-pushdown-optimization.html | One-paragraph contrast: NDB/engine pushdown ≠ ICP (avoid conflating “pushdown” jargon) |
| `controlling-optimizer` | Controlling the Query Optimizer | https://dev.mysql.com/doc/refman/9.7/en/controlling-optimizer.html | Mention-only: hints / switches exist; default app fix is schema + SELECT list |

### Deliberately light / defer

- Full buffer-pool math → **13**
- Online DDL / lock behavior of `ADD INDEX` → **18** (one caveat paragraph)
- Histograms / cost model internals → **10** / ops notes
- Generated-column indexes as covering for JSON attributes → **17**
- Skip scan / Index Merge algorithms → mention only if EXPLAIN shows them

**Citation rule:** paraphrase mechanisms; cite with `<Cite />` / `<References />`; original teaching schemas (tickets/orders), not Oracle’s `people`/`zipcode` verbatim.

---

## Article structure

Suggested H2 spine — sentence-case. Scatter **named mini-demos** mid-article; callback article 02 **secondary bounce** before teaching covering.

1. **Part B opener + what today covers** — “index is used but API still slow”; PK bounce tax.
2. **Refresh: secondary leaf anatomy** — indexed cols + PK; two-hop path (02/03). *(Embed **PK bounce counter** — same visual language as article 02; show N clustered lookups.)*
3. **What covering / index-only means** — `Using index`; mental test.
4. **Projection is half the design** — list DTO vs `SELECT *` (04).
5. **Designing a covering composite for a hot API** — filter → sort → payload suffix. *(Embed **Covering index builder** — flip to `Using index`, bounce → 0.)*
6. **ICP — filter before the bounce** — `Using index condition` ≠ covering. *(Embed **ICP filter gate**.)*
7. **Covering vs ICP vs MRR** — decision triangle; MRR one short section.
8. **Costs and anti-patterns** — wider indexes; ORM greed. *(Embed **SELECT \* tax** preset on builder.)*
9. **Worked gallery** — before/after EXPLAIN Extra.
10. **Tie-back checklist** + forward links (13, 17, 18, 20).
11. **References** — IEEE list.

---

## Deep-dive beats

Teach these in order. Weave app outcomes into prose — no “App implication:” stamp lines.

### Beat A — The secondary → PK bounce is the tax

- From `innodb-index-types`: secondary entries carry PK values; InnoDB uses them to find the clustered row.
- Non-covering access ≈ *index seek/scan + N clustered lookups* (N ≈ rows examined that pass index conditions).
- A “perfect” composite that still serves `SELECT *` from a wide orders row pays the tax on every list request. Measure with `EXPLAIN ANALYZE` / handler reads (tease 20), not vibes.

### Beat B — Covering = index-only = `Using index`

- From `mysql-indexes`: if the query uses only columns present in some index, values can come from the index tree.
- From `explain-output`: Extra `Using index` means no additional seek to the actual row.
- Nuance: for InnoDB user-defined clustered PK, `type: index` + `key: PRIMARY` can be index-ish without Extra `Using index` — teach carefully so readers don’t false-negative on PK scans.
- List endpoints should name columns; then extend the composite until Extra flips to `Using index` *for that query*.

### Beat C — PK extension is already covering `id`

- From `index-extensions`: secondary `(org_id, status, updated_at)` is internally like `(org_id, status, updated_at, id)` (for a single-column PK).
- `SELECT id, org_id, status, updated_at WHERE …` may already be covering **without** adding `id` to the KEY definition.
- Start by projecting PK + indexed columns; only then add true payload columns (`email`, `total_cents`) to the index definition.

### Beat D — Column order still matters (covering doesn’t repeal left-prefix)

- Filter/sort prefix rules from article 03 still apply (`multiple-column-indexes`).
- Heuristic for covering list indexes:  
  **`(always_equality…, optional_equality…, range_or_order_by…, [payload cols…])`**
- Payload columns at the end usually don’t participate in range determination — they’re there so the leaf can answer SELECT. Putting a low-selectivity payload column *before* the range key can wreck the prefix — don’t.
- “include columns” ≠ “shuffle filter order.” Treat covering suffixes as *INCLUDE*-style (MySQL has no separate INCLUDE syntax — you append to the composite).

### Beat E — ICP: push predicates into the index walk

- Without ICP: read index tuple → **read full row** → evaluate WHERE (`index-condition-pushdown-optimization`).
- With ICP: read index tuple → evaluate **index-evaluable** WHERE parts → only then read full row → evaluate remainder.
- EXPLAIN: `Using index condition`. Manual states it does **not** show `Using index` because full rows still must be read when ICP applies in the documented sense.
- Applicability (teach the InnoDB-relevant bits): `range`/`ref`/`eq_ref`/`ref_or_null`; InnoDB **secondary** only; not for conditions with subqueries/stored functions; not for secondary indexes on virtual generated columns (as of this refman node).
- Classic shape (re-domain): index `(zip, last, first)` + `zip = ? AND last LIKE '%x%' AND address LIKE …` — leading equality uses index range; ICP can test `last LIKE` before row read; `address` still needs the row.
- When you can’t cover (payload too wide / rarely selected), still put filterable columns in the index so ICP can discard junk keys cheaply — e.g. store `status` even if SELECT needs a fat `metadata` JSON column.

### Beat F — Covering vs ICP vs MRR (one diagram in prose)

| Goal | Extra (typical) | Base row reads |
| --- | --- | --- |
| Answer from index only | `Using index` | None for that table access |
| Filter using index, still need row | `Using index condition` | Only for keys that pass ICP |
| Need many row reads via secondary range | `Using MRR` (sometimes) | Yes, but PK-ordered batching |
| Locate via index, filter in server | `Using where` (± index) | For examined candidates |

- MRR (`mrr-optimization`): accumulate index tuples, sort by row ID, sequentialize clustered access — helps when covering is impossible and table isn’t cached.
- InnoDB/MyISAM skip MRR when covering already applies.
- Chase covering for stable hot paths; understand ICP/MRR as “still bouncing, but smarter.”

### Beat G — ORM footguns that destroy covering

- `SELECT *` / `Model.all` / Prisma `findMany` without `select:` → any new migration column can break covering silently.
- GraphQL/resolvers that request nested fields → SQL suddenly needs non-covered columns.
- `includes` / eager loads that force join to wide tables — covering on the drive table doesn’t fix joined tables (tease 06).
- Soft-delete scopes (`deleted_at IS NULL`) — if `deleted_at` isn’t in the index, you may lose covering or rely on ICP/WHERE after row read; often belongs in the composite.
- Treat the **list DTO** as the covering contract; add a CI check or comment next to the migration: “covers `GET /api/...`.”

### Beat H — Write and memory cost of covering indexes

- From `optimization-indexes` / `optimizing-innodb-queries`: indexes cost space and slow writes; fat indexes reduce leaf density → more I/O to scan the same key range.
- Updating a covered payload column (e.g. `status` or `total_cents`) updates the secondary leaf — list-friendly columns that change often have write amplification.
- Prefer covering **stable** list fields; avoid covering rapidly churning counters unless the read path is critical.
- One covering index per hottest endpoint beats five “almost covering” indexes.

### Beat I — Verify like a grown-up

- Staging: `EXPLAIN` / `EXPLAIN FORMAT=TREE` / `EXPLAIN ANALYZE` (careful in prod) — look for Extra flip.
- Optional: `SET optimizer_switch = 'index_condition_pushdown=off'` A/B to feel ICP (interactive mirrors this).
- Invisible index swap: add covering index, make old index invisible, watch p95 / handler stats (articles 18/20).
- Don’t ship a wider index without a before/after plan pasted in the PR.

---

## Interactive feature

Scatter **4–5 small demos** under `src/components/interactive/mysql-covering-index/` (reuse bounce visual from article 02 where possible). Win metric: **PK / clustered lookups avoided**.

### 1. PK bounce counter

- **Goal:** Secondary range finds rows; each non-covered column forces a clustered lookup — counter climbs (article 02 callback).
- **Placement:** Secondary leaf refresh (§2).
- **UX:** Step strip: secondary scan → N bounces; mono SQL; big “PK lookups: N” readout.

### 2. Covering index builder

- **Goal:** Append payload columns to composite + narrow SELECT → `Using index`, bounces drop to 0.
- **Placement:** Designing covering composite (§5).
- **UX:** Column chips for index + SELECT toggles; EXPLAIN Extra badge flips.

### 3. ICP filter gate

- **Goal:** `Using index condition` filters on index before row read — partial win, not index-only.
- **Placement:** ICP section (§6).
- **UX:** ICP on/off; show row reads remaining vs bounce counter.

### 4. SELECT * tax

- **Goal:** Same covering index; `SELECT *` pulls `notes` TEXT → lose `Using index`, bounces return.
- **Placement:** Anti-patterns (§8).
- **UX:** Preset on #2 builder — one click “ORM SELECT *”.

### 5. List card preset *(optional)*

- **Goal:** Before/after buttons: filter-only index + list card SELECT vs covering index.
- **Placement:** Gallery or §5. Cut if #2 covers it.

**Non-goals:** full MRR simulation; fake cost-based optimizer.

---

## Example queries / schemas

Original teaching examples (do **not** copy Oracle’s `people`/`zipcode` verbatim; same *ideas*, app domain).

### Schema — multi-tenant orders (running example)

```sql
CREATE TABLE orders (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id          BIGINT UNSIGNED NOT NULL,
  status          ENUM('open','paid','canceled') NOT NULL,
  customer_email  VARCHAR(255) NOT NULL,
  total_cents     INT UNSIGNED NOT NULL,
  currency        CHAR(3) NOT NULL,
  notes           TEXT NULL,
  updated_at      DATETIME(6) NOT NULL,
  created_at      DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  -- Article 03 shape: finds rows, does not cover list card
  KEY idx_org_status_updated (org_id, status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### Query A — index used, not covering (the hook)

```sql
EXPLAIN
SELECT id, status, updated_at, customer_email, total_cents, currency
FROM orders
WHERE org_id = 42 AND status = 'open'
ORDER BY updated_at DESC
LIMIT 50;

-- Expect teaching plan: key = idx_org_status_updated,
-- Extra may include Using where (and NOT Using index)
-- → secondary range + clustered lookups for email/total/currency
```

### Query B — covering index for the list card

```sql
ALTER TABLE orders
  ADD KEY idx_org_status_updated_cover (
    org_id, status, updated_at,
    customer_email, total_cents, currency
  );
-- id is available via index extension; optional to omit from KEY list

EXPLAIN
SELECT id, status, updated_at, customer_email, total_cents, currency
FROM orders
WHERE org_id = 42 AND status = 'open'
ORDER BY updated_at DESC
LIMIT 50;

-- Target Extra: Using index
-- (and typically no need for MRR)
```

### Query C — covering destroyed by ORM greed

```sql
-- Same covering index, but:
SELECT *
FROM orders
WHERE org_id = 42 AND status = 'open'
ORDER BY updated_at DESC
LIMIT 50;

-- notes (TEXT) forces clustered reads → lose Using index
```

### Query D — ICP without full covering

```sql
-- Index: (org_id, status, updated_at, customer_email)
-- SELECT still needs notes → cannot cover

EXPLAIN
SELECT id, customer_email, notes
FROM orders
WHERE org_id = 42
  AND status = 'open'
  AND customer_email LIKE '%@acmefreemail.test%'
  AND notes LIKE '%refund%';

-- Teaching: org_id+status use index; email LIKE may be ICP-checked
-- on index columns before row read; notes LIKE needs the row.
-- Extra: Using index condition (when ICP on), not Using index.

SET SESSION optimizer_switch = 'index_condition_pushdown=off';
-- Re-EXPLAIN: more aggressive row reads / Using where story
SET SESSION optimizer_switch = 'index_condition_pushdown=on';
```

### Query E — already covering via PK extension (aha)

```sql
EXPLAIN
SELECT id, org_id, status, updated_at
FROM orders
WHERE org_id = 42 AND status = 'open'
ORDER BY updated_at DESC
LIMIT 50;

-- Often Using index on idx_org_status_updated alone
-- because PK id is in the secondary leaf (index-extensions)
```

### Query F — session validation (high-QPS covering)

```sql
CREATE TABLE api_sessions (
  token_hash  BINARY(32) NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  expires_at  DATETIME(6) NOT NULL,
  user_agent  VARCHAR(255) NULL,
  PRIMARY KEY (token_hash),
  KEY idx_user_expires (user_id, expires_at)
) ENGINE=InnoDB;

-- Hot path: PK is already clustered covering for
-- SELECT user_id, expires_at FROM api_sessions WHERE token_hash = ?
-- Teach: clustered PK access is "row is the leaf" — covering is natural.
-- Contrast with secondary-driven lists where covering is a design choice.
```

### Anti-patterns (short)

```sql
-- Covering by including TEXT/JSON — bloated leaves, sad writes
KEY idx_bad (org_id, status, notes(100))  -- prefix on TEXT: usually the wrong tool here

-- Payload column in the wrong place (breaks range on updated_at)
KEY idx_worse (org_id, customer_email, status, updated_at)

-- Redundant pair after covering lands
-- KEY idx_org_status_updated (...)  -- retire via invisible → drop (arts 03/18)
```

### ORM sketches

```ts
// Prisma: covering only if select matches index leaf
prisma.order.findMany({
  where: { orgId: 42, status: "open" },
  orderBy: { updatedAt: "desc" },
  take: 50,
  select: {
    id: true,
    status: true,
    updatedAt: true,
    customerEmail: true,
    totalCents: true,
    currency: true,
  },
});
```

```ruby
# Rails: select() is not optional for covering
Order.where(org_id: 42, status: "open")
     .order(updated_at: :desc)
     .limit(50)
     .select(:id, :status, :updated_at, :customer_email, :total_cents, :currency)
```

---

## Tie-back checklist

Close by forcing internals → app outcomes:

- [ ] **List DTO = covering contract:** For each hot GET list, write the SELECT columns beside the composite. If EXPLAIN lacks `Using index`, decide: widen index, shrink SELECT, or accept bounce.
- [ ] **Don’t cover detail blobs:** `TEXT`/`JSON`/rarely shown columns stay off list indexes; fetch on detail/PK path.
- [ ] **PK bounce literacy:** If Extra has no `Using index`, assume secondary → clustered lookups unless proven otherwise (ICP/MRR only reduce pain).
- [ ] **ICP vs covering vocabulary:** `Using index condition` means “smarter filtering before row read,” not index-only. Don’t stop optimizing at ICP for ultra-hot paths.
- [ ] **Left-prefix still rules:** Append payload columns *after* filter/sort keys; don’t insert email in the middle of `(org_id, status, updated_at)`.
- [ ] **Use free PK extension:** Confirm whether `id` (+ PK parts) already make a skinny projection covering before adding columns.
- [ ] **ORM select lists in code review:** A new column on the model must not silently expand production SQL for covered endpoints.
- [ ] **Write tax:** Covering columns that update often amplify secondary maintenance — prefer stable card fields.
- [ ] **Verify in PR:** Paste before/after `EXPLAIN` (Extra + `key` + `rows`). Optional ICP off/on for ICP claims.
- [ ] **Retire supersets:** When a covering index replaces a thinner one, invisible-index the old key before drop (→ 18).
- [ ] **Cache awareness:** Covering shrinks random row I/O but widens index leaves — if p99 stays high, continue to buffer pool (13) and perf schema (20).
- [ ] **Forward path:** Need covering on JSON attribute? → generated column index (17).

---

## Open questions / author notes

1. **INCLUDE-style storytelling:** MySQL has no `INCLUDE (cols)` syntax (unlike SQL Server/PostgreSQL). Decide house metaphor: “covering suffix” vs “fake INCLUDE.” Recommend: teach as **appended non-filter columns** and mention other engines’ INCLUDE in one sentence so readers with Postgres muscle memory don’t search for missing syntax.
2. **How much MRR?** Keep to one short section + Extra decode. Resist `read_rnd_buffer_size` tuning essay — out of series tone for app devs.
3. **`Using index for group-by`:** Sidebar or one gallery item for admin dashboards (`COUNT`/`DISTINCT` on covered keys)? Valuable but easy scope creep — default to a callout linking `group-by-optimization`.
4. **Descending / mixed ASC-DESC indexes:** List APIs often `ORDER BY updated_at DESC`. Confirm with 9.7 behavior whether backward index scan still yields `Using index` for covering; one verified example in drafting — don’t hand-wave.
5. **Interactive fidelity:** Toy cardinality is fine; label assumptions (“illustrative 10k open orders / org”). Don’t claim to reproduce optimizer cost model.
6. **Primary ORM for snippets:** Match series house style (Prisma *or* Rails primary + one contrast). Stay consistent with articles 03/04.
7. **Schema continuity:** Reuse `orders` / `tickets` from 03/10 so the arc feels cumulative; avoid a brand-new domain.
8. **Replica / buffering crossover:** One sentence each to 13 and 19 — enough that covering isn’t sold as the only lever.
9. **Virtual generated columns + ICP:** Refman says ICP not supported with secondary indexes on virtual generated columns — note for article 17 cross-link; don’t deep-dive here.
10. **Legal/tone:** Paraphrase only; link refman URLs; no Oracle text blocks in MDX.
11. **Title/SEO alternatives:** “MySQL Covering Indexes,” “Index-Only Scans in InnoDB,” “Using index vs Using index condition” — slug stays `mysql-covering-indexes`.
12. **Part B wiring:** Hub `/projects/mysql/` + `seriesList.postSlugs` should list this as #15 after durability (#14). Ensure article 03/04/10 teasers already point here (they do in plans — verify at publish time).

---

## Drafting checklist (when writing the post)

- [ ] Callback article 02 bounce demo; scatter covering/ICP demos mid-article
- [ ] `<Cite />` / `<References />`; humanizer pass; first-person voice
- [ ] Glossary: `Using index` vs `Using index condition` vs `Using MRR`
- [ ] Before/after EXPLAIN narratives; cross-link 03, 04, 10, 13, 17, 18, 20
)
