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
| **Status** | Plan only |

---

## Authoring contract

- **Status:** Plan only — stub wired; article not written yet.
- **Voice:** First person, casual/jokey, flowing prose. Run humanizer pass (`~/.cursor/skills/humanizer`) before publish.
- **No formulaic stamps:** No `**Why bother:**`, “App consequence:”, or “Things to Play With” laundry lists — weave motivation into paragraphs.
- **Citations:** IEEE `<Cite n={…} />` in prose + `<References items={[…]} />` at bottom. Source technical claims; paraphrase refman only.
- **Interactives:** 3–5 small demos embedded **mid-article** next to the beat they teach (motivate → explain → embed). Cut demos that don’t clarify a tradeoff.
- **House defaults:** Integer cents for money; ULID `CHAR(26)` public ids; `utf8mb4` / `utf8mb4_0900_ai_ci`; Prisma as primary ORM in snippets.
- **Length:** ~10 minutes for a casual skim unless the topic truly needs more.

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

Place the inventory double-check race in the anomaly / RR sections — Postgres contrast early if it helps readers feel seen.

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

Cite with `<Cite />` / `<References />`. Local nodes under `sources/mysql-refman-9.7/nodes/`.

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

Suggested MDX flow — sentence-case H2s. Scatter **named mini-demos** mid-article; no mega race board at the top.

1. **Series beat + bridge from 08** — isolation is the dial on *I*; you already have BEGIN/COMMIT.
2. **Hook** — Checkout / inventory race; “what does the other request see?”
3. **The four levels (web-app tour)** — RU → RC → RR → Serializable; default RR called out hard.
4. **Anomaly catalog** — dirty / non-repeatable / phantom with HTTP metaphors. *(Embed **Dirty read (RU)** mini-demo here — optional, footnote mode OK.)*
5. **How InnoDB RR actually behaves** — consistent-read snapshot; first `SELECT` pins. *(Embed **Snapshot pin stepper** — RR script here.)*
6. **READ COMMITTED contrast** — fresh snapshot per read. *(Embed **RC fresh read** — same script, RC selected — here or adjacent to #5.)*
7. **DML vs SELECT gotcha** — COUNT vs DELETE surprise. *(Embed **DML vs SELECT gotcha** here.)*
8. **Setting the dial** — `SET TRANSACTION`, scopes, pool sticky-session hazard.
9. **When teams switch to READ COMMITTED** — motivations, tradeoffs.
10. **SERIALIZABLE & locking reads** — tease `FOR UPDATE` → 12.
11. **App patterns / checklist** — short txns; forward links to 11 & 12.
12. **References** — IEEE list.

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

**Folder:** `src/components/interactive/mysql-isolation-race/` (shared chrome from `schema-byte-budget/shared.tsx`).

**Rule:** If a demo doesn’t clarify a tradeoff, cut it and let prose carry the beat. Pure client simulation — no live MySQL. Split the old single mega visualizer into **focused embeds** sharing one visibility engine + unit tests.

### 1. Snapshot pin stepper (RR)

- **Goal:** Classic A/B timeline — first `SELECT` pins; second `SELECT` ignores B’s commit until A commits.
- **Placement:** Section 5 (InnoDB RR behavior).
- **UX:** Two-column Session A | B; stepper; isolation fixed to RR; status chip “Snapshot pinned @ t0”.

### 2. RC fresh read

- **Goal:** Same script as #1 with RC — second `SELECT` sees B’s commit.
- **Placement:** Section 6 (RC contrast) — can be same component with isolation toggle if embed count must stay low.
- **UX:** Toggle RC vs RR on identical steps; A’s result pane updates instantly.

### 3. Phantom range read

- **Goal:** Plain `SELECT` list grows under RC, stays pinned under RR snapshot.
- **Placement:** Section 4 (phantom anomaly) or section 5.
- **UX:** Range query on `orders WHERE status='open'`; B inserts + commits between A’s reads.

### 4. DML vs SELECT gotcha

- **Goal:** `SELECT COUNT(*)` says 0 while `DELETE` still removes B’s newly committed row.
- **Placement:** Section 7 (DML vs SELECT).
- **UX:** Stepped script with COUNT → B commits → DELETE → subsequent SELECT in A.

### 5. Dirty read (RU) — optional, cut if scope tight

- **Goal:** Show why RU is not for request handlers.
- **Placement:** Section 4 (dirty read) as footnote mode.

**Implementation notes:** Encode visibility as `(scenario, level, step) → rows`; keyboard stepper; live region for a11y.

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
- [ ] Scattered mini-demos demonstrate RR vs RC on the same race (snapshot pin minimum)  
- [ ] Explicit **forward links**: MVCC/undo → article 11; gap/next-key/deadlocks/`FOR UPDATE` inventory → article 12.  
- [ ] Does **not** explain undo history list growth or lock wait graphs in depth.  
- [ ] Cites primary nodes via `<Cite />` / `<References />`  
- [ ] Ends with actionable app rules: short txns, read-once or lock, don’t hold snapshots across slow I/O.

---

## Open questions / author notes

1. **Interactive SERIALIZABLE fidelity** — Full blocking simulation may be confusing. Prefer simplified “blocked until B commits” in snapshot stepper only; link to article 12. RU dirty reads: optional 5th mini-demo or footnote — don’t require one top mega-board with all scenarios.  
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

## Drafting checklist (when writing the post)

- [ ] Replace stub MDX; scatter 3–5 mini-demos mid-article (snapshot pin + RC contrast minimum)
- [ ] Humanizer pass; first-person voice; `<Cite />` + `<References />`
- [ ] Bridge from 08 without re-teaching COMMIT/autocommit
- [ ] Forward links to 11 (MVCC) and 12 (locks); no undo/deadlock deep dives

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
interactive: scattered mini-demos (snapshot-pin, rc-contrast, phantom, dml-vs-select)
```
)
