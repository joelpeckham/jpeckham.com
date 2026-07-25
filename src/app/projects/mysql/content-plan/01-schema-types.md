# 01 — Tables, Types & Schema That Survive Production

**Slug:** `mysql-schema-types`  
**Tier:** Foundations (Part A)  
**Audience:** Web app programmers who want deep DB literacy — spoon-fed, always tied to request/response apps, ORMs, and production pain.

---

## Intent

After this article, a reader can design an InnoDB table for a typical web feature (users, orders, listings, session-ish metadata) and defend every column choice: integer width, signed vs unsigned, `DECIMAL` vs float, `DATETIME` vs `TIMESTAMP`, `CHAR`/`VARCHAR`/`TEXT`, charset/collation, nullability, and when a `JSON` column is a product feature rather than a schema smell. They should also know what “row size” and type storage mean for index leaf density and buffer-pool pressure — without needing Part B yet.

Web developers care because ORMs hide types until production doesn’t: money rounds wrong, IDs overflow or collide with signed ranges in languages, emoji truncates under `utf8mb3`, “midnight UTC” shifts under `TIMESTAMP` timezone conversion, and nullable columns silently break uniqueness and join semantics. Schema is the cheapest place to prevent years of migration debt.

---

## Real-world hook

Open with three recognizable failure classes, then name stacks that live or die on getting types right:

1. **Money that isn’t money** — Checkout totals stored as `DOUBLE` or JS `number`. Stripe’s API model is integer minor units (cents); Shopify Liquid/money helpers and most payment gateways assume exact decimal math. A SaaS billing table that uses `FLOAT` for `unit_price` will eventually disagree with Stripe’s ledger by a cent under aggregation — and support tickets will blame “the API,” not the column.

2. **Identity that doesn’t fit the language** — Auth0 / Cognito / Clerk often give opaque string subject IDs (`VARCHAR` / `CHAR` of fixed max length). Homegrown apps that use `INT AUTO_INCREMENT` hit the signed 2.1B ceiling; Node and browser JSON happily stringify bigints poorly if you chose `BIGINT UNSIGNED` without a serialization plan. GitHub-style snowflake IDs and Discord IDs are classic “must be string in the client” stories.

3. **Time that moves when the server does** — Calendar apps (Calendly-like scheduling), booking systems, and audit logs: `TIMESTAMP` converts to/from session timezone; `DATETIME` does not. A Rails/`ActiveRecord` or Prisma app that stores “event starts at” as `TIMESTAMP` and then changes `time_zone` on the connection (or moves region) rewrites history for every reader. WordPress-era `utf8` (`utf8mb3`) truncation of emoji in comments is the charset cousin of the same lesson: the type definition is product behavior.

Concrete teaching scenario for the whole piece: **a multi-tenant marketplace** (think Etsy-lite / Shopify storefront backend) with `users`, `shops`, `listings`, `orders`, `order_items`, and a sparse `listing_attributes` JSON blob for seller-defined facets — Next.js / Nest / Rails talking to MySQL 8+/9.x InnoDB via Prisma or ActiveRecord.

---

## Primary documentation sources

Prefer these nodes while writing (local corpus: `sources/mysql-refman-9.7/nodes/`). Cite public URLs in the published post.

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

Optional deep links while drafting (not all need to appear in the post): `null-values`, `innodb-row-format`, `precision-math-decimal-characteristics`, `numeric-type-attributes`, `enum`, `blob`, `charset-column`, `create-table-check-constraints`.

---

## Article structure

Spoon-fed progression. Each section ends with a one-line “app consequence.”

1. **What a table is under InnoDB (30-second mental model)**  
   Default engine is InnoDB; a table is a clustered index of rows. Types decide what sits in that leaf, which foreshadows Article 02 (PK) without stealing it. App consequence: migrations aren’t “just SQL” — they reshape the physical row every request reads.

2. **The column anatomy checklist**  
   Walk `CREATE TABLE` pieces readers actually use: name, type, `NULL`/`NOT NULL`, `DEFAULT`, charset/collation overrides, comments. Explicitly defer FKs (Art. 16), secondary indexes (Art. 03), generated columns deep dive (Art. 17). App consequence: ORM migrations that omit nullability are product bugs.

3. **Integers: width, signedness, and ID strategy**  
   Byte table for `TINYINT`→`BIGINT`; when unsigned helps; when it fights languages/ORMs; boolean-as-`TINYINT(1)` folklore vs real boolean handling; counters vs surrogate keys. App consequence: pick ID type *with* JSON/API serialization in mind on day one.

4. **Exact vs approximate numerics (money and metrics)**  
   `DECIMAL(M,D)` precision/scale; never float for money; integer minor-units pattern (Stripe-style) as alternative; floats OK for telemetry/scores. App consequence: ledger columns and “display price” columns have different jobs — schema should say so.

5. **Time types that match the product**  
   `DATE` vs `DATETIME` vs `TIMESTAMP` ranges; session TZ conversion on `TIMESTAMP` only; fractional seconds (`FSP`); `DEFAULT`/`ON UPDATE` for `created_at`/`updated_at`; store UTC explicitly as a team convention. App consequence: “event time” and “row mutation time” are different columns with different types.

6. **Strings: CHAR, VARCHAR, TEXT, and utf8mb4**  
   Character length vs byte length under multibyte charset; trailing-space quirks; when `VARCHAR(255)` is cargo-cult; emoji / supplementary planes require `utf8mb4`; collation briefly (equality & `ORDER BY`, not a full collation treatise). App consequence: user-facing text defaults to `utf8mb4` + a deliberate max length tied to the UI.

7. **NULL is a third state (not empty string, not zero)**  
   Three-valued logic footguns in `WHERE`, unique indexes (preview), and app code that treats SQL `NULL` as JS `null` inconsistently. App consequence: optional profile fields and “unknown” are not the same as `''`.

8. **JSON as a deliberate escape hatch**  
   Validated binary JSON vs stuffing JSON into `TEXT`; good uses (sparse seller attributes, feature flags blob); bad uses (replacing relational money/ids); note that JSON isn’t directly indexed — generated columns later. App consequence: JSON is for *shape that changes per tenant*, not for core join keys.

9. **Row size, storage, and why types are a performance decision**  
   Rough byte budget from `storage-requirements` + InnoDB off-page for long VARCHAR/TEXT/JSON; denser rows → more rows per page → better buffer-pool hit rate (preview Art. 13). App consequence: `VARCHAR(2000)` “just in case” on every column is a silent tax on every list endpoint.

10. **A production-shaped starter schema (worked example)**  
    Assemble `users` / `listings` / `orders` / `order_items` with defended types; show one bad “ORM default” schema side-by-side. App consequence: readers leave with a template they can paste into a migration and argue about in PR review.

11. **Tie-back & preview**  
    Checklist + “next: primary keys & the clustered index” (Art. 02) — PK choice sits *on top of* these types.

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
- **ORM impedance** — Prisma/Rails/Django/Hibernate default mappings (`Float` ↔ `DOUBLE`, `DateTime` ↔ `TIMESTAMP`, string length 191 for utf8mb4 unique indexes historically) — call out mapping review as part of schema design.

---

## Interactive feature

**Working title:** `SchemaByteBudget` (or `RowLayoutVisualizer`)  
**Path (planned):** `src/components/interactive/schema-byte-budget/`  
**MDX pattern:** import at top of `/posts/mysql-schema-types/`, render demo, then `## Things to Play With` bullets, then essay (same as RAID / neural-net / 8-puzzle).

### UI concept

A single composition: left side is a **column builder** (add/remove columns; pick type from a curated palette; tweak M/D/FSP, nullability, charset). Right side is a **row byte strip** — a horizontal segmented bar (or grid of byte cells) showing approximate on-page storage for one InnoDB row under simplifying assumptions (DYNAMIC row format, utf8mb4 worst-case for strings, length prefixes, null bitmap bit, no overflow page detail beyond “spills off-page”).

Controls (sliders / selects, not a SQL sandbox):

| Control | Effect |
| --- | --- |
| Integer width | `TINYINT`→`BIGINT`, toggle UNSIGNED — segment grows 1→8 bytes |
| Money mode | Switch price column between `DOUBLE` / `DECIMAL(12,2)` / `BIGINT` cents — show “exact?” badge |
| String length slider | `VARCHAR(n)` — bytes = `n * 4` worst-case under utf8mb4 + length prefix; warn near row limit |
| Charset toggle | `utf8mb3` vs `utf8mb4` — emoji sample turns into truncation warning on mb3 |
| Time type toggle | `DATETIME` vs `TIMESTAMP` — show range chip + “TZ converts on read” indicator |
| Nullable toggles | Flip nullability — tiny null-bitmap cost + “three-valued logic” callout |
| Preset schemas | Buttons: “ORM defaults (bad)”, “Marketplace v1 (good)”, “Wide VARCHAR soup (fails)” |

### User actions → insight

1. Load **ORM defaults** → see float money + `TIMESTAMP` event time + `utf8mb3` bio.  
2. Flip money to `DECIMAL` or integer cents → “exact” badge; bytes barely change, correctness does.  
3. Drag listing `description` VARCHAR length up → bar approaches 65,535 shared limit / shows off-page spill.  
4. Paste 😀 into the sample string under mb3 → visual truncation; under mb4 → ok.  
5. Switch event time to `DATETIME` → 2038 warning clears; TZ badge clears.

Insight produced: **types are a layout and a contract**, not labels. Readers feel why “make everything VARCHAR(255)” and “FLOAT for price” are expensive before they read the essay.

### Mapping to site patterns

- Client component, self-contained state, no backend (like RAID visualizer).  
- Parameter scrubbing + preset scenarios (like neural-net training controls).  
- Optional clickable byte segments that highlight which column owns those bytes (RAID-style block click → explanation panel).  
- Keep math *honest but simplified*: label assumptions (“illustrative InnoDB DYNAMIC, worst-case utf8mb4”) so pedants aren’t misled; link essay sections for nuance (`innodb-row-format`, overflow pages).

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

### 2. Hardened marketplace core (target schema)

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

## Open questions / author notes

- **Minor units vs `DECIMAL`:** Pick a house style for the series (recommend integer cents for currency *amounts*, `CHAR(3)` currency code; mention `DECIMAL` as equally valid for non-USD fractional currencies / FX). Stay consistent in later articles’ schemas.
- **Public IDs:** ULID/`CHAR(26)` vs UUID (`BINARY(16)` vs `CHAR(36)`) — decide one recommended pattern for examples; mention the other briefly. UUID storage deserves a short callout without derailing.
- **Collation choice:** `utf8mb4_0900_ai_ci` vs `utf8mb4_unicode_ci` — enough for “use a modern Unicode collation,” defer deep collation to a sidebar or later note.
- **Interactive fidelity:** How precise should the byte visualizer be? Prefer labeled approximations + “not a substitute for `INFORMATION_SCHEMA`” over pretending to simulate full DYNAMIC overflow rules.
- **SQL mode / MySQL 9.7 defaults:** Confirm which strict modes are default in 9.7 when describing “prod vs laptop” traps; cite `sql-mode` rather than guessing version drift.
- **ORM examples:** Pick one primary ORM for snippets (Prisma *or* Rails) and one contrast sentence for the other — avoid maintaining three dialects.
- **Scope guardrails:** Do not deep-dive FKs, secondary indexes, or JSON multi-valued indexes here — link forward to Arts. 03, 16, 17.
- **Series glue:** Hub `/projects/mysql/` + post `/posts/mysql-schema-types/`; ensure `seriesList` eventually includes this slug first in Part A order.
- **License/citation:** Paraphrase only; never paste Oracle refman prose into the MDX. Link node URLs.
)
