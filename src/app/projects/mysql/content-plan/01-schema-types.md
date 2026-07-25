# 01 — Tables, Types & Schema That Survive Production

| Field | Value |
| --- | --- |
| **Number** | 01 |
| **Title** | Tables, Types & Schema That Survive Production |
| **Slug** | `mysql-schema-types` |
| **Tier** | Foundations (Part A) |
| **Status** | **Shipped draft** |
| **Hub** | `/projects/mysql/` |
| **Post** | `/posts/mysql-schema-types/` |
| **MDX** | `src/app/posts/mysql-schema-types/page.mdx` |
| **Demos** | `src/components/interactive/schema-byte-budget/` |
| **Next** | 02 — Primary Keys & the Clustered Index (`mysql-primary-keys`) |
| **Audience** | Web app programmers who want deep DB literacy — spoon-fed, always tied to request/response apps, ORMs, and production pain |

---

## Intent

After this article, a reader can design an InnoDB table for a typical web feature (users, orders, listings, session-ish metadata) and defend every column choice: integer width, signed vs unsigned, `DECIMAL` vs float, `DATETIME` vs `TIMESTAMP`, `CHAR`/`VARCHAR`/`TEXT`, charset/collation, nullability, and when a `JSON` column is a product feature rather than a schema smell. They should also know what “row size” and type storage mean for index leaf density and buffer-pool pressure — without needing Part B yet.

Web developers care because ORMs hide types until production doesn’t: money rounds wrong, IDs overflow or collide with signed ranges in languages, emoji truncates under `utf8mb3`, “midnight UTC” shifts under `TIMESTAMP` timezone conversion, and nullable columns silently break uniqueness and join semantics. Schema is the cheapest place to prevent years of migration debt.

---

## Real-world hook (as shipped)

**Not a cold open.** The article opens with a series welcome (“Come on in, the water's fine.”) that orients readers to Learn MySQL, sets expectations (~foundations first, deep dives later), and states why types matter before any day-job story.

Failure classes are woven into the type sections as motivation, not a three-bullet preamble:

1. **Money that isn’t money** — Float/`DOUBLE` checkout totals vs Stripe-style integer minor units. Surfaced in the money section with `MoneyModeDemo`.
2. **Identity that doesn’t fit the language** — `INT` ceilings, JS bigint rounding, UUID/ULID width and secondary-index tax (preview of article 02). Surfaced in “Choosing IDs” with `IdWidthDemo`.
3. **Time that moves when the server does** — `TIMESTAMP` session TZ vs wall-clock `DATETIME`. The **BetterRX** hospice-pharmacy respite-scheduling story lives in “Choosing time types”: “which stays start *now*?” only makes sense with an explicit timezone story. Surfaced with `TimeTypeDemo`.
4. **Charset / emoji** — `utf8mb3` truncation. Surfaced in “Choosing string types” with `VarcharCharsetDemo`.

Worked example: a **multi-tenant marketplace** (users, listings, order_items) — not healthcare PHI. Same type decisions, less paperwork.

---

## Primary documentation sources

Prefer these nodes while writing (local corpus: `sources/mysql-refman-9.7/nodes/`). Cite public URLs in the published post via `<Cite n={…} />` + `<References items={[…]} />`. Paraphrase only.

- **data-types** — Data Types overview (categories, M/D/FSP conventions)  
  https://dev.mysql.com/doc/refman/9.7/en/data-types.html
- **create-table** — `CREATE TABLE` (column defs, nullability, defaults, table options, engine)  
  https://dev.mysql.com/doc/refman/9.7/en/create-table.html
- **innodb-introduction** — Why default InnoDB matters (ACID, clustered PK, row-level locks)  
  https://dev.mysql.com/doc/refman/9.7/en/innodb-introduction.html
- **integer-types** — `TINYINT`…`BIGINT`, storage bytes, signed/unsigned ranges  
  https://dev.mysql.com/doc/refman/9.7/en/integer-types.html
- **fixed-point-types** — `DECIMAL` / `NUMERIC` for exact values (money)  
  https://dev.mysql.com/doc/refman/9.7/en/fixed-point-types.html
- **floating-point-types** — When approximate types are acceptable (and when they are not)  
  https://dev.mysql.com/doc/refman/9.7/en/floating-point-types.html
- **datetime** — `DATE` / `DATETIME` / `TIMESTAMP` ranges, TZ conversion behavior  
  https://dev.mysql.com/doc/refman/9.7/en/datetime.html
- **timestamp-initialization** — `DEFAULT` / `ON UPDATE CURRENT_TIMESTAMP` semantics  
  https://dev.mysql.com/doc/refman/9.7/en/timestamp-initialization.html
- **char** — `CHAR` vs `VARCHAR` storage, trailing spaces, row-size interaction  
  https://dev.mysql.com/doc/refman/9.7/en/char.html
- **charset-unicode-utf8mb4** — Why `utf8mb4` is the real UTF-8; contrast with `utf8mb3`  
  https://dev.mysql.com/doc/refman/9.7/en/charset-unicode-utf8mb4.html
- **json** — Native JSON validation + binary storage; indexing via generated columns (tease Art. 17)  
  https://dev.mysql.com/doc/refman/9.7/en/json.html
- **storage-requirements** — Per-type byte budgets; path into InnoDB row format  
  https://dev.mysql.com/doc/refman/9.7/en/storage-requirements.html
- **column-count-limit** — 65,535-byte row limit; InnoDB column caps; VARCHAR vs TEXT off-page  
  https://dev.mysql.com/doc/refman/9.7/en/column-count-limit.html
- **choosing-types** — “Most precise type that fits” storage guidance  
  https://dev.mysql.com/doc/refman/9.7/en/choosing-types.html
- **sql-mode** (supporting) — Strict mode, invalid dates, truncation → error vs warning  
  https://dev.mysql.com/doc/refman/9.7/en/sql-mode.html

Supporting citations shipped in the post: MDN `Number.MAX_SAFE_INTEGER`, Stripe zero-decimal currencies, charset/collation naming, `working-with-null`.

Optional deep links for future edits: `null-values`, `innodb-row-format`, `precision-math-decimal-characteristics`, `numeric-type-attributes`, `enum`, `blob`, `charset-column`, `create-table-check-constraints`.

---

## Article structure (as shipped)

First-person, casual prose. No “app consequence” stamps per section. Demos embedded mid-article after motivate → explain.

| # | H2 / H3 | Content | Demo |
| --- | --- | --- | --- |
| 1 | **Come on in, the water's fine.** | Series welcome; what today covers; why types before locks/MVCC | — |
| 2 | **What a table actually is (and why that isn't pedantry)** | InnoDB clustered index mental model; types decide leaf payload; migrations reshape physical rows | — |
| 3 | **Types matter** | Row-size ceiling preview; width + correctness both vote on pages | — |
| 3a | *Choosing IDs* | INT/BIGINT, JS rounding, UUID/ULID, internal PK + `CHAR(26)` public id pattern | `IdWidthDemo` |
| 3b | *Money: floats are for physics homework, not invoices* | Integer cents + `CHAR(3)` currency (Stripe); `DECIMAL` alternative | `MoneyModeDemo` |
| 3c | *Choosing time types* | `DATETIME` vs `TIMESTAMP`; BetterRX respite scheduling TZ story; 2038; Prisma/Rails mapping callout | `TimeTypeDemo` |
| 3d | *Choosing string types* | Charset vs collation; `utf8mb4` / `utf8mb4_0900_ai_ci`; byte math under multibyte | `VarcharCharsetDemo` |
| 3e | *NULL is a third state* | Three-valued logic; when `NOT NULL` + default | — |
| 3f | *JSON: a deliberate escape hatch* | Sparse facets yes; money/FK/filter keys no | — |
| 4 | **Why the row's byte budget matters** | Stack type choices → rows per page → list-endpoint I/O | `RowBudgetDemo` |
| 5 | **A marketplace schema that holds up** | Bad Prisma-ish schema vs defended marketplace v1; ties back to row-budget presets | — (references demo presets) |
| 6 | **Checklist before you migrate** | PR-review checklist | — |
| 7 | **References** | IEEE-style `<References />` block | — |

**Deferred explicitly in prose:** secondary indexes (Art. 03), FKs (Art. 16), JSON indexing / generated columns (Art. 17).

**Bridge to Art. 02:** checklist close + natural link — PK choice sits on top of these types.

---

## Deep-dive beats

Mechanisms and pitfalls that keep this from being a cheat sheet:

- **Display width is not storage** — Historic `INT(11)` display width ≠ 11 digits of capacity; clear the myth early so readers stop cargo-culting it from old dumps.
- **Signed vs unsigned cross-type comparison** — Mixing signed/unsigned in joins/predicates can coerce unexpectedly; prefer consistent ID types across FK-related tables (even before Art. 16).
- **`DECIMAL` scale conversion on insert** — Excess fractional digits are coerced to scale; under non-strict modes this can be silent — connect to `sql-mode` / strictness for apps.
- **`TIMESTAMP` session timezone round-trip** — Same stored UTC instant can *display* differently after `SET time_zone`; `DATETIME` stores the wall-clock digits you gave it. Teach both failure modes (shifted events vs “forgot UTC”).
- **Year-2038 ceiling on `TIMESTAMP`** — Still a real product constraint for far-future scheduling; prefer `DATETIME` for “event at” beyond 2038.
- **Automatic init/update columns** — `ON UPDATE CURRENT_TIMESTAMP` fires when *other* columns change; apps that “touch” rows can rewrite `updated_at` unintentionally; multiple auto columns need explicit defaults.
- **Charset is per-column, not just per-table** — Accidental `utf8mb3` column in a `utf8mb4` table truncates emoji; index prefix lengths are in bytes — matters for unique keys on usernames.
- **`VARCHAR` max length is characters; row limit is bytes** — Under `utf8mb4`, a “wide” row of long VARCHARs can fail `CREATE TABLE` or force TEXT/off-page storage earlier than intuition suggests (`column-count-limit`).
- **`CHAR` padding vs `VARCHAR` retention** — Trailing spaces change equality/comparisons in subtle ways; bad choice for tokens that look fixed-length but aren’t space-sensitive.
- **Strict SQL mode as production default** — Truncation and invalid dates become errors; local non-strict MySQL + prod strict MySQL is a classic “works on my machine” schema bug.
- **ENUM as a schema trap (brief)** — Tempting for status fields; changing members is DDL pain; often better as `TINYINT` + app enum or a lookup table — don’t over-teach ENUM, just inoculate.
- **JSON binary format & `max_allowed_packet`** — Large documents aren’t free; partial update optimizations exist but apps that rewrite whole blobs every request pay write amplification.
- **Null bitmap / nullable columns still cost** — Nullable columns aren’t “free metadata”; prefer `NOT NULL` with real defaults when the domain always has a value.
- **ORM impedance** — Prisma primary in snippets; one-line Rails/`ActiveRecord` contrast for `DateTime` → `TIMESTAMP` defaults.

---

## Interactive feature (as shipped)

**Path:** `src/components/interactive/schema-byte-budget/`  
**Pattern:** five small client-only demos scattered mid-article — **not** one top-of-page mega-lab, **not** a “Things to Play With” section.

| Demo | Section | Teaches |
| --- | --- | --- |
| `IdWidthDemo` | Choosing IDs | URL exposure, JSON round-trip, secondary-index width by id strategy |
| `MoneyModeDemo` | Money | Float vs `DECIMAL` vs integer cents — exactness vs bytes |
| `TimeTypeDemo` | Choosing time types | TZ conversion outcome on `TIMESTAMP` vs stable `DATETIME` digits |
| `VarcharCharsetDemo` | Choosing string types | Charset truncation, byte thermometer, rows-per-page hint |
| `RowBudgetDemo` | Why the row's byte budget matters | Presets (ORM bad / marketplace v1 / wide VARCHAR soup); rows per page |

**Shared chrome:** `schema-byte-budget/shared.tsx` (re-export pattern for future articles).

**Cut from original plan:** single `SchemaByteBudget` / `RowLayoutVisualizer` mega-composition at the top with one scrubber controlling all panels. Splitting earned clearer motivate → embed rhythm and let prose carry NULL/JSON without demos.

**Fidelity rule (shipped):** label math as illustrative (≠ `INFORMATION_SCHEMA`); worst-case utf8mb4 assumptions where relevant.

---

## Example queries / schemas

Original teaching examples (not from Oracle docs):

### 1. Bad “ORM-ish” listing table (anti-pattern)

```sql
CREATE TABLE listings_bad (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  title VARCHAR(255),
  description VARCHAR(8000),
  price DOUBLE NOT NULL,
  currency CHAR(3),
  starts_at TIMESTAMP NULL,
  attrs TEXT,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
) DEFAULT CHARSET = utf8;
```

Teaching points: float money, `utf8`→mb3, timestamp event time, JSON-as-TEXT, nullable everything, oversized VARCHAR competing for row budget.

### 2. Hardened marketplace core (target schema — house defaults)

```sql
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(26) NOT NULL,          -- ULID/string id for APIs
  email VARCHAR(320) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_public_id (public_id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE listings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(140) NOT NULL,
  description TEXT NOT NULL,
  price_cents INT UNSIGNED NOT NULL,    -- minor units; currency separate
  currency CHAR(3) NOT NULL,            -- ISO 4217
  status TINYINT UNSIGNED NOT NULL DEFAULT 1,
  starts_at DATETIME(0) NOT NULL,       -- event/schedule time, not TZ-auto
  attrs JSON NULL,                      -- sparse seller facets only
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL
    DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_listings_shop_status (shop_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  unit_price_cents INT UNSIGNED NOT NULL,
  line_total_cents INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3. Illustrative inserts / gotchas (tiny)

```sql
-- Money: prefer integer cents; if using DECIMAL, declare scale explicitly
-- DECIMAL(12,2) price_amount  -- alternative to price_cents

-- TIMESTAMP timezone surprise (conceptual demo for prose / interactive)
SET time_zone = '+00:00';
INSERT INTO demo_ts (id, t) VALUES (1, '2026-07-24 18:00:00');
SET time_zone = '-06:00';
SELECT id, t FROM demo_ts WHERE id = 1;
-- TIMESTAMP value displays shifted; DATETIME would not

-- utf8mb4 vs mb3 (conceptual)
-- INSERT into mb3 column of 'hi 😀' → error/truncation under strict mode
```

### 4. JSON used narrowly

```sql
UPDATE listings
SET attrs = JSON_OBJECT(
  'materials', JSON_ARRAY('oak', 'steel'),
  'handmade', TRUE
)
WHERE id = 42;

-- Core filters stay relational; JSON is for sparse display facets
SELECT id, title
FROM listings
WHERE shop_id = 7 AND status = 1
ORDER BY id DESC
LIMIT 20;
```

---

## Tie-back checklist

How internals reconnect to app performance / correctness:

| Internals beat | App-facing check |
| --- | --- |
| Integer width & signedness | Will IDs fit growth? Can Node/JS/JSON clients round-trip them? |
| `DECIMAL` / integer cents | Do invoice totals match Stripe/PayPal to the cent under `SUM()`? |
| `DATETIME` vs `TIMESTAMP` | Are event times stable across regions and connection `time_zone`? |
| `utf8mb4` + real lengths | Can users paste emoji / CJK without silent truncation? |
| `NOT NULL` + defaults | Does the API allow “missing” or does the DB enforce presence? |
| `JSON` vs columns | Are join/filter keys relational so list endpoints stay indexable? |
| Row byte budget | Do “wide” rows hurt list/detail cache locality (buffer pool preview)? |
| Strict SQL mode | Do staging and prod reject bad casts the same way? |
| ORM mapping review | Does the migration SQL match the type you *think* the model has? |

Close the essay by stating: **correct types prevent classes of bugs no amount of caching fixes**; denser, honest types also make the indexes and transactions in Articles 02–08 cheaper.

---

## Authoring notes (lessons applied)

- **Voice:** first person throughout; casual/jokey where it helps; humanizer pass before publish.
- **Structure:** series welcome on post 1; BetterRX story in the time section, not forced cold open.
- **Citations:** `<Cite />` + `<References />`; 18 numbered refs in shipped draft.
- **Interactives:** scatter pattern; each demo earns one beat; mega-lab plan retired.
- **House defaults locked for the series** (see resolved decisions below).

---

## Resolved decisions (formerly open questions)

| Question | Decision |
| --- | --- |
| Minor units vs `DECIMAL` | **Integer cents** (`*_cents`) + `CHAR(3)` currency for series examples; mention `DECIMAL(M,D)` as valid alternative |
| Public IDs | **`CHAR(26)` ULID-style** unique secondary; clustered PK stays **`BIGINT UNSIGNED AUTO_INCREMENT`** |
| Collation | **`utf8mb4_0900_ai_ci`** as default; `_bin` / locale-specific when product requires |
| Interactive fidelity | Labeled approximations; not a substitute for `INFORMATION_SCHEMA` |
| ORM examples | **Prisma primary**; one-line Rails/`ActiveRecord` contrast where mapping bites |
| Scope guardrails | No deep FK / secondary-index / JSON-MVI dives — forward links only |

---

## Drafting checklist

**Shipped (done):**

- [x] MDX at `src/app/posts/mysql-schema-types/page.mdx`
- [x] Five scattered demos under `schema-byte-budget/`
- [x] Series welcome + natural section flow (no formulaic stamps)
- [x] `<Cite />` + `<References />` with primary doc URLs
- [x] Marketplace good/bad schema pair
- [x] Checklist + bridge to Art. 02
- [x] Humanizer pass
- [x] Stub wired in `seriesList` / catalog

**Future edits:**

- [ ] Re-run humanizer after substantive rewrites
- [ ] Keep house defaults aligned if Art. 02+ schemas change
- [ ] Confirm MySQL 9.7 `sql-mode` defaults if citing “prod vs laptop” traps
