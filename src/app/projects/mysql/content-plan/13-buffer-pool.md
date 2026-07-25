# Article 13 — The Buffer Pool & Hot Working Sets

| Field | Value |
| --- | --- |
| **Number** | 13 |
| **Title** | The Buffer Pool & Hot Working Sets |
| **Slug** | `mysql-buffer-pool` |
| **Tier** | Deep dive (Part B) |
| **Role in arc** | After locks/MVCC (11–12), shift from “correctness under concurrency” to **RAM shape** — why InnoDB feels instant when the hot set fits, and why “optimized SQL” still dies when every request reads cold pages. Feeds durability (14), covering indexes (15), and perf-schema forensics (20). |
| **Depends on** | 02 (clustered pages), 03 (secondary indexes → more pages), 10 (EXPLAIN literacy — “plan looks fine, still slow”), lightly 11 (long txns pin old versions; don’t steal undo). |
| **Feeds into** | 14 (dirty pages / redo / flush), 15 (fewer pages touched via covering), 19 (replica warm sets diverge), 20 (I/O wait digests). |
| **Published path** | `/posts/mysql-buffer-pool/` |
| **Status** | Plan only |

---

## Authoring contract

- **Status:** Plan only — stub wired; article not written yet.
- **Voice:** First person, casual/jokey, flowing prose. Run humanizer pass (`~/.cursor/skills/humanizer`) before publish.
- **No formulaic stamps:** No `**Why bother:**`, “App consequence:”, or “Things to Play With” laundry lists — weave motivation into paragraphs.
- **Citations:** IEEE `<Cite n={…} />` in prose + `<References items={[…]} />` at bottom. Source technical claims; paraphrase refman only.
- **Interactives:** 3–5 small demos embedded **mid-article** next to the beat they teach. Prefer shared chrome from `schema-byte-budget/shared.tsx`. Client-only; label illustrative math.
- **House defaults:** Integer cents; ULID `CHAR(26)` public ids; `utf8mb4_0900_ai_ci`; Prisma primary ORM in snippets.
- **Length:** Part B can run longer than 10m if every section earns it; still prefer skimmable prose over encyclopedia.

---

## Intent

Teach web developers that InnoDB performance is, first, a **memory residency** problem: table and index **pages** live in the **buffer pool**, and a request is fast when its working set is already young (hot) in that pool.

After this article, a reader should be able to:

1. Explain the buffer pool in one sentence: an in-RAM cache of InnoDB data/index pages managed by a young/old LRU with midpoint insertion.
2. Distinguish **working set** (pages the app reuses under steady traffic) from **cold sequential scans** (mysqldump, admin exports, “read the whole table once”) that thrash the pool.
3. Read the signals that matter for apps: buffer pool hit rate, pages made young / not young, and “plan is good but p95 is I/O-bound.”
4. Reason about **sizing under managed MySQL** (RDS, Cloud SQL, Aurora, PlanetScale-style / Vitess, Railway, small Docker) where you do **not** get “80% of a dedicated box,” and how that changes product and schema choices.
5. Internalize the Part B punchline: **clever SQL loses to fit-in-memory** — a mediocre plan over hot pages beats a perfect plan that touches cold gigabytes every request.
6. Know which knobs exist (`innodb_buffer_pool_size`, `innodb_old_blocks_pct`, `innodb_old_blocks_time`, dump/restore) without becoming a DBA who tunes them blindly.

**Out of scope (defer):**

- Redo / doublewrite / `innodb_flush_log_at_trx_commit` → **article 14**.
- Change buffer, adaptive hash index deep dive → footnote only.
- Covering indexes / ICP as the main fix for “too many pages” → **article 15**.
- Full Performance Schema I/O wait forensics → **article 20**.
- Multiple buffer pool instances / NUMA / chunk-size surgery → mention that they exist for large dedicated hosts; not the web-dev default path.
- MyISAM key cache midpoint insertion (`midpoint-insertion`) — **different subsystem**; do not confuse with InnoDB’s young/old LRU.

---

## Real-world hook

**Scene:** A multi-tenant SaaS (Shopify-lite / Linear-lite / Notion-lite) on a **managed MySQL** instance. Weekday traffic is fine: shop dashboards, issue lists, document trees — p95 ~40–80ms. Every Sunday night an ops-adjacent job runs:

- Full-table `SELECT … INTO OUTFILE` / `mysqldump` / “export all workspaces for compliance,” **or**
- An admin analytics query that scans `events` / `audit_log` without a usable range, **or**
- A well-meaning Prisma/Rails “backfill” that walks every `orders` row.

Monday morning, the same EXPLAIN-approved list endpoints spike to 500ms–2s. Nothing deployed. No schema change. Hit rate in `SHOW ENGINE INNODB STATUS` (or CloudWatch / RDS Performance Insights proxies) is in the toilet. The hot pages that *were* the product — recent orders, open issues, active docs — were **evicted** by a cold scan.

**Emotional beat:** The database did not “get slower at SQL.” It stopped being an **in-memory** database for the pages your app lives on. Web developers who only optimize EXPLAIN miss the real production cliff: **RAM residency of the working set**.

**Surfaces that make this concrete:**

| Surface | Hot working set | Cold thrash |
| --- | --- | --- |
| **E-commerce admin** (Shopify-shaped) | Recent `orders` + `order_items` for active shops | Nightly full catalog export, “all-time revenue” scan |
| **Issue tracker** (GitHub/Linear-shaped) | Open issues + recent comments for active repos | Org-wide audit export, full-text-ish table walk |
| **Billing / Stripe-adjacent SaaS** | Current period invoices + subscription rows | Year-end ledger dump across all tenants |
| **Content / CMS** | Published posts + nav trees | “Reindex everything” / media metadata full scan |

**Managed hosting constraint beat (early, not buried):** On RDS / Cloud SQL / Aurora / PlanetScale-class products, memory is a **SKU**, not “80% of the box.” Buffer pool competes with connections, tmp tables, OS page cache myths, and neighboring processes. PlanetScale/Vitess and read-replica topologies add a second truth: **each node has its own warm set** — a cold replica after failover is a buffer-pool story, not just a replication story (tease → 19).

---

## Primary documentation sources

Cite the public HTML from published posts. Local research corpus: `sources/mysql-refman-9.7/nodes/<id>.md` (gitignored; do not paste Oracle prose into MDX).

**Note on naming:** There is **no** dedicated `innodb-lru-list` node in 9.7. Young/old LRU + midpoint insertion are taught from `innodb-buffer-pool` and `innodb-performance-midpoint_insertion`. The similarly named `midpoint-insertion` node is **MyISAM key cache** — cite only to warn readers away. There is also no `innodb-performance-buffer-pool-size` id; size configuration lives in `innodb-buffer-pool-resize` under parent `innodb-performance-buffer-pool`.

### Core (must cite / teach from)

| Node id | Public URL | Why it matters for this article |
| --- | --- | --- |
| `innodb-buffer-pool` | https://dev.mysql.com/doc/refman/9.7/en/innodb-buffer-pool.html | Definition of the buffer pool; page-based cache; young/old LRU with midpoint insertion; default 3/8 old sublist; how scans/read-ahead can push hot pages toward eviction; Standard Monitor hit-rate / young-making metrics. |
| `innodb-in-memory-structures` | https://dev.mysql.com/doc/refman/9.7/en/innodb-in-memory-structures.html | Chapter frame: buffer pool as the primary in-memory structure readers should care about first. |
| `innodb-buffer-pool-optimization` | https://dev.mysql.com/doc/refman/9.7/en/innodb-buffer-pool-optimization.html | Optimization chapter entry point — “know how the pool works; keep frequently used data in memory.” Hub to resize / midpoint / read-ahead / preload / instances. |
| `buffering-caching` | https://dev.mysql.com/doc/refman/9.7/en/buffering-caching.html | Broader “MySQL caches in memory” umbrella; situate InnoDB pool vs other caches without touring them all. |
| `innodb-performance-buffer-pool` | https://dev.mysql.com/doc/refman/9.7/en/innodb-performance-buffer-pool.html | Parent section for configuration/tuning topics (size, instances, scan resistance, read-ahead, flushing, preload). |
| `innodb-buffer-pool-resize` | https://dev.mysql.com/doc/refman/9.7/en/innodb-buffer-pool-resize.html | Configuring `innodb_buffer_pool_size` (offline/online), chunk/instances multiples — what “make the pool bigger” actually means. |
| `innodb-performance-midpoint_insertion` | https://dev.mysql.com/doc/refman/9.7/en/innodb-performance-midpoint_insertion.html | **Scan resistance:** `innodb_old_blocks_pct` (default 37 ≈ 3/8), `innodb_old_blocks_time` (default 1000 ms); mixed OLTP + batch reporting; keeping the normal working set during large scans. |

### Supporting (cite lightly; don’t derail)

| Node id | Public URL | Use |
| --- | --- | --- |
| `innodb-parameters` | https://dev.mysql.com/doc/refman/9.7/en/innodb-parameters.html | Defaults: `innodb_buffer_pool_size` = 128MiB; ~10% overhead beyond configured size; dedicated-server auto-sizing note; `innodb_old_blocks_*` ranges. |
| `innodb-performance-read_ahead` | https://dev.mysql.com/doc/refman/9.7/en/innodb-performance-read_ahead.html | Linear/random read-ahead can pull pages that then compete in the LRU — one short paragraph + interactive “prefetch flood” mode optional. |
| `innodb-preload-buffer-pool` | https://dev.mysql.com/doc/refman/9.7/en/innodb-preload-buffer-pool.html | Dump/restore warm set across restarts; also: restore after a report job dirties the pool — ops-relevant for managed restarts/failovers. |
| `innodb-buffer-pool-flushing` | https://dev.mysql.com/doc/refman/9.7/en/innodb-buffer-pool-flushing.html | Dirty pages / flush list — **tease only** → article 14; don’t teach fsync policy here. |
| `innodb-multiple-buffer-pools` | https://dev.mysql.com/doc/refman/9.7/en/innodb-multiple-buffer-pools.html | Mention for large dedicated hosts; skip for typical managed SKUs. |
| `information-schema-innodb-buffer-pool-stats-table` | https://dev.mysql.com/doc/refman/9.7/en/information-schema-innodb-buffer-pool-stats-table.html | Structured metrics twin of Standard Monitor (young/not young, hit rate fields). |
| `information-schema-innodb-buffer-page-lru-table` | https://dev.mysql.com/doc/refman/9.7/en/information-schema-innodb-buffer-page-lru-table.html | What dump/restore uses; warn: heavy to query in prod. |
| `sys-innodb-buffer-stats-by-table` | https://dev.mysql.com/doc/refman/9.7/en/sys-innodb-buffer-stats-by-table.html | “Which tables occupy the pool?” — powerful, **dangerous on prod** (manual warns); staging/repro only. |
| `innodb-information-schema-buffer-pool-tables` | https://dev.mysql.com/doc/refman/9.7/en/innodb-information-schema-buffer-pool-tables.html | Usage patterns for the I_S buffer pool tables. |
| `optimizing-innodb-configuration-variables` | https://dev.mysql.com/doc/refman/9.7/en/optimizing-innodb-configuration-variables.html | Optional framing: config after SQL/schema, not before. |

**Citation rule:** paraphrase + `<Cite />` / `<References />`; never paste Oracle wording into the published post.

---

## Article structure

Suggested H2 spine — sentence-case, conversational. Scatter **named mini-demos** mid-article; no mega LRU lab at the top. Teach pages-before-LRU mental model briefly (callback 02/03) before young/old list jargon.

1. **Part B opener + what today covers** — shift from concurrency (11–12) to RAM shape; Monday-after-export hook can land in §6 if stronger after mechanism setup.
2. **What the buffer pool is** — pages in RAM; misses → storage latency; managed SKU vs dedicated-host folklore.
3. **Pages, not rows** — working set estimate; secondary indexes + wide rows multiply pages. *(Optional mini-demo: **Page touch counter** for one list query.)*
4. **Young / old LRU with midpoint insertion** — mechanism in plain English. *(Embed **Young/old LRU strip**.)*
5. **Working set vs cold scan thrash** — dump, export, analytics on primary. *(Embed **Sunday export thrash** preset on same strip + **Hit-rate meter**.)*
6. **Monday morning story** — EXPLAIN unchanged, hit rate collapsed; tie to export job.
7. **Hit rate literacy** — Standard Monitor / managed dashboards.
8. **Sizing for managed MySQL** — 128MiB trap; when to resize SKU vs tune SQL.
9. **Clever SQL loses to fit-in-memory** — gallery contrast hot recent vs cold full scan.
10. **App-first fix ladder** — shrink touch set → move cold jobs → then knobs.
11. **Tie-back checklist** + forward links (14, 15, 19, 20).
12. **References** — IEEE list.

---

## Deep-dive beats

Teach these ideas in order. Weave handler implications into each beat’s prose — no “App implication:” stamp lines.

### Beat A — The buffer pool is the product’s RAM personality

- InnoDB caches **table and index data pages** in a memory area called the buffer pool (`innodb-buffer-pool`).
- On a dedicated DB server, operators often aim large (manual discusses up to ~80% of physical RAM) so InnoDB behaves like an in-memory database after warmup (`innodb-buffer-pool`, `innodb-parameters`).
- Configured size is not the whole story: InnoDB needs additional memory for structures (~10% greater than the specified pool size — teach as “leave headroom,” not as precise accounting).
- Your API latency distribution is largely “were the pages already here?” Staging with a tiny dataset always looks hot; production with years of rows is a different machine.

### Beat B — Think in pages, estimate the working set

- High-volume reads are organized around **pages** that can hold multiple rows (`innodb-buffer-pool`).
- Working set ≈ pages touched by the steady request mix (login, home, list recent X, detail by id) — not “database size on disk.”
- Multipliers web devs forget:
  - Secondary indexes are extra page sets (article 03).
  - Wide rows / `SELECT *` / big `VARCHAR`/`JSON` in the clustered leaf → fewer rows per page → more pages per request (article 01).
  - Joins multiply page touches across tables (article 06).
- Rough teaching estimate (order-of-magnitude, not a calculator):  
  `hot_rows × avg_row_bytes / page_size` (+ index pages). Enough to show “10GB table, 200MB hot set” vs “everyone’s dashboard scans 2GB of history.”
- Archive/cold tables and “all-time” features are buffer-pool product decisions.

### Beat C — Young / old LRU with midpoint insertion

Mechanism (paraphrase from `innodb-buffer-pool` + `innodb-performance-midpoint_insertion`):

1. The pool is a linked list of pages, LRU-ish.
2. New pages are inserted at the **midpoint** (head of the **old** sublist), not at the MRU head.
3. By default ~**3/8** of the pool is the old sublist (`innodb_old_blocks_pct` default **37**).
4. Accessing a page in the old sublist can make it **young** (move to head of new sublist) — with timing nuances via `innodb_old_blocks_time` (default **1000** ms) so scan-style revisit patterns don’t promote junk.
5. Unused pages age toward the tail and are **evicted** when space is needed.
6. Read-ahead / one-shot scans can still churn the pool; midpoint strategy exists specifically to protect hot pages.

Teach with a diagram in prose + the interactive — young head, midpoint, old tail, eviction at the end.

- A page seen once during a dump should die in the old list; a page hit every request on `/api/inbox` should stay young. When that stops happening, latency is “memory,” not “SQL syntax.”

### Beat D — Working set vs cold sequential scan thrash

Concrete thrash sources for web teams:

| Thrash source | Why it hurts |
| --- | --- |
| `mysqldump` / logical backup of hot schema | Touches essentially all pages; classic manual example |
| Admin “export CSV of everything” | Same shape as dump; often on primary |
| Analytics on OLTP primary | Large range/`ALL` scans; read-ahead may amplify |
| Backfills / migrations reading every row | Long-running page flood (also ties to 11/18) |
| Accidental `SELECT *` fanout on huge tables | ORM “convenience” |

Manual guidance worth teaching (not cargo-culting):

- Mixed OLTP + periodic batch: temporarily raising `innodb_old_blocks_time` during batch can help protect the OLTP working set (`innodb-performance-midpoint_insertion`).
- Huge tables that cannot fit: smaller `innodb_old_blocks_pct` (e.g. toward 5) restricts once-read data’s share of the pool — **benchmark**; effects vary.
- Small tables that fit: defaults (or even higher old pct) are often fine.

- Prefer **replica / separate analytics store** for cold scans; never “run the weekly export on the primary that serves checkout” without expecting a warm-set tax.

### Beat E — Hit rate literacy (what to look at)

From Standard Monitor `BUFFER POOL AND MEMORY` (`innodb-buffer-pool`):

- **Buffer pool hit rate** — pages satisfied from pool vs read from storage (teach as the headline meter; interactive mirrors this).
- **Pages made young / not young**, `youngs/s`, `non-youngs/s` — are scans promoting junk or failing to protect hot pages?
- **Pages read / reads/s** — sustained disk reads under “normal” API load = working set miss.
- Status / I_S twins: `INNODB_BUFFER_POOL_STATS`, related status variables (`information-schema-innodb-buffer-pool-stats-table`).

Managed-MySQL translation table (teach patterns, not vendor UI tours):

| You want | Often appears as |
| --- | --- |
| Hit rate / miss rate | RDS Enhanced Monitoring, Performance Insights, Cloud SQL metrics, generic `Innodb_buffer_pool_*` exports |
| Pool size | Parameter group / instance class memory (not always a naked `SET GLOBAL` for apps) |
| I/O latency under miss | Cloud volume IOPS/throughput limits — misses are *more* expensive than “local NVMe folklore” |

- Add “check buffer pool / read I/O” next to EXPLAIN when prod is slow and plans look fine (bridge from article 10).

### Beat F — Sizing for web apps (managed constraints)

Teach an opinionated ladder:

1. **Default 128MiB** (`innodb_parameters`) is a footgun for any real app Docker/VPS that “forgot” to set the pool — everything is cold forever.
2. **Dedicated host folklore (≤~80%)** applies when MySQL owns the machine (`innodb-buffer-pool`). Your Next.js + MySQL on one 4GB VPS is **not** that machine.
3. **Managed SKUs:** memory is capped; buffer pool is chosen by instance class / plan. You often negotiate with:
   - connection count memory
   - sort/temp needs
   - OS and engine overhead
   - “we resized compute but the warm set is still bigger than RAM”
4. **PlanetScale-style / Vitess / serverless-ish MySQL:** treat each serving path as having a **finite warm cache**; design data access for locality (per-tenant, recent windows). Exact knobs may be abstracted — the *idea* is not.
5. Online resize exists (`innodb-buffer-pool-resize`) but chunk/instances constraints matter on self-hosted; on managed, you often **resize the instance** instead.
6. After restart/failover: warm set is gone until rebuild — dump/restore (`innodb-preload-buffer-pool`) or traffic-driven warmup; expect a latency cliff.

- Capacity planning is “does the hot working set fit this SKU?” not “did we index the column?”

### Beat G — Clever SQL loses to fit-in-memory

Make this the philosophical center of the deep dive:

- A beautiful `type: ref` plan that must fetch **cold** pages every time still pays storage latency × pages.
- A slightly worse plan that only touches **young** pages stays in the 1–5ms band.
- Therefore production wins often look like:
  - **Time-local queries** (`created_at > now() - interval 30 day`) with matching indexes so you don’t walk history.
  - **Tenant-local access** (always `WHERE workspace_id = ?` first) so each app’s hot set is a slice.
  - **Split hot/cold tables** (active `orders` vs `orders_archive`).
  - **Don’t put the audit log in the same buffer-pool fate** as checkout tables if you scan it on the primary.
  - **Covering indexes** later (15) as “touch fewer pages,” not as day-one magic.

Gallery contrast (same schema, different access):

1. Hot: recent open orders for one shop — small page set, stays young.
2. Cold: `SELECT COUNT(*) FROM orders` / full dump — floods old list, evicts (1).
3. “Clever” but cold: perfect index on `archived_orders(status, created_at)` used by a rare admin tool that still pulls gigabytes — fine on a replica; catastrophic on the primary’s pool.

- Performance reviews should ask “what pages does this endpoint keep warm?” before “can we add a hint?”

### Beat H — App-first fix ladder (then knobs)

Ritual to close the essay:

1. Measure: hit rate + read rate under the slow symptom (and during the suspected thrash job).
2. Shrink the **touch set** of the hot path (projection, indexes, keyset pagination, avoid `SELECT *`).
3. Move cold scans off the primary (replica, warehouse, backup tooling).
4. Schedule / isolate batch work; consider temporary `innodb_old_blocks_time` only with benchmarks (`innodb-performance-midpoint_insertion`).
5. Increase instance memory / `innodb_buffer_pool_size` when the steady working set simply does not fit.
6. After maintenance: preload / expect warmup (`innodb-preload-buffer-pool`).
7. Only then exotic instance/chunk/read-ahead tuning.

---

## Interactive feature

Scatter **3–5 small client demos** under `src/components/interactive/mysql-buffer-pool/` (shared chrome from `schema-byte-budget/shared.tsx`). Split the old mega-scrubber — same sim core, multiple embeds.

### 1. Young/old LRU strip

- **Goal:** See midpoint insert, promote-to-young, evict-from-tail — not textbook LRU.
- **Placement:** Young/old mechanism section (§4).
- **UX:** Horizontal strip (32–48 slots); color hot-set page ids; one-line event log.

### 2. Sunday export thrash

- **Goal:** Hot OLTP mix → cold sequential scan → hot mix again; watch hot pages evicted.
- **Placement:** Working set vs thrash (§5) + Monday hook (§6).
- **UX:** Preset buttons on same strip; reuses #1 component with scripted workloads.

### 3. Hit-rate meter

- **Goal:** Correlate pool state with Monitor-style `hits / (hits+misses)` display.
- **Placement:** Embed beside #2 and hit-rate literacy (§7).
- **UX:** Simple bar + fraction; miss flash on cold access — not a metrics dashboard.

### 4. Working set vs pool size

- **Goal:** When working set > pool capacity, even “healthy” traffic never stabilizes high hit rate.
- **Placement:** Sizing / fit-in-memory sections (§8–9).
- **UX:** Slider: pool slots vs working-set size; qualitative only.

### 5. Scan resistance toggle *(optional)*

- **Goal:** Higher simulated `old_blocks_time` → export hurts less (qualitative; label “benchmark before prod”).
- **Placement:** Thrash section (§5). Cut if #2 already feels crowded.

**Non-goals:** multiple buffer pool instances, flush list, redo — tease 14 only.

---

## Example queries / schemas

Use one coherent multi-tenant shop schema across prose + interactive labels. Types stay boring-correct (article 01); this piece is about **which pages get touched**.

```sql
CREATE TABLE shops (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  status ENUM('open', 'paid', 'canceled', 'archived') NOT NULL,
  created_at DATETIME(6) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  KEY idx_orders_shop_created (shop_id, created_at),
  KEY idx_orders_shop_status_created (shop_id, status, created_at),
  CONSTRAINT fk_orders_shop FOREIGN KEY (shop_id) REFERENCES shops (id)
) ENGINE=InnoDB;

CREATE TABLE order_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  shop_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME(6) NOT NULL,
  KEY idx_events_shop_created (shop_id, created_at),
  CONSTRAINT fk_events_order FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE=InnoDB;

-- Intentionally huge / cold-ish sibling for the thrash story
CREATE TABLE orders_archive (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  status ENUM('open', 'paid', 'canceled', 'archived') NOT NULL,
  created_at DATETIME(6) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  KEY idx_arch_shop_created (shop_id, created_at)
) ENGINE=InnoDB;
```

### Scenario queries (each gets a buffer-pool story)

**1. Hot path — shop dashboard (should stay young)**

```sql
SELECT id, status, created_at, customer_email
FROM orders
WHERE shop_id = 42
  AND status = 'open'
ORDER BY created_at DESC
LIMIT 50;
```

Teaching: small, repeated page set under multi-tenant access; EXPLAIN may show `ref`/`range` — still only wins if those pages remain buffered.

**2. Hot path — detail (point read)**

```sql
SELECT id, shop_id, status, created_at, customer_email
FROM orders
WHERE id = 1001 AND shop_id = 42;
```

Teaching: clustered PK page; stays warm if this order is in the active set.

**3. Cold thrash — compliance export on primary (the villain)**

```sql
SELECT id, shop_id, status, created_at, customer_email
FROM orders
ORDER BY id;
-- or: mysqldump / SELECT ... INTO OUTFILE of the whole table
```

Teaching: sequential page flood; midpoint inserts; without scan resistance / isolation to a replica, young hot pages age out (`innodb-buffer-pool`, `innodb-performance-midpoint_insertion`).

**4. Cold thrash — “clever” analytics that still kills RAM**

```sql
EXPLAIN
SELECT shop_id, COUNT(*) AS paid_orders
FROM orders
WHERE status = 'paid'
  AND created_at < NOW() - INTERVAL 1 YEAR
GROUP BY shop_id;
```

Teaching: may have a usable index and still touch a huge cold range; perfect plan ≠ hot pool. Move to replica / warehouse / archive table.

**5. Fit-in-memory product fix — recent window only**

```sql
SELECT id, status, created_at
FROM orders
WHERE shop_id = 42
  AND created_at >= NOW() - INTERVAL 30 DAY
ORDER BY created_at DESC
LIMIT 50;
```

Teaching: same UX for most dashboards; dramatically smaller steady working set than “all history.”

**6. Observability snippets (author/repro, not interactive)**

```sql
-- Size + instances (self-hosted / when permitted)
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SHOW VARIABLES LIKE 'innodb_old_blocks%';

SHOW ENGINE INNODB STATUS\G
-- Read: BUFFER POOL AND MEMORY → hit rate, young-making, pages read

SELECT POOL_SIZE, DATABASE_PAGES, OLD_DATABASE_PAGES,
       HIT_RATE, PAGES_MADE_YOUNG, PAGES_NOT_MADE_YOUNG
FROM information_schema.INNODB_BUFFER_POOL_STATS;
-- Column names: confirm against 9.7 I_S docs while drafting;
-- teach the idea even if managed UIs wrap these.
```

**Optional staging-only (warn hard):**

```sql
-- Can be expensive — staging/repro only (sys view warning in manual)
SELECT * FROM sys.innodb_buffer_stats_by_table
ORDER BY allocated DESC
LIMIT 20;
```

**Seed guidance for local repro:** Generate enough `orders` that the table **does not** fit in a deliberately small `innodb_buffer_pool_size` (e.g. 128M–256M in Docker). Run hot queries until hit rate is high; run full-table dump; re-run hot queries and show hit rate / latency change. Interactive fixtures can use tiny fabricated page ids that tell the same story.

---

## Tie-back checklist

Closing checklist for the published post. Each row: symptom → earlier article / this article → action.

| If you see… | Remember from… | Do this |
| --- | --- | --- |
| Wide rows / JSON blobs making every page sparse | **01 Schema & types** | Narrow hot columns; don’t store cold payloads on hot rows |
| Random PKs scattering inserts across leaves | **02 Primary keys** | Time-ordered / sequential keys when locality matters (nuance, don’t relitigate whole PK essay) |
| Secondary indexes doubling page touch sets | **03 Indexes** | Keep indexes that earn their pages; drop unused |
| `SELECT *` list endpoints | **04 SELECT** | Project only needed columns to touch less |
| Deep `OFFSET` walking many leaves | **05 Pagination** | Keyset pagination — fewer wasted page reads |
| Join fanout pulling whole tables into RAM | **06 JOINs** | Index join keys; avoid “join the world” admin queries on primary |
| Long transactions / history list weirdness blamed on “cache” | **11 MVCC** | Don’t confuse undo growth with buffer pool thrash — verify hit rate |
| Lock waits while hit rate is fine | **12 Locks** | Different disease; don’t resize the pool to fix deadlocks |
| EXPLAIN looks great, p95 still awful after a dump | **This article** | Check hit rate / cold jobs; restore working set locality |
| Dirty page / fsync / crash-safety questions | **14 Durability** (next) | Separate “cached pages” from “how writes become durable” |
| Need fewer page reads for the same query | **15 Covering indexes** | Index-only access as the next lever |
| Replica lag / failover then everything cold | **19 Replication** | Each node warms alone; plan for cold-cache traffic storms |
| “Where is time spent — CPU vs I/O waits?” | **20 Perf schema** | Confirm buffer misses vs lock/CPU with waits |

**Definition of done for this article:** reader can explain young/old midpoint LRU in plain English, name their app’s working set, and diagnose “Sunday export ruined Monday latency” without reaching for query hints first.

**Forward links:** durability & dirty pages → **14**; covering / fewer pages → **15**; replica warmth → **19**; I/O wait forensics → **20**.

---

## Open questions / author notes

1. **No `innodb-lru-list` node:** Teach LRU exclusively from `innodb-buffer-pool` + `innodb-performance-midpoint_insertion`. Optionally mention `information-schema-innodb-buffer-page-lru-table` as the introspection surface, not as the algorithm doc.
2. **Avoid MyISAM confusion:** `midpoint-insertion` is MyISAM key cache. One “not this page” callout if SEO/search might collide; do not teach it.
3. **Managed MySQL honesty:** Exact RDS/Aurora/PlanetScale parameter names drift. Write principles (SKU memory, warm set per node, limited knob access) and link vendor docs at publish time rather than freezing vendor UI steps in the evergreen post.
4. **PlanetScale / Vitess:** May abstract `innodb_buffer_pool_size`. Still teach working-set locality — the interactive and mental model remain valid.
5. **Don’t steal article 14:** Dirty pages, flush list, doublewrite, `innodb_flush_log_at_trx_commit` get one “pages can be dirty; durability next” paragraph max.
6. **Don’t steal article 15:** Covering indexes are “touch fewer pages,” one forward pointer, no workshop.
7. **Hit-rate numerators:** Standard Monitor prints `Buffer pool hit rate N / 1000`. Status variable formulas (`Innodb_buffer_pool_read_requests` vs `Innodb_buffer_pool_reads`) should be verified against current server status docs while drafting the observability section — teach the idea even if the exact identity of CloudWatch metrics varies.
8. **`INNODB_BUFFER_POOL_STATS` column list:** Confirm exact column names (`HIT_RATE` etc.) against the 9.7 node when writing SQL samples; some teaching snippets may need adjustment.
9. **Interactive fidelity:** Simulation should be labeled a model (no multiple instances, no unzip LRU, no change buffer). Prefer clarity of young/old/midpoint/evict over engine completeness.
10. **Tuning caution:** Manual says benchmark before changing `innodb_old_blocks_*` in production. Article tone: explain, don’t prescribe global values for all apps.
11. **Legal:** Original teaching prose only; link refman; local corpus stays gitignored (`sources/README.md`).
12. **Series glue:** Register slug `mysql-buffer-pool` in hub `seriesList.postSlugs` when publishing; place after locks (12), before durability (14).
13. **Tone check:** Empowering, slightly scary Monday story → crisp mechanism → practical app ladder. Avoid “set buffer pool to 80%” as the moral for Docker-compose developers.

---

## Drafting checklist (when writing the post)

- [ ] Part B opener; scatter LRU/thrash/hit-rate demos mid-article
- [ ] `<Cite />` / `<References />`; humanizer pass; first-person voice
- [ ] Managed-hosting constraints before “80% of RAM” advice
- [ ] Forward to 14, 15, 19, 20; don’t steal redo/flush (14)

---

## Draft success metrics (for later editing)

- A reader can sketch young / midpoint / old / eviction on a napkin.
- The interactive makes Sunday-export eviction *visually* obvious (hot pages leave; hit rate drops).
- Managed-hosting constraints appear before any “80% of RAM” advice, so hobby Docker and RDS readers both feel seen.
- Every thrash story maps to an app action (move job, shrink touch set, resize SKU) before a mysterious global variable.
- Zero sections that require understanding redo/flush policy (that’s 14).
