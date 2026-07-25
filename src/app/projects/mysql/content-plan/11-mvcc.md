# 11 — MVCC, Undo Logs & Long Transactions

| Field | Value |
| --- | --- |
| **Number** | 11 |
| **Title** | MVCC, Undo Logs & Long Transactions |
| **Slug** | `mysql-mvcc` |
| **Tier** | Deep dive (Part B) |
| **Hub** | `/projects/mysql/` |
| **Post** | `/posts/mysql-mvcc/` |
| **Depends on** | 08 — Transactions (`mysql-transactions`); 09 — Isolation (`mysql-isolation`) |
| **Feeds into** | 12 — Locks (`mysql-locks`); 14 — Durability (`mysql-durability`); 20 — Perf Schema (`mysql-perf-schema`) |
| **Status** | Plan only |

---

## Authoring contract

- **Status:** Plan only — stub wired; article not written yet.
- **Voice:** First person, casual/jokey, flowing prose. Run humanizer pass (`~/.cursor/skills/humanizer`) before publish.
- **No formulaic stamps:** No `**Why bother:**`, “App consequence:”, or “Things to Play With” laundry lists — weave motivation into paragraphs.
- **Citations:** IEEE `<Cite n={…} />` in prose + `<References items={[…]} />` at bottom. Source technical claims; paraphrase refman only.
- **Interactives:** 3–5 small demos embedded **mid-article** next to the beat they teach (motivate → explain → embed). Cut demos that don’t clarify a tradeoff. Prefer shared chrome from `schema-byte-budget/shared.tsx` (re-export per article folder). Client-only; label illustrative math.
- **House defaults:** Integer cents for money; ULID `CHAR(26)` public ids; clustered PK `BIGINT UNSIGNED` unless teaching exception; `utf8mb4` / `utf8mb4_0900_ai_ci`; Prisma as primary ORM in snippets.
- **Length:** Part B can run longer than 10m if every section earns it; still prefer skimmable prose over encyclopedia.

**Series division (09 / 11 / 12):** 09 = what you see at each isolation level; **11 = how InnoDB versions rows so consistent reads work**; 12 = row/gap locks and deadlocks when writers block each other. Say that once in the opener; don’t re-teach the anomaly catalog from 09 or gap-lock matrices from 12.

---

## Intent

Explain *how* InnoDB delivers the isolation behavior from article 09: multi-version concurrency control (MVCC) via undo logs, so consistent nonlocking reads can see a snapshot without locking writers out.

This is the first Part B deep dive. Readers already know RR pins a snapshot and RC refreshes per statement. Here they learn the mechanism that makes that cheap under concurrency — and the operational cost when snapshots live too long.

After reading, a developer should be able to:

1. Sketch a row version chain: clustered row → `DB_TRX_ID` / `DB_ROLL_PTR` → undo → older image.
2. Explain why a plain `SELECT` under RR/RC does not block writers (consistent nonlocking read).
3. State why **update** undo must survive until every open read view that might need it is gone — and why **insert** undo can die at commit.
4. Connect “idle in transaction” / long API requests / ORM-held connections to **history list growth**, purge lag, and undo tablespace bloat.
5. Read `History list length` in `SHOW ENGINE INNODB STATUS` as a health signal, not folklore.
6. Know that purge is the background cleanup of undo + delete-marked rows — and when long readers starve it.
7. Keep request transactions short; never hold a DB transaction across Stripe / HTTP / sleep / user think-time.

**Explicit non-goals:** row/gap/next-key lock matrices and deadlock graphs (article 12); redo / `innodb_flush_log_at_trx_commit` (article 14); buffer pool internals (article 13). Mention locks only as “locking reads are a different path.”

One-liner shared with 09/12: **09 = what you see; 11 = how InnoDB versions rows so you can see it; 12 = how writers block each other.**

---

## Real-world hook

Place the idle-in-transaction story in the section on long transactions / history list — it earns its place there, not as a forced cold open unless it’s the best hook after the series beat.

**Opening scenario — “idle in transaction” on a hot primary**

A Shopify-scale or GitHub-scale OLTP primary looks “fine” on QPS, then disk for undo grows, purge lags, and SELECTs start reconstructing older versions (CPU + I/O). The smoking gun in `processlist` / Performance Schema is not a slow query — it is a connection sitting **`Sleep` / idle while still inside an open transaction**, often for tens of seconds or minutes.

How web stacks create that state:

1. **ORM / connection pool antipattern** — `BEGIN` (or first statement under `autocommit=0`), then call Stripe, S3, another microservice, or render a template *before* `COMMIT`. The snapshot (RR) or the transaction’s undo retention window stays open the whole time.
2. **Long-lived “request = transaction”** — a GraphQL resolver or admin export starts a transaction, walks hundreds of queries, and never short-circuits. Even read-only consistent reads pin update undo.
3. **Forgotten explicit transaction** — disable autocommit in a script / console / Sidekiq job, run a `SELECT`, walk away. Refman calls this out as a classic history-list inflator.
4. **`mysqldump --single-transaction`** during heavy DML — legitimate long consistent read; operators must schedule it knowing MVCC will retain history for the dump’s duration.

Frame for app programmers: *writers are not “blocked” by your long SELECT — they succeed, and InnoDB keeps old versions alive for you.* The tax is paid in undo space, purge lag, table bloat (dead rows), and eventually write throttling if `innodb_max_purge_lag` is set.

**Companies / product shapes (light, not case studies):**

- GitHub / large SaaS MySQL fleets — “idle in transaction” as a top production hygiene metric.
- Shopify-style checkout + payment webhooks — temptation to hold the cart txn across payment I/O.
- Rails / Laravel / Prisma apps with middleware that opens a txn for the whole request.
- Analytics-ish `SELECT` on the primary with autocommit off (should be replica + short reads).

Tone: “your consistent read is free of locks, not free of history.”

---

## Primary documentation sources

Cite local nodes under `sources/mysql-refman-9.7/nodes/` and link public HTML in the published post. **Do not paste Oracle prose** — paraphrase; always cite node id + URL.

### Core (must read / cite)

| Node id | Public URL | Use in article |
| --- | --- | --- |
| `innodb-multi-versioning` | https://dev.mysql.com/doc/refman/9.7/en/innodb-multi-versioning.html | **Core mechanism.** Undo in rollback segments; hidden `DB_TRX_ID`, `DB_ROLL_PTR`, `DB_ROW_ID`; insert vs update undo lifetime; commit regularly including read-only txns; delete → purge; secondary-index MVCC differences (delete-mark + clustered lookup). |
| `innodb-consistent-read` | https://dev.mysql.com/doc/refman/9.7/en/innodb-consistent-read.html | Snapshot definition; RR first-read pins / RC per-read; nonlocking; Session A/B timeline; DML-vs-SELECT visibility (recap from 09, don’t re-teach isolation); freshest via RC or locking read (→ 12). |
| `innodb-undo-logs` | https://dev.mysql.com/doc/refman/9.7/en/innodb-undo-logs.html | What an undo log record is; rollback segments; up to four undo logs per txn (insert/update × user/temp); role in consistent read reconstruction. Keep slot-capacity formulas light. |
| `innodb-undo-tablespaces` | https://dev.mysql.com/doc/refman/9.7/en/innodb-undo-tablespaces.html | Where undo lives (`undo_001`/`undo_002`); growth under long txns; truncate (`innodb_undo_log_truncate`, `innodb_max_undo_log_size`); why long runners block reclaim. Ops-aware, not a full DBA chapter. |
| `innodb-purge-configuration` | https://dev.mysql.com/doc/refman/9.7/en/innodb-purge-configuration.html | **History list** = undo pages for committed txns; purge threads/batch; `History list length` in `SHOW ENGINE INNODB STATUS`; long RR / forgotten COMMIT / `mysqldump --single-transaction` as lag causes; `innodb_max_purge_lag` delay on DML. |
| `mysql-acid` | https://dev.mysql.com/doc/refman/9.7/en/mysql-acid.html | Bridge: Isolation (I) is implemented via levels + locking; MVCC is how nonlocking isolation stays concurrent. One short subsection, not a full ACID rehash. |

### Supporting (cite where a beat needs them)

| Node id | Public URL | Why |
| --- | --- | --- |
| `innodb-transaction-isolation-levels` | https://dev.mysql.com/doc/refman/9.7/en/innodb-transaction-isolation-levels.html | Back-link only — levels already covered in 09. |
| `commit` | https://dev.mysql.com/doc/refman/9.7/en/commit.html | `START TRANSACTION WITH CONSISTENT SNAPSHOT`; commit ends the retention window. |
| `innodb-locking-reads` | https://dev.mysql.com/doc/refman/9.7/en/innodb-locking-reads.html | Contrast: `FOR SHARE` / `FOR UPDATE` are *not* consistent nonlocking reads — tease 12. |
| `show-engine` | https://dev.mysql.com/doc/refman/9.7/en/show-engine.html | Where to find InnoDB status / TRANSACTIONS section (if citing the command formally). |
| `mysqldump` | https://dev.mysql.com/doc/refman/9.7/en/mysqldump.html | `--single-transaction` as intentional long consistent read (ops callout). |

**Citation rule:** paraphrase mechanisms; cite with `<Cite />` / `<References />`; never paste Oracle manual prose.

---

## Article structure

Suggested H2 spine — sentence-case, conversational. Scatter **named mini-demos** mid-article (see Interactive feature); no mega-lab at the top. Teach prerequisite mental models (version chain, read view) before jargon-heavy ops sections — same lesson as the B-tree overview in article 02.

1. **Part B opener + what today covers** — welcome; recap 09’s visibility contract in one paragraph; state 09/11/12 split; promise the undo engine under consistent reads.
2. **What MVCC means in one picture** — writers create versions; readers reconstruct; plain `SELECT` doesn’t lock writers. One running `items.qty` story through prose + demos.
3. **Row anatomy (before you say “roll pointer”)** — `DB_TRX_ID`, `DB_ROLL_PTR`, light `DB_ROW_ID`; where undo lives. *(Embed **Version chain walker**.)*
4. **Consistent nonlocking reads** — snapshot rule; walk the chain; RR pin vs RC refresh (callback 09, don’t re-teach anomalies). *(Embed **RR vs RC snapshot toggle**.)*
5. **Insert undo vs update undo** — why long readers pin update undo; read-only still counts. *(Embed **Undo lifetime chips**.)*
6. **History list and purge** — `History list length`; purge lag; dead rows. Idle-in-transaction hook lands here with GitHub/Shopify hygiene. *(Embed **History list meter**.)*
7. **Long transactions in web stacks** — ORM unit-of-work, Stripe-across-txn, dump `--single-transaction`; fix the txn before tuning purge threads.
8. **Undo tablespaces (ops lite)** — growth, truncate awareness; adding tablespaces doesn’t excuse open transactions.
9. **Secondary indexes (one honest paragraph)** — delete-mark + clustered lookup; tease 15; don’t steal covering/ICP.
10. **Boundary with article 12** — consistent read ≠ `FOR UPDATE`; one sentence on locking reads → 12.
11. **Tie-back checklist** — practical review questions.
12. **References** — IEEE list; bridge to 12 (locks) and 20 (open-trx forensics).

Tone: mechanism + production pain, still spoon-fed. Avoid academic concurrency proofs and deep DBA capacity planning.

---

## Deep-dive beats

### Beat 1 — Bridge: isolation is the contract; MVCC is the implementation

- Recap from 09 in ≤1 short paragraph: RR = one snapshot for the txn’s consistent reads; RC = new snapshot per consistent read; plain `SELECT` does not lock under those levels.
- From `mysql-acid`: Isolation is tuned by level + locking; InnoDB also uses multi-versioning so readers and writers proceed together.
- Promise of this article: follow one row through updates and see *which* version a reader reconstructs — and what piles up if the reader never commits.

### Beat 2 — Multi-versioning in plain English

- InnoDB keeps information about old versions of changed rows for **rollback** and **consistent read** (`innodb-multi-versioning`).
- Physical home: undo tablespaces → rollback segments → undo logs (`innodb-undo-logs`, `innodb-undo-tablespaces`).
- Mental model for web devs: the “current” clustered row is the tip of a chain; older tips live in undo until no transaction might need them.

### Beat 3 — Hidden columns on every clustered row

Teach the three system fields (paraphrase, don’t dump the manual):

| Field | Role for this article |
| --- | --- |
| `DB_TRX_ID` | Which transaction last inserted/updated this row version (deletes are special updates that mark deleted). |
| `DB_ROLL_PTR` | Pointer into undo — how to rebuild the previous row image. |
| `DB_ROW_ID` | Only when InnoDB invents a clustered index; mention briefly, don’t center. |

Interactive should surface `trx_id` + “roll ptr → undo #N” visually.

### Beat 4 — Walking the chain for a consistent read

- Definition from `innodb-consistent-read`: query sees changes committed before the snapshot timepoint; not later/uncommitted; exception = earlier statements in the *same* transaction.
- Algorithm (teaching simplification, labeled as such): start at current clustered row; if not visible to the read view, follow `DB_ROLL_PTR` to undo and reconstruct; repeat until visible or row is absent for that view.
- Emphasize: **no locks** on the read path for ordinary `SELECT` in RC/RR — writers may keep committing.
- Recap RR pin vs RC refresh without redoing the anomaly catalog from 09.
- Optional callout: DML can still touch rows your plain `SELECT` cannot see (09 gotcha) — one sentence + link back.

### Beat 5 — Insert undo vs update undo (why long readers matter)

From `innodb-multi-versioning`:

- **Insert undo** — needed for rollback; discardable once the inserting transaction commits (no other txn needs the “before insert” image for consistent read of a never-seen row the same way).
- **Update undo** (includes delete-as-update) — needed for consistent reads that must rebuild older images; discardable only when **no transaction** still has a snapshot that might require that undo.

App translation: a checkout that updates `qty` creates update undo; an abandoned admin tab with an open RR transaction can pin that undo (and everything after it in the history sense) far longer than the checkout itself.

### Beat 6 — History list, purge, and dead rows

From `innodb-purge-configuration` + multi-versioning:

- After commit, undo pages for committed work sit on the **history list** until purge processes them.
- **Purge** physically removes delete-marked rows/index records and frees undo that MVCC/rollback no longer need.
- `SHOW ENGINE INNODB STATUS` → `History list length` — usually low (thousands or less); write-heavy load **or long-running transactions (including read-only)** inflate it.
- Named causes to highlight: `mysqldump --single-transaction` under concurrent DML; `SELECT` after disabling autocommit without `COMMIT`/`ROLLBACK`.
- Tuning knobs at awareness level: `innodb_purge_threads`, `innodb_max_purge_lag` (DML delay when lag exceeds threshold), `innodb_max_purge_lag_delay`. Do not turn the article into a knobs encyclopedia — “know they exist; fix the long txn first.”
- Secondary symptom: insert/delete churn with lagging purge → table full of dead rows → disk-bound slowness (`innodb-multi-versioning`).

### Beat 7 — Undo tablespaces grow when reclaim cannot finish

From `innodb-undo-tablespaces` (keep ops-lite):

- Default `undo_001` / `undo_002`; long-running transactions are explicitly called out as drivers of large undo.
- Automated truncation (`innodb_undo_log_truncate` + `innodb_max_undo_log_size`) still needs purge to empty rollback segments — open snapshots block progress.
- Takeaway for app authors: adding undo tablespaces helps distribute space; it does **not** excuse holding transactions open across HTTP.

### Beat 8 — Secondary indexes (short, honest)

From `innodb-multi-versioning` “Multi-Versioning and Secondary Indexes”:

- Secondary indexes are not updated in-place with the same hidden columns; updates delete-mark old entries and insert new ones; purge cleans later.
- Visibility may require a clustered lookup (and undo) when the secondary entry is delete-marked or the page was touched by a newer txn — covering-index shortcut may be skipped.
- One paragraph + forward tease to article 15 (covering indexes / ICP). Enough that readers don’t think “secondary index = free snapshot.”

### Beat 9 — App failure modes and hygiene

Concrete patterns:

| Antipattern | Why it hurts MVCC |
| --- | --- |
| Open txn → call Stripe / HTTP → then write/commit | Snapshot/undo retention spans network RTT |
| ORM unit-of-work wrapping the whole controller | Same; plus pool connections stuck “in transaction” |
| Interactive transaction left open in `mysql` client | History list climbs while you think |
| Huge reporting `SELECT` on primary with explicit txn | Pins versions; prefer replica + autocommit |
| Assuming “read-only txn is harmless” | Update undo still cannot be purged for that read view |

Positive patterns:

- Begin late, commit early; never span external I/O (reinforce 08).
- Prefer autocommit for single-statement reads.
- For multi-statement work: smallest set of statements that must be atomic; release connection to the pool only after commit/rollback.
- Monitor: history list length, undo file size, `Threads_running` vs connections in `Sleep` with open trx (Perf Schema deep dive → 20).

### Beat 10 — Boundary with article 12

- Consistent nonlocking read ≠ locking read.
- If you need the *freshest* committed row **and** to stop others from changing it, that is `SELECT … FOR UPDATE` / lock territory — link to 12.
- Do not introduce gap locks here except “RR locking reads take them; details later.”

---

## Interactive feature

Scatter **3–5 small client demos** under `src/components/interactive/mysql-mvcc/` (re-export shared chrome from `schema-byte-budget/shared.tsx`). Import each in MDX **next to the section it teaches** — motivate in prose, explain the UI, embed, move on. If a demo doesn’t clarify a tradeoff, cut it and let prose carry the beat. Pure client simulation; label as illustrative (≠ live `INFORMATION_SCHEMA`).

### 1. Version chain walker

- **Goal:** See `DB_TRX_ID` / roll pointer → undo nodes for one hot row (`items.id = 1`).
- **Placement:** After row anatomy (§3).
- **UX:** Horizontal chain (oldest ← … ← tip); highlight which node a reader reconstructs; mono event log. Keep one row, no gap locks.

### 2. RR vs RC snapshot toggle

- **Goal:** Same writer script; RR pins first-read qty; RC refreshes each `SELECT`.
- **Placement:** After consistent nonlocking reads (§4).
- **UX:** Isolation toggle + `SELECT` / `COMMIT` buttons; badge “Read view @ t1” vs “Fresh each SELECT.” Reuse chain walker data, don’t duplicate full timeline scrubber.

### 3. Undo lifetime chips

- **Goal:** Contrast insert undo (discardable at commit) vs update undo (pinned while any read view needs it).
- **Placement:** After insert vs update undo (§5).
- **UX:** Two labeled chips on a timeline; writer commits; show which undo frees when reader commits. One sentence caption per step.

### 4. History list meter

- **Goal:** Open RR reader + ongoing writers → history/undo retention climbs; drops after reader `COMMIT` + purge tick.
- **Placement:** After history list & purge (§6); pairs with idle-in-transaction hook.
- **UX:** Simple bar/counter (not a dashboard); optional “idle txn” preset. Primary wow moment for prod hygiene.

### 5. Idle transaction clock *(optional — merge into #4 if scope tight)*

- **Goal:** Same meter, framed as “ORM left txn open during HTTP” — tie to `processlist` / tease 20.
- **Placement:** Long transactions section (§7).
- **UX:** Sleep/timer label on reader session; caption links to history list length in `SHOW ENGINE INNODB STATUS`.

**Explicit non-goals:** gap locks, deadlock graphs, redo flush — forward to 12 / 14. `FOR UPDATE` path shows disabled note “see article 12.”

**Implementation notes:** Shared visibility function + unit tests; keyboard-operable controls; live region for “Reader sees qty=5 via undo version 2.”

---

## Example queries/schemas

Shared tiny schema (align with article 09 where helpful):

```sql
CREATE TABLE items (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  sku VARCHAR(64) NOT NULL UNIQUE,
  qty INT NOT NULL,
  price_cents INT NOT NULL
) ENGINE=InnoDB;

INSERT INTO items (id, sku, qty, price_cents) VALUES
  (1, 'tee-black-m', 5, 2000);
```

**Two-session version walk (RR pin + writers):**

```sql
-- Session R (reader)
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT qty FROM items WHERE id = 1;   -- 5; snapshot pinned

-- Session W (writer) — run twice with different values if you like
UPDATE items SET qty = 4 WHERE id = 1;
COMMIT;
UPDATE items SET qty = 3 WHERE id = 1;
COMMIT;

-- Session R
SELECT qty FROM items WHERE id = 1;   -- still 5 under RR
-- Meanwhile history/undo retained for R's read view

COMMIT;                               -- R done; purge may free update undo
SELECT qty FROM items WHERE id = 1;   -- 3
```

**The footgun — leave the reader open:**

```sql
-- Session R
SET autocommit = 0;
SELECT qty FROM items WHERE id = 1;
-- walk away / call external API / sleep
-- Watch History list length climb as other sessions write

COMMIT;  -- or ROLLBACK — end the retention window
```

**Inspect history list (ops literacy):**

```sql
SHOW ENGINE INNODB STATUS\G
-- In TRANSACTIONS section, note:
--   History list length N
--   Purge done for trx's n:o < ...
```

**Undo tablespace awareness (optional sidebar):**

```sql
SELECT TABLESPACE_NAME, FILE_NAME
FROM INFORMATION_SCHEMA.FILES
WHERE FILE_TYPE LIKE 'UNDO LOG';

SELECT NAME, STATE
FROM INFORMATION_SCHEMA.INNODB_TABLESPACES
WHERE NAME LIKE 'innodb_undo%';
```

**Explicit snapshot pin (advanced, short):**

```sql
START TRANSACTION WITH CONSISTENT SNAPSHOT;
SELECT qty FROM items WHERE id = 1;
COMMIT;
```

**Contrast — locking read (tease 12, do not expand):**

```sql
START TRANSACTION;
SELECT qty FROM items WHERE id = 1 FOR UPDATE;  -- not MVCC-only path
COMMIT;
```

**App-shaped pseudocode (call out as bad vs good):**

```text
BAD:  BEGIN → SELECT cart → HTTP payment → UPDATE inventory → COMMIT
GOOD: SELECT cart (autocommit) → HTTP payment → BEGIN → claim rows + write → COMMIT
```

---

## Tie-back checklist

Reader / author verification before publishing:

- [ ] Opens with **idle in transaction / long request** production pain, not a dry undo glossary.  
- [ ] Bridges from 09: RR/RC snapshot rules assumed; this essay owns the **version chain**.  
- [ ] Explains consistent **nonlocking** reads vs locking reads (forward to 12).  
- [ ] Covers hidden columns `DB_TRX_ID` / `DB_ROLL_PTR` (and light `DB_ROW_ID`).  
- [ ] Distinguishes **insert undo** vs **update undo** lifetimes.  
- [ ] Defines **history list** + **purge**; shows how to read `History list length`.  
- [ ] States clearly that **read-only** long transactions still block purge of update undo.  
- [ ] Names ORM / pool / external-I/O antipatterns (Stripe-across-txn, whole-request unit-of-work).  
- [ ] Mentions undo tablespace growth/truncate at awareness level without becoming a DBA runbook.  
- [ ] Short secondary-index MVCC note; no covering-index deep dive (→ 15).  
- [ ] Scatters mini-demos mid-article (chain, RR/RC, undo lifetimes, history meter) — not one top mega-lab.
- [ ] Cites primary nodes via `<Cite />` / `<References />`; no Oracle text paste.
- [ ] Humanizer pass before publish; first-person voice check.
- [ ] Ends with: begin late, commit early, never hold DB txns across network I/O; watch history length.

---

## Open questions / author notes

1. **How deep on undo tablespace truncate?** Prefer one subsection + link; full `CREATE UNDO TABLESPACE` choreography is optional appendix for ops-curious readers.  
2. **History list vs “read view” precision** — Teaching model can say “open snapshot pins undo.” Avoid overclaiming exact InnoDB purge scheduling internals unless citing purge-configuration carefully.  
3. **Interactive scope** — Ship chain walker + RR/RC toggle + history meter as v1; undo lifetime chips if cheap; avoid one timeline scrubber that tries to teach everything.  
4. **`INFORMATION_SCHEMA` / Perf Schema for open trx** — Light mention here; full forensics toolkit is article 20. Maybe one query (`sys.innodb_trx` / `performance_schema.events_transactions_current`) as a “where to look next” box.  
5. **Secondary indexes** — Keep to one paragraph; resist pulling ICP/covering into this post.  
6. **Postgres comparison** — One callout max (“MVCC everywhere; retention/bloat failure modes rhyme”). Do not rewrite 09’s isolation contrast.  
7. **`WITH CONSISTENT SNAPSHOT`** — Useful for “pin without a prior SELECT”; keep advanced.  
8. **mysqldump** — Frame as *legitimate* long consistent read that ops must schedule; not an app antipattern.  
9. **Voice** — Prefer “fix the long transaction” over “tune purge threads” as the default remedy.  
10. **Handoff lines** — Close with the 09/11/12 split; open 12 by contrasting nonlocking vs locking reads on the same `items` row.

---

## Drafting checklist (when writing the post)

- [ ] Part B series opener + 09/11/12 division in first screen
- [ ] Scatter demos mid-article; no import-at-top mega-lab
- [ ] `<Cite />` / `<References />` for all core claims
- [ ] Humanizer pass; first-person voice; no formulaic section stamps
- [ ] Idle-in-transaction hook in long-transaction section (not forced cold open)
- [ ] Forward to 12 (locking reads) and 20 (open-trx queries)
- [ ] Register `mysql-mvcc` in hub `seriesList.postSlugs` when publishing

---

## Draft metadata (for when the post is created)

```yaml
title: MVCC, Undo Logs & Long Transactions
slug: mysql-mvcc
series: Learn MySQL
seriesOrder: 11
tier: Deep dive
description: >
  How InnoDB consistent reads walk undo version chains, why the history list
  grows under idle-in-transaction workloads, and how purge reclaims space —
  with a snapshot visualizer for web developers.
interactive: mysql-mvcc (folder of scattered mini-demos)
```
