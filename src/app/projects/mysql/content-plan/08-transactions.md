# 08 — Transactions & ACID for Request Handlers

| Field | Value |
| --- | --- |
| **Number** | 08 |
| **Title** | Transactions & ACID for Request Handlers |
| **Slug** | `mysql-transactions` |
| **Tier** | Foundations (Part A) |
| **Series hub** | `/projects/mysql/` |
| **Post path** | `/posts/mysql-transactions/` |
| **Prev / next** | 07 Writes → **08** → 09 Isolation Levels |
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

Teach web developers to treat a multi-statement request (checkout, signup, transfer) as one **atomic unit of work** against InnoDB: begin → mutate → commit or rollback. Readers leave able to:

1. Map **ACID** (especially Atomicity + Durability) to what their HTTP handler actually promises.
2. Choose an explicit transaction boundary (`START TRANSACTION` / ORM `transaction` block) instead of relying on accidental autocommit.
3. Diagnose **partial failure** — “order row written, inventory never decremented” — as an autocommit / missing-transaction bug, not mysterious data corruption.
4. Know that **isolation** exists and matters for concurrent checkouts, but defer the deep dive to article 09.

This is the Foundations pivot from “how do I write one SQL statement correctly?” (articles 1–7) to “how do several writes become one business decision?”

---

## Real-world hook

Place checkout / transfer stories in the sections where atomicity and autocommit land — not forced cold opens unless they’re the best hook.

**Stripe / Shopify-style checkout** (primary narrative): a single `POST /checkout` must (a) reserve or decrement inventory, (b) create an order + line items, (c) record a payment intent / charge reference, and often (d) enqueue a fulfillment event. If step (b) succeeds and step (c) fails, the customer sees an error but stock is already gone — or worse, money is captured with no order. The database transaction is the first line of defense for the *local* consistency of those rows; payment APIs and outbox/saga patterns sit *outside* or *beside* that boundary (call that out; don’t pretend one MySQL `COMMIT` settles Stripe).

**Banking / ledger transfer** (secondary): debit account A, credit account B. Autocommit on each `UPDATE` is a double-entry bug waiting to happen. Same mental model as checkout, cleaner arithmetic.

**Signup with side tables** (tertiary, shorter): create `users` + `profiles` + default `workspaces` membership. Partial signup rows are a classic ORM footgun when each `save()` autocommits.

Tone: “your request handler is already a transaction in the business sense — make the database agree.”

---

## Primary documentation sources

Cite with `<Cite />` / `<References />`. Local nodes under `sources/mysql-refman-9.7/nodes/`.

### Core (must read / cite in article)

| Node id | Local file | Public URL | Why it matters |
| --- | --- | --- | --- |
| `mysql-acid` | `nodes/mysql-acid.md` | https://dev.mysql.com/doc/refman/9.7/en/mysql-acid.html | Official ACID framing for InnoDB: A↔transactions/`COMMIT`/`ROLLBACK`/`autocommit`; C↔doublewrite/crash recovery; I↔isolation levels; D↔flush/sync/hardware. Use as the vocabulary section. |
| `commit` | `nodes/commit.md` | https://dev.mysql.com/doc/refman/9.7/en/commit.html | `START TRANSACTION` / `BEGIN` / `COMMIT` / `ROLLBACK` / `SET autocommit`; default autocommit-on semantics; `WITH CONSISTENT SNAPSHOT`, `READ ONLY`/`READ WRITE`; API note (prefer client/ORM methods); mixed-engine and nontransactional caveats. |
| `sql-transactional-statements` | `nodes/sql-transactional-statements.md` | https://dev.mysql.com/doc/refman/9.7/en/sql-transactional-statements.html | Chapter hub for transactional + locking statements; points into `commit` and XA. |
| `innodb-introduction` | `nodes/innodb-introduction.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-introduction.html | InnoDB is default; DML follows ACID with commit/rollback/crash recovery; row locks + consistent reads. Ground “why InnoDB” before ACID details. |
| `innodb-autocommit-commit-rollback` | `nodes/innodb-autocommit-commit-rollback.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-autocommit-commit-rollback.html | **Primary “autocommit” source** (there is no standalone `autocommit` node): every statement is a transaction when autocommit is on; explicit multi-statement tx; session ending with autocommit=0 rolls back; locks released on commit/rollback; client-language note. |

### Supporting (cite where the beat needs them)

| Node id | Public URL | Use |
| --- | --- | --- |
| `implicit-commit` | https://dev.mysql.com/doc/refman/9.7/en/implicit-commit.html | DDL / admin / `START TRANSACTION` itself can silently commit an open tx — ORM migration-in-request and “nested transaction” myths. |
| `cannot-roll-back` | https://dev.mysql.com/doc/refman/9.7/en/cannot-roll-back.html | Don’t put DDL inside a checkout transaction; partial rollback is impossible. |
| `set-transaction` | https://dev.mysql.com/doc/refman/9.7/en/set-transaction.html | Light intro only: isolation levels exist; default `REPEATABLE READ`; point to article 09. |
| `innodb-transaction-isolation-levels` | https://dev.mysql.com/doc/refman/9.7/en/innodb-transaction-isolation-levels.html | One short “I means…” teaser; do not enumerate anomaly matrices here. |
| `savepoint` | https://dev.mysql.com/doc/refman/9.7/en/savepoint.html | Optional advanced beat: partial rollback *within* one transaction (rare in request handlers; mention, don’t center). |
| `xa` | https://dev.mysql.com/doc/refman/9.7/en/xa.html | Explicitly **out of scope** for Foundations; one sentence if readers ask about distributed tx / 2PC. |

**Citation style in the published post:** `<Cite n={…} />` in prose + `<References items={[…]} />` at bottom — not inline doc hyperlinks on code.

---

## Article structure

Suggested MDX outline — sentence-case H2s. Scatter **named mini-demos** mid-article; no stepper at the top.

1. **Series beat + what today covers** — from single-statement writes (07) to multi-step request atomicity.
2. **Hook** — Shopify/Stripe checkout partial-failure story (2–3 paragraphs).
3. **What “transaction” means for a request handler** — one connection, one unit of work, commit makes changes durable & visible.
4. **ACID in plain English (InnoDB edition)** — four short subsections; Isolation teaser → 09; Durability teaser → 14.
5. **Autocommit: the default that surprises ORM users** — each statement is its own transaction. *(Embed **Autocommit footgun toggle** here.)*
6. **Explicit boundaries: `START TRANSACTION` / `BEGIN` → `COMMIT` / `ROLLBACK`**
7. **Request-scoped pattern** — open at start of use-case, commit before success response, rollback in `catch`. *(Embed **Checkout transaction stepper** here — commit vs rollback paths.)*
8. **ORM pitfalls** — Prisma-first; Rails/Django contrasts (see Deep-dive beats).
9. **Partial failure modes** — inventory without order; implicit commit from DDL. *(Optional **Partial failure** animation in stepper.)*
10. **What belongs inside vs outside the DB transaction** — Stripe API, outbox pattern (light).
11. **Tie-back checklist**
12. **References** — IEEE list; bridge to 09 (isolation).

Target length: ~10 minutes skim; ~2.5–4k words only if every beat earns it.

---

## Deep-dive beats

### Beat A — ACID mapped to a checkout

Use `mysql-acid` as the spine. For each letter, one sentence of definition + one checkout translation:

| Letter | InnoDB angle (from docs) | Checkout translation |
| --- | --- | --- |
| **A** Atomicity | Transactions; `autocommit`; `COMMIT` / `ROLLBACK` | All of: decrement stock, insert `orders`, insert `order_items` — or none. |
| **C** Consistency | Doublewrite, crash recovery; also app/DB constraints | Constraints (`CHECK`, FK, non-null money) + invariants (“stock ≥ 0”) hold after commit; crash mid-tx doesn’t leave torn pages. |
| **I** Isolation | Isolation level + locking (teaser) | Concurrent checkouts shouldn’t both sell the last unit — *how* MySQL enforces that is article 09 / 12. |
| **D** Durability | `innodb_flush_log_at_trx_commit`, sync, hardware | After successful `COMMIT`, a power blip shouldn’t erase the order (tradeoffs → article 14). |

Emphasize: apps usually need **A** first; they often confuse “we caught the exception in Express” with “MySQL rolled back.”

### Beat B — Autocommit is on by default

From `commit` + `innodb-autocommit-commit-rollback`:

- New sessions start with **autocommit enabled**.
- Each statement is atomic *by itself*; `ROLLBACK` cannot undo a prior successful statement once it autocommitted.
- Multi-statement work requires either:
  - `START TRANSACTION` … `COMMIT`/`ROLLBACK` (autocommit restored after), or
  - `SET autocommit = 0` for the session (easy to leak “idle in transaction” — foreshadow article 11).
- Prefer **request-scoped explicit transactions** over flipping session autocommit for the life of a pooled connection.

**ORM pitfall matrix (teach explicitly):**

| Stack | Happy path | Footgun |
| --- | --- | --- |
| **Rails** | `ActiveRecord::Base.transaction { … }` | Multiple `save!` / `update!` outside a block → each statement commits; `after_commit` vs `after_save` confusion; nested `transaction` uses savepoints. |
| **Prisma** | `prisma.$transaction([…])` or interactive `$transaction(async (tx) => …)` | Sequential `prisma.order.create` then `prisma.inventory.update` **without** `$transaction` → two autocommit txs; interactive tx timeout if you await Stripe inside the block. |
| **Django** | `with transaction.atomic():` | Autocommit mode is default; views that call multiple `Model.save()` without `atomic()`; `on_commit()` hooks for post-success side effects. |

Show the same SQL underneath: `START TRANSACTION` / `COMMIT` (or connector equivalents). Quote the refman note that many APIs provide their own begin/commit methods and those should be preferred over raw strings when available.

### Beat C — BEGIN / COMMIT / ROLLBACK mechanics

From `commit.md`:

- `START TRANSACTION` (standard, preferred) vs `BEGIN` / `BEGIN WORK` (aliases; **not** the same as `BEGIN … END` in stored programs).
- `COMMIT` → changes permanent + visible to other sessions; locks released.
- `ROLLBACK` → cancel all modifications in the current tx; locks released.
- Beginning a new transaction **commits any pending transaction** (implicit commit) — “nested transactions” are not real in MySQL; Rails/Prisma nested APIs are savepoints or no-ops depending on stack.
- Statement errors vs transaction rollback: a single-statement failure may roll back *that statement* while leaving the transaction open (InnoDB preserves locks) — apps must still `ROLLBACK` or retry cleanly. Point to error-handling docs lightly; don’t derail.

### Beat D — Request-scoped lifecycle

Canonical pattern for a checkout handler:

```
acquire connection from pool
START TRANSACTION
  validate cart / lock or update inventory
  insert order + items
  insert payment_local_row (status=pending)  -- not the Stripe API call
COMMIT
release connection
call Stripe / enqueue outbox  -- outside, or use transactional outbox
```

Failure path:

```
ROLLBACK
release connection
return 4xx/5xx / idempotent retry guidance
```

Rules of thumb:

1. **Short transactions** — no HTTP calls to payment providers inside the open tx.
2. **One connection** owns the tx; don’t hop pools mid-flight.
3. **Idempotency keys** at the app layer (checkout attempt id) so retries after network blips don’t double-insert after a successful commit the client never saw.
4. Pooling: never leave `autocommit=0` on a returned connection; prefer begin/commit that restores defaults.

### Beat E — Partial failure & implicit commit

Scenarios to dramatize (interactive covers #1):

1. Autocommit: inventory `UPDATE` commits; order `INSERT` fails → phantom reservation.
2. Explicit tx, app forgets `ROLLBACK` on exception and returns connection to pool → next request sees weird state / long lock holds (bridge to MVCC article).
3. Mid-tx `ALTER` / migration helper / `TRUNCATE` → **implicit commit** (`implicit-commit`) of earlier DML; subsequent `ROLLBACK` cannot undo.
4. DDL cannot roll back (`cannot-roll-back`) — schema changes are not checkout steps.

### Beat F — Isolation teaser (stop here)

One paragraph + link:

> Isolation is the *I* in ACID: what can concurrent sessions see while your checkout transaction is open? InnoDB’s default is `REPEATABLE READ`. Changing that (or understanding phantom inventory reads) is the next article — [Isolation Levels & What Other Requests See](/posts/mysql-isolation/).

Do **not** teach gap locks, consistent read snapshots, or anomaly tables in 08.

### Beat G — Outside the database

Brief honesty section:

- Charging a card is not rolled back by MySQL.
- Patterns: authorize → commit local rows → capture; or **transactional outbox** (insert outbox row in same tx, worker publishes); compensating transactions if capture succeeds and local commit fails (rare if ordered correctly).
- Keep this to ~1 screen so the article stays about MySQL transactions.

---

## Interactive feature

**Folder:** `src/components/interactive/mysql-transaction-stepper/` or `checkout-transaction/` (shared chrome from `schema-byte-budget/shared.tsx`; reuse RAID phase-rail pattern).

**Rule:** If a demo doesn’t clarify a tradeoff, cut it and let prose carry the beat. Pure client simulation — no live MySQL.

### 1. Checkout transaction stepper

- **Goal:** Walk BEGIN → inventory → order → payment row → COMMIT or ROLLBACK; pending rows vs committed state.
- **Placement:** Section 7 (request-scoped pattern).
- **UX:** Numbered phase rail (RAID-like); table panels show uncommitted (dashed) vs solid rows; other-session SELECT panel updates on commit; failure injection after step 3.

### 2. Autocommit footgun toggle

- **Goal:** Show each step committing immediately — inventory decrement survives failed order INSERT.
- **Placement:** Section 5 (autocommit).
- **UX:** Same checkout script rewritten so `ROLLBACK` after a failed step cannot undo prior autocommitted statements.

### 3. Partial failure callout (optional — may live inside stepper)

- **Goal:** Dramatize “inventory updated, order never created” without a second mega-lab.
- **Placement:** Section 9 (partial failure modes).
- **UX:** Single-frame before/after with autocommit on vs explicit transaction.

**Non-goals for v1:** isolation anomalies, deadlock simulation (09/12).

---

## Example queries / schemas

Minimal schema for article + interactive (money as integer cents; aligns with article 01 guidance if that lands):

```sql
CREATE TABLE products (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(32) NOT NULL UNIQUE,
  stock INT UNSIGNED NOT NULL,
  price_cents INT UNSIGNED NOT NULL
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','paid','cancelled') NOT NULL,
  total_cents INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE order_items (
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  qty INT UNSIGNED NOT NULL,
  price_cents INT UNSIGNED NOT NULL,
  PRIMARY KEY (order_id, product_id),
  CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders (id),
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL UNIQUE,
  provider_ref VARCHAR(64) NULL,
  status ENUM('pending','authorized','captured','failed') NOT NULL,
  amount_cents INT UNSIGNED NOT NULL,
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders (id)
) ENGINE=InnoDB;
```

**Happy-path SQL (explicit transaction):**

```sql
START TRANSACTION;

-- Fail the whole tx if stock would go negative (app also checks affected rows)
UPDATE products
SET stock = stock - 1
WHERE id = 42 AND stock >= 1;

INSERT INTO orders (user_id, status, total_cents)
VALUES (7, 'pending', 2599);

SET @order_id = LAST_INSERT_ID();

INSERT INTO order_items (order_id, product_id, qty, price_cents)
VALUES (@order_id, 42, 1, 2599);

INSERT INTO payments (order_id, status, amount_cents)
VALUES (@order_id, 'pending', 2599);

COMMIT;
```

**Rollback path (narrate after a forced error):**

```sql
ROLLBACK;
-- products.stock, orders, order_items, payments: unchanged
```

**Autocommit footgun (contrast snippet):**

```sql
-- autocommit=1 (default): this is already durable
UPDATE products SET stock = stock - 1 WHERE id = 42 AND stock >= 1;

-- This fails (e.g. FK / app bug) — inventory is NOT undone by ROLLBACK
INSERT INTO orders (user_id, status, total_cents) VALUES (7, 'pending', 2599);
ROLLBACK;  -- does nothing useful for the UPDATE above
```

**ORM sketch (one of each, short):**

```ruby
ActiveRecord::Base.transaction do
  product.decrement!(:stock)
  order = Order.create!(...)
  order.order_items.create!(...)
  order.create_payment!(status: "pending", ...)
end
```

```ts
await prisma.$transaction(async (tx) => {
  await tx.product.update({ where: { id: 42, stock: { gte: 1 } }, data: { stock: { decrement: 1 } } });
  const order = await tx.order.create({ data: { /* ... */ } });
  await tx.payment.create({ data: { orderId: order.id, status: "pending", /* ... */ } });
});
```

```python
from django.db import transaction

with transaction.atomic():
    Product.objects.filter(pk=42, stock__gte=1).update(stock=F("stock") - 1)
    order = Order.objects.create(...)
    OrderItem.objects.create(order=order, ...)
    Payment.objects.create(order=order, status="pending", ...)
```

**Optional savepoint sidebar** (small):

```sql
START TRANSACTION;
-- ... required steps ...
SAVEPOINT optional_discount;
-- try discount write; on failure:
ROLLBACK TO SAVEPOINT optional_discount;
COMMIT;
```

---

## Tie-back checklist

Readers should be able to answer yes to each:

- [ ] I can explain Atomicity with a multi-table checkout in one sentence.
- [ ] I know MySQL sessions default to **autocommit on**, so two ORM `save`s are two transactions unless I say otherwise.
- [ ] I can write `START TRANSACTION` … `COMMIT` / `ROLLBACK` (or the ORM equivalent) for a request handler.
- [ ] I know to **rollback on error** and not return a pooled connection still “in transaction.”
- [ ] I avoid DDL / implicit-commit statements inside business transactions.
- [ ] I keep external I/O (Stripe, email, HTTP) **out of** the open DB transaction (or use an outbox row committed with the rest).
- [ ] I understand Isolation exists and that MySQL’s default is `REPEATABLE READ`, and I know article 09 is next — not that I’ve mastered anomalies yet.
- [ ] I can spot a partial-failure bug in a PR that updates inventory and creates an order without a transaction block.

---

## Open questions / author notes

1. **Interactive fidelity:** Simulate table state in React only (preferred for v1, like RAID), or wire a tiny SQL.wasm / server mock? Recommendation: pure client simulation with SQL captions — faster, no infra.
2. **Payment narrative boundary:** How hard to push “DB tx ≠ Stripe tx”? Enough that readers don’t think `ROLLBACK` refunds a card, not so much that we write a payments architecture essay. Lean on outbox + “call Stripe after COMMIT.”
3. **FK / stock race:** `UPDATE … WHERE stock >= 1` is enough for Foundations atomicity; true concurrent “last item” correctness needs locking/isolation (09/12). Add a callout box: “This prevents negative stock in one tx; two concurrent txs need the isolation/locking articles.”
4. **`BEGIN` vs `START TRANSACTION`:** Teach `START TRANSACTION` as preferred; mention `BEGIN` because everyone types it; warn about stored-program `BEGIN … END`.
5. **Series glue:** Ensure `seriesList` / hub lists `mysql-transactions` as #8 between writes and isolation; prev/next in post frontmatter.
6. **Naming collision:** Slug `mysql-transactions` is clear; interactive component name should not collide with browser `Transaction` or Stripe types — prefer `CheckoutTransactionStepper`.
7. **Depth vs 11/14:** Mention crash recovery and `innodb_flush_log_at_trx_commit` only as “Durability knobs exist”; do not explain redo/doublewrite here.
8. **Savepoints & XA:** Savepoints = optional sidebar; XA = “not this series’ Foundations path.”
9. **Need a second worked example?** Signup (`users` + `profiles`) is shorter for readers who don’t do commerce — keep as a compact second SQL block if word count allows.
10. **Research note:** User brief listed an `autocommit` node; the refman split is `commit` (SQL + `SET autocommit`) + `innodb-autocommit-commit-rollback` (InnoDB behavior). Cite both; don’t invent a missing node id.

---

## Drafting checklist (when writing the post)

- [ ] Frontmatter: title, slug `mysql-transactions`, series id `mysql`, description focused on request handlers
- [ ] Scatter 2–3 mini-demos mid-article (stepper + autocommit toggle minimum)
- [ ] Humanizer pass; first-person voice; `<Cite />` + `<References />`
- [ ] ORM section covers Rails, Prisma, Django at least once each (Prisma-primary in snippets)
- [ ] Explicit “see you in article 09” for isolation
- [ ] No gap-lock / MVCC deep dive leakage
- [ ] Tie-back checklist rendered as compact end section
- [ ] Hub + `seriesList.postSlugs` updated when stubs go live
