# 09 — Isolation Levels & What Other Requests See

| Field | Value |
| --- | --- |
| **Number** | 09 |
| **Title** | Isolation Levels & What Other Requests See |
| **Slug** | `mysql-isolation` |
| **Tier** | Foundations (Part A) |
| **Hub** | `/projects/mysql/` |
| **Post** | `/posts/mysql-isolation/` |
| **Depends on** | 08 — Transactions & ACID (`mysql-transactions`) |
| **Feeds into** | 11 — MVCC (`mysql-mvcc`); 12 — Locks (`mysql-locks`) |
| **Interactive** | Two-session race visualizer (isolation toggle → what each session sees) |

---

## Intent

Teach web developers what InnoDB isolation levels actually mean for concurrent HTTP handlers: which anomalies show up under each level, why MySQL’s default is `REPEATABLE READ` (and how that differs from Postgres / many ORMs’ mental model), and when production teams intentionally switch to `READ COMMITTED`.

This article is about **visibility** — “what does my request see while another request is mid-flight?” It is *not* the MVCC internals deep dive (article 11) and *not* the row/gap/deadlock deep dive (article 12). Point forward; do not steal those essays.

After reading, a developer should be able to:

1. Name the four SQL:1992 levels InnoDB supports and state MySQL’s default.
2. Map dirty / non-repeatable / phantom reads to two-request race stories.
3. Explain the RR snapshot rule: first consistent read pins the view for the rest of the transaction.
4. Know how to set isolation at next-transaction / session / global scope (`SET TRANSACTION`, `transaction_isolation`).
5. Decide when `READ COMMITTED` is a deliberate operational choice (and what they give up).
6. Avoid the RR footgun of mixing locking reads/DML with plain `SELECT`s expecting one coherent world.

---

## Real-world hook

**Opening scenario — inventory double-check during checkout**

Two concurrent requests hit a shop API:

- **Request A** (checkout): begins a transaction, `SELECT`s stock for SKU `tee-black-m`, sees `qty = 1`, starts payment work (slow Stripe call or queue hop — still inside the txn or at least still “thinking”).
- **Request B** (another checkout, or an admin restock/cancel): commits an update that changes that same row (or inserts a competing reservation).

The reader’s gut question: *When A’s second `SELECT` (or its `UPDATE`) runs, what does it see?*

That answer depends on isolation level — not on “MySQL is magical ACID.” Frame the whole article as answering that question for:

| Level | Metaphor for Request A’s second plain `SELECT` |
| --- | --- |
| `READ UNCOMMITTED` | May see B’s *uncommitted* edit (dirty). |
| `READ COMMITTED` | Sees B only after B commits; each `SELECT` can see a fresher world. |
| `REPEATABLE READ` (default) | Keeps seeing the snapshot from A’s *first* consistent read — even after B commits. |
| `SERIALIZABLE` | Forces locking semantics on plain `SELECT`s (when not a lone autocommit read) so A and B serialize more strictly. |

**Secondary hook — “we moved from Postgres and everything felt wrong.”**  
Postgres defaults to `READ COMMITTED`. Rails / Prisma / Django apps ported onto MySQL keep the same ORM code and suddenly get longer-lived read views, more gap-lock friction under locking statements, and “stale” reads inside a multi-query request. Name this early so readers from other DBs feel seen.

**Companies / product shapes to mention lightly (not case studies):**

- Checkout / inventory (Shopify-style cart finalize).
- Seat or ticket holds (booking: “is this seat free?” twice in one request).
- Admin reporting next to live OLTP (why bulk reads often want RC or a replica, not long RR txns on the primary).
- Stripe-style “read balance → decide → write ledger” inside one request-scoped transaction.

---

## Primary documentation sources

Cite local nodes under `sources/mysql-refman-9.7/nodes/` and link the public HTML in the published post.

| Node id | Public URL | Use in article |
| --- | --- | --- |
| `innodb-transaction-isolation-levels` | https://dev.mysql.com/doc/refman/9.7/en/innodb-transaction-isolation-levels.html | **Core.** All four levels; default RR; locking vs consistent-read behavior per level; RC gap-lock / semi-consistent-read notes; SERIALIZABLE `FOR SHARE` conversion. |
| `set-transaction` | https://dev.mysql.com/doc/refman/9.7/en/set-transaction.html | How to change level: next txn / `SESSION` / `GLOBAL`; `transaction_isolation` variable; startup `--transaction-isolation`; `READ ONLY` access mode (brief). |
| `innodb-consistent-read` | https://dev.mysql.com/doc/refman/9.7/en/innodb-consistent-read.html | Snapshot semantics; RR first-read pins view; RC fresh snapshot per read; classic Session A/B timeline; DML-vs-SELECT visibility gotcha; “freshest state” via RC or locking read. |
| `mysql-acid` | https://dev.mysql.com/doc/refman/9.7/en/mysql-acid.html | Isolation as the *I* in ACID; pointer that levels + locking implement it. Bridge from article 08. |
| `innodb-locking-transaction-model` | https://dev.mysql.com/doc/refman/9.7/en/innodb-locking-transaction-model.html | **Light.** Section map only — “locking strategies differ by isolation; details in article 12.” |

**Supporting (cite sparingly, do not deep-dive):**

| Node id | Public URL | Why |
| --- | --- | --- |
| `innodb-next-key-locking` | https://dev.mysql.com/doc/refman/9.7/en/innodb-next-key-locking.html | Phantom definition + that RR locking reads use next-key/gap locks to block phantoms — tease article 12. |
| `innodb-locking-reads` | https://dev.mysql.com/doc/refman/9.7/en/innodb-locking-reads.html | `FOR UPDATE` / `FOR SHARE` as the “see freshest + lock” alternative to bumping isolation. |
| `commit` (START TRANSACTION) | https://dev.mysql.com/doc/refman/9.7/en/commit.html | `START TRANSACTION` / `WITH CONSISTENT SNAPSHOT` as a way to pin the snapshot explicitly. |
| `innodb-transaction-model` | https://dev.mysql.com/doc/refman/9.7/en/innodb-transaction-model.html | Parent chapter glue if needed. |

**Do not paste Oracle prose.** Paraphrase; always cite node id + URL.

---

## Article structure

Suggested MDX flow (interactive at top, per series pattern):

1. **Interactive** — Two-session race visualizer (see below).
2. **Hook** — Checkout / inventory race; “what does the other request see?”
3. **Bridge from 08** — You already have `BEGIN`/`COMMIT`/autocommit; isolation is the dial on *I*.
4. **The four levels (web-app tour)** — RU → RC → RR → Serializable, default called out hard.
5. **Anomaly catalog** — Dirty / non-repeatable / phantom with HTTP-request metaphors + which levels allow them.
6. **How InnoDB RR actually behaves** — Consistent-read snapshot; first `SELECT` pins; DML visibility surprise; don’t mix locking + nonlocking blindly.
7. **Setting the dial** — `SET TRANSACTION`, scopes, checking `@@transaction_isolation`, ORM notes.
8. **When teams switch to READ COMMITTED** — motivations, tradeoffs, binlog note.
9. **SERIALIZABLE & locking reads** — when to escalate vs when `SELECT … FOR UPDATE` is the real tool.
10. **App patterns / checklist** — short request txns; pick level deliberately; forward links to 11 & 12.
11. **Further reading** — refman links.

Tone: spoon-fed, concrete, no academic isolation-proof digression. Prefer timelines (Session A / Session B) over theory tables alone — then summarize with a table.

---

## Deep-dive beats

### Beat 1 — Isolation is a visibility contract between requests

- Recap ACID *I* from `mysql-acid`: isolation level fine-tunes reliability vs concurrency overhead.
- Reframe for HTTP: each in-flight request (or each explicit transaction inside it) is a “session” that must tolerate other sessions committing.
- Autocommit single-statement requests still *have* an isolation level; multi-statement request handlers make the differences obvious.

### Beat 2 — The four levels, MySQL-shaped

Teach from **most common for InnoDB apps** outward (matches refman emphasis: RR first).

**`REPEATABLE READ` (default)**  
- Consistent (nonlocking) reads use the snapshot established by the **first** such read in the transaction (`innodb-consistent-read`, `innodb-transaction-isolation-levels`).  
- Later plain `SELECT`s in the same txn agree with each other.  
- Locking reads / `UPDATE` / `DELETE` use current row versions + locks; range searches take gap/next-key locks (name them; defer mechanics to 12).  
- Refman warning to paraphrase: mixing locking statements with nonlocking `SELECT`s in one RR txn often wants `SERIALIZABLE` instead — the two “worlds” disagree.

**`READ COMMITTED`**  
- **Each** consistent read gets a **fresh** snapshot.  
- Locking reads lock index records, **not gaps** (except FK / duplicate-key checks) → phantoms possible.  
- Extra app-relevant effects: non-matching row locks released after `WHERE` evaluation; semi-consistent read on `UPDATE` of locked rows → fewer deadlocks / less blocking (high-level only; 12 owns the lock story).  
- Only row-based binary logging is supported; `MIXED` auto-promotes to row.

**`READ UNCOMMITTED`**  
- Dirty reads possible; otherwise behaves like RC. Almost never what a web API wants. Mention for completeness / “don’t set this in prod unless you are doing a very specific dirty scan and understand it.”

**`SERIALIZABLE`**  
- Like RR, but with `autocommit` disabled InnoDB implicitly turns plain `SELECT` into `SELECT … FOR SHARE`.  
- Lone autocommit `SELECT` can still be a nonlocking consistent read.  
- Specialized: XA, troubleshooting concurrency — rarely the default for CRUD APIs.

### Beat 3 — Anomalies as HTTP metaphors

Keep a single running cast: **Request A** (reader or checkout) and **Request B** (writer).

| Anomaly | HTTP metaphor | Allowed under (InnoDB practical) |
| --- | --- | --- |
| **Dirty read** | A’s GET handler reads a price/qty B wrote but later **rolls back** (payment failed). A showed a lie. | `READ UNCOMMITTED` |
| **Non-repeatable read** | Same request handler `SELECT`s order status twice; between the two, B commits `paid`. Second read differs. | `READ COMMITTED` (and RU). Blocked for plain consistent reads under RR (same snapshot). |
| **Phantom** | A lists “open tickets where `event_id = 42`” twice; B inserts a new open ticket and commits; A’s second list grows. | Possible under RC for many workloads; RR uses next-key/gap locking on **locking** range scans to prevent phantoms (point to `innodb-next-key-locking` + article 12). Emphasize: RR’s *consistent read* snapshot also means new committed rows stay invisible to plain `SELECT`s until snapshot advances. |

Clarify a subtle teaching point many blogs muddy:

- Under RR, **plain `SELECT`** “avoids” seeing others’ commits by **stale snapshot**, not by blocking writers.
- Preventing others from *inserting into a range you intend to update* is a **locking** story (gap/next-key) — article 12.

### Beat 4 — The consistent-read timeline (must-teach)

Reproduce (paraphrased) the classic A/B timeline from `innodb-consistent-read`:

1. A: `SELECT` → empty (snapshot taken).  
2. B: `INSERT` … `COMMIT`.  
3. A: `SELECT` → still empty (same snapshot).  
4. A: `COMMIT`, then `SELECT` → sees the row.

Also teach the **DML vs SELECT** gotcha from the same node (high leverage for apps):

- A RR transaction’s `SELECT COUNT(*) … WHERE c1 = 'xyz'` may return 0.  
- The same txn’s `DELETE … WHERE c1 = 'xyz'` may delete rows **just committed by others**.  
- After that DML, subsequent `SELECT`s in A can see rows A itself touched.  
- Mental model: snapshot governs consistent reads; DML operates on current rows + locks. This is why “I checked it was empty then deleted nothing” is not always true if you only checked with a nonlocking `SELECT` while writers are committing.

Show the escape hatches named in the docs:

- Want freshest state: use `READ COMMITTED`, **or** a locking read (`FOR SHARE` / `FOR UPDATE`).  
- Want to advance the RR timepoint: `COMMIT` (then new txn) or `START TRANSACTION WITH CONSISTENT SNAPSHOT` patterns as appropriate.

### Beat 5 — Setting isolation in real apps

From `set-transaction`:

| Scope | Syntax idea | App meaning |
| --- | --- | --- |
| Next transaction only | `SET TRANSACTION ISOLATION LEVEL READ COMMITTED;` (no `SESSION`/`GLOBAL`) | One checkout txn wants RC; rest of pool session stays default. **Must run before the txn starts.** |
| Session | `SET SESSION TRANSACTION ISOLATION LEVEL …` or `SET @@SESSION.transaction_isolation = …` | Connection-pool hazard: session state sticks. Prefer explicit per-txn set or pool reset. |
| Global | `SET GLOBAL …` / `--transaction-isolation=READ-COMMITTED` | Fleet-wide policy (common: default MySQL RR → ops sets RC). |

Teaching points:

- Cannot change characteristics mid-transaction (`ERROR 1568`) — set before `START TRANSACTION`.  
- Inspect: `SELECT @@GLOBAL.transaction_isolation, @@SESSION.transaction_isolation;`.  
- Startup values use dashes: `READ-COMMITTED`, etc.  
- ORM callouts (short):  
  - Rails: `ActiveRecord::Base.transaction(isolation: :read_committed)` (verify current API in prose when writing).  
  - Prisma / Sequelize / Django: how (or whether) they expose isolation; warn that “just open a transaction” inherits server/session default (often RR on MySQL).  
  - Connection pools: sticky `SESSION` isolation is a classic footgun after a rare code path sets it.

### Beat 6 — When teams switch to READ COMMITTED

Honest “why prod flips the dial” section — this is a primary focus of the article.

**Common motivations:**

1. **Lock contention / deadlocks under RR** — gap locks and long-held locks on scanned rows during `UPDATE`/`DELETE` hurt hot tables (inventory, counters, queues). RC releases non-matching locks and skips most gap locks.  
2. **Postgres parity** — same app logic, fewer “why is this snapshot stale?” surprises for multi-statement reads that *want* to see commits.  
3. **Hot row updaters** — semi-consistent read behavior makes concurrent `UPDATE … WHERE` less blocking (explain outcome, not internals).  
4. **Reporting / export sessions** on the primary — prefer short RC reads or a replica (also tease long-txn harm → article 11).

**What you give up / must accept:**

- Non-repeatable reads inside one request transaction (design handlers to read-once or lock what they will update).  
- Phantoms more available when using locking range patterns without gap locks.  
- Binlog must be row-based (usually already true in modern setups).  
- You still need **explicit locking** or careful upserts for correctness (inventory reservation is not “solved by RC”).

**Decision heuristic for the article:**

- Default RR is fine for many apps with **short** transactions and clear locking reads at the point of write.  
- Switch to RC when metrics show gap-lock waits / deadlocks on hot ranges *or* when product semantics want “each query sees latest committed” inside a multi-query request.  
- Do not use RU for request handlers.  
- Reach for `FOR UPDATE` (article 12) when the bug is “two checkouts sold the last item,” not when the bug is “my second SELECT looked weird.”

### Beat 7 — Coordination with 11 and 12 (explicit in prose)

| Topic | This article (09) | Later |
| --- | --- | --- |
| Snapshots / undo / history list / “idle in transaction” | Name that consistent reads use MVCC snapshots | **11** owns undo, purge, history length |
| Gap locks, next-key, deadlock examples, lock waits | Name that RR locking reads take gap/next-key locks; RC mostly doesn’t | **12** owns lock types, diagrams, deadlock debugging |
| `FOR UPDATE` inventory pattern | Mention as the tool for “claim the row” | **12** works the pattern fully |

One short paragraph near the end: “If you only remember one split: **09 = what you see; 11 = how InnoDB versions rows so you can see it; 12 = how writers block each other.**”

### Beat 8 — Closing app checklist (inline, expanded in Tie-back)

- Keep transactions shorter than external I/O (don’t hold RR snapshots across Stripe round-trips — link back to 08).  
- Know your server default; don’t assume Postgres RC.  
- Read once or lock for update when correctness matters.  
- Prefer next-transaction-scoped isolation changes over sticky session changes in pools.

---

## Interactive feature

### Name

**Two-Session Race Visualizer**  
Suggested component path: `src/components/interactive/mysql-isolation-race/` (client component, imported at top of MDX — same pattern as RAID / neural-net / 8-puzzle).

### Goal

Let the reader *toggle isolation* and step a fixed race script; the UI shows what Session A’s result set is after each step so the anomaly becomes visceral.

### UX sketch

- **Top controls:** Isolation select — `READ UNCOMMITTED` | `READ COMMITTED` | `REPEATABLE READ` | `SERIALIZABLE` (default selected: `REPEATABLE READ`).  
- **Scenario picker (tabs or select):**  
  1. **Dirty / commit-or-rollback** — B updates then commits *or* rolls back; A reads in between.  
  2. **Non-repeatable** — A reads, B commits update, A reads again.  
  3. **Phantom** — A range-reads, B inserts into range and commits, A range-reads again.  
- **Two columns:** Session A | Session B, each with a mini statement log and a “result table” pane.  
- **Stepper:** Prev / Next / Reset (RAID-like phased workflow). Optional autoplay.  
- **Status chips:** “Snapshot pinned @ t0”, “Fresh snapshot”, “Dirty read”, “Blocked waiting for lock” (SERIALIZABLE / locking cases — keep lock blocking *light*; no full lock table UI).  
- **Caption under the board:** one sentence explaining the current step under the selected level.

### Teaching scripts (implement as data, not hard-coded JSX)

**Script NRR — non-repeatable / snapshot**

| Step | A | B | RR expected | RC expected |
| --- | --- | --- | --- | --- |
| 0 | `START TRANSACTION` | — | — | — |
| 1 | `SELECT qty FROM items WHERE id=1` → `5` | — | snapshot @ t1 | snapshot @ t1 |
| 2 | — | `UPDATE items SET qty=4 WHERE id=1; COMMIT` | committed in DB | committed |
| 3 | `SELECT qty …` | — | still `5` | `4` |
| 4 | `COMMIT` | — | — | — |
| 5 | `SELECT qty …` | — | `4` | `4` |

**Script PH — phantom (plain SELECTs)**

| Step | A | B | RR | RC |
| --- | --- | --- | --- | --- |
| 1 | `SELECT id FROM orders WHERE status='open'` → `(1)` | — | snap | snap |
| 2 | — | `INSERT` open order `2`; `COMMIT` | — | — |
| 3 | same `SELECT` | — | still `(1)` | `(1),(2)` |

**Script DR — dirty (RU vs others)**

| Step | A | B | RU | RC/RR |
| --- | --- | --- | --- | --- |
| 1 | `START TRANSACTION`; `SELECT price` → `20` | `START TRANSACTION`; `UPDATE price=1` (uncommitted) | A may see `1` | A still `20` |
| 2 | — | `ROLLBACK` | A’s dirty value vanishes on next rules; emphasize RU danger | — |

**SERIALIZABLE flavor:** for the NRR script, show A’s second plain `SELECT` as taking `FOR SHARE` semantics (may block until B ends) when A has an open txn — simplified, with a “blocked” state rather than full lock graph.

### Implementation notes

- Pure client simulation with a tiny in-memory table + scripted commits; **no live MySQL**.  
- Encode expected visibility per `(scenario, level, step)` so toggling isolation on the same step instantly rewrites A’s result pane.  
- Keep visual language consistent with site interactives (ink borders, mono logs, clear step hints) without inventing a new design system.  
- Accessibility: keyboard stepper, live region announcing “Session A now sees qty=5”.  
- Tests: unit-test the pure visibility function (scenario × level × step → rows), same spirit as `raid.test.ts` / puzzle search tests.

### Success criterion

A reader who only plays with the widget should correctly predict RR vs RC on the inventory double-`SELECT` before reading Beat 4.

---

## Example queries/schemas

Use one tiny schema across prose + interactive:

```sql
CREATE TABLE items (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  sku VARCHAR(64) NOT NULL UNIQUE,
  qty INT NOT NULL,
  price_cents INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  status ENUM('open', 'paid', 'canceled') NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  KEY (status),
  KEY (item_id)
) ENGINE=InnoDB;

INSERT INTO items (id, sku, qty, price_cents) VALUES
  (1, 'tee-black-m', 5, 2000);
INSERT INTO orders (id, status, item_id) VALUES
  (1, 'open', 1);
```

**Demonstrate setting / inspecting isolation:**

```sql
SELECT @@GLOBAL.transaction_isolation, @@SESSION.transaction_isolation;

-- Next transaction only (pool-safe pattern)
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT qty FROM items WHERE id = 1;
-- ...
COMMIT;

-- Session-wide (warn about pools)
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

**RR snapshot race (reader can paste into two mysql clients):**

```sql
-- Session A
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT qty FROM items WHERE id = 1;  -- note value

-- Session B
UPDATE items SET qty = qty - 1 WHERE id = 1;
COMMIT;

-- Session A
SELECT qty FROM items WHERE id = 1;  -- same as first under RR
COMMIT;
SELECT qty FROM items WHERE id = 1;  -- now fresh
```

**RC contrast:** same script with `READ COMMITTED` — second `SELECT` in A sees B’s commit.

**DML vs SELECT gotcha (advanced callout box):**

```sql
-- Session A (RR)
START TRANSACTION;
SELECT COUNT(*) FROM orders WHERE status = 'open';  -- say 1

-- Session B inserts another open order and COMMITs

-- Session A
SELECT COUNT(*) FROM orders WHERE status = 'open';     -- still 1 (snapshot)
-- But an UPDATE/DELETE targeting those rows can still affect B's new row;
-- after A modifies it, later SELECTs in A may see it.
```

**Locking-read alternative (tease 12):**

```sql
START TRANSACTION;
SELECT qty FROM items WHERE id = 1 FOR UPDATE;  -- freshest + claim
-- business logic
UPDATE items SET qty = qty - 1 WHERE id = 1;
COMMIT;
```

**SERIALIZABLE sketch:**

```sql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
START TRANSACTION;
SELECT qty FROM items WHERE id = 1;  -- behaves like FOR SHARE when autocommit=0
COMMIT;
```

---

## Tie-back checklist

Reader / author verification before publishing:

- [ ] Opens with a concurrent **web request** race, not a textbook bank-account only.  
- [ ] States clearly: **InnoDB default = `REPEATABLE READ`**.  
- [ ] Contrasts with **Postgres / ORM** RC expectations.  
- [ ] Defines dirty / non-repeatable / phantom with **HTTP metaphors**.  
- [ ] Explains RR **first consistent read pins snapshot**; RC **fresh snapshot per read**.  
- [ ] Calls out **DML can affect rows invisible to plain SELECT** under RR.  
- [ ] Documents how to set isolation at **next / session / global** and the **pool sticky-session** hazard.  
- [ ] Explains **why teams adopt READ COMMITTED** (contention, deadlock reduction, fresher reads) and tradeoffs (anomalies, row binlog).  
- [ ] Mentions SERIALIZABLE + `FOR SHARE` conversion without recommending it as a CRUD default.  
- [ ] Interactive demonstrates at least RR vs RC on the same race.  
- [ ] Explicit **forward links**: MVCC/undo → article 11; gap/next-key/deadlocks/`FOR UPDATE` inventory → article 12.  
- [ ] Does **not** explain undo history list growth or lock wait graphs in depth.  
- [ ] Cites primary nodes with public 9.7 URLs.  
- [ ] Ends with actionable app rules: short txns, read-once or lock, don’t hold snapshots across slow I/O.

---

## Open questions / author notes

1. **Interactive SERIALIZABLE fidelity** — Full blocking simulation may be confusing. Prefer a simplified “blocked until B commits” state for one script; link to article 12 for real lock waits. Confirm in implementation whether RU dirty reads are worth a third scenario tab or a footnote mode.  
2. **ORM API accuracy** — When drafting the post, verify current Rails / Prisma / Django isolation APIs rather than relying on memory; keep that subsection short.  
3. **MySQL vs Postgres phantom story** — Postgres RR is not identical to InnoDB RR. One careful callout box is enough; do not derail into a cross-engine thesis.  
4. **Article 08 handoff** — Ensure 08 only *names* isolation and points here; 09 should not re-teach `COMMIT`/`ROLLBACK`/`autocommit` except one bridge paragraph.  
5. **Article 11/12 handoff** — Share the visibility-vs-versions-vs-locks one-liner with those plans so all three open/close consistently.  
6. **Binlog / replication** — RC’s row-logging requirement is one sentence here; replica lag / read-your-writes stays article 19.  
7. **`WITH CONSISTENT SNAPSHOT`** — Optional advanced note; only if it helps the “pin timepoint” mental model without crowding the main RR rule.  
8. **Live demo vs simulation** — Site pattern is client simulation (RAID etc.). Stay simulated; optionally later add a “paste this in two terminals” appendix (already in Example queries).  
9. **Default recommendation voice** — Prefer “know your default; choose deliberately” over “everyone should switch to RC.” Many MySQL fleets stay on RR successfully with short transactions + locking reads.  
10. **Scope creep watch** — Semi-consistent read and gap locks are *motivations* for RC, not a license to paste lock matrices into 09.

---

## Draft metadata (for when the post is created)

```yaml
title: Isolation Levels & What Other Requests See
slug: mysql-isolation
series: Learn MySQL
seriesOrder: 9
tier: Foundations
description: >
  What concurrent HTTP handlers actually see under MySQL isolation levels —
  RR vs RC, dirty/non-repeatable/phantom races, and when teams switch defaults.
interactive: mysql-isolation-race
```
)
