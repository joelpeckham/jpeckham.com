# 02 — Primary Keys & the Clustered Index

| Field | Value |
| --- | --- |
| **Number** | 02 |
| **Title** | Primary Keys & the Clustered Index |
| **Slug** | `mysql-primary-keys` |
| **Tier** | Foundations (Part A) |
| **Status** | **Shipped draft** |
| **Hub** | `/projects/mysql/` |
| **Post** | `/posts/mysql-primary-keys/` |
| **MDX** | `src/app/posts/mysql-primary-keys/page.mdx` |
| **Demos** | `src/components/interactive/mysql-clustered-index/` |
| **Prereq** | 01 — Tables, Types & Schema (`mysql-schema-types`) |
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

**Series change from original plan:** B-tree / leaf / descent vocabulary is **taught in this article** (not deferred). Added because “clustered leaf” was unreadable without it.

---

## Real-world hook (as shipped)

**Not a UUID-SaaS cold open.** The article opens with series context + thesis (“The table is sorted. That is not a metaphor.”) and a quick recap of Art. 01 house defaults (`BIGINT` clustered PK + `CHAR(26)` public id).

**BetterRX day-job story** lives in **“Access paths: when the PK never gets invited”**: inbound integration log table with PHI in JSON; support searches by MRN inside the blob; surrogate PK exists but the workload never uses it → full table scan until MRN is extracted/indexed. Bridges naturally to secondary-index bounce.

Industry patterns still referenced in prose (Stripe-style public ids, UUID v4 spray, tenant composites) but woven into design-recipes and insert-locality sections rather than a front-loaded pain table.

---

## Primary documentation sources

Cite node id + public HTML via `<Cite n={…} />` + `<References />`. Paraphrase only — no Oracle prose paste in the published article.

### Must-read (core claims of this post)

| Node id | URL | Use in article |
| --- | --- | --- |
| `innodb-index-types` | https://dev.mysql.com/doc/refman/9.7/en/innodb-index-types.html | Clustered vs secondary; PK selection order; secondary entries contain PK; short-PK guidance |
| `innodb-introduction` | https://dev.mysql.com/doc/refman/9.7/en/innodb-introduction.html | InnoDB default engine; clustered index as a headline advantage |
| `primary-key-optimization` | https://dev.mysql.com/doc/refman/9.7/en/primary-key-optimization.html | PK = vital lookup columns; auto-increment surrogate when no natural key |
| `create-table` | https://dev.mysql.com/doc/refman/9.7/en/create-table.html | `PRIMARY KEY` / `AUTO_INCREMENT` syntax & rules (short PK for InnoDB secondaries) |
| `innodb-physical-structure` | https://dev.mysql.com/doc/refman/9.7/en/innodb-physical-structure.html | B-tree leaves; sequential vs random insert fill (~15/16 vs ~1/2–15/16) — UUID story ammo |
| `example-auto-increment` | https://dev.mysql.com/doc/refman/9.7/en/example-auto-increment.html | App-facing `AUTO_INCREMENT` / `LAST_INSERT_ID()` / type sizing |
| `innodb-auto-increment-handling` | https://dev.mysql.com/doc/refman/9.7/en/innodb-auto-increment-handling.html | Gaps; lost values on rollback — light app-relevant slice |
| `create-table-gipks` | https://dev.mysql.com/doc/refman/9.7/en/create-table-gipks.html | Generated invisible PKs (`my_row_id`) when `sql_generate_invisible_primary_key=ON` |
| `constraint-primary-key` | https://dev.mysql.com/doc/refman/9.7/en/constraint-primary-key.html | Duplicate-key errors / `IGNORE` behavior apps hit on upserts |

### Supporting (link, don’t deep-dive)

| Node id | URL | Why |
| --- | --- | --- |
| `optimization-indexes` | https://dev.mysql.com/doc/refman/9.7/en/optimization-indexes.html | Bridge into series index arc |
| `mysql-indexes` | https://dev.mysql.com/doc/refman/9.7/en/mysql-indexes.html | Covering index tease |
| `create-index` | https://dev.mysql.com/doc/refman/9.7/en/create-index.html | Naming / uniqueness vocabulary |
| `innodb-indexes` | https://dev.mysql.com/doc/refman/9.7/en/innodb-indexes.html | Section hub |
| `invisible-columns` | https://dev.mysql.com/doc/refman/9.7/en/invisible-columns.html | GIPK visibility quirks with `SELECT *` |
| `innodb-buffer-pool` | https://dev.mysql.com/doc/refman/9.7/en/innodb-buffer-pool.html | Insert-locality → cache churn |
| `create-table-foreign-keys` | https://dev.mysql.com/doc/refman/9.7/en/create-table-foreign-keys.html | FK columns copy parent PK width |

### Contrast citation (shipped)

| Source | URL | Use |
| --- | --- | --- |
| PostgreSQL page layout | https://www.postgresql.org/docs/current/storage-page-layout.html | Heap tuples vs InnoDB clustered leaves — one paragraph, cited in “What clustered means” |

---

## Article structure (as shipped)

First-person, ~10–15 min skim. Demos mid-article. No top-of-page mega-lab.

| # | H2 | Content | Demo |
| --- | --- | --- | --- |
| 1 | **The table is sorted. That is not a metaphor.** | Series context; thesis; Art. 01 recap (bigint PK + public id) | — |
| 2 | **A B-tree in one coffee** | Interior vs leaf pages; descent vocabulary; 16KB pages | `BtreeDescentDemo` (leaf shows row chip — clustered hit folded in) |
| 3 | **What "clustered" means for a request** | InnoDB leaf = row; `GET /api/orders/:id`; Postgres heap contrast (cited) | — |
| 4 | **Access paths: when the PK never gets invited** | BetterRX JSON/MRN log-table story; access path vs PK choice | — |
| 5 | **How InnoDB picks the clustered index** | Three rules + GIPK footnote; always declare PK | — |
| 6 | **Secondary indexes are PK-sized** | Two-hop bounce; PK width tax | `SecondaryBounceDemo`, then `PkWidthTaxDemo` |
| 7 | **Insert locality (why random UUIDs as PK feel haunted)** | 15/16 vs random fill; shape comparison table | `InsertLocalityDemo` |
| 8 | **Design recipes I will actually defend** | Bigint default; public id secondary; client-mint ids; multi-tenant; anti natural-key PK | — |
| 9 | **AUTO_INCREMENT for people who ship HTTP handlers** | `LAST_INSERT_ID()`, gaps, overflow | — |
| 10 | **Forgot a primary key** | Hidden row id / GIPK; fix before large | — |
| 11 | **Checklist before you merge the migration** | PR-review checklist | — |
| 12 | **References** | `<References />` — 10 numbered refs | — |

**Bridge to Art. 03:** secondary indexes, left-prefix, selectivity — assumes bounce path is already understood.

---

## Deep-dive beats

### Beat A — B-tree vocabulary (new in this article)

- Interior pages steer; leaf pages hold entries; lookup = root-to-leaf **descent**.
- Default index page size 16KB.
- Without a usable index → full table scan.
- `BtreeDescentDemo` shows descent; clustered “row body” chip on the leaf replaces a separate clustered-hit demo.

### Beat B — The table *is* the clustered index

- Leaf pages hold full rows (for the clustered index), not pointers to a heap.
- Primary-key equality lookup = find the page that already has the payload → fewest I/Os for detail endpoints.
- **Postgres contrast (shipped):** heap tuples + separate indexes point elsewhere; InnoDB advice does not port 1:1.

### Beat C — Access path ≠ PK quality

- Perfect surrogate PK does nothing if the workload filters on values buried in JSON.
- BetterRX MRN story: extract/index what humans search by.

### Beat D — Selection order (never leave this implicit)

1. Explicit `PRIMARY KEY` → clustered.
2. Else first `UNIQUE` index with all `NOT NULL` columns → clustered.
3. Else synthetic clustered index `GEN_CLUST_INDEX` on a 6-byte monotonic row ID (insertion order).
4. Optional: `sql_generate_invisible_primary_key=ON` → invisible `my_row_id` GIPK.

Teaching angle: **always declare an explicit PK** in app migrations.

### Beat E — Secondary lookup = two searches

For `WHERE email = ?` with `UNIQUE (email)`:

1. Descend secondary B-tree → find `(email, primary_key)`.
2. Descend clustered B-tree by that PK → row.

Implications:

- Secondary entry width ≈ indexed cols + PK cols (+ overhead).
- A fat PK multiplies across every secondary and every FK child that stores the parent key.
- Covering indexes (article 15) can skip step 2 — tease only.

### Beat F — Insert locality & page splits

From physical structure: sequential inserts pack leaves ~15/16 full; random inserts leave pages half-to-mostly full and cause splits.

| Shape | Insert locality | Secondary tax | App ergonomics |
| --- | --- | --- | --- |
| `BIGINT AUTO_INCREMENT` | Excellent (monotonic) | 8 bytes | Great; guessable ids → use separate public token if needed |
| UUID v7 / ULID | Good (time-ordered) | 16 bytes | Client-generated ids; offline-friendly |
| UUID v4 | Poor (random) | 16–36 bytes | Easy to generate; costly at write scale |
| Natural email/slug PK | Depends on distribution | Often wide/variable | Brittle on update; PII in every secondary |
| `(tenant_id, id)` | Good within tenant | Width of both | Tenant-scoped scans; joins carry two cols |

### Beat G — AUTO_INCREMENT realities for HTTP handlers

- Retrieve new id with `LAST_INSERT_ID()` / driver APIs — connection-scoped, safe under concurrency.
- Gaps are normal (rollbacks, discarded values). Never use AI as a gapless invoice sequence.
- Size the integer from article 01; overflow fails the next insert.

### Beat H — Design recipes (opinionated defaults — shipped)

**Default for most MySQL web tables:**  
`id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY`.

**If API must not leak sequential ids:**  
Internal AI PK + `public_id` unique secondary (`CHAR(26)` ULID per Art. 01). URLs use `public_id`; joins/FKs use `id`.

**If clients must mint ids:**  
UUID v7 / ULID — prefer `BINARY(16)` when ergonomics allow; mention `CHAR(36)` as common ORM footgun.

**Multi-tenant (resolved):**  
Default **global surrogate `id` PK** + secondaries leading with `tenant_id`. Composite `PRIMARY KEY (tenant_id, id)` only when tenant locality dominates and you've accepted wider secondaries/FKs. **Do not** endorse `AUTO_INCREMENT` as second column of composite PK without verification — article steers away.

**Natural keys:** soft-ban as PK; unique secondary instead.

### Beat I — Changing PKs later is painful

One paragraph pointing at article 18: rebuilding the clustered index rebuilds the table and every secondary. Choose deliberately in v1.

---

## Interactive feature (as shipped)

**Path:** `src/components/interactive/mysql-clustered-index/`  
**Pattern:** four small demos mid-article — **not** “Clustered Lookup Lab” at the top.

| Demo | Section | Teaches |
| --- | --- | --- |
| `BtreeDescentDemo` | A B-tree in one coffee | Root→leaf descent; interior steer vs leaf entries; row chip on clustered leaf |
| `SecondaryBounceDemo` | Secondary indexes are PK-sized | Email lookup: secondary hop → PK → row |
| `PkWidthTaxDemo` | Secondary indexes are PK-sized | PK width × secondary count → bytes |
| `InsertLocalityDemo` | Insert locality | Sequential bigint append vs UUIDv4 spray / page splits |

**Deleted (too much chrome / low value):**

| Cut | Reason |
| --- | --- |
| `AccessPathDemo` | BetterRX JSON/MRN story + prose carries the access-path beat |
| `ClusteredHitDemo` | Folded into `BtreeDescentDemo` leaf “row” chip |

**Fidelity rule:** meters labeled as teaching toys, not `INFORMATION_SCHEMA` / page-algorithm simulators.

**Implementation notes:** client-only; step controls for accessibility; shared chrome in folder `shared.tsx`.

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

### 2. Public id without fat clustered key (aligns with Art. 01)

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(26) NOT NULL,  -- ULID for APIs (Art. 01 house default)
  account_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_public_id (public_id),
  KEY idx_orders_account (account_id)
) ENGINE=InnoDB;

-- API detail: lookup by public id (secondary → clustered bounce)
SELECT id, account_id, status
FROM orders
WHERE public_id = ?;
```

For binary UUIDv7 storage, `BINARY(16)` remains the alternate when teaching client-mint ids — mention `CHAR(36)` as ORM footgun.

### 3. Multi-tenant — blessed pattern (shipped recommendation)

```sql
-- Prefer: global surrogate PK + tenant-leading secondary
CREATE TABLE tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(200) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_tickets_tenant_subject (tenant_id, subject)
) ENGINE=InnoDB;
```

Composite clustered `(tenant_id, id)` documented as deliberate tradeoff when tenant-packed scans dominate — not the default.

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

Show that each secondary stores a 36-byte id; contrast with `BINARY(16)` UUIDv7 or bigint.

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
- [ ] Detail endpoints that filter on PK can rely on a single clustered descent; filters on email/slug/MRN expect a bounce.
- [ ] Keys humans search by are **columns** (or generated columns), not treasure hunts inside JSON.
- [ ] `AUTO_INCREMENT` values are treated as unique, not gapless business numbers.
- [ ] Multi-tenant tables either lead indexes with `tenant_id` or use a deliberate composite PK — not accidental cross-tenant scans.
- [ ] ORM migration history doesn’t create PK-less tables (or GIPK/hidden row-id is understood).
- [ ] You’ve sketched the cost of a future PK type change (table rebuild) and chosen anyway.

---

## Authoring notes (lessons applied)

- **Voice:** first person; spoon-fed defaults then exceptions; humanizer pass before publish.
- **Structure:** series recap + thesis open; BetterRX in access-path section; B-tree vocab before “clustered leaf.”
- **Citations:** `<Cite />` + `<References />`; Postgres heap cited once for contrast.
- **Interactives:** four focused demos; cut redundant chrome; no top-of-page lab.
- **Art. 03 setup:** bounce path and PK width assumed; left-prefix not taught here.

---

## Resolved decisions (formerly open questions)

| Question | Decision |
| --- | --- |
| Composite + `AUTO_INCREMENT` | **Global surrogate `id` PK** + `tenant_id`-leading secondaries as default; composite clustered only as explicit tradeoff |
| Storage for 128-bit ids | Teach **`BINARY(16)`** for client-mint; **`CHAR(26)` ULID** for public id secondary (Art. 01); `CHAR(36)` as footgun callout |
| Postgres readers | **One cited contrast** in clustered section — shipped |
| Autoinc lock-mode detail | Gaps + lost values on rollback; skip full lock-mode matrix |
| Natural keys | Unique secondary, not PK |
| B-tree overview | **In this article**, not deferred |
| Interactive fidelity | Teaching model labels; no false precision |
| Series glue | Stub + `seriesList` wired; Art. 03 opens assuming bounce |

---

## Drafting checklist

**Shipped (done):**

- [x] MDX at `src/app/posts/mysql-primary-keys/page.mdx`
- [x] Four scattered demos under `mysql-clustered-index/`
- [x] B-tree section + `BtreeDescentDemo` (replaces deferred vocab + cut `ClusteredHitDemo`)
- [x] BetterRX access-path story in prose (replaces `AccessPathDemo`)
- [x] Cite ≥4 primary MySQL nodes + Postgres contrast
- [x] Bigint vs UUID secondary-width teaching via `PkWidthTaxDemo`
- [x] Checklist + bridge to Art. 03
- [x] No pasted Oracle manual text
- [x] Humanizer pass
- [x] Stub wired in catalog

**Future edits:**

- [ ] Re-run humanizer after substantive rewrites
- [ ] Keep public-id examples aligned with Art. 01 (`CHAR(26)` ULID)
- [ ] If adding demos, prefer single-focus mid-article embeds over re-expanding into a mega-lab
