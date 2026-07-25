# Article 07 — Writes: INSERT, UPDATE, DELETE & Upserts

| Field | Value |
| --- | --- |
| **Number** | 07 |
| **Title** | Writes: INSERT, UPDATE, DELETE & Upserts |
| **Slug** | `mysql-writes` |
| **Tier** | Foundations (Part A) |
| **Series position** | After JOINs (06); before Transactions (08) |
| **Hub** | `/projects/mysql/` |
| **Post path** | `/posts/mysql-writes/` |
| **Interactive** | Yes — top-of-MDX client demo (see below) |

---

## Intent

Teach web-app programmers how MySQL *writes* actually behave — not as ORM method names, but as statements with precise semantics for duplicates, row counts, index maintenance, and bulk throughput.

By the end, a reader should be able to:

1. Choose the right write shape for a request path: plain `INSERT`, `INSERT IGNORE`, multi-row `INSERT`, `UPDATE`/`DELETE` with a selective `WHERE`, `INSERT … ON DUPLICATE KEY UPDATE`, or (rarely) `REPLACE`.
2. Design idempotent write APIs (webhooks, retries, “save profile”) that do not create duplicate rows or silently wipe columns.
3. Interpret **affected rows** vs **matched/found rows**, including the 0/1/2 dance of upserts and how drivers/`CLIENT_FOUND_ROWS` change the story.
4. Reason about **write amplification**: every secondary index is another structure InnoDB must maintain on insert/update/delete — and why over-indexing from article 03 hurts write paths.
5. Batch writes sanely (multi-`VALUES`, PK order, when `LOAD DATA` is the next gear) without pretending every endpoint needs a bulk loader.

**Out of scope (hand off):** full transaction/`BEGIN`/`COMMIT`/`ROLLBACK` pedagogy, isolation anomalies, and lock/gap/deadlock deep dives → articles **08**, **09**, **12**. Mention autocommit and “one statement ≈ one transaction” only as a light bridge so bulk tips and idempotency make sense.

**Teaching voice:** spoon-fed, request/response framed, original prose. Cite Oracle docs; never paste refman text into the published MDX.

---

## Real-world hook

**Scene:** a Stripe (or Shopify) webhook handler for `checkout.session.completed` / `orders/create`.

The provider retries delivery. Your handler must:

- create an `orders` row if this `provider_event_id` (or `stripe_session_id`) is new;
- update status/totals if the same event arrives again (or a later event races);
- never create two orders for one checkout;
- return 200 quickly even when the payload is a no-op “already processed.”

ORMs often hide three different SQL shapes behind one “upsert” helper:

| App intent | Dangerous default | Safer MySQL shape |
| --- | --- | --- |
| “Create if missing” | catch unique error → retry | `INSERT … ON DUPLICATE KEY UPDATE` on a **single** natural unique key, or `INSERT IGNORE` when ignore-is-correct |
| “Overwrite whole row” | `REPLACE` | usually **wrong** (delete+insert → new auto-inc, FK/trigger side effects) |
| “Patch fields” | blind `UPDATE` then insert | upsert with explicit column assignments / row alias |

Second hook (bulk): an admin CSV import or nightly sync that fires thousands of single-row `INSERT`s from a Node/Rails loop — each statement pays connect/parse/index overhead. Multi-row `INSERT` (and, for ops jobs, `LOAD DATA`) is the fix; the interactive demo makes the index-maintenance cost visceral.

Tie both hooks to production pain readers already feel: duplicate webhook orders, “affectedRows === 0 so the update failed?” false alarms, and write latency cliffs after adding “just one more index.”

---

## Primary documentation sources

Local corpus: `sources/mysql-refman-9.7/nodes/<id>.md` (gitignored). Public cite form: `https://dev.mysql.com/doc/refman/9.7/en/<id>.html`.

### Core DML (must-read while drafting)

| Node id | URL | Why it matters for this article |
| --- | --- | --- |
| `insert` | https://dev.mysql.com/doc/refman/9.7/en/insert.html | Forms (`VALUES`, `SET`, multi-row, `SELECT`); `IGNORE`; multi-row info string `Records/Duplicates/Warnings`; privilege notes for upsert. |
| `insert-on-duplicate` | https://dev.mysql.com/doc/refman/9.7/en/insert-on-duplicate.html | Upsert semantics; affected-rows 1 / 2 / 0; multiple unique indexes trap; row/column aliases (`AS new`); deprecation of `VALUES(col)` in UPDATE clause; auto-inc side note. |
| `replace` | https://dev.mysql.com/doc/refman/9.7/en/replace.html | Delete-then-insert (not update); needs PK/UNIQUE; privileges; affected-rows ≥2 when replacement happened; contrast with upsert. |
| `update` | https://dev.mysql.com/doc/refman/9.7/en/update.html | `WHERE` / `ORDER BY` / `LIMIT`; “same value → not updated”; returns **changed** rows by default; `LIMIT` is rows-**matched**; left-to-right assignment quirk. |
| `delete` | https://dev.mysql.com/doc/refman/9.7/en/delete.html | Selective delete; `LIMIT` chunking tip; `TRUNCATE` vs `DELETE` (faster empty, not transaction-safe the same way — tease 08 lightly). |
| `information-functions` | https://dev.mysql.com/doc/refman/9.7/en/information-functions.html | `ROW_COUNT()`; `CLIENT_FOUND_ROWS` flips UPDATE (and upsert “no-op”) semantics; REPLACE / upsert row-count rules collected in one place. |

### Bulk & optimization (support)

| Node id | URL | Use |
| --- | --- | --- |
| `insert-optimization` | https://dev.mysql.com/doc/refman/9.7/en/insert-optimization.html | Cost model: connecting/sending/parsing vs row insert vs **indexes**; multi-`VALUES`; `LOAD DATA` ~20× claim (use carefully, as orientation). |
| `update-optimization` | https://dev.mysql.com/doc/refman/9.7/en/update-optimization.html | Update ≈ select + write; indexes that did not change are not rewritten. |
| `delete-optimization` | https://dev.mysql.com/doc/refman/9.7/en/delete-optimization.html | Delete cost scales with indexes (esp. historical MyISAM framing — translate to InnoDB secondary maintenance). |
| `load-data` | https://dev.mysql.com/doc/refman/9.7/en/load-data.html | **Light touch** — ops/import gear, not everyday API path; `REPLACE`/`IGNORE` modifiers; point to security/`LOCAL` gotchas without a full treatise. |
| `optimizing-innodb-bulk-data-loading` | https://dev.mysql.com/doc/refman/9.7/en/optimizing-innodb-bulk-data-loading.html | Multi-row inserts; insert in PK order; autocommit off for imports (bridge to 08); uniqueness/FK check toggles for **trusted** bulk loads only. |

### Index maintenance / write amplification (InnoDB)

| Node id | URL | Use |
| --- | --- | --- |
| `innodb-index-types` | https://dev.mysql.com/doc/refman/9.7/en/innodb-index-types.html | Clustered vs secondary; secondary entries carry PK → every write may touch many trees; long PK widens secondaries. |
| `innodb-indexes` | https://dev.mysql.com/doc/refman/9.7/en/innodb-indexes.html | Parent section for index topics. |
| `innodb-change-buffer` | https://dev.mysql.com/doc/refman/9.7/en/innodb-change-buffer.html | Secondary index changes may be buffered when pages are cold; merges later; default `innodb_change_buffering=none` in 9.7 — teach concept + “still pay maintenance, buffering is an I/O strategy.” |
| `faqs-innodb-change-buffer` | https://dev.mysql.com/doc/refman/9.7/en/faqs-innodb-change-buffer.html | Optional FAQ skims while drafting the visualizer copy. |

### Optional / light cross-links (do not steal later articles)

| Node id | URL | Boundary |
| --- | --- | --- |
| `insert-select` | https://dev.mysql.com/doc/refman/9.7/en/insert-select.html | Mention for ETL/`INSERT … SELECT`; not the hero. |
| `commit` / `innodb-autocommit-commit-rollback` | (article 08 primary) | One short “each statement autocommits unless you open a transaction” note. |
| `innodb-auto-increment-handling` | https://dev.mysql.com/doc/refman/9.7/en/innodb-auto-increment-handling.html | Upsert/REPLACE auto-inc surprises; bulk `innodb_autoinc_lock_mode` tip only if space. |
| `truncate-table` | https://dev.mysql.com/doc/refman/9.7/en/truncate-table.html | Contrast with `DELETE` for “empty table” ops jobs. |
| Series articles 02–03, 08, 16 | internal | PK/clustered, secondary indexes, transactions, FK cascades on delete. |

**License reminder:** personal use of the local Info split is fine; published posts must be original teaching, linking out to Oracle HTML — see `sources/README.md` and the Preface legal notices.

---

## Article structure

Suggested MDX spine (H2s). Interactive component mounts **above** the first H2 (site pattern: RAID / neural-net / puzzle).

1. **Hook — The webhook that must not double-charge**  
   Retries, unique natural keys, “200 OK means idempotent.”

2. **Mental model — A write is index work**  
   Clustered row + every secondary (callback to 02/03). One sentence on autocommit → 08.

3. **INSERT — Creating rows on purpose**  
   Column lists, defaults, multi-row `VALUES` / `VALUES ROW()`, `INSERT IGNORE` vs error-and-retry, `LAST_INSERT_ID()` caveats for multi-row.

4. **UPDATE & DELETE — Change and remove with a WHERE**  
   Selective predicates; LIMIT as safety valve; “set to same value doesn’t count as changed”; soft-delete product note vs hard `DELETE`.

5. **Upserts — `ON DUPLICATE KEY UPDATE` vs `REPLACE`**  
   Decision table; multiple unique indexes; row aliases (`AS new`); when REPLACE’s delete+insert breaks FKs/triggers/auto-inc.

6. **Affected vs matched — reading the driver return value**  
   UPDATE changed vs found; upsert 0/1/2; `CLIENT_FOUND_ROWS` / Prisma-`found` style surprises; never treat “0” as always-failure for idempotent PATCH.

7. **Bulk patterns — batching without a data warehouse**  
   Multi-row insert sizing; PK order; when to graduate to `LOAD DATA`; warn about disabling unique/FK checks (import-only, trusted data).

8. **Write amplification — indexes you pay for on every POST**  
   Tie interactive back; “indexes are a read optimization with a write tax.”

9. **App patterns checklist**  
   Webhook idempotency key, inventory-ish counter upsert, batch create endpoint, ORM mapping notes (Rails `upsert`, Prisma `upsert`, Django `update_or_create` — behavior differs; verify SQL).

10. **What’s next**  
    Article 08: wrap multi-statement checkout in a real transaction; 09: what concurrent readers see.

---

## Deep-dive beats

Teaching beats to hit in the body (each should earn a concrete SQL example or diagram callout).

### A. INSERT shapes for APIs

- Prefer explicit column lists in app SQL / migrations-generated SQL — schema drift and `SELECT *` mindsets cause silent mis-ordered inserts.
- Multi-row insert is the default bulk tool for app servers; one round-trip, one parse, many rows (`insert`, `insert-optimization`).
- `INSERT IGNORE`: duplicate unique → row discarded, warning, statement continues. Good for “fire and forget if exists”; bad if you needed to update fields.
- Strict SQL mode vs non-strict truncation/clipping — point back to article 01; do not re-teach types.

### B. UPDATE / DELETE for request handlers

- Always show `WHERE` on the PK or a unique key in examples; bare `UPDATE`/`DELETE` is a production incident waiting.
- MySQL UPDATE returns **rows actually changed** by default; setting a column to its current value does not increment affected (`update`). Apps that PATCH with full resource bodies often see `0` on no-op saves — that is success for idempotency.
- `LIMIT` on UPDATE/DELETE is a **matched-rows** cap (`update`) — useful for batched deletes (“delete 1000 expired sessions”), not a substitute for a correct key.
- Left-to-right `SET a = a+1, b = a` quirk — one short “don’t be clever” warning.
- Soft deletes (`deleted_at`) as product pattern; hard delete still needs index-aware `WHERE` (and later FK cascades in 16).

### C. Upsert decision core (the article’s center of gravity)

| Goal | Prefer | Avoid / caution |
| --- | --- | --- |
| Insert or update **in place** | `INSERT … ON DUPLICATE KEY UPDATE` | Multiple UNIQUE indexes (only one row updated; ambiguous which key “won”) |
| Insert or **skip** | `INSERT IGNORE` or upsert with no-op assignments | Treating ignore as “updated” |
| Insert or **replace entire row** | Explicit `DELETE`+`INSERT` in a transaction (08) or careful upsert listing all columns | `REPLACE` by default — it is delete+insert semantics (`replace`) |
| Preserve auto-inc / FKs / triggers on conflict | Upsert update path | `REPLACE` (old row deleted; triggers/FKs fire; new row may get new auto-inc behavior) |

Specific upsert facts to teach from `insert-on-duplicate`:

- Affected-rows **per row**: **1** insert, **2** update, **0** “updated” to same values (or **1** with `CLIENT_FOUND_ROWS`).
- Prefer modern row alias: `INSERT … VALUES (…) AS new ON DUPLICATE KEY UPDATE col = new.col` — `VALUES(col)` in the UPDATE clause is deprecated.
- Upsert still bumps auto-increment on the INSERT attempt path even when the row ends up updated (InnoDB) — surprising for “idempotent” mental models; call out.
- `INSERT … SELECT … ON DUPLICATE` is unsafe for statement-based replication — mention lightly; apps usually use VALUES form.

`REPLACE` facts from `replace`:

- Algorithm: try insert → on duplicate key, delete conflicting row(s) → insert again.
- Affected-rows **1** = pure insert; **≥2** = something was deleted then inserted (often 2 for single-row replace).
- Requires PRIMARY/UNIQUE or it is just INSERT.
- Needs INSERT **and** DELETE privileges.

### D. Affected vs matched (driver literacy)

Collect in one section with a small table:

| Statement | Default “affected” meaning |
| --- | --- |
| `INSERT` | Rows inserted (multi-row: see Records/Duplicates) |
| `UPDATE` | Rows **changed**, not merely matched |
| `DELETE` | Rows deleted |
| `REPLACE` | Deleted + inserted counts combined |
| `INSERT … ON DUPLICATE KEY UPDATE` | 1 / 2 / 0 per row as above |

`CLIENT_FOUND_ROWS` (C API / many connectors): UPDATE reports matched; upsert no-op becomes 1 not 0 (`information-functions`). Note that ORMs differ (mysql2, Rails mysql2, Prisma, JDBC flags) — tell readers to verify their stack once, not memorize every ORM.

Idempotent API rule of thumb: **HTTP success** should key off “desired state achieved,” not `affectedRows > 0`.

### E. Bulk insert patterns

From `insert-optimization` + `optimizing-innodb-bulk-data-loading`:

- Batch size tradeoff: larger multi-`VALUES` → fewer round-trips, bigger packets / redo; practical app batches often hundreds–low thousands depending on row width and `max_allowed_packet`.
- Insert in **PRIMARY KEY order** when bulk-loading — clustered index friendly, especially when table > buffer pool.
- Explicit only non-default columns to reduce parse work (minor but real).
- `LOAD DATA`: ~order-of-magnitude faster for file→table; security/`LOCAL`, privilege, and ops concerns — “use for imports/migrations, not for every REST POST.”
- Autocommit-per-statement makes naive loops flush redo often — one-sentence bridge to 08 (`SET autocommit=0` … `COMMIT` for imports).
- `unique_checks=0` / `foreign_key_checks=0`: **only** for trusted bulk load sessions where you can guarantee integrity; never as an app default.

### F. Write amplification & change buffer

- Every INSERT maintains clustered index + each secondary (`innodb-index-types`, insert cost “× number of indexes”).
- UPDATE cost depends on **which** indexed columns change (`update-optimization`).
- DELETE maintains indexes too; chunk large deletes with `WHERE` + `LIMIT` loops (`delete`).
- Change buffer (`innodb-change-buffer`): secondary index mods for non-resident pages may be deferred; merges later can cause I/O storms after bulk loads. In 9.7 default buffering is `none` — still teach the *maintenance* cost; buffering is an accelerator/mitigation, not “free indexes.”
- Callback to article 03: unused indexes are pure write tax.

### G. Light transaction touch

- Default: each statement commits on its own (autocommit).
- Multi-row `INSERT` is still **one** statement / one atomic unit — good for “all these rows or none” within that statement.
- Multi-step “insert order + insert lines + charge” needs an explicit transaction → **08**.
- Do not explain isolation levels here beyond “concurrent writers exist; locks are real; details later.”

---

## Interactive feature

**Primary recommendation: Upsert Decision Playground + mini write-cost meter** (one component, two linked panels).

Site pattern: `"use client"` demo under `src/components/interactive/`, imported at top of MDX (see `raid-visualizer`, `neural-net`, `puzzle-solver`).

### Panel A — Upsert decision playground

**Controls:**

- Scenario picker: *Webhook idempotency*, *User profile save*, *Inventory counter*, *Full row resync*.
- Conflict strategy: `INSERT`, `INSERT IGNORE`, `ON DUPLICATE KEY UPDATE`, `REPLACE`.
- Schema toggles: single UNIQUE (`provider_event_id`) vs **two** UNIQUEs (show the footgun).
- Incoming payload vs existing row (editable key fields + column values).

**Output:**

- Generated SQL (with `AS new` alias form for upsert).
- Plain-language “what MySQL will do” (insert / update in place / delete+insert / skip).
- Predicted **affected-rows** for the single-row case (0 / 1 / 2), plus a note when `CLIENT_FOUND_ROWS` would change it.
- Warning chips: *multiple unique indexes*, *REPLACE fires DELETE side effects*, *auto-inc may advance*, *no-op update → 0*.

### Panel B — Batch write + index-maintenance cost visualizer

**Controls:**

- Row count slider (1 → 5_000).
- Statement mode: *N single-row INSERTs* vs *1 multi-row INSERT* (batches of K).
- Secondary index count (0–8), optional “wide PK” toggle (secondary payload cost).
- Optional: fraction of updates that touch an indexed column.

**Visualization:**

- Stacked cost bars inspired by `insert-optimization` proportions: round-trips/parse vs row writes vs **per-index maintenance** (illustrative units, not a benchmark claim).
- Tiny “index trees touched” glyph: 1 clustered + N secondaries lighting up per row.
- Caption: change buffer may defer secondary I/O when cold — demo still counts logical maintenance work.

**Implementation notes:**

- Pure client math + animation; no live MySQL.
- Keep first viewport of the **post** calm: demo is interactive tool below title/lede, not a dashboard of unrelated stats (align with site interactive posts).
- Prefer 2–3 intentional motions: strategy highlight, cost bar morph, index glyphs pulse on “run.”
- Component name idea: `MysqlWritePlayground` → `src/components/interactive/mysql-write-playground/`.

**Fallback if scope tight:** ship Panel A only; cover bulk cost with a static diagram + the cost-factor list from `insert-optimization`.

---

## Example queries/schemas

Teaching schema (reuse across sections):

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider_event_id VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  total_cents INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_provider_event (provider_event_id),
  KEY idx_orders_user_created (user_id, created_at)
) ENGINE=InnoDB;
```

### Idempotent webhook upsert (preferred)

```sql
INSERT INTO orders (provider_event_id, user_id, status, total_cents)
VALUES ('evt_123', 42, 'paid', 2599) AS new
ON DUPLICATE KEY UPDATE
  status = new.status,
  total_cents = new.total_cents;
-- affected: 1 (insert), 2 (changed), 0 (same values)
```

### INSERT IGNORE (create-once, no update)

```sql
INSERT IGNORE INTO orders (provider_event_id, user_id, status, total_cents)
VALUES ('evt_123', 42, 'paid', 2599);
```

### REPLACE (show then discourage for this schema)

```sql
REPLACE INTO orders (provider_event_id, user_id, status, total_cents)
VALUES ('evt_123', 42, 'paid', 2599);
-- delete+insert semantics; id may change; secondary + FK fallout
```

### Multi-row batch create

```sql
INSERT INTO orders (provider_event_id, user_id, status, total_cents)
VALUES
  ('evt_a', 1, 'paid', 1000),
  ('evt_b', 1, 'paid', 2000),
  ('evt_c', 2, 'paid', 1500);
```

### No-op UPDATE (idempotent PATCH)

```sql
UPDATE orders
SET status = 'paid', total_cents = 2599
WHERE id = 10;
-- If already paid/2599 → 0 rows affected (success for “make it so”)
```

### Chunked DELETE

```sql
DELETE FROM sessions
WHERE expires_at < NOW()
ORDER BY expires_at
LIMIT 1000;
-- repeat until ROW_COUNT() < 1000
```

### Multiple UNIQUE footgun (callout)

```sql
-- Avoid upserting when both email and external_id are UNIQUE
-- unless you truly understand which row will be updated (LIMIT 1 semantics).
```

### LOAD DATA (ops sidebar only)

```sql
LOAD DATA LOCAL INFILE '/tmp/orders.csv'
INTO TABLE orders
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\n'
(provider_event_id, user_id, status, total_cents);
```

---

## Tie-back checklist

Reader self-check before leaving the post:

- [ ] I can name a **natural idempotency key** for my write-heavy endpoints (and enforce it with UNIQUE).
- [ ] I know when to use **upsert** vs **IGNORE** vs plain INSERT+conflict handling.
- [ ] I treat `REPLACE` as delete+insert and can explain one reason it is risky in an FK/auto-inc world.
- [ ] I interpret `affectedRows === 0` on UPDATE/upsert as **possible success** for no-op idempotent writes.
- [ ] I know whether my driver enables **found rows** vs **changed rows**.
- [ ] I batch inserts with multi-`VALUES` instead of a per-row loop for bulk paths.
- [ ] I can explain why each secondary index adds write work (and I will re-audit indexes from article 03).
- [ ] I know multi-statement business flows need **transactions** next (article 08), not more clever single statements.

**Series glue:**

- ← 06 JOINs: reads that fan out; this article is the write half of CRUD.
- → 08 Transactions: atomic multi-step writes, rollback, autocommit discipline.
- → 09 Isolation: what concurrent SELECTs see during/after writes.
- → 12 Locks: why concurrent upserts deadlock.
- → 16 FKs: `ON DELETE` / replace side effects.
- → 03/15 Indexes: write tax vs covering-index read wins.

---

## Open questions / author notes

1. **Interactive scope:** Ship combined playground+cost meter, or A-only for v1? Recommendation: A+B if one afternoon of polish; otherwise A first with a static cost diagram.
2. **ORM section depth:** Keep to a short “verify the SQL your ORM emits” box with 2–3 framework links, or a dedicated subsection with screenshots of Prisma/Rails upsert SQL? Prefer short box — ORM APIs churn; MySQL semantics do not.
3. **`LOAD DATA` security rabbit hole:** `LOCAL`, privilege, and path rules deserve restraint. Link `load-data` + security child pages; do not make this a sysadmin article.
4. **Change buffer default in 9.7:** Confirm wording against `innodb_change_buffering` default (`none` in the local node). Teach logical amplification regardless; avoid implying buffering always softens bulk load pain on stock 9.7.
5. **Auto-increment on upsert:** Worth a callout box with a tiny experiment; do not derail into full `innodb-auto-increment-handling` (bulk lock modes → brief pointer only).
6. **Triggers / binlog / replication unsafety:** Mention only where it changes app choices (REPLACE side effects; `INSERT…SELECT…ON DUPLICATE` SBR unsafety). Full replication story is article 19.
7. **Soft delete vs hard delete:** Product advice belongs here lightly; cascading FK behavior waits for 16.
8. **Tone/length target:** Foundations post — aim ~2.5–4k words + interactive; enough to be the “writes” reference, not a DML encyclopedia (`INSERT…SELECT`, multi-table UPDATE/DELETE stay secondary).
9. **Example domain:** Stick with `orders` + webhook throughout for continuity; optional second sketch (`users.email` profile save) in the playground scenarios.
10. **No Oracle paste:** Draft from these notes; quote only short SQL forms; link node URLs in a Sources footnote or inline “MySQL 9.7 — INSERT” style citations.

---

## Drafting checklist (when writing the post)

- [ ] Register slug in series list / hub when publishing.
- [ ] Build interactive under `src/components/interactive/…` and import in MDX.
- [ ] Cite public refman URLs for insert, update, delete, replace, insert-on-duplicate, insert-optimization, innodb-index-types, innodb-change-buffer, information-functions; light link to load-data.
- [ ] Explicit handoff sentences to 08 (transactions) and back-refs to 02/03 (PK + secondary indexes).
- [ ] Include the affected-rows table and upsert vs REPLACE decision table in the published post.
- [ ] Run through webhook + no-op PATCH stories end-to-end in copy before merge.
