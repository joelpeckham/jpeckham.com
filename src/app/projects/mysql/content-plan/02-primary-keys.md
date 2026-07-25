# 02 — Primary Keys & the Clustered Index

| Field | Value |
| --- | --- |
| **Number** | 02 |
| **Title** | Primary Keys & the Clustered Index |
| **Slug** | `mysql-primary-keys` |
| **Tier** | Foundations (Part A) |
| **Hub** | `/projects/mysql/` |
| **Post** | `/posts/mysql-primary-keys/` |
| **Prereq** | 01 — Tables, Types & Schema |
| **Next** | 03 — Secondary Indexes (`mysql-indexes`) |
| **Audience** | Web app programmers; spoon-fed InnoDB mechanics tied to ORMs, APIs, and multi-tenant schemas |

---

## Intent

Teach that in InnoDB the primary key **is** the table’s physical layout: row data lives in the clustered index leaf pages. Choosing a PK is not a naming ceremony — it decides insert locality, secondary-index width, join cost, and how every `WHERE id = ?` detail endpoint behaves under load.

By the end, a reader should be able to:

1. Explain the three ways InnoDB picks a clustered index (`PRIMARY KEY` → suitable `UNIQUE NOT NULL` → hidden `GEN_CLUST_INDEX` / optional GIPK).
2. Draw the two-hop path for a secondary-index lookup (secondary leaf → PK → clustered leaf).
3. Defend a PK shape for a real app table: `BIGINT UNSIGNED AUTO_INCREMENT`, time-ordered UUID, or composite multi-tenant key — with tradeoffs, not dogma.
4. Spot ORM defaults that silently create random clustered keys or tables with no explicit PK.

**Out of scope (hand off):** composite secondary left-prefix / selectivity (03); covering indexes & ICP (15); FK cascades (16); online DDL of PK changes (18). Mention briefly; do not steal those articles.

---

## Real-world hook

Open with a familiar pain: a SaaS `orders` table that started with `id CHAR(36)` UUID v4 because “distributed IDs are safer,” then grew three secondary indexes (`account_id`, `status`, `created_at`). Writes slowed, buffer pool churned, and `SHOW TABLE STATUS` index size rivaled the data. The bug was not “indexes are bad” — it was **random PK → random leaf inserts → page splits**, plus **36-byte PK copied into every secondary entry**.

Concrete industry patterns to name (without claiming insider internals):

| Pattern | Who / where it shows up | Teaching point |
| --- | --- | --- |
| Monotonic `BIGINT` surrogate | Classic Rails / Laravel / Django MySQL apps; Shopify-scale integer IDs | Cheap clustered inserts; narrow FK/join keys; easy `LAST_INSERT_ID()` |
| Opaque / public IDs separate from PK | Stripe-style `cus_…` / `pi_…` in APIs | Clustered key can stay internal bigint; public id is a unique secondary |
| Time-ordered 128-bit IDs | UUID v7 / ULID / KSUID in modern Node/Go services | Keep global uniqueness without pure-random page thrash |
| Random UUID v4 as PK | Many early Prisma / Nest / serverless schemas | Worst common InnoDB clustered shape at write volume |
| Composite tenant-leading PK | Multi-tenant B2B SaaS (`PRIMARY KEY (tenant_id, id)`) | Locality for “all rows for this tenant”; every secondary still pays composite width |
| Snowflake / shard-friendly ints | Discord/Twitter-style 64-bit IDs (conceptually) | Still monotonic-ish; fits `BIGINT` without UUID bloat |
| “Forgot a PK” ORM migrations | Greenfield dumps, import scripts, `CREATE TABLE` without `PRIMARY KEY` | Hidden 6-byte row-id cluster or GIPK — invisible until replication / FK pain |

Hook close: GitHub Issues / Linear-style detail URLs (`/orders/1847291`) map naturally to clustered PK lookups. If the URL uses a UUID that is *also* the clustered key, every secondary index and every FK child table pays that tax forever.

---

## Primary documentation sources

Cite node id + public HTML. Paraphrase only — no Oracle prose paste in the published article.

### Must-read (core claims of this post)

| Node id | URL | Use in article |
| --- | --- | --- |
| `innodb-index-types` | https://dev.mysql.com/doc/refman/9.7/en/innodb-index-types.html | Clustered vs secondary; PK selection order; secondary entries contain PK; short-PK guidance |
| `innodb-introduction` | https://dev.mysql.com/doc/refman/9.7/en/innodb-introduction.html | InnoDB default engine; clustered index as a headline advantage |
| `primary-key-optimization` | https://dev.mysql.com/doc/refman/9.7/en/primary-key-optimization.html | PK = vital lookup columns; auto-increment surrogate when no natural key |
| `create-table` | https://dev.mysql.com/doc/refman/9.7/en/create-table.html | `PRIMARY KEY` / `AUTO_INCREMENT` syntax & rules (short PK for InnoDB secondaries) |
| `innodb-physical-structure` | https://dev.mysql.com/doc/refman/9.7/en/innodb-physical-structure.html | B-tree leaves; sequential vs random insert fill (~15/16 vs ~1/2–15/16) — UUID story ammo |
| `example-auto-increment` | https://dev.mysql.com/doc/refman/9.7/en/example-auto-increment.html | App-facing `AUTO_INCREMENT` / `LAST_INSERT_ID()` / type sizing |
| `innodb-auto-increment-handling` | https://dev.mysql.com/doc/refman/9.7/en/innodb-auto-increment-handling.html | Lock modes (default interleaved=2); gaps; persistence across restart — light app-relevant slice |
| `create-table-gipks` | https://dev.mysql.com/doc/refman/9.7/en/create-table-gipks.html | Generated invisible PKs (`my_row_id`) when `sql_generate_invisible_primary_key=ON` |
| `constraint-primary-key` | https://dev.mysql.com/doc/refman/9.7/en/constraint-primary-key.html | Duplicate-key errors / `IGNORE` behavior apps hit on upserts |

### Supporting (link, don’t deep-dive)

| Node id | URL | Why |
| --- | --- | --- |
| `optimization-indexes` | https://dev.mysql.com/doc/refman/9.7/en/optimization-indexes.html | Bridge into series index arc |
| `mysql-indexes` | https://dev.mysql.com/doc/refman/9.7/en/mysql-indexes.html | What indexes are for (setup for article 03) |
| `create-index` | https://dev.mysql.com/doc/refman/9.7/en/create-index.html | Naming / uniqueness vocabulary |
| `innodb-indexes` | https://dev.mysql.com/doc/refman/9.7/en/innodb-indexes.html | Section hub |
| `invisible-columns` | https://dev.mysql.com/doc/refman/9.7/en/invisible-columns.html | GIPK visibility quirks with `SELECT *` |

---

## Article structure

Proposed MDX flow (~2.5–4k words). Top-of-page interactive first (site pattern).

1. **Interactive** — Clustered Lookup Lab (see below)
2. **Cold open** — UUID-as-PK SaaS story + one sentence thesis: *InnoDB stores the row in the PK*
3. **What “clustered” means for a request** — `GET /api/orders/:id` as a single B-tree descent into data pages
4. **How InnoDB chooses the clustered index** — three rules + GIPK footnote
5. **Secondary indexes are PK-sized** — diagram; why long PKs tax every email/status index
6. **PK shape menu for web apps** — bigint AI · UUID v4 · UUID v7/ULID · natural · composite tenant
7. **AUTO_INCREMENT in app code** — `LAST_INSERT_ID()`, gaps, don’t treat as gapless invoice numbers
8. **Multi-tenant & public-id patterns** — composite PK vs surrogate + unique secondary
9. **ORM footguns** — Rails/Prisma/Django defaults; “no primary key” migrations
10. **Tie-back checklist** — production review questions
11. **Further reading** — doc links + “next: Secondary Indexes”

Series nav: prev `mysql-schema-types`, next `mysql-indexes`.

---

## Deep-dive beats

### Beat A — The table *is* the clustered index

- Leaf pages hold full rows (for the clustered index), not pointers to a heap.
- Primary-key equality lookup = find the page that already has the payload → fewest I/Os for detail endpoints.
- Contrast (one sentence) with engines/apps that keep a separate heap: InnoDB’s model is why PK choice is load-bearing.

### Beat B — Selection order (never leave this implicit)

1. Explicit `PRIMARY KEY` → clustered.
2. Else first `UNIQUE` index with all `NOT NULL` columns → clustered.
3. Else synthetic clustered index `GEN_CLUST_INDEX` on a 6-byte monotonic row ID (insertion order).
4. Optional server behavior: `sql_generate_invisible_primary_key=ON` adds invisible `my_row_id BIGINT UNSIGNED AUTO_INCREMENT` PK (GIPK) instead of relying on the hidden row-id story for new InnoDB tables.

Teaching angle: **always declare an explicit PK** in app migrations. Hidden clustering is fine until you need FKs, logical replication assumptions, or a stable id in the API.

### Beat C — Secondary lookup = two searches

For `WHERE email = ?` with `UNIQUE (email)`:

1. Descend secondary B-tree → find `(email, primary_key)`.
2. Descend clustered B-tree by that PK → row.

Implications:

- Secondary entry width ≈ indexed cols + PK cols (+ overhead).
- A fat PK multiplies across every secondary and every FK child that stores the parent key.
- Covering indexes (article 15) can skip step 2 — tease only.

### Beat D — Insert locality & page splits

From physical structure: sequential inserts pack leaves ~15/16 full; random inserts leave pages half-to-mostly full and cause splits.

Map to PK shapes:

| Shape | Insert locality | Secondary tax | App ergonomics |
| --- | --- | --- | --- |
| `BIGINT AUTO_INCREMENT` | Excellent (monotonic) | 8 bytes | Great; guessable ids → use separate public token if needed |
| UUID v7 / ULID | Good (time-ordered) | 16 bytes | Client-generated ids; offline-friendly |
| UUID v4 | Poor (random) | 16 bytes | Easy to generate; costly at write scale |
| Natural email/slug PK | Depends on distribution | Often wide/variable | Brittle on update; PII in every secondary |
| `(tenant_id, id)` | Good within tenant | Width of both | Tenant-scoped scans; joins carry two cols |

### Beat E — AUTO_INCREMENT realities for HTTP handlers

- Retrieve new id with `LAST_INSERT_ID()` / driver APIs — connection-scoped, safe under concurrency.
- Gaps are normal (rollbacks, discarded values, interleaved mode). Never use AI as a gapless invoice sequence.
- Default `innodb_autoinc_lock_mode=2` (interleaved): scalable simple inserts; mention statement-based replication needs consecutive mode as ops trivia, not the main lesson.
- Size the integer (`INT` vs `BIGINT UNSIGNED`) from article 01; overflow fails the next insert.

### Beat F — Design recipes (opinionated defaults)

**Default for most MySQL web tables:**  
`id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY`.

**If clients must mint ids (mobile offline, multi-writer ingest):**  
UUID v7 / ULID as `BINARY(16)` or `CHAR(36)` — prefer binary storage; document the trade vs bigint.

**If API must not leak sequential ids:**  
Internal AI PK + `public_id` unique secondary (nanoid/ulid). URLs use `public_id`; joins/FKs use `id`.

**If nearly every query is tenant-scoped:**  
Consider `PRIMARY KEY (tenant_id, id)` *or* keep surrogate PK and lead composite secondaries with `tenant_id` (discuss tradeoff; don’t pretend one true way). Clustered composite helps range locality for tenant packs; surrogate keeps secondary/FK width small.

### Beat G — Changing PKs later is painful

One paragraph pointing at article 18: rebuilding the clustered index rebuilds the table and every secondary. Choose deliberately in v1.

---

## Interactive feature

**Name:** Clustered Lookup Lab  
**Component path (proposed):** `src/components/interactive/mysql-clustered-index/`  
**Placement:** first export in the MDX body (RAID / neural-net / puzzle pattern).

### What the user does

1. **Pick a PK shape** (segmented control): `BIGINT AI` · `UUIDv4` · `UUIDv7` · `Composite (tenant_id, id)`.
2. **Seed a tiny table** (slider: 12–48 rows) with 1–2 secondary indexes (e.g. `email`, `status`).
3. **Run a lookup mode:**
   - *Clustered hit* — `WHERE id = ?` (or composite equality)
   - *Secondary + bounce* — `WHERE email = ?`
4. **Watch animation:** highlight secondary leaf → extract PK → highlight clustered leaf → reveal row payload.
5. **Read live meters** (toy model, labeled as illustrative):
   - Avg secondary entry bytes (indexed cols + PK width)
   - Estimated leaf splits during bulk insert (random vs sequential)
   - “Hops” for the selected query (1 vs 2)

### Visual language

- Two vertical B-trees side by side: **Clustered (table)** and **Secondary (email)**.
- Leaf cells show key + “row body” chip on clustered; secondary leaves show `email → pk`.
- Random UUID inserts briefly flash page-split cracks; sequential bigint inserts append cleanly.
- Composite mode colors leaves by `tenant_id` bands to show locality.

### Why it fits the series

Article 03 will deepen secondary/composite design; this lab only teaches **PK width + bounce**. Keep covering-index “skip clustered” as a disabled teaser toggle labeled “see article 15”.

### Implementation notes

- Client-only; no MySQL connection.
- Deterministic pseudo-rng seeded so scrubbing PK shape recreates the same logical rows with different key encodings.
- Accessibility: step button (“Next hop”) in addition to autoplay; text summary of hops/meters for screen readers.

---

## Example queries / schemas

### 1. Baseline web table (recommended default)

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(32) NOT NULL,
  total_cents INT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_orders_account_created (account_id, created_at)
) ENGINE=InnoDB;
```

### 2. Public id without fat clustered key

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id BINARY(16) NOT NULL,  -- ULID/UUIDv7 bytes
  account_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_public_id (public_id),
  KEY idx_orders_account (account_id)
) ENGINE=InnoDB;

-- API detail: lookup by public id (secondary → clustered bounce)
SELECT id, account_id, status
FROM orders
WHERE public_id = UNHEX(?);
```

### 3. Multi-tenant composite clustered key

```sql
CREATE TABLE tickets (
  tenant_id BIGINT UNSIGNED NOT NULL,
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject VARCHAR(200) NOT NULL,
  PRIMARY KEY (tenant_id, id),
  KEY idx_tickets_tenant_subject (tenant_id, subject)
) ENGINE=InnoDB;

-- Note: AUTO_INCREMENT on non-leading PK column is a MyISAM-era habit;
-- for InnoDB prefer a separate sequence/surrogate or app-assigned id per tenant.
-- Call out clearly in the article which pattern you endorse for InnoDB 9.7.
```

**Author decision to resolve before draft:** InnoDB `AUTO_INCREMENT` requirements (must be indexed; first column of some index). Composite `(tenant_id, id)` with `id AUTO_INCREMENT` needs careful treatment — either document supported pattern or recommend `id` global AI PK + `(tenant_id, id)` unique. Prefer the latter in the article unless verified against current InnoDB rules in `innodb-auto-increment-handling` / `create-table`.

### 4. Anti-pattern: random UUID PK + several secondaries

```sql
CREATE TABLE events (
  id CHAR(36) NOT NULL,  -- UUIDv4 string
  user_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(64) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_events_user (user_id),
  KEY idx_events_kind_created (kind, created_at)
) ENGINE=InnoDB;
```

Show (conceptually) that each secondary stores a 36-byte id; contrast with `BINARY(16)` UUIDv7 or bigint.

### 5. App insert + readback pattern

```sql
INSERT INTO orders (account_id, status, total_cents)
VALUES (42, 'pending', 1999);

SELECT LAST_INSERT_ID();  -- use in same session / ORM create() return
```

### 6. Inspect what MySQL thinks the PK is

```sql
SHOW CREATE TABLE orders\G
SHOW INDEX FROM orders;
SELECT COLUMN_NAME, COLUMN_KEY, EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders';
```

### 7. GIPK awareness (ops / migrations)

```sql
SET sql_generate_invisible_primary_key = ON;
CREATE TABLE orphan_lines (sku VARCHAR(32), qty INT);
SHOW CREATE TABLE orphan_lines\G  -- expect my_row_id + PRIMARY KEY
```

---

## Tie-back checklist

Readers should leave able to answer “yes/no + why” for their schema:

- [ ] Every InnoDB table in the app has an **explicit** `PRIMARY KEY`.
- [ ] Hot tables use a **short, stable** clustered key (prefer 8-byte bigint unless there’s a hard requirement otherwise).
- [ ] If the API exposes opaque ids, they are a **unique secondary**, not necessarily the clustered key.
- [ ] Random UUID v4 is **not** the clustered key on high-write tables (or you’ve measured page split / index bloat and accepted it).
- [ ] You know which secondaries exist and roughly **PK width × row count** extra bytes they carry.
- [ ] Detail endpoints that filter on PK can rely on a single clustered descent; filters on email/slug expect a bounce.
- [ ] `AUTO_INCREMENT` values are treated as unique, not gapless business numbers.
- [ ] Multi-tenant tables either lead indexes with `tenant_id` or use a deliberate composite PK — not accidental cross-tenant scans.
- [ ] ORM migration history doesn’t create PK-less tables (or GIPK/hidden row-id is understood).
- [ ] You’ve sketched the cost of a future PK type change (table rebuild) and chosen anyway.

---

## Open questions / author notes

1. **Composite + `AUTO_INCREMENT` endorsement:** Verify InnoDB 9.7 rules for AI as second column of a composite PK vs recommending global `id` + tenant secondaries. Document one blessed pattern; don’t waffle.
2. **Storage for 128-bit ids:** Prefer `BINARY(16)` in examples; mention `CHAR(36)` only as the common ORM footgun. Align with article 01 type guidance.
3. **Postgres readers:** One callout box — Postgres heap + secondary indexes differ; don’t assume MySQL PK advice ports 1:1. Keep short.
4. **How much autoinc lock-mode detail?** Enough to explain gaps + “interleaved is default”; full matrix belongs in ops runbooks, not Foundations.
5. **Natural keys:** Soft-ban email/slug as PK (updates, PII, width). Unique secondary instead.
6. **Interactive fidelity:** Label meters as a teaching model, not a simulator of InnoDB page algorithms — avoid false precision.
7. **Series glue:** Article 03 should open by assuming the bounce path; article 15 by assuming PK width is already understood.
8. **Existing stubs:** No current `mysql-primary-keys` stub — new post + hub/`seriesList` entry when publishing.
9. **Tone:** Spoon-fed, not scary. Prefer “here’s the default that works” then “when to break it.”
10. **Optional aside:** `_rowid` alias for single-column integer PK — fun trivia, not a main beat.

---

## Drafting checklist (when writing the post)

- [ ] Import Clustered Lookup Lab at top of MDX
- [ ] Cite ≥4 primary nodes with public 9.7 URLs
- [ ] One worked schema comparing bigint vs UUID PK secondary width
- [ ] Explicit “next article” bridge into secondary indexes
- [ ] No pasted Oracle manual text; paraphrase + link
- [ ] Mobile-friendly interactive (stacked trees on small viewports)
