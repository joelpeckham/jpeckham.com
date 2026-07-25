# Article 20 — Slow Query Forensics with Performance Schema

| Field | Value |
| --- | --- |
| **Number** | 20 |
| **Title** | Slow Query Forensics with Performance Schema |
| **Slug** | `mysql-perf-schema` |
| **Tier** | Deep dive (Part B / series capstone) |
| **Role in arc** | Diagnostic toolkit that closes the series — readers leave able to triage production pain into CPU / IO / lock / index / sort categories and map each finding back to the right earlier article (1–19). |
| **Published path** | `/posts/mysql-perf-schema/` |
| **Interactive** | Digest triage board (pick synthetic symptoms → reveal which P_S / `sys` tables light up) *or* annotated incident-timeline scrubber |

---

## Intent

Teach web developers a **repeatable forensics loop** for “the API is slow and EXPLAIN isn’t enough”—using Performance Schema digests, wait events, and the `sys` schema views that wrap them.

After this article, a reader should be able to:

1. Know when to leave EXPLAIN (article 10) and enter runtime evidence: digests, samples, wait classes, lock waits.
2. Query `performance_schema.events_statements_summary_by_digest` (or `sys.statement_analysis`) to find the hottest normalized statements by total / avg / max latency.
3. Read the digest columns that matter for apps: `SUM_TIMER_WAIT`, `SUM_LOCK_TIME`, `SUM_ROWS_EXAMINED` vs `SUM_ROWS_SENT`, `SUM_NO_INDEX_USED`, `SUM_CREATED_TMP_*`, `SUM_SORT_*`, `QUERY_SAMPLE_TEXT`.
4. Classify pain into buckets: **index / scan**, **sort / temp**, **lock wait**, **IO / buffer pool coldness**, **long transaction / history**—and name the earlier article that owns the fix.
5. Use a short, safe staging/prod checklist: what consumers to leave on by default, what to enable briefly during an incident, what never to do on a hot primary (truncate blindly, enable every wait instrument forever, run `EXPLAIN ANALYZE` on destructive SQL).
6. Prefer `sys` views for day-to-day triage; drop to raw `performance_schema` when they need the join graph (e.g. `data_lock_waits` → `data_locks` → current statement).

**Out of scope (defer / footnote only):** mutex-level InnoDB expert profiling as a primary skill, full consumer hierarchy theory, Enterprise Firewall / query rewrite plugins, NDB / Group Replication P_S tables, writing custom instruments, capacity-planning with memory summary tables as a main topic, replacing APM (Datadog/New Relic) — position P_S as the DB-side ground truth those tools often wrap.

---

## Real-world hook

**Scene:** Black Friday week. `GET /api/checkout/preview` p95 jumps from 80ms to 1.8s. The on-call engineer pastes `EXPLAIN` for the “main” order lookup into Slack—it looks fine (`type: ref`, sensible `key`). Staging can’t reproduce it. The slow query log shows *many* different literal SQL strings that are clearly the same shape. Someone asks: “Is it the disk? Locks? The replica? Did deploy #482 break an index?” Nobody has a shared vocabulary for answering.

**Companies / surfaces that make this concrete:**

- **Shopify-style checkout** — preview endpoint does inventory + cart + tax; under concurrency the plan is fine but `SUM_LOCK_TIME` and `sys.innodb_lock_waits` explode (article 12).
- **GitHub-style notifications inbox** — list digest shows `SUM_NO_INDEX_USED` / full scans after an ORM “quick fix” dropped a composite (articles 03–05).
- **Stripe-style dashboard** — reporting query looks indexed in EXPLAIN but `rows_examined >> rows_sent` and `statements_with_sorting` light up; cold buffer pool on a new replica makes IO waits dominate (articles 05, 13, 19).
- **SaaS admin “export CSV”** — one digest owns half of total latency; sample text reveals `SELECT *` + deep offset pagination that EXPLAIN on page 1 never stressed (article 05).
- **Post-migration hang** — online DDL finished, but a leftover long transaction + metadata/data locks make “simple” updates wait (articles 11, 12, 18).

**The emotional beat:** EXPLAIN answers “what *would* the optimizer do?” Performance Schema answers “what *is* the server spending time on, across the real workload?” Series graduation is being able to open digests / waits and say: *this is lock contention, not a bad plan* — or *this digest is a full scan dressed up as an ORM helper* — and point at the article that teaches the fix.

---

## Primary documentation sources

Cite the public HTML from published posts. Local research corpus: `sources/mysql-refman-9.7/nodes/<id>.md` (gitignored; do not paste Oracle prose into MDX).

### Core (must cite / teach from)

| Node id | Public URL | Why it matters for this article |
| --- | --- | --- |
| `performance-schema` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema.html | What P_S is: runtime events, in-memory, instance-local, not binlogged; design goals (minimal overhead, doesn’t change plans); pointer to `sys`. |
| `performance-schema-quick-start` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-quick-start.html | Verify `performance_schema=ON`; table groups (current / history / summary / setup); “not everything enabled by default”; first useful SELECTs. |
| `performance-schema-statement-digests` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-statement-digests.html | Normalization (`?` literals), `DIGEST` / `DIGEST_TEXT`, sampling (`QUERY_SAMPLE_TEXT`), digest table sizing / `NULL` overflow row, `max_digest_length` vs `performance_schema_max_digest_length`. |
| `performance-schema-statement-summary-tables` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-statement-summary-tables.html | `events_statements_summary_by_digest` columns: timers, lock time, rows examined/sent, no-index flags, temp tables, sorts — the triage spreadsheet. |
| `performance-schema-events-statements-current-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-events-statements-current-table.html | Live “what is this thread doing now”; `LOCK_TIME`, `ROWS_*`, `NO_INDEX_USED`, stages of a statement. |
| `performance-schema-examples` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-examples.html | Official diagnose-loop methodology (run → analyze → disable noise → truncate → repeat); mutex wait chase pattern (light touch). |
| `sys-schema` | https://dev.mysql.com/doc/refman/9.7/en/sys-schema.html | `sys` as the developer-friendly layer over P_S; installed by default on modern MySQL. |
| `sys-statement-analysis` | https://dev.mysql.com/doc/refman/9.7/en/sys-statement-analysis.html | Day-one view: normalized query, latency, lock_latency, rows_examined, full_scan, tmp tables. |
| `slow-query-log` | https://dev.mysql.com/doc/refman/9.7/en/slow-query-log.html | Complementary tool: threshold-based file/table log; when it helps vs when digests are better; `long_query_time`, `log_queries_not_using_indexes`. |

### Supporting — waits, locks, IO, consumers

| Node id | Public URL | Use |
| --- | --- | --- |
| `performance-schema-consumer-configurations` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-consumer-configurations.html | Consumer hierarchy; enable only what you need; overhead story for prod-with-care. |
| `performance-schema-wait-summary-tables` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-wait-summary-tables.html | Aggregated wait latency by event name — “where does time go outside SQL text?” |
| `sys-wait-classes-global-by-latency` | https://dev.mysql.com/doc/refman/9.7/en/sys-wait-classes-global-by-latency.html | Coarse classes (`wait/io/file`, sync, etc.) for “IO vs mutex vs …” framing. |
| `performance-schema-data-locks-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-data-locks-table.html | Who holds which InnoDB data locks (tie to article 12). |
| `performance-schema-data-lock-waits-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-data-lock-waits-table.html | Requesting vs blocking transaction/thread — live lock forensics. |
| `sys-innodb-lock-waits` | https://dev.mysql.com/doc/refman/9.7/en/sys-innodb-lock-waits.html | Friendlier lock-wait view (`waiting_query`, `blocking_query`, ages). |
| `performance-schema-table-io-waits-summary-by-index-usage-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-table-io-waits-summary-by-index-usage-table.html | Per-index IO; `INDEX_NAME NULL` = no index (full scan / inserts). |
| `sys-schema-tables-with-full-table-scans` | https://dev.mysql.com/doc/refman/9.7/en/sys-schema-tables-with-full-table-scans.html | Which tables are being full-scanned. |
| `sys-statements-with-full-table-scans` | https://dev.mysql.com/doc/refman/9.7/en/sys-statements-with-full-table-scans.html | Which digests drive scans (`no_index_used_pct`). |
| `sys-statements-with-sorting` | https://dev.mysql.com/doc/refman/9.7/en/sys-statements-with-sorting.html | Filesort / merge-pass evidence (article 05 / 10 Extra). |
| `sys-statements-with-temp-tables` | https://dev.mysql.com/doc/refman/9.7/en/sys-statements-with-temp-tables.html | In-memory vs on-disk temp tables. |
| `sys-schema-unused-indexes` | https://dev.mysql.com/doc/refman/9.7/en/sys-schema-unused-indexes.html | Write amplification candidates (articles 03, 07) — with “server must be warm” caveat. |
| `sys-schema-index-statistics` | https://dev.mysql.com/doc/refman/9.7/en/sys-schema-index-statistics.html | Which indexes actually serve reads vs absorb writes. |
| `innodb-performance-schema` | https://dev.mysql.com/doc/refman/9.7/en/innodb-performance-schema.html | InnoDB instruments exist (`wait/io/file/innodb/...`, stages for ALTER); expert path, not the default loop. |
| `monitor-innodb-mutex-waits-performance-schema` | https://dev.mysql.com/doc/refman/9.7/en/monitor-innodb-mutex-waits-performance-schema.html | Optional deep link if mutex waits dominate after app-level causes ruled out. |
| `mysqldumpslow` | https://dev.mysql.com/doc/refman/9.7/en/mysqldumpslow.html | Summarize slow log when digests aren’t available (older hosts / managed limits). |

### Light touch / cross-links

| Node id | Public URL | Use |
| --- | --- | --- |
| `performance-schema-processlist-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-processlist-table.html | Modern processlist alternative; pair with `sys.processlist` / `sys.session`. |
| `sys-processlist` | https://dev.mysql.com/doc/refman/9.7/en/sys-processlist.html | Human-readable sessions during an incident. |
| `performance-schema-events-transactions-current-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-events-transactions-current-table.html | Long-running / idle transactions (articles 08, 11). |
| `performance-schema-metadata-locks-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-metadata-locks-table.html | DDL vs DML queueing (article 18). |
| `explain` / `explain-output` | https://dev.mysql.com/doc/refman/9.7/en/explain.html | “When EXPLAIN isn’t enough” contrast — don’t re-teach article 10. |
| `sys-ps-setup-save` / `sys-ps-setup-reload-saved` / `sys-ps-setup-reset-to-default` | (sys schema procedures) | Incident hygiene: snapshot config → enable → restore. |

**Citation rule:** paraphrase + link; never paste Oracle wording into the published post.

---

## Article structure

Proposed MDX flow (top interactive, then narrative). Capstone energy: one forensic idea per section, always ending in “so in your app / so in Slack…”.

1. **Hook** — Slow checkout; EXPLAIN looks fine; Slack has no shared diagnosis language.
2. **Interactive** — Digest triage board (or incident timeline); invite readers to classify symptoms before the essay.
3. **When EXPLAIN isn’t enough** — Plan vs population; concurrency; cache; “wrong query being blamed”; ORM string explosion.
4. **The forensics stack** — Slow query log → digests → waits → locks → (optional) InnoDB instruments. Prefer the left side first.
5. **Mental model: events, consumers, digests** — spoon-fed: statement events nest stages/waits; digests normalize SQL; `sys` is a view layer.
6. **Find the hot digests** — `sys.statement_analysis` / `events_statements_summary_by_digest` ordered by total and by avg latency; read sample text.
7. **Decode the digest columns (literacy core)** — latency vs lock time; examined vs sent; no-index; temp; sort; errors.
8. **Bucket the pain** — decision tree: scan / sort-temp / lock / IO / long-trx → which article owns the fix.
9. **Live incident queries** — current statements, processlist, `sys.innodb_lock_waits`, wait classes.
10. **Staging vs prod-with-care** — what to enable, truncate carefully, restore defaults; don’t leave history_long forever.
11. **Series capstone checklist** — map findings → articles 1–19.
12. **Further reading** — linked refman nodes; what this site’s series deliberately deferred.

**Length target:** long-form synthesis (~3–4.5k words) + interactive; denser than mid-series posts because it is the graduation ceremony.

---

## Deep-dive beats

Teach these ideas in order. Each beat should end with “so in your app…”

### Beat A — EXPLAIN is a map; digests are the traffic report

- Article 10 taught planned access paths. Capstone: a good plan can still hurt under load (locks, IO, cardinality skew, wrong endpoint blamed).
- Slow query log records *instances* that crossed `long_query_time`; digests aggregate *shapes* across literals (`performance-schema-statement-digests`).
- App implication: ORM logs show thousands of unique strings; digests collapse them to one row you can prioritize by `SUM_TIMER_WAIT`.

### Beat B — The stack you actually use

Opinionated ladder for web-devs (cheap → expensive / rare):

1. **APM / app timings** — which endpoint? (out of band; mention only)
2. **`sys.statement_analysis` / digests** — which SQL shape?
3. **Digest counters** — scan / sort / temp / lock_time flags
4. **`EXPLAIN` / `EXPLAIN ANALYZE`** on the sample (staging / replica)
5. **Live locks** — `sys.innodb_lock_waits` / `data_lock_waits` if lock_time or stuck threads
6. **Wait classes / table IO by index** — if digests look “clean” but server is busy
7. **Slow log + `mysqldumpslow`** — when managed MySQL limits P_S access or digests overflow

So in your app: don’t start at InnoDB mutex instruments (`innodb-performance-schema`).

### Beat C — Digests: normalization, samples, and the NULL catch-all

- Literals → `?`; object names preserved — so `orders` vs `customers` stay distinct (`performance-schema-statement-digests`).
- `QUERY_SAMPLE_TEXT` / `QUERY_SAMPLE_SEEN` give a concrete statement to EXPLAIN.
- Truncation / `max_digest_length`: long ORM queries can collide after `...` — mention as a gotcha.
- Digest table full → special row with `SCHEMA_NAME`/`DIGEST` NULL absorbs leftovers; if that row is huge, raise `performance_schema_digests_size` or truncate/reset after investigation.
- App implication: always filter `WHERE DIGEST IS NOT NULL` (or equivalent) when ranking “top offenders.”

### Beat D — Column decoder for `events_statements_summary_by_digest`

Teach a short “read this first” set (human names for app Slack):

| Signal | Columns / sys fields | App English |
| --- | --- | --- |
| Hot shape | `SUM_TIMER_WAIT`, `COUNT_STAR`, `AVG`/`MAX` | “Pays the bill” vs “rare spike” |
| Lock pain | `SUM_LOCK_TIME` / `lock_latency` | Waiting on tables/rows — not CPU in the plan |
| Scan smell | `SUM_NO_INDEX_USED`, `SUM_SELECT_SCAN`, `full_scan` | Missing/unusable index |
| Over-read | `SUM_ROWS_EXAMINED` ≫ `SUM_ROWS_SENT` | Filtering late; bad selectivity; `SELECT *` |
| Sort pain | `SUM_SORT_*`, `statements_with_sorting` | `ORDER BY` not index-backed |
| Temp pain | `SUM_CREATED_TMP_*`, esp. disk | Spills; often GROUP BY / DISTINCT / bad join shape |
| Errors | `SUM_ERRORS` / `SUM_WARNINGS` | Deadlocks, truncation, SQL mode fights |

So in your app: one digest row beats a folder of EXPLAINs if you don’t know which query to explain.

### Beat E — Pain buckets → series articles (the capstone map)

Decision tree (also powers the interactive):

1. **`lock_latency` high or live rows in `innodb_lock_waits`** → articles **12** (locks), **08/09/11** (trx length / isolation / MVCC), sometimes **18** (metadata locks during DDL).
2. **`no_index_used` / full scans / `INDEX_NAME IS NULL` IO** → **03**, **04**, **06**, **15** (covering); confirm with EXPLAIN (**10**).
3. **Sort / temp flags** → **05** (pagination / ORDER BY), **06** (join + group shapes), **10** (`Using filesort` / temporary).
4. **Examined ≫ sent, plan looks OK, IO waits high** → **13** (buffer pool / working set), **19** (cold replica), durability/fsync only if write path (**14**).
5. **One write digest dominates after “read” indexing binge** → **07** + **03** (index write tax); **16** if cascades amplify.
6. **JSON / generated-column / multi-valued surprises** → **17**.
7. **Schema/type/charset casts preventing index use** → **01** then **04**.
8. **PK / clustering secondary lookup explosion** → **02**, then **15**.

### Beat F — Live forensics when something is stuck *now*

- `performance_schema.events_statements_current` / `sys.processlist` — who is running what.
- `sys.innodb_lock_waits` — waiting vs blocking query text and ages.
- `performance_schema.data_lock_waits` joined to `data_locks` — engine lock IDs when `sys` isn’t enough.
- Transactions current / history — “idle in transaction” from a leaked request-scoped trx (articles 08, 11).
- App implication: kill/fix at the *blocking* session (often a forgotten admin transaction), not the loud waiting API workers.

### Beat G — Waits when SQL text looks innocent

- `sys.wait_classes_global_by_latency` for coarse “file IO vs synch vs …”
- Table IO by index usage: which indexes earn their keep; `NULL` index name for scans.
- File IO instruments for InnoDB data/log — bridge to buffer pool / durability articles without becoming a DBA manual.
- Official iterative method from `performance-schema-examples`: enable broadly in a *repro*, filter noise, truncate summaries, repeat — **not** the default always-on prod config.

### Beat H — Configuration hygiene for staging and prod-with-care

- Defaults already collect a useful amount; statement digests are the daily driver.
- History / history_long / fine-grained waits: enable briefly during incidents; use `sys.ps_setup_save` → change → `reload_saved` / `reset_to_default` pattern when available.
- `TRUNCATE` summary tables resets counters (useful before a load test); warn that it erases evidence mid-incident if done carelessly.
- P_S is instance-local and not replicated — measure the primary *and* the lagging replica separately (article 19).
- Slow log: complementary for hosts where digests are truncated/disabled; remember lock acquire time nuances and threshold defaults (`slow-query-log`).

### Beat I — The graduation ritual (close the series)

1. Identify the slow *endpoint* (APM / logs).
2. Find the hot *digest* (`sys.statement_analysis`).
3. Read counters → pick a pain bucket.
4. Pull `QUERY_SAMPLE_TEXT` → `EXPLAIN` / `EXPLAIN ANALYZE` on staging or replica.
5. If counters say locks → live lock views, not more indexes.
6. Apply the fix from the mapped article; re-check digest latency and counters.
7. Only then consider server knobs / InnoDB mutex deep dives.

---

## Interactive feature

### Name (primary recommendation)

**Digest Triage Board**  
Suggested component path: `src/components/interactive/digest-triage/` (`"use client"`, imported at top of MDX; mirror RAID / explain-explorer patterns).

### Primary UX (ship this)

1. **Symptom picker** — 4–6 synthetic incidents (cards or a select), each with a one-line web story:
   - “Checkout p95 up; EXPLAIN looks fine” → **lock waits**
   - “Admin list suddenly scanning” → **full scan / no index**
   - “Inbox sort melts CPU” → **filesort / sort counters**
   - “Export creates disk temps” → **temp tables**
   - “New replica is mysteriously slow” → **IO / buffer pool cold**
   - “Deploy migration; writes queue” → **metadata / data locks during DDL**
2. **Triage reveal** — for the selected symptom, highlight which tables/views/metrics “light up”:
   - Digest columns (e.g. `SUM_LOCK_TIME`, `SUM_NO_INDEX_USED`, `SUM_SORT_ROWS`, `SUM_CREATED_TMP_DISK_TABLES`)
   - `sys` views (`innodb_lock_waits`, `statements_with_full_table_scans`, `statements_with_sorting`, `statements_with_temp_tables`, `wait_classes_global_by_latency`, `schema_tables_with_full_table_scans`)
   - Raw P_S anchors (`events_statements_summary_by_digest`, `data_lock_waits`, `table_io_waits_summary_by_index_usage`)
3. **Fake digest row** — monospace mini-table of the synthetic summary row with severity tints (green / amber / red) on the columns that diagnose the case.
4. **Next-step callout** — “Now EXPLAIN the sample” / “Open lock waits” / “Check buffer pool / replica” + link targets to earlier series posts by number.
5. **No live MySQL** — all fixtures local JSON; do not require a connection.

### Secondary mode (nice-to-have in same component)

**Annotated incident timeline scrubber** — horizontal scrubber over a 5–10 minute synthetic incident:

- T0: deploy / traffic spike marker
- Digest latency climbs
- Lock wait rows appear / clear
- IO wait class spikes on replica promote
- Annotation tooltips at scrub positions: “here digests would show X; here `innodb_lock_waits` would be non-empty”

Ship triage board first; timeline can be a second tab if scope allows.

### Interaction / motion notes

- Intentional motion: symptom card select → metric chips “ignite”; cross-fade between fake digest rows; brief pulse on the winning pain bucket.
- One composition: symptom + lit-up metric board + next-step — not a DBA dashboard chrome soup.
- Keyboard: arrow between symptoms; focusable metric chips with plain-English glossary (our wording).

### Data shape (implementation sketch)

```ts
type PainBucket =
  | "lock"
  | "full_scan"
  | "filesort"
  | "temp_disk"
  | "io_buffer"
  | "ddl_meta_lock";

type MetricLight = {
  id: string;
  label: string; // e.g. "SUM_LOCK_TIME"
  surface: "digest" | "sys" | "ps_raw";
  tableOrView: string;
  severity: "red" | "amber" | "green";
  blurb: string; // our English
};

type DigestFixture = {
  digestText: string;
  schema: string;
  countStar: number;
  sumTimerWaitHuman: string;
  sumLockTimeHuman: string;
  rowsExamined: number;
  rowsSent: number;
  sumNoIndexUsed: number;
  sumSortRows: number;
  sumCreatedTmpDiskTables: number;
  querySampleText: string;
};

type TriageCase = {
  id: string;
  title: string;
  scenario: string;
  bucket: PainBucket;
  lights: MetricLight[];
  digest: DigestFixture;
  explainEnough: boolean; // false when the teaching point is "EXPLAIN looked fine"
  nextArticles: number[]; // e.g. [12, 8, 11]
  takeaway: string;
};
```

---

## Example queries / schemas

Reuse the marketplace / orders schema from earlier plans so the series feels continuous. Keep types boring-correct (article 01); this post is about measurement.

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
  KEY idx_orders_shop_status_created (shop_id, status, created_at),
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

CREATE TABLE inventory (
  shop_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(64) NOT NULL,
  qty INT NOT NULL,
  PRIMARY KEY (shop_id, sku)
) ENGINE=InnoDB;
```

### Practical queries a web-dev can run

**1. Top digests by total latency (`sys` first)**

```sql
SELECT query, db, exec_count, total_latency, avg_latency, max_latency,
       lock_latency, rows_examined_avg, rows_sent_avg, full_scan
FROM sys.statement_analysis
WHERE query NOT LIKE 'TRUNCATE%'
  AND query NOT LIKE 'SHOW%'
ORDER BY total_latency DESC
LIMIT 15;
```

**2. Same idea on raw P_S (portable / explicit)**

```sql
SELECT SCHEMA_NAME,
       DIGEST_TEXT,
       COUNT_STAR,
       ROUND(SUM_TIMER_WAIT / 1e12, 3) AS sum_latency_s,
       ROUND(AVG_TIMER_WAIT / 1e12, 6) AS avg_latency_s,
       ROUND(SUM_LOCK_TIME / 1e12, 3) AS sum_lock_s,
       SUM_ROWS_EXAMINED,
       SUM_ROWS_SENT,
       SUM_NO_INDEX_USED,
       SUM_CREATED_TMP_DISK_TABLES,
       SUM_SORT_ROWS,
       QUERY_SAMPLE_TEXT
FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST IS NOT NULL
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 15;
```

**3. Full-scan offenders**

```sql
SELECT * FROM sys.statements_with_full_table_scans
ORDER BY no_index_used_pct DESC, total_latency DESC
LIMIT 20;

SELECT * FROM sys.schema_tables_with_full_table_scans
LIMIT 20;
```

**4. Sort / temp offenders**

```sql
SELECT * FROM sys.statements_with_sorting LIMIT 20;
SELECT * FROM sys.statements_with_temp_tables LIMIT 20;
```

**5. Live lock forensics**

```sql
SELECT waiting_pid, waiting_query, blocking_pid, blocking_query,
       wait_age_secs, locked_table_schema, locked_table_name, locked_index
FROM sys.innodb_lock_waits
ORDER BY wait_age_secs DESC;
```

**6. Coarse wait classes (when digests don’t explain host saturation)**

```sql
SELECT * FROM sys.wait_classes_global_by_latency
LIMIT 20;
```

**7. Index IO / unused indexes (warm server only)**

```sql
SELECT OBJECT_SCHEMA, OBJECT_NAME, INDEX_NAME,
       COUNT_STAR, SUM_TIMER_WAIT
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'app'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 30;

SELECT * FROM sys.schema_unused_indexes
WHERE object_schema = 'app';
```

**8. Reset counters before a staging repro (careful)**

```sql
TRUNCATE TABLE performance_schema.events_statements_summary_by_digest;
-- then run the load test / hit the endpoint N times / re-query digests
```

**9. Slow log companion (ops)**

```sql
-- my.cnf / SET GLOBAL (staging): slow_query_log=ON, long_query_time=0.5
-- summarize:
-- mysqldumpslow -s t /path/to/slow.log
```

### Scenario narratives for the article body

| Scenario | How to provoke (author staging) | What should light up |
| --- | --- | --- |
| Lock waits | Tx A `SELECT … FOR UPDATE` on inventory row; Tx B checkout update same SKU | `lock_latency`, `sys.innodb_lock_waits` |
| Full scan | Drop/ignore `idx_orders_shop_status_created`; filter + list | `SUM_NO_INDEX_USED`, `statements_with_full_table_scans` |
| Filesort | `ORDER BY customer_email` without index | `statements_with_sorting`, digest `SUM_SORT_*` |
| Temp disk | Wide `GROUP BY` / big join distinct on large data | `statements_with_temp_tables`, disk tmp pct |
| Cold IO | Restart replica / tiny buffer pool; scan large table | `wait/io/file` class, high latency with “OK” plan |

---

## Tie-back checklist

Closing “series graduation” table. Each row: forensic signal → earlier article → action. This is the defining artifact of article 20.

| If digests / waits show… | Remember from… | Do this |
| --- | --- | --- |
| Implicit casts / charset mismatches → index ignored | **01 Schema & types** | Fix types/collations before adding more indexes |
| Huge secondary lookups; fat PK in every secondary | **02 Primary keys** | Revisit PK width and clustering implications |
| `no_index_used`, weak `key_len`, unused vs hot indexes | **03 Secondary indexes** | Composite / left-prefix; drop write-only dead weight (`schema_unused_indexes`) |
| Sargability fails; examined ≫ sent from residual filters | **04 SELECT & filtering** | Rewrite predicates; project less |
| Sort counters + deep OFFSET samples | **05 Pagination** | Index-aligned `ORDER BY`; keyset pagination |
| `SELECT_FULL_JOIN` / join digests with scan inners | **06 JOINs** | Index join keys; revisit ORM join vs N+1 |
| Write digests dominate after index binge | **07 Writes** | Every secondary index taxes INSERT/UPDATE |
| Idle transactions; lock_time with “simple” statements | **08 Transactions** | Short request-scoped trx; no work/IO while holding locks |
| Weird visibility + lock shapes under concurrency | **09 Isolation** | Know RR gap/next-key behavior feeding lock waits |
| Need a plan for `QUERY_SAMPLE_TEXT` | **10 EXPLAIN** | EXPLAIN / ANALYZE on staging or replica — after digests pick the victim |
| History length / purge lag; “plan fine, reads heavy” | **11 MVCC & undo** | Hunt long transactions; don’t confuse undo IO with bad SQL |
| `innodb_lock_waits`, high `SUM_LOCK_TIME`, deadlocks | **12 Locks** | Fix lock order, indexes for lock ranges, trx scope |
| Wait class file IO + cold pages; good plans, bad latency | **13 Buffer pool** | Working set / pool size; separate cold replica mystery |
| Fsync / redo wait spikes on write path | **14 Durability** | Know `innodb_flush_log_at_trx_commit` tradeoffs (ops-aware) |
| High examined with covering opportunity | **15 Covering / ICP** | Index-only access to cut primary lookups |
| Cascade storms in blocking queries | **16 Foreign keys** | Cascade depth; app delete order |
| JSON field filters unindexed in samples | **17 JSON** | Generated / multi-valued indexes for real predicates |
| Metadata locks; digests stalled during deploy | **18 Online DDL** | Expand/contract; watch MDL; deploy windows |
| Primary fine, replica digests/IO ugly; read-after-write bugs | **19 Replication** | Lag, session stickiness, measure the node users hit |
| Counters ambiguous; need iterative enable/truncate | **This article** | Repro loop from `performance-schema-examples`; restore consumer defaults |

**Capstone definition of done for the series:** a reader can take a production latency complaint, find the responsible digest, name the pain bucket in plain English, choose the correct earlier lever (or EXPLAIN the sample), and avoid “add a random index” when the evidence says locks or IO.

---

## Open questions / author notes

1. **Interactive choice:** Prefer **Digest Triage Board** as v1 (clear teaching, fixture-friendly). Timeline scrubber is a strong v1.1 if the board feels thin—or a second tab.
2. **`sys` vs raw P_S in the post:** Lead with `sys.*` for readability; always show the underlying `performance_schema` table names so readers survive hosts where `sys` is missing/stripped.
3. **Managed MySQL variance:** RDS/Aurora/Cloud SQL differ in which P_S tables/instruments are available and whether `sys` exists. Add a short “if `sys` is missing…” box with raw digest SQL.
4. **Don’t re-teach article 10:** One section + links; the new skill is *choosing what to EXPLAIN* and *when EXPLAIN cannot see the pain*.
5. **Don’t become a mutex encyclopedia:** InnoDB sync instruments are a footnote after app-level buckets are empty (`innodb-performance-schema`, `monitor-innodb-mutex-waits-performance-schema`).
6. **Safety:** Truncating summary tables mid-incident erases evidence; enabling all wait history on a hot primary has cost (`performance-schema-consumer-configurations`). Recommend staging repro first; on prod, prefer read-only SELECTs against already-on digests / lock tables.
7. **Digest overflow row:** Explicitly teach filtering `DIGEST IS NOT NULL` and what the NULL catch-all means (`performance-schema-statement-digests`).
8. **Timer units:** P_S timers are picoseconds; `sys` formats human time — prefer `sys` in examples, show `/ 1e12` once for raw queries.
9. **Privileges:** Selecting from P_S needs appropriate grants; some orgs wrap access via admin roles — mention “ask for `performance_schema` read” as a real team hurdle.
10. **Coordination with 12 / 13 / 18 / 19:** Those articles own mechanisms; this article owns *detection* and routing. Cross-link heavily; avoid duplicating gap-lock diagrams or buffer-pool internals.
11. **Slow log vs digests framing:** Slow log = thresholded instances + ops muscle memory; digests = always-on shapes. Teach both; default the forensic loop to digests on MySQL 8+/9.x.
12. **ORM brand balance:** Neutral SQL in fixtures; Prisma/Rails/Django as producers of literal soup that digests normalize.
13. **Legal:** Original teaching prose only; link refman nodes; local `sources/mysql-refman-9.7/` stays gitignored.
14. **Series glue:** Register slug `mysql-perf-schema` last in hub `seriesList.postSlugs`; hub copy should call this the diagnostic capstone.
15. **Tone check:** Graduation energy — “you can run an incident without guessing” — not a tour of every `performance_schema` table (there are many).

---

## Draft success metrics (for later editing)

- A reader can explain why EXPLAIN can look fine while digests show high `SUM_LOCK_TIME`.
- Interactive makes three buckets (lock / scan / sort) visually distinct without a live database.
- Top 10 example queries in the post are copy-pasteable on a stock MySQL 8+/9.x with `sys`.
- Every major pain bucket maps to at least one earlier article number in the closing checklist.
- Zero sections that require understanding InnoDB mutex implementation.
