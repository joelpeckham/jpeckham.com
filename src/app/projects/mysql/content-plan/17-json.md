# Article 17 — JSON Columns, Generated Columns & Multi-Valued Indexes

| Field | Value |
| --- | --- |
| **Number** | 17 |
| **Title** | JSON Columns, Generated Columns & Multi-Valued Indexes |
| **Slug** | `mysql-json` |
| **Tier** | Deep dive (Part B) |
| **Audience** | Web app programmers who already know secondary indexes (Art. 03), EXPLAIN (Art. 10), and when schema types matter (Art. 01) — now ready for flexible attributes *without* abandoning relational indexing |
| **Published path** | `/posts/mysql-json/` |
| **Depends on** | 01 schema/types (JSON escape hatch tease), 03 secondary indexes, 10 EXPLAIN; light callback to 15 covering (multi-valued cannot cover) |
| **Feeds** | 18 online DDL (adding generated cols / multi-valued indexes is migration cost), 20 perf forensics (JSON rewrite amplification shows up in digests) |
| **Status** | Plan only |

---

## Authoring contract

- **Status:** Plan only — stub wired; article not written yet.
- **Voice:** First person, casual/jokey, flowing prose. Humanizer pass before publish.
- **No formulaic stamps:** No `**Why bother:**`, “App consequence:”, or “Things to Play With” lists.
- **Citations:** IEEE `<Cite />` + `<References items={[…]} />`. Source technical claims; paraphrase refman only.
- **Interactives:** 3–5 small demos mid-article. Shared chrome from `schema-byte-budget/shared.tsx`.
- **House defaults:** Integer cents; ULID public ids; `utf8mb4_0900_ai_ci`; Prisma primary ORM.
- **Length:** Part B — skimmable prose over encyclopedia.

**Article 02 callback:** Article `mysql-primary-keys` already tells the BetterRX JSON/MRN full-table-scan story. **Do not re-tell it as the cold open.** One short callback when teaching “filtering JSON without an index,” then go deeper on generated columns and multi-valued indexes here.

---

## Intent

Teach when MySQL’s native `JSON` type is a **product feature** for web apps (sparse prefs, feature flags, seller facets) versus when it becomes a **document-DB antipattern** that destroys join keys, list-endpoint performance, and integrity.

After this article, a reader should be able to:

1. Choose deliberately: put stable, filtered, joined attributes in relational columns; put *shape-that-changes-per-tenant* (or rarely filtered) data in `JSON`.
2. Extract and query JSON safely with paths (`$`, `->`, `->>`, `JSON_EXTRACT` / `JSON_UNQUOTE`, `JSON_VALUE`) and know that **JSON columns are not indexed directly**.
3. Index a scalar JSON path via a **generated column** (virtual or stored) + secondary index, or via a **functional key part** / `JSON_VALUE(...)` expression index — and explain the collation / expression-match pitfalls that make the optimizer ignore the index.
4. Index a **tags / labels / zipcodes-style array** with an InnoDB **multi-valued index** (`CAST(... AS ... ARRAY)`), and write `WHERE` clauses using `MEMBER OF()`, `JSON_CONTAINS()`, or `JSON_OVERLAPS()` so the optimizer can use it.
5. Prefer partial JSON updates (`JSON_SET` / `JSON_REPLACE` / `JSON_REMOVE`) over whole-document rewrites when the optimization applies, and know the hard limits (empty arrays, unique multi-valued, online DDL = `COPY`, no covering).

**Explicitly out of scope (tease, don’t steal):** JSON duality views (MySQL Document Store / Rel / duality — mention once as “another product surface”); full `JSON_TABLE` ETL essays; GeoJSON; NDB’s 3-JSON-column cap beyond a footnote; Online DDL mechanics (Art. 18) beyond “multi-valued add is `ALGORITHM=COPY`.”

---

## Real-world hook

Place the prefs/flags/tags escape story in the section on green/red zones or indexing — not as a duplicate of article 02’s BetterRX JSON scan hook. Open with a **forward-looking** product ask (“six months later we need to filter flags”) or callback 02 in one sentence, then teach generated columns / multi-valued indexes.

**Opening scenario — feature flags + sparse user prefs that escaped the schema:**

A SaaS product (think LaunchDarkly-style flags stored per org, Notion/Linear-style per-user UI prefs, Shopify-style seller-defined listing facets) ships v1 with:

```sql
-- “we’ll never need to filter these”
ALTER TABLE users ADD COLUMN prefs JSON NULL;
ALTER TABLE orgs  ADD COLUMN flags JSON NULL;
ALTER TABLE listings ADD COLUMN attrs JSON NULL;
```

Six months later Product wants:

- Admin list: “all orgs with `flags.billing_v2 = true`”
- Support tool: “users whose theme is `dark`”
- Marketplace search: “listings tagged `handmade` OR `oak`”
- Analytics: “count users by `prefs.locale`”

The ORM happily emits `WHERE prefs->>'$.theme' = 'dark'` and `WHERE JSON_CONTAINS(attrs->'$.tags', '"oak"')`. At 50k rows staging is fine. At 20M rows production p99 is a full scan — because **JSON is not a secondary index key**. Someone proposes “migrate everything to Mongo.” Someone else proposes 40 generated columns. Both are wrong for different reasons.

**The insight this article owns:** MySQL can keep the flexible blob *and* index the paths you actually filter — if you treat generated columns / functional indexes / multi-valued indexes as first-class schema design, not afterthoughts. Conversely, if a field is in every list filter, it should have been a column from day one.

**Secondary hooks (short callouts later in the piece):**

- **Stripe-style metadata bags** — `metadata` JSON on customers/subscriptions is great for *display and webhook passthrough*; terrible as the only place you store `plan_tier` you filter dashboards on. Promote hot keys to columns (or generated indexed extracts).
- **GitHub / GitLab labels** — classic array membership: “issues with label `bug`.” Multi-valued index (or a proper `issue_labels` junction table) beats scanning JSON arrays.
- **E-commerce product attributes** — color/size that power faceted nav belong relational or in a typed EAV; “seller free-text facets” belong in JSON with selective indexes on the few facets that become first-class filters.
- **LaunchDarkly / Unleash-style flag evaluation** — reading a whole `flags` document per request is fine; *listing orgs by flag value* needs an indexed extract.
- **WordPress / CMS options dumps** — the antipattern: one giant JSON/options blob for the whole app config, then filtering inside it in SQL.

Concrete teaching scenario for the whole piece: **multi-tenant marketplace + SaaS settings** — `orgs.flags`, `users.prefs`, `listings.attrs` (including `tags` array) — Next.js / Nest / Rails talking to MySQL 8+/9.x InnoDB via Prisma or ActiveRecord. Same marketplace DNA as Art. 01 so readers reuse mental schema.

---

## Primary documentation sources

Local corpus: `sources/mysql-refman-9.7/nodes/<id>.md`. Cite public HTML in the published post. **Citation rule:** paraphrase mechanisms; cite with `<Cite />` / `<References />`; **never paste Oracle manual prose**.

### Core (must read while drafting)

| Node id | Title | URL | Why |
| --- | --- | --- | --- |
| `json` | The JSON Data Type | https://dev.mysql.com/doc/refman/9.7/en/json.html | Native type vs string; binary storage; **not indexed directly**; partial update rules; path/normalization overview; pointer to multi-valued |
| `json-functions` | JSON Functions (hub) | https://dev.mysql.com/doc/refman/9.7/en/json-functions.html | Function map for creation / search / modification |
| `json-search-functions` | Functions That Search JSON Values | https://dev.mysql.com/doc/refman/9.7/en/json-search-functions.html | `JSON_EXTRACT`, `->` / `->>`, `JSON_VALUE`, `MEMBER OF`, `JSON_CONTAINS`, `JSON_OVERLAPS`, `JSON_CONTAINS_PATH` |
| `json-modification-functions` | Functions That Modify JSON Values | https://dev.mysql.com/doc/refman/9.7/en/json-modification-functions.html | `JSON_SET` / `REPLACE` / `REMOVE` — partial-update eligibility |
| `create-table-generated-columns` | CREATE TABLE and Generated Columns | https://dev.mysql.com/doc/refman/9.7/en/create-table-generated-columns.html | `VIRTUAL` vs `STORED`; expression rules; JSON indexing use case |
| `create-table-secondary-indexes` | Secondary Indexes and Generated Columns | https://dev.mysql.com/doc/refman/9.7/en/create-table-secondary-indexes.html | Virtual indexes; **JSON indirect index** example (`json-column-indirect-index`); write-cost tradeoffs |
| `create-index` | CREATE INDEX Statement | https://dev.mysql.com/doc/refman/9.7/en/create-index.html | **Functional key parts** (`create-index-functional-key-parts`) + **multi-valued indexes** (`create-index-multi-valued`) — primary how-to for CAST/ARRAY and collation traps |
| `generated-column-index-optimizations` | Optimizer Use of Generated Column Indexes | https://dev.mysql.com/doc/refman/9.7/en/generated-column-index-optimizations.html | Expression must match definition; `JSON_UNQUOTE` for string compares |

### Supporting (cite selectively)

| Node id | Title | URL | Why |
| --- | --- | --- | --- |
| `json-creation-functions` | Functions That Create JSON Values | https://dev.mysql.com/doc/refman/9.7/en/json-creation-functions.html | `JSON_OBJECT` / `JSON_ARRAY` / merge helpers for app writes |
| `json-validation-functions` | JSON Schema Validation Functions | https://dev.mysql.com/doc/refman/9.7/en/json-validation-functions.html | `JSON_SCHEMA_VALID` + `CHECK` constraint pattern for prefs/flags shape |
| `json-utility-functions` | JSON Utility Functions | https://dev.mysql.com/doc/refman/9.7/en/json-utility-functions.html | `JSON_PRETTY`, storage size/free helpers |
| `json-attribute-functions` | Functions That Return JSON Value Attributes | https://dev.mysql.com/doc/refman/9.7/en/json-attribute-functions.html | `JSON_TYPE`, `JSON_LENGTH`, `JSON_STORAGE_SIZE` / `JSON_STORAGE_FREE` |
| `json-table-functions` | JSON Table Functions | https://dev.mysql.com/doc/refman/9.7/en/json-table-functions.html | Brief: relationalize arrays for reporting (`JSON_TABLE`) — not the main path |
| `alter-table-generated-columns` | ALTER TABLE and Generated Columns | https://dev.mysql.com/doc/refman/9.7/en/alter-table-generated-columns.html | Adding/changing generated cols in migrations |
| `create-table-check-constraints` | CREATE TABLE CHECK Constraints | https://dev.mysql.com/doc/refman/9.7/en/create-table-check-constraints.html | Pair with `JSON_SCHEMA_VALID` |
| `cast-functions` | Cast Functions and Operators | https://dev.mysql.com/doc/refman/9.7/en/cast-functions.html | `CAST(... AS ... ARRAY)` type details for multi-valued |
| `innodb-online-ddl-operations` | Online DDL Operations | https://dev.mysql.com/doc/refman/9.7/en/innodb-online-ddl-operations.html | Multi-valued index creation → not online (`COPY`) — bridge to Art. 18 |
| `replication-features-json` | Replication of JSON Documents | https://dev.mysql.com/doc/refman/9.7/en/replication-features-json.html | Optional: `PARTIAL_JSON` binlog + partial updates |

### Nested / section anchors (same parent HTML; call out in drafts)

These appear as Texinfo nodes inside larger HTML pages — still cite the parent URL and name the section in prose:

- **`json-paths` / `json-path-syntax`** — inside `json.html`: `$`, `.key`, `[N]`, `[*]`, `**`, last-element sugar.
- **`json-column-indirect-index`** — inside `create-table-secondary-indexes.html`: the canonical generated-column + index recipe.
- **`create-index-functional-key-parts`** — inside `create-index.html`: expression indexes; `->>` → `LONGTEXT` trap; `CAST` + `COLLATE utf8mb4_bin` fix.
- **`create-index-multi-valued`** — inside `create-index.html`: N:1 index records; `MEMBER OF` / `JSON_CONTAINS` / `JSON_OVERLAPS`; restrictions (no covering, no ASC/DESC, empty array invisible to index scan, unique semantics, `ALGORITHM=COPY`).

### Deliberately light / defer

- JSON duality views (`json-duality-views*`) → not this curriculum’s Document Store track.
- Full covering-index theory → Art. 15 (note only: multi-valued indexes **cannot** be covering).
- Online DDL expand/contract playbooks → Art. 18.
- Performance Schema digests for “rewrote whole JSON every request” → Art. 20.

---

## Article structure

Suggested H2 spine — sentence-case. Scatter **named mini-demos** mid-article; no mega advisor at top.

1. **Part B opener + what today covers** — flexible attrs without abandoning relational indexing; brief callback to 02 if JSON scan story helps.
2. **The prefs/flags/tags feature that escaped the schema** — three failing product queries.
3. **What native JSON buys you** — validation; not indexed directly.
4. **Green zone vs red zone** — when JSON helps vs document-DB antipattern.
5. **JSON path literacy** — `->` vs `->>`. *(Embed **Path playground**.)*
6. **Generated columns: VIRTUAL vs STORED**
7. **Indexing a scalar path** — generated / functional / `JSON_VALUE`. *(Embed **Index advisor badge** + **Collation trap**.)*
8. **Multi-valued indexes for tags** — `MEMBER OF` / `CONTAINS` / `OVERLAPS`. *(Embed **Multi-valued tags demo**.)*
9. **Partial updates vs whole-document rewrite** — `JSON_SET`. *(Embed **Partial vs full rewrite** meter.)*
10. **Optional JSON Schema + CHECK**
11. **Worked hybrid schema**
12. **Tie-back checklist** + preview 18.
13. **References** — IEEE list.

---

## Deep-dive beats

Mechanisms and pitfalls that keep this from being “just use JSON”:

- **JSON columns are never indexed directly.** Secondary indexes need a scalar (or multi-valued array cast). Any plan that filters only with ad-hoc `->>` and no supporting index is a table scan waiting to happen at scale (`json`, `create-table-secondary-indexes`).

- **Binary JSON ≠ free random access forever.** Subobject lookup without reparsing is real; huge documents still blow row size, buffer pool, and replication payload. `max_allowed_packet` is a hard store limit.

- **Partial update optimization is narrow.** Only `JSON_SET` / `JSON_REPLACE` / `JSON_REMOVE` on the *same* `JSON` column; no net-new keys that enlarge parent objects in ways that violate the rules; replacement value cannot be larger than the old (unless prior free space). Whole-document assignment from the app disables it (`json`).

- **VIRTUAL vs STORED is a memory/disk trade.** Indexed virtual columns materialize values in the **secondary index** (extra write cost on INSERT/UPDATE of base JSON) but not in the clustered row. Stored columns enlarge the primary row for every reader. Prefer virtual+index for “filter occasionally” extracts (`create-table-secondary-indexes`).

- **Expression identity matters for optimizer matching.** `f1 + 1` ≠ `1 + f1`; JSON path expressions must match the generated/functional definition, including `JSON_UNQUOTE` when comparing strings to extracted quoted values (`generated-column-index-optimizations`).

- **The `->>` functional-index trap.** `data->>'$.name'` becomes `JSON_UNQUOTE(JSON_EXTRACT(...))` → typed as `LONGTEXT` → cannot index without cast; `CAST(... AS CHAR(n))` introduces collation `utf8mb4_0900_ai_ci` while `JSON_UNQUOTE` is `utf8mb4_bin` → index ignored unless you `COLLATE utf8mb4_bin` on the index expression or write the full `CAST` in the query (`create-index` functional key parts). **This is the #1 “we added an index and EXPLAIN still says ALL” footgun.**

- **`JSON_VALUE` as the cleaner functional index.** `INDEX ((JSON_VALUE(j, '$.id' RETURNING UNSIGNED)))` often avoids the explicit generated column; queries must use the same `JSON_VALUE` expression to match (`json-search-functions`).

- **Multi-valued index = N index records per row.** Great for tags; write amplification scales with array cardinality. Empty array → **no** index entries (row invisible to index scan). JSON `null` inside indexed arrays errors. Only one multi-valued key part per index; can compose with normal columns (`org_id`, …) (`create-index` multi-valued section).

- **Which predicates use multi-valued indexes.** Optimizer considers `MEMBER OF()`, `JSON_CONTAINS()`, `JSON_OVERLAPS()` — not arbitrary `LIKE` on the JSON text, not unpacking in the app. Teach the semantic difference: contains-all vs overlaps-any.

- **Multi-valued cannot cover, cannot ASC/DESC, cannot be PK, no range/index-only scans.** After the index points at rows, you still fetch the clustered record — ties to Art. 15 “covering” intuition by contrast.

- **Online DDL: multi-valued index add is `ALGORITHM=COPY`.** Plan maintenance windows / expand-contract differently than a normal secondary index (bridge Art. 18; cite `innodb-online-ddl-operations` / create-index restrictions).

- **Unique multi-valued = unique *element* across the table.** Two listings cannot share the tag `oak` if `UNIQUE` on the tags array index — almost never what product wants for tags; uniqueness belongs on relational keys.

- **JSON Schema CHECK is a contract, not a substitute for columns.** Good for required keys / types on prefs; bad for pretending schema evolution is free — changing the CHECK is still DDL (`json-validation-functions`, `create-table-check-constraints`).

- **ORM impedance.** Prisma `Json` / Rails `json`/`jsonb`-style columns often encourage whole-document replace; raw SQL path expressions may not match indexed expressions; some ORMs don’t express `MEMBER OF` cleanly — call out “drop to SQL for indexed JSON predicates.”

- **Promote hot paths.** Operational playbook: start JSON → measure filters via slow query / P_S (Art. 20) → add generated indexed extract → if the attribute becomes core domain, migrate to a real column (expand/contract, Art. 18).

- **Junction table vs multi-valued tags.** If tags need metadata (who added, color, ACL), ordering, or FKs to a `tags` dimension table, use relational `listing_tags`. Multi-valued shines for simple scalar arrays with membership queries and modest cardinality.

---

## Interactive feature

Scatter **4–5 small demos** under `src/components/interactive/mysql-json/` (shared chrome from `schema-byte-budget/shared.tsx`). Split path playground and advisor.

### 1. Path playground

- **Goal:** Live `->` / `->>` on sample `prefs` / `flags` / `listing.attrs` JSON; highlight matched subtree.
- **Placement:** JSON path literacy (§5).

### 2. Index advisor badge

- **Goal:** Given path + query intent → promote-to-column / generated index / multi-valued / don’t filter in SQL.
- **Placement:** Scalar indexing (§7) and multi-valued intro (§8).
- **UX:** Recommendation badge + mock mini-EXPLAIN (`ALL` vs `ref`); label illustrative.

### 3. Collation trap

- **Goal:** `->>` functional index ignored unless `CAST … COLLATE utf8mb4_bin` matches query — #1 EXPLAIN footgun.
- **Placement:** Indexing scalar path (§7).

### 4. Multi-valued tags

- **Goal:** `'oak' MEMBER OF (attrs->'$.tags')` with `CAST(… AS … ARRAY)` sketch; empty-array warning.
- **Placement:** Multi-valued section (§8).

### 5. Partial vs full rewrite

- **Goal:** `JSON_SET` one key vs whole-document `UPDATE` — qualitative write-amp bar.
- **Placement:** Partial updates (§9).

**Non-goals:** live MySQL; full JSON Schema editor.

---

## Example queries / schemas

Original teaching examples (not from Oracle docs). Paraphrase mechanisms; do not paste manual samples verbatim into the published MDX.

### 1. Antipattern — everything important lives in JSON

```sql
CREATE TABLE listings_bad (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  doc JSON NOT NULL,  -- title, price, status, tags, everything
  PRIMARY KEY (id),
  KEY idx_org (org_id)
) ENGINE=InnoDB;

-- Every list endpoint becomes a scan of doc
SELECT id
FROM listings_bad
WHERE org_id = 42
  AND doc->>'$.status' = 'active'
  AND 'oak' MEMBER OF (doc->'$.tags');
```

Teaching points: `org_id` index helps only the tenant slice; status/tags still filter residual rows; no integrity on price/status; ORM will keep enlarging `doc`.

### 2. Hybrid target schema — relational core + JSON edges

```sql
CREATE TABLE orgs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  flags JSON NULL,
  -- Indexed extract for a flag that became an admin filter
  billing_v2 TINYINT(1)
    GENERATED ALWAYS AS (JSON_VALUE(flags, '$.billing_v2' RETURNING UNSIGNED))
    VIRTUAL,
  PRIMARY KEY (id),
  KEY idx_orgs_billing_v2 (billing_v2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(320) NOT NULL,
  prefs JSON NULL,
  theme VARCHAR(16)
    GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(prefs, '$.theme')))
    VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_org_theme (org_id, theme)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE listings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(140) NOT NULL,
  status TINYINT UNSIGNED NOT NULL DEFAULT 1,
  price_cents INT UNSIGNED NOT NULL,
  attrs JSON NULL,  -- sparse facets + tags array
  PRIMARY KEY (id),
  KEY idx_listings_org_status (org_id, status),
  -- Multi-valued index on tags (CHAR array; keep tag strings short)
  KEY idx_listings_tags ( (CAST(attrs->'$.tags' AS CHAR(32) ARRAY)) )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3. Functional index alternative (no explicit generated column)

```sql
-- Scalar flag via JSON_VALUE expression index
ALTER TABLE orgs
  ADD INDEX idx_flags_billing
  ( (JSON_VALUE(flags, '$.billing_v2' RETURNING UNSIGNED)) );

-- String path: collation-safe pattern (teach why COLLATE matters)
ALTER TABLE users
  ADD INDEX idx_prefs_theme_fn
  ( (CAST(prefs->>'$.theme' AS CHAR(16)) COLLATE utf8mb4_bin) );
```

Matching queries (expression must align):

```sql
SELECT id, name FROM orgs
WHERE JSON_VALUE(flags, '$.billing_v2' RETURNING UNSIGNED) = 1;

SELECT id, email FROM users
WHERE org_id = 7
  AND prefs->>'$.theme' = 'dark';  -- works with COLLATE utf8mb4_bin index recipe
```

### 4. Tags: MEMBER OF / CONTAINS / OVERLAPS

```sql
-- Single tag
SELECT id, title
FROM listings
WHERE org_id = 42
  AND status = 1
  AND 'oak' MEMBER OF (attrs->'$.tags');

-- Must include all listed tags
SELECT id, title
FROM listings
WHERE JSON_CONTAINS(attrs->'$.tags', CAST('["oak","handmade"]' AS JSON));

-- Any overlap
SELECT id, title
FROM listings
WHERE JSON_OVERLAPS(attrs->'$.tags', CAST('["oak","steel"]' AS JSON));
```

Note for prose: if you need `org_id` + tag together efficiently, consider a composite including the multi-valued part, e.g. `(org_id, (CAST(attrs->'$.tags' AS CHAR(32) ARRAY)))` — only one multi-valued key part allowed; validate with EXPLAIN on realistic data.

### 5. Partial update vs whole-document replace

```sql
-- Prefer (when optimization conditions hold)
UPDATE users
SET prefs = JSON_SET(COALESCE(prefs, JSON_OBJECT()), '$.theme', 'dark')
WHERE id = 1001;

-- Avoid as the only write path for tiny toggles
UPDATE users
SET prefs = CAST('{"theme":"dark","locale":"en","sidebar":"dense"}' AS JSON)
WHERE id = 1001;
```

### 6. Optional CHECK with JSON Schema (prefs contract)

```sql
ALTER TABLE users
  ADD CONSTRAINT chk_prefs_shape CHECK (
    prefs IS NULL OR JSON_SCHEMA_VALID(
      CAST('{
        "type": "object",
        "properties": {
          "theme": { "type": "string", "enum": ["light", "dark", "system"] },
          "locale": { "type": "string", "minLength": 2, "maxLength": 12 }
        },
        "additionalProperties": true
      }' AS JSON),
      prefs
    )
  );
```

### 7. EXPLAIN literacy callback (verify index use)

```sql
EXPLAIN FORMAT=TREE
SELECT id, title
FROM listings
WHERE 'handmade' MEMBER OF (attrs->'$.tags');

-- Expect: index lookup on idx_listings_tags (ref/range), not Table scan
-- If ALL: path cast type mismatch, missing index, or predicate family not eligible
```

### 8. When to use a junction table instead

```sql
CREATE TABLE listing_tags (
  listing_id BIGINT UNSIGNED NOT NULL,
  tag VARCHAR(32) NOT NULL,
  PRIMARY KEY (listing_id, tag),
  KEY idx_tag_listing (tag, listing_id)
) ENGINE=InnoDB;

-- Prefer when tags need FKs to a tags dimension, audit columns, or rich metadata
```

---

## Tie-back checklist

How internals reconnect to app performance / correctness:

| Internals beat | App-facing check |
| --- | --- |
| Native `JSON` validation + binary storage | Are we still stuffing documents into `TEXT`? Invalid JSON should fail writes, not corrupt reads. |
| JSON not directly indexed | Does any list/admin endpoint filter JSON paths without a generated/functional/multi-valued index? |
| Green-zone JSON uses | Are flags/prefs/facets truly sparse & document-shaped — or secretly core domain fields? |
| Red-zone antipattern | Are money, status, FKs, or high-frequency filters living only inside JSON? |
| VIRTUAL generated + secondary index | Can we index hot scalars without doubling storage in the clustered row? |
| Expression / collation match | Does EXPLAIN show the JSON index in use, or did `->>` / CAST collation silently disable it? |
| `JSON_VALUE` functional index | Can we avoid an extra visible column and still keep ORM/raw SQL expressions aligned? |
| Multi-valued index on tags | Do tag filters use `MEMBER OF` / `CONTAINS` / `OVERLAPS` — and is array cardinality bounded? |
| Empty array / unique multi-valued semantics | Will “no tags” or “unique tag globally” surprise product behavior? |
| Partial JSON update rules | Does the app toggle one key with `JSON_SET`, or rewrite the whole blob every request? |
| JSON Schema CHECK | Is there a server-side contract for prefs/flags shape, or only TypeScript types? |
| Junction table alternative | Do tags need metadata/FKs that JSON arrays can’t express cleanly? |
| DDL cost (`COPY` for multi-valued) | Is adding the tags index part of a zero-downtime plan (preview Art. 18)? |

Close the essay by stating: **JSON is a typed document column inside a relational engine — use it for flexible edges, then deliberately index (or promote) the paths your APIs actually query.** Flexibility without an access-path plan is just deferred full-table scans.

---

## Open questions / author notes

- **Generated column vs functional index vs `JSON_VALUE`:** Pick a house style for the series examples. Recommendation: teach **explicit generated columns** first (visible in `SHOW CREATE TABLE`, easier ORM mental model), then show `JSON_VALUE` functional indexes as the compact form; mention raw `CAST(->> …) COLLATE utf8mb4_bin` as the footgun-aware variant.
- **Virtual default:** Prefer `VIRTUAL` + secondary index for extracts unless readers constantly `SELECT` the scalar without filtering — document the exception.
- **Tags: multi-valued vs junction:** Give a clear heuristic in the post (simple scalar tags + membership queries → multi-valued; tag metadata / graph / FK to `tags` table → junction). Don’t pretend one wins forever.
- **Charset for multi-valued string arrays:** Manual restricts multi-valued string indexes to `binary`/`binary` or `utf8mb4`/`utf8mb4_0900_as_cs`. Confirm example collations against 9.7 defaults when drafting so snippets don’t fail on create; case-sensitivity of tags is a product decision — call it out.
- **Prisma / Rails / Django expression support:** Verify what each primary ORM can declare natively for generated columns and functional/multi-valued indexes; plan “raw SQL migration” snippets where ORMs lag. Pick one primary ORM for examples + one contrast sentence.
- **Interactive fidelity:** Advisor mock EXPLAIN only; path evaluator is client-side subset. Scatter embeds — no top mega-lab.
- **Article 02 callback:** One sentence link to BetterRX JSON/MRN scan in indexing section; don’t duplicate as cold open.
- **Partial update + binlog:** Keep `binlog_row_value_options=PARTIAL_JSON` as a short ops callout, not a replication essay (Art. 19).
- **JSON Schema Draft 4 limits:** Mention no `$ref` / external resources so readers don’t paste modern Draft 2020-12 schemas expecting success.
- **Duality views:** One-sentence “exists for Document Store / REST-ish duality; not this article” to avoid rabbit holes.
- **Series glue:** Hub `/projects/mysql/` + post `/posts/mysql-json/`; ensure `seriesList.postSlugs` eventually includes `mysql-json` as #17. Cross-link Art. 01 (JSON escape hatch), 03 (secondary indexes), 10 (EXPLAIN), 15 (covering contrast), 18 (DDL).
- **License/citation:** Paraphrase only; `<Cite />` / `<References />`; never paste Oracle refman prose into the MDX.

---

## Drafting checklist (when writing the post)

- [ ] Callback article 02 JSON story once; don’t re-tell as cold open
- [ ] Scatter JSON demos mid-article; humanizer pass; first-person voice
- [ ] `<Cite />` / `<References />`; multi-valued `COPY` DDL warning → 18
- **Scope guardrails:** Do not deep-dive buffer pool (13), MVCC (11), or online DDL algorithms (18) beyond the JSON-specific migration warning.
