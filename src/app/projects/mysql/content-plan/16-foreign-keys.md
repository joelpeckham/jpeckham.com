# 16 — Foreign Keys, Cascades & Integrity

| Field | Value |
| --- | --- |
| **Number** | 16 |
| **Title** | Foreign Keys, Cascades & Integrity |
| **Slug** | `mysql-foreign-keys` |
| **Tier** | Deep dive (Part B) |
| **Series hub** | `/projects/mysql/` |
| **Post path** | `/posts/mysql-foreign-keys/` |
| **Prev / next** | 15 Covering Indexes → **16** → 17 JSON Columns |
| **Status** | Plan only |

---

## Authoring contract

- **Status:** Plan only — stub wired; article not written yet.
- **Voice:** First person, casual/jokey, flowing prose. Humanizer pass before publish.
- **No formulaic stamps:** No `**Why bother:**`, “App consequence:”, or “Things to Play With” lists.
- **Citations:** IEEE `<Cite />` + `<References items={[…]} />`. Source technical claims; paraphrase refman only.
- **Interactives:** 3–5 small demos mid-article; split cascade graph into focused steppers. Shared chrome from `schema-byte-budget/shared.tsx`.
- **House defaults:** Integer cents; ULID public ids; `utf8mb4_0900_ai_ci`; Prisma primary ORM.
- **Length:** Part B — skimmable prose over encyclopedia.

---

## Intent

After this article, a reader can decide—and defend—whether a given relationship belongs in **InnoDB foreign keys**, **application-enforced integrity**, or a **hybrid** (indexes + careful deletes, no DB FK). They leave able to:

1. Write correct `FOREIGN KEY … REFERENCES … ON DELETE / ON UPDATE` clauses and explain what each referential action actually does under InnoDB.
2. Predict cascade side effects: which child rows disappear, which become `NULL`, which block the parent delete, and why triggers do **not** fire on cascaded actions.
3. Reason about **locks and metadata** FKs add: shared row locks during checks, related-table metadata locks, and why a “simple” parent delete can stall or deadlock under load.
4. Know when large SaaS shops (GitHub-style lore, Vitess-shaped topologies) skip FKs—and when that tradeoff is wrong for a typical multi-tenant web app.
5. Design soft-delete flows that do **not** pretend `ON DELETE CASCADE` will clean up tombstoned parents.

Web developers care because ORMs make FKs look like free documentation (`belongs_to` / `@relation`), until a cascade wipes audit rows, a restore leaves orphans after `foreign_key_checks=0`, or sharding/online DDL makes DB FKs impossible. Integrity is a product promise; the article teaches where that promise is enforced.

Prerequisites assumed: schema/types (01), PKs (02), secondary indexes (03), writes (07), transactions (08), locks teaser from 12. This piece sits in Part B because the *decision* and the *operational edges* (cascades, locks, scale) matter more than syntax alone.

---

## Real-world hook

Open with a familiar SaaS delete that looks safe in the API and catastrophic in the database.

**Primary narrative — “Delete organization” in a multi-tenant app** (think Slack workspace, Notion workspace, Shopify shop, or GitHub org lite):

1. Product manager asks for “hard delete this tenant after 30 days.”
2. Engineer adds `ON DELETE CASCADE` from `orgs` → `memberships`, `projects`, `files`, `audit_events`, `billing_invoices` “so we don’t leave orphans.”
3. Support later hard-deletes the wrong org (or a script runs against staging dump pointed at prod credentials). Cascades erase invoice history and audit trails the compliance team thought were immutable. App-layer soft delete never ran; the DB did the product’s job without asking.

**Secondary hook — orphan rows without FKs:** A Next.js / Rails marketplace where `order_items.listing_id` is only an app convention. A buggy admin “purge listing” endpoint deletes the listing but leaves line items pointing at a ghost. Reports join-fail silently; refunds break. This is the case FKs *would* have saved—if the team hadn’t copied “we don’t use FKs at scale” folklore without the scale.

**Tertiary hook — Vitess / shard boundary:** An engineering blog post (or war story) says “GitHub doesn’t use foreign keys” / “Vitess didn’t support FKs.” The reader’s 50-GB single-primary SaaS copies that advice and ships orphan-prone deletes. Teaching point: **the constraint that makes sense at hyperscale sharding is not free advice for a monolith.**

Concrete teaching schema for the whole piece: marketplace / multi-tenant core from Article 01 — `orgs` (or `shops`), `users`, `memberships`, `listings`, `orders`, `order_items`, optional `audit_events` — with deliberate FK choices (and non-choices) on each edge.

Tone: “Foreign keys are a concurrency and product-semantics feature, not just a diagram arrow.”

---

## Primary documentation sources

Prefer these nodes while writing (local corpus: `sources/mysql-refman-9.7/nodes/`). Cite public URLs in the published post.

### Core (must read / cite)

| Node id | Local file | Public URL | Why it matters |
| --- | --- | --- | --- |
| `create-table-foreign-keys` | `nodes/create-table-foreign-keys.md` | https://dev.mysql.com/doc/refman/9.7/en/create-table-foreign-keys.html | **Primary source.** Syntax; parent/child model; restrictions (engine match, types, indexes, no prefix indexes, no partitioned InnoDB FKs, no FK on virtual generated columns); referential actions; cascade DFS; triggers not activated by cascades; `foreign_key_checks`; locking/MDL extension; metadata (`SHOW CREATE TABLE`, I_S); error diagnosis via `SHOW ENGINE INNODB STATUS`. |
| `example-foreign-keys` | `nodes/example-foreign-keys.md` | https://dev.mysql.com/doc/refman/9.7/en/example-foreign-keys.html | Teaching walkthrough: insert child without parent fails (1452); delete parent with child fails under default/RESTRICT (1451); recreate with `ON UPDATE CASCADE` / `ON DELETE CASCADE` and show both in action. Good narrative spine for early sections. |
| `constraint-foreign-key` | `nodes/constraint-foreign-key.md` | https://dev.mysql.com/doc/refman/9.7/en/constraint-foreign-key.html | Shorter overview: actions list; InnoDB treats `NO ACTION` as `RESTRICT` (no deferred checks); `SET DEFAULT` rejected by InnoDB; `MATCH` ignored and dangerous; auto-index on FK columns; I_S pointers. |
| `ansi-diff-foreign-keys` | `nodes/ansi-diff-foreign-keys.md` | https://dev.mysql.com/doc/refman/9.7/en/ansi-diff-foreign-keys.html | **Critical deep-dive source.** Immediate (not deferred) checks; shared row-level locks during FK examination; self-referential `ON UPDATE CASCADE`/`SET NULL` → acts like `RESTRICT`; self-referential `ON DELETE CASCADE`/`SET NULL` OK; cascade nesting depth ≤ 15; `MATCH` ignored / disables `ON DELETE`/`ON UPDATE`; non-UNIQUE referenced keys deprecated; MySQL 9.7 inline `REFERENCES` + implicit parent PK. |

### Supporting (cite where the beat needs them)

| Node id | Public URL | Use |
| --- | --- | --- |
| `information-schema-referential-constraints-table` | https://dev.mysql.com/doc/refman/9.7/en/information-schema-referential-constraints-table.html | `UPDATE_RULE` / `DELETE_RULE` discovery for ops and the interactive’s “inspect schema” mode. |
| `information-schema-innodb-foreign-table` | https://dev.mysql.com/doc/refman/9.7/en/information-schema-innodb-foreign-table.html | InnoDB-specific FK metadata; `TYPE` bit flags for ON DELETE/UPDATE actions. |
| `information-schema-innodb-foreign-cols-table` | https://dev.mysql.com/doc/refman/9.7/en/information-schema-innodb-foreign-cols-table.html | Column-level FK mapping (`FOR_COL_NAME` / `REF_COL_NAME`). |
| `information-schema-key-column-usage-table` | https://dev.mysql.com/doc/refman/9.7/en/information-schema-key-column-usage-table.html | Portable query: columns with `REFERENCED_TABLE_SCHEMA IS NOT NULL`. |
| `create-table` | https://dev.mysql.com/doc/refman/9.7/en/create-table.html | Parent chapter; constraint placement in table defs. |
| `alter-table` | https://dev.mysql.com/doc/refman/9.7/en/alter-table.html | `ADD`/`DROP FOREIGN KEY`; note INPLACE vs COPY interaction from FK node. |
| `server-system-variables` (or dedicated `foreign_key_checks` mention in FK node) | https://dev.mysql.com/doc/refman/9.7/en/server-system-variables.html | Session/global `foreign_key_checks`; emphasize **re-enable does not scan/repair**. |
| `show-engine` | https://dev.mysql.com/doc/refman/9.7/en/show-engine.html | `LATEST FOREIGN KEY ERROR` section of `SHOW ENGINE INNODB STATUS`. |
| `lock-tables` | https://dev.mysql.com/doc/refman/9.7/en/lock-tables.html | Explicit `LOCK TABLES` implicitly opens/locks FK-related tables (READ for checks, WRITE for cascading updates)—cite via FK locking section. |
| `innodb-introduction` | https://dev.mysql.com/doc/refman/9.7/en/innodb-introduction.html | Only InnoDB/NDB enforce FKs; MyISAM parses and ignores. |
| `foreign-key-optimization` | https://dev.mysql.com/doc/refman/9.7/en/foreign-key-optimization.html | Light cite only: vertical split / join-by-id pattern — not cascade mechanics. |
| `create-table-check-constraints` | https://dev.mysql.com/doc/refman/9.7/en/create-table-check-constraints.html | Contrast: CHECKs are row-local; FKs are cross-table. One paragraph, don’t steal the show. |

Optional while drafting (may appear as footnotes): `restrict_fk_on_non_standard_key` (system var for deprecated non-unique referenced keys), error reference pages for `ER_NO_REFERENCED_ROW_2` / `ER_ROW_IS_REFERENCED_2`, `mysqldump` behavior with `foreign_key_checks` (covered inside `create-table-foreign-keys`).

**Industry / scale lore (not MySQL docs — label clearly as engineering practice, paraphrase, link primary posts if used):**

- GitHub / large MySQL shops historically avoiding FKs for online schema change, operational simplicity, and sharding readiness (cite a specific public post only if verified at write time; otherwise attribute as “common large-MySQL folklore” and list the *technical* reasons that actually hold).
- Vitess: historically no / limited cross-shard FK enforcement; modern Vitess has been adding managed FK support in stages — teach the *shard-boundary* reason, not a frozen product claim. Verify current Vitess docs when drafting the published post.
- Soft-delete patterns in Rails/Prisma/Laravel communities as the dominant alternative to hard `ON DELETE CASCADE` for user-facing entities.

**Citation rule:** paraphrase only; cite with `<Cite />` / `<References />`; never paste Oracle refman prose into MDX.

---

## Article structure

Suggested H2 spine — sentence-case. Scatter **named mini-demos** mid-article; no mega cascade graph at top.

1. **Part B opener + what today covers** — wrong-org delete hook in §2 or §7, not forced cold open.
2. **What a foreign key actually is** — child-side constraint; not an ORM arrow.
3. **Syntax and mental model** — composite keys; named constraints.
4. **Referential actions** — RESTRICT / CASCADE / SET NULL. *(Embed **Cascade stepper** — pick ON DELETE, step delete.)*
5. **DB-enforced vs app-only** — GitHub/Vitess lore vs monolith SaaS.
6. **Cascade gotchas** — no triggers; DFS order; audit tables. *(Embed **RESTRICT block** + **DFS order chips**.)*
7. **Locks and slow parent deletes** — shared locks; MDL; callback 12.
8. **`foreign_key_checks` traps** — restore; re-enable doesn’t repair.
9. **Soft deletes vs hard deletes** — `deleted_at` ≠ `ON DELETE`. *(Embed **Soft-delete non-event**.)*
10. **Restrictions checklist** — InnoDB rules.
11. **Worked marketplace schema** — deliberate FK choices.
12. **Diagnostics** — 1451/1452; I_S.
13. **Tie-back checklist** + preview 17/18.
14. **References** — IEEE list.

Do not end sections with “App consequence:” stamps.

---

## Deep-dive beats

Mechanisms and pitfalls that keep this from being a `FOREIGN KEY` cheat sheet:

- **Immediate vs deferred checking** — InnoDB checks per row as the statement runs, not at commit (SQL standard default is deferred). Self-referential “delete then reinsert” tricks that work under deferred engines fail here (`ansi-diff-foreign-keys`).
- **`NO ACTION` ≡ `RESTRICT` on InnoDB** — NDB can defer; InnoDB rejects immediately. Don’t design for deferred FK checks on MySQL/InnoDB.
- **Cascades do not fire triggers** — Audit triggers on child `DELETE` won’t see cascaded deletes. If compliance depends on triggers, cascades are a footgun (`create-table-foreign-keys`).
- **Depth-first cascade algorithm** — InnoDB walks the FK index DFS; multi-level graphs delete in an order that surprises people who think in breadth-first “layers.” Interactive should show DFS order.
- **15-level cascade nesting limit** — Deep hierarchies (org → team → project → …) can fail cascades that “should” work.
- **Self-referential `ON UPDATE CASCADE` / `ON UPDATE SET NULL` acts like `RESTRICT`** — Prevents infinite loops. Self-referential `ON DELETE CASCADE` / `SET NULL` are allowed.
- **Shared row-level locks during FK checks** — Parent insert/update/delete and child insert/update take shared locks on the *other* side’s examined rows. Under RR + hot parents, this couples with Article 12 lock/gap behavior.
- **Metadata lock propagation** — DDL/DML on related tables contend via extended MDL; “why is my migration waiting on a SELECT against the child?”
- **`LOCK TABLES` pulls in the family** — Explicit table locks implicitly lock FK-related tables (READ for checks, WRITE for cascading updates). Rare in ORMs, deadly in admin scripts.
- **`foreign_key_checks=0` is not a free lunch** — Speeds dumps/loads and allows drop order flexibility; **re-enabling does not repair orphans**. App code that disables checks “temporarily” can leave permanent integrity holes.
- **Type identity is strict for integers** — Same size *and* sign for INT/DECIMAL FK pairs; charset/collation must match for strings. Classic migration failure: `INT` child → `INT UNSIGNED` parent.
- **Referenced key should be UNIQUE/PRIMARY** — Non-unique referenced indexes are a deprecated InnoDB extension (`restrict_fk_on_non_standard_key`); migrate away.
- **Index prefixes forbidden** — Explains why `TEXT`/`BLOB` can’t be FK columns; also why prefix-only unique indexes on long VARCHARs aren’t FK-eligible as referenced keys without a full unique key.
- **Partitioned InnoDB tables cannot participate in FKs** — Parent or child. Matters if Article 18 / later partitioning notes tempt readers.
- **Generated columns** — No FK on virtual generated columns; stored generated / base columns restrict which cascade actions are legal (`create-table-foreign-keys`).
- **`MATCH FULL/PARTIAL/SIMPLE`** — Parsed but should be avoided; explicit `MATCH` causes MySQL to **ignore** `ON DELETE`/`ON UPDATE`. Silent semantics change.
- **Dual-direction CASCADE requirements** — If both tables reference each other, CASCADE must be defined on both sides for cascading ops to succeed.
- **Error message information disclosure** — Users with parent table privileges see `ER_*_2` messages naming parent tables; without privileges, generic errors. Relevant for shared-DB multi-tenant admin tools.
- **ORM illusion** — Prisma/ActiveRecord/Django relations often *suggest* FKs in migrations but teams disable them for “perf.” Call out: missing FK ≠ faster reads; it trades write-time checks + cascade locks for app complexity and orphan risk.
- **Soft delete ≠ `ON DELETE SET NULL`** — Soft delete is an `UPDATE`; referential actions only run on real `DELETE`/`UPDATE` of the referenced key. Tombstones keep children valid and invisible only if queries filter.
- **When large SaaS skips FKs (honest list)**  
  - Horizontal sharding / Vitess: cross-shard parent/child can’t be enforced in one InnoDB constraint.  
  - Online DDL / gh-ost / pt-osc era friction (related-table MDL, harder cutovers).  
  - Multi-writable topologies and restore/reorder operational freedom.  
  - Extreme hot-parent delete/update amplification.  
  **Counterweight:** single-primary apps with multiple writers (humans + jobs + admin) get orphan bugs constantly without FKs. Prefer FKs on money/membership edges; skip or soften on huge append-only / shard-bound tables.
- **Hybrid pattern (recommended default for this series’ marketplace)**  
  - FK + `ON DELETE RESTRICT` (or omit action) on edges where orphans are unacceptable (`order_items → orders`, `memberships → orgs`).  
  - No FK (or FK without cascade) on high-churn / shard-likely edges if you must; enforce in the same transaction in app code.  
  - Never `ON DELETE CASCADE` onto audit, invoice, or compliance tables.  
  - Soft-delete user-facing entities; hard-delete only via an explicit sweeper that deletes children in a known order inside a transaction (or archival pipeline).

---

## Interactive feature

Scatter **4–5 small demos** under `src/components/interactive/mysql-foreign-keys/` (shared chrome from `schema-byte-budget/shared.tsx`). Split the old mega graph.

### 1. Cascade stepper

- **Goal:** Delete parent under CASCADE / RESTRICT / SET NULL — watch child outcomes step by step.
- **Placement:** Referential actions (§4).
- **UX:** Small org → projects → tasks graph; per-edge ON DELETE picker; step/delete.

### 2. RESTRICT block

- **Goal:** Parent delete fails while children exist (1451); contrast with CASCADE wipe.
- **Placement:** Cascade gotchas (§6) or §4.
- **UX:** Single edge to orders/audit; shake/red on block.

### 3. Soft-delete non-event

- **Goal:** `UPDATE deleted_at` does not fire `ON DELETE`; children unchanged.
- **Placement:** Soft deletes section (§9).
- **UX:** Toggle soft vs hard delete on same graph.

### 4. DFS cascade order

- **Goal:** Multi-level CASCADE walks depth-first; 15-level limit callout.
- **Placement:** Cascade gotchas (§6).
- **UX:** Stepper highlights visit order on three-level tree.

### 5. foreign_key_checks trap *(optional)*

- **Goal:** Checks off → orphan parent delete; re-enable warning banner.
- **Placement:** `foreign_key_checks` section (§8).

**Non-goals:** full lock simulator — point to 12.

Remove any “Things to Play With” MDX laundry list; motivation lives in prose before each embed.

---

## Example queries / schemas

Original teaching examples (not copied from Oracle docs; aligned with series marketplace schema).

### 1. Parent/child with explicit constraint names

```sql
CREATE TABLE orgs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE memberships (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role TINYINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_memberships_org_user (org_id, user_id),
  KEY idx_memberships_user (user_id),
  CONSTRAINT fk_memberships_org
    FOREIGN KEY (org_id) REFERENCES orgs (id)
    ON DELETE CASCADE          -- membership dies with org (debatable; teach the debate)
    ON UPDATE RESTRICT,
  CONSTRAINT fk_memberships_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT         -- don’t cascade-delete users away from history casually
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2. Orders: enforce integrity, refuse silent cascade into money

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  buyer_id BIGINT UNSIGNED NOT NULL,
  status TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_orders_org (org_id),
  CONSTRAINT fk_orders_org
    FOREIGN KEY (org_id) REFERENCES orgs (id)
    ON DELETE RESTRICT         -- block org hard-delete while orders exist
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  unit_price_cents INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_listing (listing_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE,         -- line items are ownership-subordinate to the order
  CONSTRAINT fk_order_items_listing
    FOREIGN KEY (listing_id) REFERENCES listings (id)
    ON DELETE RESTRICT         -- cannot purge a listing still referenced by history
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3. Anti-pattern: cascading into audit

```sql
-- Don’t do this for compliance-bearing tables
CREATE TABLE audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_org_created (org_id, created_at),
  CONSTRAINT fk_audit_org
    FOREIGN KEY (org_id) REFERENCES orgs (id)
    ON DELETE CASCADE          -- anti-pattern: erase the evidence with the org
) ENGINE=InnoDB;

-- Prefer: RESTRICT, or no FK + archival org_id retained after org row is gone
```

### 4. Soft-delete parent (cascades never run)

```sql
ALTER TABLE orgs
  ADD COLUMN deleted_at DATETIME(3) NULL,
  ADD KEY idx_orgs_deleted_at (deleted_at);

-- “Delete” in the product sense:
UPDATE orgs SET deleted_at = CURRENT_TIMESTAMP(3) WHERE id = 42;
-- memberships / orders still reference org 42; ON DELETE actions do not fire.

-- Hard-delete sweeper (explicit, ordered, transactional) — sketch:
START TRANSACTION;
DELETE FROM memberships WHERE org_id = 42;
-- ... archive or delete non-compliance children in known order ...
DELETE FROM orgs WHERE id = 42 AND deleted_at IS NOT NULL;
COMMIT;
```

### 5. Classic failures (for prose / interactive narrator)

```sql
-- Child insert without parent → ERROR 1452 (ER_NO_REFERENCED_ROW_2)
INSERT INTO order_items (order_id, listing_id, quantity, unit_price_cents)
VALUES (999999, 1, 1, 500);

-- Parent delete with RESTRICT child → ERROR 1451 (ER_ROW_IS_REFERENCED_2)
DELETE FROM listings WHERE id = 1;

-- Type mismatch on ADD FK (sign/width) → errno 150 style failure
-- ALTER TABLE order_items ADD CONSTRAINT ... REFERENCES listings(id);
```

### 6. Inspect & diagnose

```sql
SHOW CREATE TABLE order_items\G

SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME,
       UPDATE_RULE, DELETE_RULE
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'marketplace';

SELECT * FROM INFORMATION_SCHEMA.INNODB_FOREIGN
WHERE FOR_NAME LIKE 'marketplace/%';

SHOW ENGINE INNODB STATUS\G
-- read LATEST FOREIGN KEY ERROR
```

### 7. `foreign_key_checks` restore trap (call out, don’t recommend in apps)

```sql
SET SESSION foreign_key_checks = 0;
-- load rows in any order; possible to insert orphans
SET SESSION foreign_key_checks = 1;
-- WARNING: existing orphans are NOT validated away
```

### 8. MySQL 9.7 inline REFERENCES (brief modernity note)

```sql
CREATE TABLE shirt (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner SMALLINT UNSIGNED NOT NULL REFERENCES person,  -- implicit PK of person
  PRIMARY KEY (id)
) ENGINE=InnoDB;
```

Series examples should still prefer explicit `CONSTRAINT fk_… FOREIGN KEY … REFERENCES …(col)` for clarity in migrations.

---

## Tie-back checklist

How internals reconnect to app performance / correctness:

| Internals beat | App-facing check |
| --- | --- |
| FK on child, not parent | Does every multi-writer path (API, job, admin, SQL console) agree on allowed parents? |
| `ON DELETE CASCADE` | Would a support hard-delete erase invoices/audit/files you are legally or operationally required to keep? |
| `ON DELETE RESTRICT` | Does the API return a clear “org still has orders” error instead of 500 on 1451? |
| `ON DELETE SET NULL` | Are child columns nullable *on purpose*? Does the UI handle orphaned-but-null FK rows? |
| Immediate FK checks + shared row locks | Can a hot parent delete/update stall concurrent child inserts under load? |
| MDL on related tables | Will `ALTER TABLE` / migrations block more of the schema graph than you expected? |
| Cascades skip triggers | Is any audit/compliance hook assuming triggers see cascaded deletes? |
| `foreign_key_checks` | Do app pools ever disable checks? After restore, do you verify zero orphans? |
| Soft `deleted_at` | Do all list/detail queries filter tombstones? Do unique keys account for reuse? |
| No FK (Vitess/shard lore) | If you skipped FKs, is integrity enforced in **one transaction** in the app—or only by hope? |
| Type/sign/charset match | Do ORM migrations keep parent/child ID types identical? |
| Named constraints | Can you `DROP FOREIGN KEY fk_…` cleanly in expand/contract migrations (Art. 18)? |

Close the essay by stating: **foreign keys are optional in MySQL the same way seatbelts are optional—legal, and a bad default to skip without a concrete topology reason.** Cascades are not “cleanup helpers”; they are silent multi-table writes with lock amplification.

---

## Open questions / author notes

- **House style for the series marketplace:** Recommend `ON DELETE RESTRICT` (or default) for money/history edges; `ON DELETE CASCADE` only for pure ownership children (`order_items` → `orders`, maybe `memberships` → `orgs` with an explicit product callout). Never cascade into `audit_events` / invoices. Stay consistent with Arts. 01, 07, 08 schemas.
- **GitHub / Vitess citations:** Before publish, pull one primary public source each (GitHub engineering post if available; current Vitess FK docs). Avoid undated “everyone knows” claims; separate *sharding impossibility* from *monolith folklore*.
- **Interactive scope** — Ship cascade stepper + soft-delete + RESTRICT as separate embeds; concurrency overlay optional prose-only.
- **Triggers:** Mention “cascades don’t fire triggers” once with a cite; don’t teach trigger design here.
- **ORM examples:** Pick Prisma *or* Rails for migration snippets showing `onDelete: Cascade` vs `Restrict`; one contrast sentence for the other. Show how easy it is to get CASCADE from generator defaults.
- **Soft-delete unique keys:** Decide whether examples use partial uniqueness patterns (e.g. generated column “active email”) or simple `deleted_at` + app checks — mention the MySQL unique-null / soft-delete tension without derailing into Art. 17.
- **`ON UPDATE CASCADE`:** Cover briefly (PK/natural key renames are rare and dangerous); discourage updating referenced keys in app design (stable surrogate PKs from Art. 02).
- **NDB notes:** Mention only that NDB differs on deferred `NO ACTION` and some cascade limits; series stays on InnoDB.
- **Cross-links:** Back to 02 (referenced keys should be PK/unique), 03 (FK indexes), 07 (DELETE semantics), 08 (explicit delete transactions), 12 (row/gap locks), forward to 18 (DDL + FK drop/add during migrations).
- **Scope guardrails:** Do not deep-dive CHECK constraints, polymorphic associations (`likeable_id`/`likeable_type` — note that FKs can’t express them cleanly), or distributed sagas beyond “FK is local to one MySQL primary.”
- **Series glue:** Hub `/projects/mysql/` + post `/posts/mysql-foreign-keys/`; ensure `seriesList.postSlugs` includes this slug in Part B order.
- **License/citation:** Paraphrase only; `<Cite />` / `<References />`; never paste Oracle refman prose into the MDX.

---

## Drafting checklist (when writing the post)

- [ ] Scatter FK demos mid-article; no top mega-graph or “Things to Play With” list
- [ ] `<Cite />` / `<References />`; humanizer pass; first-person voice
- [ ] Soft delete vs CASCADE clearly separated; forward to 18 for DDL/FK migrations
