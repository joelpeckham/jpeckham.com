# Article 18 — Online DDL & Zero-Downtime Migrations

| Field | Value |
| --- | --- |
| **Number** | 18 |
| **Title** | Online DDL & Zero-Downtime Migrations |
| **Slug** | `mysql-online-ddl` |
| **Tier** | Deep dive (Part B) |
| **Role in arc** | Operational edge of schema change under live traffic — after schema/indexes/writes/transactions/locks, before replication lag from long DDL (19) and wait forensics (20). |
| **Published path** | `/posts/mysql-online-ddl/` |
| **Interactive** | Migration planner: pick an `ALTER`, see `ALGORITHM` / `LOCK`, animate metadata-lock wait queue vs app traffic |

---

## Intent

Teach web developers to **ship schema changes without treating `ALTER TABLE` as a deploy lottery**.

After this article, a reader should be able to:

1. Name the three InnoDB DDL algorithms — **INSTANT**, **INPLACE**, **COPY** — and what each does to table data, concurrency, and disk.
2. Predict (or force-fail with an explicit clause) whether a common web migration is metadata-only, rebuilds in place, or copies the table.
3. Explain why “online” / “concurrent DML” still stalls traffic: **exclusive metadata lock** phases, long transactions, and the wait queue that blocks new app queries behind a pending DDL.
4. Choose an expand/contract (expand → dual-write or backfill → cutover → contract) migration shape for Rails/Prisma/Django deploys instead of a single incompatible `ALTER` + app release.
5. Decide when native Online DDL is enough vs when a trigger-based / binlog-based external tool (pt-osc / gh-ost mental model) is the safer production pattern — without becoming a DBA handbook.
6. State historically *why* “just add a nullable column” used to mean a rebuild, and what Instant ADD/DROP COLUMN changed (and what limits remain: row versions, compressed tables, combining clauses, etc.).

**Out of scope (defer):** full partitioning exchange rules, NDB online ops, Group Replication online upgrade, detailed `OPTIMIZE TABLE` tuning, binlog/replica lag deep dive (tease → article 19), Performance Schema digests as the primary topic (tease → 20), foreign-key cascade design (16 — only as a `LOCK=NONE` limitation).

---

## Real-world hook

**Scene:** Friday deploy. Feature needs `orders.fulfillment_state`. Someone opens a PR with:

```sql
ALTER TABLE orders ADD COLUMN fulfillment_state VARCHAR(32) NOT NULL DEFAULT 'unfulfilled';
```

Staging (tiny table, quiet connections) finishes in milliseconds. Production has a 200GB `orders` table, connection pool with idle-in-transaction leftovers from a background job, and a deploy train that also ships the ORM that *requires* the new column. Slack fills with `Waiting for table metadata lock`. Checkout p95 spikes. Rollback doesn’t help — the `ALTER` is still holding/queueing.

**Companies / surfaces that make this concrete:**

- **Shopify-scale storefront / admin migrations** — large tenant-scoped tables (`orders`, `line_items`, `products`) where even “simple” column adds used to mean planned maintenance windows; the industry lore is “never ALTER the hot table during peak” until Instant/ONLINE DDL + careful expand/contract discipline matured.
- **GitHub-style migration culture** — schema changes as product risk; online schema change tooling and “migrations that don’t block deploys” as eng culture, not a DBA-only ritual. The teaching point isn’t copying their stack — it’s that **schema change is a traffic problem**, not a SQL syntax problem.
- **Rails + [`strong_migrations`](https://github.com/ankane/strong_migrations)** — the gem that turns dangerous ActiveRecord migrations into CI failures: adding a non-nullable column without a default (or with a default that rewrites rows on older MySQL), changing column type, renaming columns the app still reads, adding an index without `algorithm: :inplace` / concurrent patterns, etc. Use it as the *web-dev-facing* checklist that maps onto MySQL’s algorithm table.
- **Prisma / Django / Laravel deploy trains** — generated migrations that concatenate several incompatible clauses into one `ALTER`, or that run migrate in the same release that starts selecting the new column — classic expand/contract violation.

**Emotional beat:** “Online DDL” does **not** mean “invisible to the app.” It means *most of the work* can proceed with concurrent DML — then a short exclusive metadata lock must land, and anything holding (or waiting behind) that lock becomes your outage. Zero-downtime is a **migration design** (expand/contract + algorithm choice + transaction hygiene), not a magic keyword.

**Concrete teaching scenario for the whole piece:** multi-tenant marketplace backend (same arc as articles 01–10): Next.js / Rails / Nest talking to MySQL 8+/9.x InnoDB. Hot tables: `orders`, `order_items`, `listings`. Deploy pipeline runs SQL migrations before or during app rollout. Readers leave able to rewrite the Friday PR into a safe sequence.

---

## Primary documentation sources

Cite public HTML from published posts. Local research corpus: `sources/mysql-refman-9.7/nodes/<id>.md` (gitignored; do not paste Oracle prose into MDX).

**Note on missing node IDs:** There is **no** standalone `innodb-instant-ddl` or `innodb-online-ddl-algorithms` node in 9.7. Instant DDL is documented under `alter-table` (algorithm definitions + INSTANT-capable operations list) and `innodb-online-ddl-operations` (per-operation Instant / In Place / Rebuilds / Concurrent DML matrix). Treat those two as the “algorithms chapter.”

### Core (must cite / teach from)

| Node id | Public URL | Why it matters for this article |
| --- | --- | --- |
| `innodb-online-ddl` | https://dev.mysql.com/doc/refman/9.7/en/innodb-online-ddl.html | Chapter intro: instant + in-place + concurrent DML; default “as little locking as possible”; `ALGORITHM` / `LOCK` at end of `ALTER TABLE`; force INSTANT/INPLACE to fail closed instead of silently copying. |
| `innodb-online-ddl-operations` | https://dev.mysql.com/doc/refman/9.7/en/innodb-online-ddl-operations.html | **The matrix** — Instant / In Place / Rebuilds table / Permits concurrent DML / Only modifies metadata for indexes, PKs, columns, generated cols, FKs, table ops. Primary source for “is ADD COLUMN free?” and Instant ADD/DROP limitations (row versions, COMPRESSED, FULLTEXT, combining clauses). |
| `alter-table` | https://dev.mysql.com/doc/refman/9.7/en/alter-table.html | Formal `ALGORITHM={DEFAULT\|INSTANT\|INPLACE\|COPY}` and `LOCK={DEFAULT\|NONE\|SHARED\|EXCLUSIVE}`; default preference INSTANT → INPLACE → COPY; INSTANT = metadata only; INPLACE may rebuild; COPY row-by-row, no concurrent DML; only `LOCK=DEFAULT` with INSTANT. |
| `innodb-online-ddl-performance` | https://dev.mysql.com/doc/refman/9.7/en/innodb-online-ddl-performance.html | **Three phases** (init shared MDL → execution → commit exclusive MDL); `LOCK` clause semantics; the session demo where idle transaction → ALTER waits → *new SELECTs also wait*; `SHOW FULL PROCESSLIST` state `Waiting for table metadata lock`. |
| `metadata-locking` | https://dev.mysql.com/doc/refman/9.7/en/metadata-locking.html | Why MDL exists; locks held until **transaction end** (not statement end) for tables touched in a txn; write-preferring waiters; FK-related tables also locked; Performance Schema `metadata_locks` pointer. |
| `create-index` | https://dev.mysql.com/doc/refman/9.7/en/create-index.html | Online index creation syntax (`ALGORITHM` / `LOCK` on `CREATE INDEX`); finishes after transactions accessing the table complete so the index reflects recent contents — ties “add index during deploy” to MDL wait. |

### Supporting (cite lightly; don’t derail)

| Node id | Public URL | Use |
| --- | --- | --- |
| `innodb-online-ddl-limitations` | https://dev.mysql.com/doc/refman/9.7/en/innodb-online-ddl-limitations.html | Exclusive MDL always needed in final phase; `LOCK=NONE` forbidden with certain FK `ON CASCADE` / `SET NULL`; online log duplicate-key surprises; large-table: no pause/throttle; replication lag tease → 19. |
| `innodb-online-ddl-failure-conditions` | https://dev.mysql.com/doc/refman/9.7/en/innodb-online-ddl-failure-conditions.html | Incompatible ALGORITHM/LOCK; MDL timeout; `tmpdir` / online log too big (`innodb_online_alter_log_max_size`); concurrent DML that violates the *new* definition. |
| `innodb-online-ddl-space-requirements` | https://dev.mysql.com/doc/refman/9.7/en/innodb-online-ddl-space-requirements.html | Temp online log, sort files, intermediate table — why INPLACE rebuilds still need disk headroom; Instant exempt. |
| `innodb-online-ddl-single-multi` | https://dev.mysql.com/doc/refman/9.7/en/innodb-online-ddl-single-multi.html | Combining multiple clauses: whole statement limited by the least capable part — explains “don’t mix Instant ADD with a type change.” |
| `online-ddl-memory-management` | https://dev.mysql.com/doc/refman/9.7/en/online-ddl-memory-management.html | Optional ops footnote for large index builds. |
| `online-ddl-parallel-thread-configuration` | https://dev.mysql.com/doc/refman/9.7/en/online-ddl-parallel-thread-configuration.html | Optional: parallel threads for index creation (version-aware). |
| `performance-schema-metadata-locks-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-metadata-locks-table.html | How to see who holds / waits for MDL in prod (bridge → article 20). |
| `monitor-alter-table-performance-schema` | https://dev.mysql.com/doc/refman/9.7/en/monitor-alter-table-progress.html | Progress monitoring for long ALTER (stage/work estimated) — one paragraph for “is it stuck or working?” |
| `optimizing-innodb-ddl-operations` | https://dev.mysql.com/doc/refman/9.7/en/optimizing-innodb-ddl-operations.html | Secondary tips: load data then add secondary indexes; brief. |
| `atomic-ddl` | https://dev.mysql.com/doc/refman/9.7/en/atomic-ddl.html | Optional: DDL atomicity / crash safety framing — don’t expand into a chapter. |
| `alter-table-examples` | https://dev.mysql.com/doc/refman/9.7/en/alter-table-examples.html | Optional worked examples while drafting. |

**External (non-refman) teaching refs — link, don’t scrape:**

- Percona Toolkit `pt-online-schema-change` — trigger + shadow table + chunked copy mental model.
- GitHub `gh-ost` — binlog-based, triggerless online schema change mental model.
- Rails `strong_migrations` — dangerous migration patterns checklist (maps cleanly onto the algorithm matrix).
- Classic expand/contract / parallel-change posts (e.g. “expand and contract pattern for continuous delivery”) — use for app deploy sequencing, not as MySQL internals.

**Citation rule:** paraphrase + link; never paste Oracle wording into the published post.

---

## Article structure

Proposed MDX flow (top interactive, then narrative). Spoon-fed: one migration idea per section, always with a web-app deploy consequence.

1. **Deploy-day failure mode (hook)**  
   Staging-fast / prod-stuck `ALTER`; `Waiting for table metadata lock`; feature flag vs migration ordering.  
   App consequence: schema change is part of the request path’s availability budget.

2. **What “online” actually means**  
   Benefits from `innodb-online-ddl`: availability, less copy I/O, `LOCK` tuning. Default behavior tries Instant/In-place. “Online” ≠ zero lock ≠ zero risk.  
   App consequence: never assume the ORM migration is safe because MySQL 8+ exists.

3. **Three algorithms: INSTANT / INPLACE / COPY**  
   Teach from `alter-table`: metadata-only vs in-place (maybe rebuild) vs full copy; concurrency defaults; forcing `ALGORITHM=…` to fail closed in CI.  
   App consequence: put `ALGORITHM` / `LOCK` in the migration SQL you review, not only in folklore.

4. **The operations matrix (web-dev subset)**  
   Walk the rows apps hit daily from `innodb-online-ddl-operations`: add/drop/rename column, add secondary index, change nullability, change type, extend VARCHAR, set default, add PK (expensive), drop PK (COPY). Show Instant column as “maybe” with asterisks.  
   App consequence: type changes and “NOT NULL without a plan” are still the expensive ones.

5. **Why “ADD nullable COLUMN” wasn’t always free**  
   Historical arc: pre-online / table-copy era → INPLACE rebuild still rewrote data for many column adds → Instant ADD COLUMN (metadata + row versions). MySQL 9.7: Instant is default when supported. Limits: can’t combine with non-Instant clauses; COMPRESSED / FULLTEXT / temp tables; max row versions (255) then rebuild; auto-increment column is *not* the cheap path.  
   App consequence: “we added a null column, should be fine” needs a version + matrix check, not vibes.

6. **Lock phases that still stall traffic**  
   Three phases from `innodb-online-ddl-performance`; exclusive MDL at commit; long/idle transactions hold shared MDL until commit (`metadata-locking`); pending exclusive MDL **blocks new DML/SELECT** — the pile-up. Processlist + `performance_schema.metadata_locks`.  
   App consequence: kill idle transactions / fix pool checkout leaks before a big ALTER window.

7. **Expand / contract for web deploys**  
   Pattern: expand schema (additive, Instant/INPLACE-friendly) → deploy dual-compatible app → backfill → switch reads/writes → contract (drop old column/index) in a later release. Map `strong_migrations`-style rules onto this. Multi-step > one clever `ALTER`.  
   App consequence: backward-compatible migrations unlock independent deploy/rollback of app and schema.

8. **Native Online DDL vs pt-osc / gh-ost (mental model)**  
   Native: server does in-place/instant work + online DML log; cutover is MDL. External OSC: shadow table + row copy (triggers or binlog) + atomic rename/cutover; useful when rebuild is huge, you need throttle/pause, or you want to avoid long native rebuild risk / replica effects. Honest tradeoffs (triggers write amp; gh-ost ops complexity; native is simpler when Instant/INPLACE+LOCK=NONE fits).  
   App consequence: reach for OSC when the matrix says “rebuilds table” on a huge hot table — not for every Instant ADD.

9. **Worked migration: `fulfillment_state` on `orders`**  
   Bad one-shot vs safe expand/contract sequence with explicit `ALGORITHM`/`LOCK`; optional index add as separate step; notes on defaults and NOT NULL cutover.  
   App consequence: a paste-ready playbook for the Friday PR.

10. **Tie-back checklist & preview**  
    Checklist below; forward link to replication lag from long DDL (19) and wait forensics (20); back-links to transactions/locks (08–12) for idle-in-transaction.

---

## Deep-dive beats

Mechanisms and pitfalls that keep this from being a cheat sheet:

- **Default algorithm preference** — Omitting `ALGORITHM` tries INSTANT, then INPLACE, then COPY (`alter-table`). CI should often **pin** `ALGORITHM=INSTANT` or `INPLACE` so a silent COPY cannot ship.
- **`LOCK=NONE` is a promise with teeth** — If the operation can’t honor it, the statement errors instead of locking harder (`innodb-online-ddl`). Use that as a safety rail in production migrations.
- **INSTANT only allows `LOCK=DEFAULT`** — Don’t cargo-cult `LOCK=NONE` onto Instant ops; it isn’t the knob (`alter-table` / `innodb-online-ddl`).
- **INPLACE can still rebuild** — “In place” ≠ “metadata only.” Adding a column with `ALGORITHM=INPLACE` rebuilds; Instant is the metadata path (`innodb-online-ddl-operations`).
- **COPY always blocks concurrent DML** — Reads may continue until the final exclusive cache/definition swap; writes stall (`alter-table`). Treat COPY as a maintenance-window algorithm on hot tables.
- **Row versions for Instant ADD/DROP** — Each Instant add/drop bumps `INNODB_TABLES.TOTAL_ROW_VERSIONS`; cap 255; then Instant rejected until rebuild/OPTIMIZE resets versions. Chronic “tiny Instant migrations” can paint you into a corner.
- **Combining clauses downgrades the whole statement** — Instant ADD + non-Instant action in one `ALTER` → not Instant (`innodb-online-ddl-single-multi` / operations notes). ORMs that emit multi-action ALTERs are a footgun.
- **Changing type usually COPY** — `INT`→`BIGINT`, charset width changes that need rewrite, etc. Extending `VARCHAR` size can be INPLACE without rebuild in allowed cases — teach the asymmetry.
- **Nullability flips rebuild** — Making NULL / NOT NULL is INPLACE-with-rebuild territory (asterisks for NOT NULL validation). Prefer expand: new nullable column → backfill → enforce in app → optional NOT NULL later under controlled load.
- **Defaults: metadata vs rewrite** — Setting/dropping a default can be Instant (metadata). Adding `NOT NULL DEFAULT …` semantics depend on version/history; call out that *older* MySQL rewrote rows for new defaults — hence `strong_migrations` paranoia — and verify against the 8+/9.x matrix rather than tribal memory.
- **Secondary index add: concurrent DML yes, Instant no** — Classic INPLACE non-rebuild; still waits for old transactions to finish so the index is consistent (`create-index` / operations). Large index builds need disk for sort files + online log headroom.
- **Online log overflow** — Heavy writes during long INPLACE DDL can hit `innodb_online_alter_log_max_size` and fail the DDL (`failure-conditions` / space-requirements). Hot checkout tables during Black Friday ALTER = bad idea even if LOCK=NONE.
- **Exclusive MDL wait queue is the outage shape** — Diagram/teach the three-session example from `innodb-online-ddl-performance`: txn holds shared MDL → ALTER waits for exclusive → *new* SELECTs queue behind ALTER. This is the interactive’s climax.
- **Metadata locks last until transaction end** — A `SELECT` inside `START TRANSACTION` (or ORM unit-of-work) pins schema (`metadata-locking`). Autocommit statement-only is much kinder to DDL.
- **FK cascades restrict `LOCK=NONE`** — Tables with `ON UPDATE/DELETE CASCADE` or `SET NULL` may not allow `LOCK=NONE` (`limitations`). Ties lightly to article 16.
- **Replica lag tease** — Long DDL on source must finish before running on replica; concurrent source DML applies after replica DDL (`limitations`) → article 19.
- **Rename / swap cutover** — External OSC tools cut over with rename patterns; native path rarely needs swap for Instant adds — but expand/contract sometimes uses new table + rename for hard type changes. Name-order MDL quirks from `metadata-locking` are an advanced footnote, not a centerpiece.
- **Progress vs stuck** — `PERFORMING` stages vs `Waiting for table metadata lock`: one is work, one is queueing. Teach readers not to “let it cook” when processlist says waiting on MDL held by sleeping trx.

---

## Interactive feature

**Working title:** `MigrationPlanner` (or `OnlineDdlLab`)  
**Path (planned):** `src/components/interactive/migration-planner/`  
**MDX pattern:** import at top of `/posts/mysql-online-ddl/`, render demo, then `## Things to Play With` bullets, then essay (same as RAID / neural-net / EXPLAIN explorer).

### UI concept

One composition, two coordinated panels — **not** a dashboard:

1. **Migration picker** — choose a realistic `ALTER` from a curated list (or small builder: operation + options). Show the resulting SQL with explicit `ALGORITHM` / `LOCK`.
2. **Outcome card** — algorithm used (Instant / In-place rebuild / In-place no rebuild / Copy), concurrent DML yes/no, rebuilds table yes/no, metadata-only yes/no, risk chips (MDL stall, disk, not Instant-combinable).
3. **Traffic vs MDL animator** — a horizontal timeline / lane diagram:
   - App workers issuing short autocommit reads/writes (moving dots).
   - One “idle in transaction” session holding shared metadata lock.
   - DDL session entering Phase 1 → 2 → 3; Phase 3 requests exclusive MDL and **queues**.
   - Subsequent app queries stack up behind the exclusive wait (visual pile-up).
   - Toggle: commit/rollback the idle txn → exclusive granted → brief freeze → traffic resumes.

### Preset ALTER catalog (fixtures)

| Preset | SQL shape | Teaching outcome |
| --- | --- | --- |
| Add nullable column | `ADD COLUMN col VARCHAR(32) NULL, ALGORITHM=INSTANT` | Instant, metadata-only, still needs brief exclusive MDL |
| Add NOT NULL + default (one-shot) | `ADD COLUMN col VARCHAR(32) NOT NULL DEFAULT 'x'` | Discuss version/matrix; contrast with expand/contract |
| Add secondary index | `ADD INDEX …, ALGORITHM=INPLACE, LOCK=NONE` | Concurrent DML; no Instant; watch online log / finish waits |
| Change column type | `MODIFY COLUMN id BIGINT …` | COPY (or non-online); scary on hot table → OSC callout |
| Extend VARCHAR | `MODIFY COLUMN title VARCHAR(200)` (same charset) | Often INPLACE metadata-ish; contrast with charset/type change |
| Drop column Instant | `DROP COLUMN legacy_flag, ALGORITHM=INSTANT` | Instant + row version bump; contract-phase warning |
| Mixed clauses trap | `ADD COLUMN c INT, MODIFY COLUMN d BIGINT` | Least-capable algorithm wins; fail-closed demo |
| Force COPY | Same Instant-capable op with `ALGORITHM=COPY` | Shows why pinning ALGORITHM matters |

Each preset exposes recommended `ALGORITHM` / `LOCK` and a one-line “deploy advice.”

### Animator controls

| Control | Effect |
| --- | --- |
| Idle transaction toggle | On: shared MDL held; DDL sticks in wait; app traffic queues. Off/commit: cutover completes. |
| ALTER preset selector | Changes whether Phase 2 is “instant blip,” “long rebuild,” or “copy blocked writes.” |
| Traffic rate slider | More app queries → taller wait queue during exclusive wait (feels like outage). |
| `LOCK=NONE` vs default | For presets that support it; show fail-closed error toast if preset can’t honor NONE. |
| “strong_migrations mode” | Highlights why the one-shot NOT NULL add is flagged; suggests expand/contract steps as a checklist overlay. |

### User actions → insight

1. Pick **Add nullable column / INSTANT** with idle txn **off** → Phase 3 is a tiny blip; traffic barely hiccups.  
2. Turn idle txn **on**, re-run → same Instant ALTER, but app lanes freeze behind `Waiting for table metadata lock`.  
3. Switch to **Change column type / COPY** → writes blocked for a long Phase 2 even without idle txn; insight: algorithm dominates duration; MDL still finishes it.  
4. Switch to **Mixed clauses** → planner refuses Instant; shows downgrade path.  
5. Enable **strong_migrations mode** on the dangerous one-shot → expands into a 3-step expand/contract plan.

Insight produced: **Instant/INPLACE choose how much work you do; metadata locks decide whether the site hangs while you finish.** Readers feel why transaction hygiene and migration shape beat “MySQL supports online DDL.”

### Interaction / motion notes (site pattern)

- Intentional motion: dots flowing in app lanes; DDL phase bar filling; exclusive lock pulse; queue stacking/unstacking when idle txn commits.
- No card grid chrome; one scene: picker + outcome + lanes.
- Keyboard: cycle presets; space toggles idle transaction.
- No live MySQL — all outcomes from a local rules table derived from the operations matrix (label “illustrative MySQL 9.7 InnoDB rules; always verify on your version”).

### Data shape (implementation sketch)

```ts
type DdlAlgorithm = "INSTANT" | "INPLACE" | "COPY";
type DdlLock = "DEFAULT" | "NONE" | "SHARED" | "EXCLUSIVE";

type MigrationPreset = {
  id: string;
  title: string;
  scenario: string; // web-app story
  sql: string;
  requestedAlgorithm?: DdlAlgorithm;
  requestedLock?: DdlLock;
  result: {
    algorithm: DdlAlgorithm;
    lock: DdlLock;
    rebuildsTable: boolean;
    permitsConcurrentDml: boolean;
    metadataOnly: boolean;
    notes: string[];
    risk: "low" | "medium" | "high";
  };
  expandContract?: string[]; // optional step list for strong_migrations mode
};

type AnimPhase = "idle" | "init" | "execute" | "wait_mdl" | "commit" | "done";
```

Rules engine: pure functions from operation kind → result; animator reads `result` + idle-txn flag to pick phase durations and whether app lane queues.

---

## Example queries / schemas

Use the marketplace `orders` table through the article + interactive fixtures. Keep types aligned with article 01.

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  status ENUM('open', 'paid', 'canceled') NOT NULL,
  total_cents INT UNSIGNED NOT NULL,
  currency CHAR(3) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_orders_shop_created (shop_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 1. Dangerous one-shot (anti-pattern)

```sql
-- App release in the same deploy requires fulfillment_state NOT NULL.
ALTER TABLE orders
  ADD COLUMN fulfillment_state VARCHAR(32) NOT NULL DEFAULT 'unfulfilled',
  ADD INDEX idx_orders_fulfillment (shop_id, fulfillment_state);
```

Teaching: mixed concerns (column + index); NOT NULL cutover in one step; no explicit ALGORITHM; on large tables the index build dominates; any idle txn → site-wide MDL queue.

### 2. Fail-closed Instant expand (step A)

```sql
ALTER TABLE orders
  ADD COLUMN fulfillment_state VARCHAR(32) NULL,
  ALGORITHM=INSTANT;
```

If this errors (unsupported combo / row version limit / COMPRESSED / etc.), **stop** — don’t let the client retry into a surprise COPY.

### 3. Dual-compatible app window + backfill

```sql
-- App vN: read coalesce(fulfillment_state, 'unfulfilled'); write both old mental model and new column.
UPDATE orders
SET fulfillment_state = 'unfulfilled'
WHERE fulfillment_state IS NULL
LIMIT 1000;  -- chunked job; repeat
```

Teaching: batch backfill beats one table-rewriting DDL; keep transactions short so DDL/OPS can still land.

### 4. Enforce NOT NULL only after backfill (step B — may rebuild)

```sql
ALTER TABLE orders
  MODIFY COLUMN fulfillment_state VARCHAR(32) NOT NULL,
  ALGORITHM=INPLACE,
  LOCK=NONE;
```

Teaching: nullability change is not Instant; pin LOCK=NONE to refuse unsafe locking; run when traffic/idle-trx debt is low.

### 5. Index as its own migration (step C)

```sql
ALTER TABLE orders
  ADD INDEX idx_orders_fulfillment (shop_id, fulfillment_state),
  ALGORITHM=INPLACE,
  LOCK=NONE;
```

Or equivalently `CREATE INDEX ... ALGORITHM=INPLACE LOCK=NONE`. Teaching: separate deploy from column add; monitor disk / `innodb_online_alter_log_max_size` risk under write load.

### 6. Contract later (step D)

```sql
-- After no code path reads legacy_notes:
ALTER TABLE orders
  DROP COLUMN legacy_notes,
  ALGORITHM=INSTANT;
```

Teaching: contract is its own release; Instant DROP still bumps row versions; brief MDL still applies.

### 7. Reproduce the MDL pile-up (local lab)

```sql
-- Session 1
START TRANSACTION;
SELECT id FROM orders LIMIT 1;
-- leave open

-- Session 2
ALTER TABLE orders
  ADD COLUMN x INT NULL,
  ALGORITHM=INSTANT;
-- shows Waiting for table metadata lock

-- Session 3
SELECT id FROM orders WHERE shop_id = 42 LIMIT 10;
-- also waits behind Session 2's exclusive MDL request

-- Session 1
COMMIT;  -- Session 2 finishes; Session 3 proceeds
```

Tie to `SHOW FULL PROCESSLIST` and `performance_schema.metadata_locks` (preview article 20).

### 8. When native rebuild is the wrong tool (narrative SQL)

```sql
-- Hot 500GB table, must change type — prefer OSC / expand new column + dual-write,
-- not a synchronous COPY on primary during peak.
ALTER TABLE orders
  MODIFY COLUMN total_cents BIGINT UNSIGNED NOT NULL,
  ALGORITHM=COPY;  -- honesty: this is a maintenance operation
```

Contrast with: add `total_cents_bigint`, backfill, switch app, drop old — or gh-ost/pt-osc cutover for true rewrite.

---

## Tie-back checklist

Use as the article’s closing “deploy-ready migrations” list.

| If you see / need… | Remember from… | Do this |
| --- | --- | --- |
| Need a new attribute for a feature flag / state machine | **01 Schema & types** | Prefer additive nullable (or Instant-friendly) columns; pick types you won’t need to `MODIFY` later |
| Migration rewrites the clustered index | **02 Primary keys** | Avoid late `ADD PRIMARY KEY` / PK swaps on big tables; design PK early |
| “Just add an index in the migrate” on huge table | **03 Indexes** + this article | Separate release; `ALGORITHM=INPLACE, LOCK=NONE`; watch disk & write rate |
| Deploy also ships queries using the new column | **04–07 app SQL / writes** | Expand/contract: old app must run on new schema; new app must run on old until cutover |
| `Waiting for table metadata lock` during ALTER | **08–11 transactions / MVCC** + this article | Find idle/long txns; don’t hold transactions across requests; schedule DDL after draining leakers |
| ALTER waits forever under concurrency | **12 Locks** + `metadata-locking` | MDL ≠ row locks; exclusive DDL request blocks newcomers — use processlist / `metadata_locks` |
| Instant ADD suddenly rejected after many tiny migrations | **This article** | Check `TOTAL_ROW_VERSIONS`; rebuild/OPTIMIZE to reset; stop mixing random Instant churn |
| Migration fine on primary, replica lags / backup delayed | **19 Replication** (preview) | Long DDL + apply order; plan OSC or off-peak; don’t ignore replicas |
| Need to prove who blocks the ALTER in prod | **20 Perf Schema** (preview) | `metadata_locks` / wait events — forensics capstone |

**Definition of upgrade for Part B readers:** can take an ORM migration PR, label its algorithm class, spot MDL risk, and rewrite it into an expand/contract sequence with fail-closed `ALGORITHM`/`LOCK` clauses — knowing when to escalate to OSC.

**Forward links:** replication & deferred apply of DDL (19); Performance Schema metadata lock forensics (20).  
**Back links:** schema types (01); secondary indexes (03); transactions (08); MVCC / long txn (11); row locks vs MDL distinction (12); FK `LOCK=NONE` limit (16).

---

## Open questions / author notes

1. **Version framing:** Series corpus is MySQL 9.7. Instant ADD COLUMN landed in 8.0; capabilities expanded across 8.0.x (drop, reorder rules, etc.). Call out “verify on *your* 8.0 minor / managed MySQL (RDS/Aurora/Cloud SQL may lag or differ).” Aurora’s own online DDL notes may need a short “managed forks” callout without derailing.
2. **No `innodb-instant-ddl` node:** Don’t invent a citation. Use `alter-table` + `innodb-online-ddl-operations` as the Instant sources.
3. **Defaults / NOT NULL history:** `strong_migrations` advice evolved with MySQL versions (e.g. instant/defaults behavior). Be careful not to over-teach outdated “DEFAULT always rewrites the table” as current 9.7 truth — present as historical reason for the culture, then show today’s matrix.
4. **gh-ost / pt-osc depth:** Mental model + when to reach for them — not a setup tutorial. No trigger SQL dump; link out.
5. **Interactive rules fidelity:** Encode the *web-dev subset* of the matrix, not every FULLTEXT/spatial asterisk. Label simplifications; link essay for FULLTEXT first-index rebuild, etc.
6. **Don’t steal article 19:** Replica lag gets one section beat + checklist row, not a binlog deep dive.
7. **Don’t steal article 20:** `metadata_locks` / processlist are enough to diagnose the pile-up; full waits/digests stay in 20.
8. **ORM brand balance:** Use `strong_migrations` as the clearest named example; mention Prisma Migrate / Django `RunSQL` / Laravel as producers of multi-clause ALTERs without bashing.
9. **Shopify/GitHub:** Use as *culture* hooks (large-table migration seriousness), not unverifiable internal claims. Prefer “migration culture at large product companies” if specifics can’t be cited from public engineering posts — author may swap in linked public eng blog posts while drafting.
10. **Safety:** Never recommend `LOCK=EXCLUSIVE` on hot paths except deliberate maintenance. Emphasize fail-closed `LOCK=NONE` / `ALGORITHM=INSTANT|INPLACE`.
11. **Legal:** Original teaching prose only; link refman nodes; local `sources/mysql-refman-9.7/` stays gitignored (`sources/README.md`).
12. **Series glue:** Register slug `mysql-online-ddl` in hub `seriesList.postSlugs` when publishing; place after JSON (17), before replication (19).
13. **Tone check:** Empowering ops literacy for app engineers — “you can read the matrix and design the deploy” — not fearmongering that every ALTER needs gh-ost.

---

## Draft success metrics (for later editing)

- A reader can classify 5 common Rails/Prisma migrations as Instant / Inplace / Copy in under a minute.
- The interactive makes the idle-transaction → site-wide wait queue *visually obvious* even for an Instant ADD.
- Expand/contract sequence for `fulfillment_state` is copy-pasteable into a real PR checklist.
- Zero sections that require knowing InnoDB redo internals; MDL + algorithm matrix are enough.
- Native vs OSC decision fits in one clear heuristic paragraph.
