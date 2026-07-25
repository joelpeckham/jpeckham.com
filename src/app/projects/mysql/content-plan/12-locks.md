# 12 — Row Locks, Gap Locks & Deadlocks

| Field | Value |
| --- | --- |
| **Number** | 12 |
| **Title** | Row Locks, Gap Locks & Deadlocks |
| **Slug** | `mysql-locks` |
| **Tier** | Deep dive (Part B) |
| **Hub** | `/projects/mysql/` |
| **Post** | `/posts/mysql-locks/` |
| **Depends on** | 08 — Transactions (`mysql-transactions`); 09 — Isolation (`mysql-isolation`); 11 — MVCC (`mysql-mvcc`) as prior context for “consistent read ≠ lock” |
| **Feeds into** | 13 — Buffer Pool (hot rows sit in RAM *and* under lock); 16 — Foreign Keys (FK checks take shared locks); 18 — Online DDL (metadata vs row locks); 20 — Perf Schema forensics (lock waits as a wait class) |
| **Status** | Plan only |

---

## Authoring contract

- **Status:** Plan only — stub wired; article not written yet.
- **Voice:** First person, casual/jokey, flowing prose. Run humanizer pass (`~/.cursor/skills/humanizer`) before publish.
- **No formulaic stamps:** No `**Why bother:**`, “App consequence:”, or “Things to Play With” laundry lists — weave motivation into paragraphs.
- **Citations:** IEEE `<Cite n={…} />` in prose + `<References items={[…]} />` at bottom. Source technical claims; paraphrase refman only.
- **Interactives:** 3–5 small demos embedded **mid-article** next to the beat they teach (motivate → explain → embed). Cut demos that don’t clarify a tradeoff. Prefer shared chrome from `schema-byte-budget/shared.tsx`.
- **House defaults:** Integer cents for money; ULID `CHAR(26)` public ids; `utf8mb4` / `utf8mb4_0900_ai_ci`; Prisma as primary ORM in snippets.
- **Length:** Part B can run longer than 10m if every section earns it; still prefer skimmable prose over encyclopedia.

**Series division (09 / 11 / 12):** 09 = visibility at each isolation level; 11 = MVCC / undo / history list; **12 = row, gap, and next-key locks + deadlocks when writers serialize.** One bridge sentence on snapshots vs locks; do not redo MVCC internals (11) or the full isolation tour (09).

---

## Intent

Teach web developers how InnoDB **actually serializes writers** under default `REPEATABLE READ`: record locks, gap locks, next-key locks, and the deadlocks that fall out of concurrent inventory / cart / booking flows.

After this article, a reader should be able to:

1. Distinguish **consistent non-locking reads** (article 09/11 territory) from **locking reads / DML** that take index-record and gap locks.
2. Name the lock types that matter for apps: shared (`S`) / exclusive (`X`), record, gap, next-key, insert-intention; know intention table locks (`IS`/`IX`) exist without memorizing the full matrix.
3. Predict what `SELECT … FOR UPDATE` locks under RR — including when a unique equality lookup is **record-only** vs when a range / non-unique search takes **next-key / gap** locks.
4. Explain why two “innocent” checkout handlers deadlock (opposite lock order, or overlapping ranges + timing).
5. Diagnose with `performance_schema.data_locks` / `data_lock_waits` and `SHOW ENGINE INNODB STATUS` (“LATEST DETECTED DEADLOCK”).
6. Handle production failures correctly: **deadlock → retry the whole transaction**; **lock wait timeout → don’t spin forever**; know when `NOWAIT` / `SKIP LOCKED` / `READ COMMITTED` are deliberate tools.

**Hard boundary — do not redo article 11.** Undo logs, read views, history list growth, and “idle in transaction” purge pain belong to MVCC. This essay owns *locks*: who waits, who blocks inserts into a gap, who gets rolled back as the victim. One bridge sentence is enough: “plain `SELECT` under RR reads a snapshot and takes no row locks; `FOR UPDATE` / `UPDATE` / `DELETE` take locks on the *current* row versions.”

**Also defer:** AUTO-INC lock modes deep dive (brief mention only), spatial predicate locks, `LOCK TABLES` as a first-line strategy (footnote / last-resort tip from the manual), Group Replication / cluster lock behavior.

---

## Real-world hook

**Primary scene — last-item checkout race that becomes a deadlock**

A Shopify-style storefront (or any inventory API) has two hot endpoints finishing carts at the same time:

- **Request A** (`POST /checkout` for cart 1): `BEGIN` → `SELECT … FOR UPDATE` on inventory row for SKU `tee-black-m` → `SELECT … FOR UPDATE` on a reservation / seat / coupon row → Stripe work or local writes → `COMMIT`.
- **Request B** (cart 2, overlapping SKUs or a shared promotion row): locks the **same two resources in the opposite order**.

Or the single-table cousin: A locks item 10 then item 20; B locks item 20 then item 10 (multi-line cart sorted differently by each request). Both hold one exclusive lock and wait for the other → **ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction**.

The reader’s gut says “ACID should prevent double-sell.” Reality: InnoDB prevents corruption by **locking and sometimes aborting one writer**. Correct apps treat 1213 (and often 1205 lock-wait timeout) as **retryable**, not as a hard business failure.

**Secondary hooks (short, rotate through the piece):**

1. **Seat / ticket booking** — “hold seats 12–14 for event 42” under RR takes gap/next-key locks on the seat index range so another session cannot insert a phantom hold into that gap. Two overlapping holds deadlock or wait; a non-unique `status` index scan can lock far more than the seats you meant.
2. **Cart + inventory + coupon** — three tables, three lock orders scattered across service methods → classic cross-table deadlock (manual’s Animals/Birds example, renamed to product domain).
3. **Job queue workers** — `SELECT … FOR UPDATE SKIP LOCKED` as the intentional “don’t wait, take the next free row” pattern (contrast with checkout, where skipping a locked SKU is usually wrong).

**Tone:** “Your HTTP handler isn’t just reading a snapshot anymore — it’s joining a lock graph with every other in-flight request.”

**Companies / surfaces to name lightly:** Shopify-style inventory finalize; Eventbrite/Ticketmaster-style holds; Calendly-style slot booking; Stripe-adjacent “decrement balance / claim idempotency key” rows; any Rails/Prisma/Django app that wrapped “check qty → update qty” without a locking read and then “fixed” it with `FOR UPDATE` without a retry loop.

---

## Primary documentation sources

Cite local nodes under `sources/mysql-refman-9.7/nodes/` while drafting. Link the public HTML in the published post. Prefer paraphrase over Oracle prose.

### Core (must read / cite)

| Node id | Local file | Public URL | Use in article |
| --- | --- | --- | --- |
| `innodb-locking-transaction-model` | `nodes/innodb-locking-transaction-model.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-locking-transaction-model.html | Chapter map — locking types, statement lock sets, phantoms, deadlocks. Orient the reader; don’t paste the TOC. |
| `innodb-locking` | `nodes/innodb-locking.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-locking.html | **Core vocabulary.** S/X, intention IS/IX, record locks, gap locks (purely inhibitive; S/X gap don’t conflict), next-key = record + preceding gap, insert intention, intervals / supremum. RR uses next-key for searches/scans; RC disables gap locking for searches (except FK / dup-key). |
| `innodb-locks-set` | `nodes/innodb-locks-set.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-locks-set.html | **What each statement locks.** Locking read / `UPDATE` / `DELETE` lock scanned index records (not the exact `WHERE`); unique equality → record only; ranges / non-unique → gap/next-key; plain `SELECT` = consistent read (no locks) unless SERIALIZABLE; `INSERT` X on inserted row + insert-intention gap; duplicate-key → S lock (deadlock trap); secondary index exclusive locks also lock clustered records; no usable index → lock every row. |
| `innodb-next-key-locking` | `nodes/innodb-next-key-locking.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-next-key-locking.html | Phantom problem; next-key as the RR locking fix; “lock the nonexistence of something”; gap after last record / supremum. (Node title in the manual is “Phantom Rows”.) |
| `innodb-locking-reads` | `nodes/innodb-locking-reads.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-locking-reads.html | `FOR SHARE` vs `FOR UPDATE`; locks released at commit/rollback; locking reads require a transaction (autocommit off / `START TRANSACTION`); parent/child and counter examples; **`NOWAIT` / `SKIP LOCKED`**. |
| `innodb-deadlocks` | `nodes/innodb-deadlocks.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-deadlocks.html | Definition; opposite lock order; range/gap timing; prevention tips overview; apps must handle retry even when logic is “correct”; `innodb_print_all_deadlocks`; isolation level doesn’t remove write deadlocks. |
| `innodb-deadlock-example` | `nodes/innodb-deadlock-example.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-deadlock-example.html | Worked A/B deadlock with `FOR SHARE` then crossed `UPDATE`s; `data_locks` / `data_lock_waits` snapshots; `SHOW ENGINE INNODB STATUS` “WE ROLL BACK TRANSACTION (N)”; ERROR 1213. **Adapt domain** (inventory/cart), don’t copy Animals/Birds verbatim. |
| `innodb-deadlock-detection` | `nodes/innodb-deadlock-detection.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-deadlock-detection.html | Auto-detect on by default; victim ≈ **smaller** txn (rows inserted/updated/deleted); `innodb_deadlock_detect` off → rely on lock wait timeout; wait-for graph depth limits. |
| `innodb-deadlocks-handling` | `nodes/innodb-deadlocks-handling.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-deadlocks-handling.html | **App contract:** always prepared to re-issue; keep txns short; consistent lock order; indexes so you lock fewer records; less locking / try RC for locking reads; last-resort serialization. |

### Supporting (cite when useful)

| Node id | Public URL | Why |
| --- | --- | --- |
| `performance-schema-data-locks-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-data-locks-table.html | Live lock board columns: `LOCK_TYPE`, `LOCK_MODE` (`S`/`X`/`IS`/`IX` + gap), `LOCK_STATUS` (`GRANTED`/`WAITING`), `LOCK_DATA` (PK values, `supremum pseudo-record`). |
| `performance-schema-data-lock-waits-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-data-lock-waits-table.html | Who blocks whom — pairs with the interactive’s “wait edge.” |
| `innodb-parameters` (`innodb_lock_wait_timeout`, `innodb_deadlock_detect`) | https://dev.mysql.com/doc/refman/9.7/en/innodb-parameters.html | Default **50s** lock wait → `ERROR 1205 (HY000)`; session/global scope. |
| `innodb-transaction-isolation-levels` | https://dev.mysql.com/doc/refman/9.7/en/innodb-transaction-isolation-levels.html | Light bridge from 09: RC disables most gap locks; don’t re-teach all four levels. |
| `innodb-consistent-read` | https://dev.mysql.com/doc/refman/9.7/en/innodb-consistent-read.html | One clarifying cite: consistent reads ignore locks on rows in the read view. |
| `show-engine` | https://dev.mysql.com/doc/refman/9.7/en/show-engine.html | How to pull `LATEST DETECTED DEADLOCK` in ops. |
| `select` (locking clause syntax) | https://dev.mysql.com/doc/refman/9.7/en/select.html | `FOR UPDATE` / `FOR SHARE` / `OF` / `NOWAIT` / `SKIP LOCKED` syntax pointer. |

**Optional footnotes only:** `innodb-auto-increment-handling`, `lock-tables`, `innodb-information-schema-understanding-innodb-locking`, `sys-innodb-lock-waits`.

**Do not paste Oracle prose.** Teach with the inventory/booking schema below; when using the official deadlock sequence, rename tables and keep the lock-order lesson.

**Citation rule:** paraphrase mechanisms; cite with `<Cite />` / `<References />`; never paste Oracle manual prose.

---

## Article structure

Suggested H2 spine — sentence-case, conversational. Scatter **named mini-demos** mid-article; no mega lock-board at the top.

1. **Part B beat + what today covers** — checkout/booking hook; 09/11/12 split in one paragraph (visibility → MVCC → **locks**).
2. **Locks vs snapshots** — plain `SELECT` vs `FOR UPDATE` / DML; consistent readers can still see old versions (11). *(Optional one-line embed: **Snapshot vs lock** contrast chip — no MVCC replay.)*
3. **Lock vocabulary under RR** — S/X, record, gap, next-key, insert-intention; intention locks in one paragraph.
4. **What statements lock** — `SELECT` vs locking reads vs DML; unique equality vs range; locks follow the index scan. *(Embed **Record-only FOR UPDATE**.)*
5. **Phantoms and gaps** — why RR locking reads take next-key; supremum; RC escape hatch (callback 09). *(Embed **Next-key gap guard**.)*
6. **Deadlocks and retries** — crossed order + range timing; 1213 vs 1205; victim selection. *(Embed **Crossed-order deadlock stepper**.)*
7. **App patterns** — inventory claim, consistent lock order, retry loop, `NOWAIT` / `SKIP LOCKED`, when RC helps.
8. **Observability** — `data_locks`, `data_lock_waits`, `SHOW ENGINE INNODB STATUS`.
9. **Tie-back checklist** + forward links (13 / 16 / 18 / 20).
10. **References** — IEEE list.

Do **not** end major sections with “App consequence:” stamps — weave the handler implication into the paragraph.

## Deep-dive beats

### Beat 1 — Locks vs snapshots (30-second remap)

- Plain `SELECT` under RR: consistent read, **no row locks** (article 09/11).
- `SELECT … FOR UPDATE` / `FOR SHARE`, `UPDATE`, `DELETE`: operate on current versions and **set locks** that other writers (and some locking readers) must respect.
- Consistent readers still sail past your `X` locks using old versions — which is why “I locked it!” doesn’t stop other requests from *seeing* a pre-image via non-locking `SELECT`.
- if the bug is double-sell, you need a **locking read or atomic `UPDATE`**, not a second plain `SELECT`.

### Beat 2 — Shared, exclusive, intention (just enough)

- `S` = others may `S`, not `X`; `X` = exclusive for writers.
- `FOR SHARE` → `S` (+ table `IS`); `FOR UPDATE` / `UPDATE` / `DELETE` → `X` (+ table `IX`).
- Intention locks make row + table locking coexist; they mostly matter when someone does `LOCK TABLES` — mention, don’t drill.
- two checkouts can both `FOR SHARE` the same row and then both deadlock upgrading to `X` — prefer `FOR UPDATE` when you intend to write (manual’s counter example).

### Beat 3 — Record locks are index-record locks

- Every row lock sits on an **index record** (clustered PK, or hidden clustered index if none).
- Exclusive locks on secondary index records also lock the corresponding clustered records (`innodb-locks-set`).
- `SHOW ENGINE` / P_S wording: `locks rec but not gap` / `REC_NOT_GAP` vs next-key (no gap qualifier) vs `GAP`.
- bad or missing indexes turn one `UPDATE … WHERE status = 'open'` into “lock the world.”

### Beat 4 — Gap locks & next-key locks (the RR star)

- **Gap lock:** inhibits inserts into the gap before/between/after index records; purely inhibitive; multiple transactions can hold gap locks on the same gap (S/X gap don’t conflict with each other).
- **Next-key lock:** record lock + gap before that record. Default RR searches/scans use these to prevent phantoms.
- Teaching intervals (from `innodb-locking`) for index values `10, 11, 13, 20`:
  - `(-∞, 10]`, `(10, 11]`, `(11, 13]`, `(13, 20]`, `(20, +∞)` (supremum).
- Unique index + unique equality search → **record lock only** (no preceding gap). Non-unique or range → gap/next-key.
- Insert intention locks: concurrent inserts into different positions of the same gap don’t block each other until they conflict.
- RC: gap locking disabled for ordinary searches/scans (still used for FK + duplicate-key checks); fewer phantom-blocking locks, fewer wait edges — tradeoff already framed in article 09.
- a range `FOR UPDATE` on seats or SKUs locks **holes**, not just existing rows — that’s a feature (no phantom hold) and a concurrency cost.

### Beat 5 — `SELECT … FOR UPDATE` as the web-app primitive

- Use when the request will decide based on current state and then write (inventory claim, seat hold, balance check).
- Same locks as a searched `UPDATE` on those rows.
- Requires an open transaction; locks live until `COMMIT`/`ROLLBACK`.
- Subquery gotcha: outer `FOR UPDATE` does not lock rows in a subquery unless the subquery also has a locking clause.
- `NOWAIT` → fail fast (`ERROR 3572`); `SKIP LOCKED` → omit locked rows (queues/workers; **not** general checkout integrity).
- never hold `FOR UPDATE` across slow Stripe/network calls — lock, decide, write, commit; do external I/O outside the txn (bridge to 08’s boundary lesson).

### Beat 6 — Deadlocks: how concurrent carts create them

Two mechanisms to teach (both in the manual):

1. **Opposite lock order** across tables or rows (Animals/Birds → `inventory` + `coupons`, or item 10 vs 20).
2. **Range / gap timing** — each txn acquires some next-key locks, waits for others; cycles appear under concurrency.

Detection:

- On by default (`innodb_deadlock_detect`).
- InnoDB chooses a **victim** (prefers smaller txns by rows written) and rolls it back with **1213 / 40001**.
- High-concurrency option: disable detection and lean on `innodb_lock_wait_timeout` (default **50s** → **1205**) — rare app-level knob; mention for ops literacy.
- Isolation level does **not** remove write deadlocks (`innodb-deadlocks`).

A correct checkout still needs a **retry layer**; deadlock ≠ logic bug by itself (though frequent deadlocks often mean bad lock order or over-broad scans).

### Beat 7 — Minimize & handle (production checklist)

From `innodb-deadlocks-handling`, translated to handlers:

| Technique | App translation |
| --- | --- |
| Re-issue on deadlock | Catch 1213 (and usually 1205); retry whole txn with jittered backoff; cap attempts; then 409/503 to client |
| Short transactions | No interactive “begin → await webhook → commit”; no `FOR UPDATE` across HTTP fan-out |
| Consistent order | Sort line-item IDs before locking; always lock `inventory` before `coupons`; centralize in one repository method |
| Good indexes | Lock only the rows you mean (tie to articles 03 / 10) |
| Less locking / RC | Prefer non-locking reads when snapshot is enough; try RC if gap locks dominate waits (09) |
| Serialize last | Semaphore row or careful `LOCK TABLES` — last resort, not the blog’s hero pattern |

### Beat 8 — Observability without article 20’s whole toolkit

- `performance_schema.data_locks` — granted vs waiting; decode `LOCK_MODE` / `LOCK_DATA`.
- `performance_schema.data_lock_waits` — blocking edges.
- `SHOW ENGINE INNODB STATUS` → `LATEST DETECTED DEADLOCK` (holds / waits / “WE ROLL BACK TRANSACTION”).
- `innodb_print_all_deadlocks=ON` temporarily when frequency is high; turn off after capture.
- Tease article 20 for wait/digest aggregation; this article stays on the lock graph.

### Beat 9 — Explicit non-goals / pointers

| Topic | Where it lives |
| --- | --- |
| Snapshot pinning, undo, history list | **11** |
| Isolation level tour | **09** |
| Buffer pool / hot pages under contention | **13** |
| FK check shared locks | **16** |
| DDL lock waits during migrate | **18** |
| Aggregated wait forensics | **20** |

---

## Interactive feature

Scatter **3–5 small client demos** under `src/components/interactive/mysql-lock-board/` (shared chrome from `schema-byte-budget/shared.tsx`). Embed each mid-article — split the old mega-board into focused toys. Pure TypeScript lock simulator + unit tests; label as simplified teaching model.

### 1. Record-only FOR UPDATE

- **Goal:** Unique equality lookup takes record `X` only — adjacent gap stays free; insert beside locked key still allowed.
- **Placement:** After “what statements lock” (§4).
- **UX:** Minimal index strip (4 keys); one txn, one `FOR UPDATE`; gap cells unmarked. Single-focus, no second txn column.

### 2. Next-key gap guard

- **Goal:** Range `FOR UPDATE` locks next-key + gap; concurrent insert into gap waits.
- **Placement:** After phantoms & gaps (§5).
- **UX:** Stepper: range lock → insert attempt → wait → commit clears. Optional **RR vs RC** toggle (RC: gap not taken for search — callback 09).

### 3. Crossed-order deadlock stepper

- **Goal:** Two txns, opposite lock order → cycle → victim rollback (1213).
- **Placement:** Deadlocks section (§6).
- **UX:** Two-column statement log + compact wait graph; animate victim (smaller txn by rows written). Inventory + coupon or item 10/20 — keep two resources max.

### 4. RR vs RC gap toggle *(optional — fold into #2)*

- **Goal:** Same range script; RC lets insert proceed while A holds row lock only.
- **Placement:** Gap section or observability callback to 09.

### 5. Snapshot vs lock contrast *(optional — prose-first)*

- **Goal:** Side-by-side: plain `SELECT` sees snapshot qty; `FOR UPDATE` blocks writer — pointer to 11, no MVCC replay.
- **Placement:** Locks vs snapshots (§2). Cut if prose + one diagram suffice.

**Non-goals:** full gap compatibility matrix, MVCC version pane, duplicate-key three-session trap in v1 unless cheap “Advanced” tab.

**A11y:** keyboard stepper; live region for wait/deadlock states.

---

## Example queries / schemas

One teaching schema shared by prose + interactive. Original domain (do not copy Animals/Birds or `child` verbatim).

### Schema — inventory + holds + coupons

```sql
CREATE TABLE inventory (
  sku_id      BIGINT UNSIGNED NOT NULL,
  sku         VARCHAR(64) NOT NULL,
  qty         INT NOT NULL,
  PRIMARY KEY (sku_id),
  UNIQUE KEY uq_sku (sku)
) ENGINE=InnoDB;

CREATE TABLE seat_holds (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id    BIGINT UNSIGNED NOT NULL,
  seat_no     INT NOT NULL,
  cart_id     BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_event_seat (event_id, seat_no),
  KEY idx_event_seat (event_id, seat_no)
) ENGINE=InnoDB;

CREATE TABLE coupons (
  code        VARCHAR(32) NOT NULL,
  remaining   INT NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB;

INSERT INTO inventory (sku_id, sku, qty) VALUES
  (10, 'tee-black-m', 1),
  (11, 'tee-black-l', 5),
  (13, 'hoodie-grey', 2),
  (20, 'cap-navy', 3);

INSERT INTO coupons (code, remaining) VALUES ('SAVE10', 100);
```

### Claim inventory (correct primitive)

```sql
START TRANSACTION;

SELECT sku_id, qty
FROM inventory
WHERE sku = 'tee-black-m'
FOR UPDATE;   -- unique equality → record X, not gap

-- app checks qty >= 1
UPDATE inventory
SET qty = qty - 1
WHERE sku = 'tee-black-m' AND qty >= 1;

COMMIT;
```

### Range hold (next-key / gap under RR)

```sql
START TRANSACTION;

-- Locks scanned index records + gaps (non-unique or range path).
-- Prefer unique seat lookup when claiming one seat.
SELECT id, seat_no
FROM seat_holds
WHERE event_id = 42 AND seat_no BETWEEN 10 AND 20
FOR UPDATE;

INSERT INTO seat_holds (event_id, seat_no, cart_id)
VALUES (42, 15, 1001);

COMMIT;
```

### Deadlock reproduction (two sessions)

```sql
-- Session A
START TRANSACTION;
SELECT qty FROM inventory WHERE sku_id = 10 FOR UPDATE;
-- Session B
START TRANSACTION;
SELECT remaining FROM coupons WHERE code = 'SAVE10' FOR UPDATE;
UPDATE inventory SET qty = qty - 1 WHERE sku_id = 10;  -- waits
-- Session A
UPDATE coupons SET remaining = remaining - 1 WHERE code = 'SAVE10';
-- → ERROR 1213 (40001) on one session
```

### Consistent lock order (app-level fix)

```sql
-- Always lock inventory SKUs in ascending sku_id, then coupons alphabetically.
-- Pseudocode in prose; show SQL for a two-sku cart:
SELECT sku_id, qty FROM inventory
WHERE sku_id IN (20, 10)
ORDER BY sku_id
FOR UPDATE;
```

### Lock wait timeout & fail-fast

```sql
SET SESSION innodb_lock_wait_timeout = 5;  -- demo only; default 50

SELECT * FROM inventory WHERE sku_id = 10 FOR UPDATE NOWAIT;
-- ERROR 3572 (HY000): Do not wait for lock.

SELECT * FROM inventory FOR UPDATE SKIP LOCKED;  -- queue workers, not checkout
```

### Observability

```sql
SELECT ENGINE_TRANSACTION_ID AS trx_id,
       OBJECT_NAME AS tbl,
       INDEX_NAME,
       LOCK_TYPE,
       LOCK_MODE,
       LOCK_STATUS,
       LOCK_DATA
FROM performance_schema.data_locks
WHERE OBJECT_SCHEMA = DATABASE();

SELECT * FROM performance_schema.data_lock_waits\G

SHOW ENGINE INNODB STATUS\G
-- inspect LATEST DETECTED DEADLOCK
```

### App retry sketch (TypeScript-ish, for prose)

```ts
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    await db.transaction(async (tx) => {
      /* SELECT … FOR UPDATE, updates, commit via ORM */
    });
    return;
  } catch (e) {
    if (!isRetryableLockError(e) || attempt === 3) throw e;
    await sleep(25 * attempt + jitter());
  }
}
```

Map ORM errors: MySQL `1213` / `40001` (deadlock), `1205` / `HY000` (lock wait timeout). Note Prisma / mysql2 / ActiveRecord each wrap differently — show the SQLSTATE as the stable signal.

---

## Tie-back checklist

Copy-paste for the end of the published post (and for the author’s own review before shipping):

- [ ] Explains **S vs X** and that row locks are **index-record** locks.
- [ ] Defines **gap** vs **record** vs **next-key** under default **RR**, with a concrete range example.
- [ ] States when unique equality `FOR UPDATE` skips the gap (and when ranges don’t).
- [ ] Separates **consistent read** (no row locks) from **locking read** without re-teaching MVCC.
- [ ] Shows a realistic **inventory/cart/booking** deadlock (crossed order) and names **ERROR 1213**.
- [ ] Documents **victim selection** (prefer smaller txn) + `SHOW ENGINE INNODB STATUS` / P_S locks.
- [ ] Distinguishes **1213 deadlock** from **1205 lock wait timeout** (default 50s).
- [ ] Gives an **app retry** pattern and **consistent lock-order** rule.
- [ ] Mentions `NOWAIT` / `SKIP LOCKED` with correct use cases (fail-fast vs queue).
- [ ] Points to **RC** as a gap-lock / contention lever without restating all of article 09.
- [ ] Scatters mini-demos (record-only, next-key, deadlock) mid-article — not one top lock board.
- [ ] `<Cite />` / `<References />`; humanizer pass; first-person voice.

---

## Open questions / author notes

1. **Interactive scope** — Ship record-only + next-key + deadlock as three small embeds; don’t rebuild full gap compatibility matrix in v1.

2. **Victim heuristic animation** — Real InnoDB uses “number of rows inserted, updated, or deleted.” Script metadata should tag each txn with a write-count so the animation isn’t arbitrary. Call out that “too deep wait-for graph” (≥200 txns) is an ops edge case, not interactive material.

3. **P_S `LOCK_MODE` strings** — Docs list `S[,GAP]` / `X[,GAP]` / …; deadlock example output also shows `S,REC_NOT_GAP` / `X,REC_NOT_GAP`. Teach both: board uses friendly labels (`record`, `gap`, `next-key`); observability section shows real `data_locks` rows.

4. **ORM defaults** — Confirm how Prisma / Rails / Django expose `FOR UPDATE` (`lock: true`, `with_lock`, `select_for_update`) and whether connection-pool checkout can leave transactions open (bridge to 08/11). One short “ORM cheat sheet” subsection is enough; don’t fork the article per framework.

5. **Scope creep watch** — Semi-consistent reads under RC, AUTO-INC modes, and `LOCK TABLES` recipes are supporting cites only. FK locking → article 16. History list / long txn → already shipped in 11.

6. **Series hub** — When publishing, add `mysql-locks` to hub `seriesList.postSlugs` in Part B order (after `mysql-mvcc`).

7. **Depends-on copy** — Article 09 already teases this piece; keep the forward/back links symmetric (“visibility in 09, locks here”). If 11 isn’t published yet, one sentence of snapshot-vs-lock contrast is still enough to stand alone.

8. **Error codes to mention in prose** — `1213`/`40001` deadlock; `1205` lock wait timeout; `3572` `NOWAIT`. Skip drowning readers in every SQLSTATE.

9. **Demo data for local try-along** — Optional `docker compose` / local MySQL snippet in a callout; not required for the interactive, which must work offline.

10. **Naming** — Component folder `mysql-lock-board/` with per-demo exports; post title stays “Row Locks, Gap Locks & Deadlocks.”

---

## Drafting checklist (when writing the post)

- [ ] Part B opener + 09/11/12 division; no MVCC deep dive
- [ ] Scatter demos mid-article; no import-at-top mega-board
- [ ] `<Cite />` / `<References />`; humanizer pass; no “App consequence:” stamps
- [ ] Checkout deadlock + retry pattern with ERROR 1213 / 1205
- [ ] Forward links: 13, 16, 18, 20
)
