# Learn MySQL — Master Content Plan

Audience: web application programmers who want database literacy spoon-fed — deep enough to reason about InnoDB and SQL under load, always tied back to request/response apps, ORMs, and production pain.

Primary research corpus: local MySQL 9.7 Reference Manual nodes under `sources/mysql-refman-9.7/` (gitignored). Cite the public HTML when linking from published posts: `https://dev.mysql.com/doc/refman/9.7/en/<node-id>.html`.

Series glue: hub `/projects/mysql/` + topic posts `/posts/<slug>/`. Full writing voice / citations / interactives: [`src/app/posts/README.md`](../../../posts/README.md).

---

## Authoring lessons (from articles 1–2)

Bake these into every per-article plan. Plans written before shipping `mysql-schema-types` and `mysql-primary-keys` assumed a single top-of-page mega-demo and more formulaic section endings. That is obsolete.

### Voice

- Almost entirely **first person** (“I”, not “we”). Reader “you” is fine for teaching.
- Casual, story-driven, a little jokey. Fun to read. Flowing prose, not a textbook outline.
- Hand-hold on *why this matters* inside the paragraph. **No** formulaic stamps: `**Why bother:**`, “App consequence:”, “Things to Play With” laundry lists.
- Before publish, run a **humanizer** pass (`~/.cursor/skills/humanizer`): kill AI tells (em-dash piles, rule-of-three, promotional filler, signposting, staccato punchline stacks) while keeping every technical claim.
- Sentence-case headings. Prefer short section titles that sound like conversation (“Choosing IDs”, “A B-tree in one coffee”).

### Structure

- **Series openers** (esp. early Part A): welcome people to the series, say what today covers, why it’s worth an article — then teach.
- Personal day-job anecdotes ([BetterRX](https://www.betterrx.com/), etc.) earn their place in the *relevant* section. Name the day job when useful. Don’t force the anecdote as the cold open unless it’s the best hook.
- Aim ~10 minutes for a casual skimmer unless the topic truly needs more (Part B can run longer if every page earns it).
- Teach prerequisite vocabulary *before* you lean on it (e.g. B-tree / leaf / descent before “clustered leaf”). Prefer a short prose + mini-demo block over reordering the whole series.
- Close with a practical checklist, IEEE-style references, and a natural bridge to the next post. Don’t narrate site chrome (prev/next).

### Citations

- **IEEE-style superscripts** via `<Cite n={…} />` + `<References items={[…]} />` at the bottom. Not inline “see the docs” hyperlinks on code.
- Number in order of first appearance. Source technical claims with primary docs (MySQL refman, MDN, PostgreSQL docs when contrasting, Stripe, etc.).
- Paraphrase only. Local refman is research; never paste Oracle prose into MDX.

### Interactives (scatter, don’t dump)

- Default: **several small demos** embedded mid-article next to the section they teach — not one mega-lab at the top.
- Pattern per demo: motivate in prose → explain what the UI shows → embed → keep moving.
- Prefer 3–5 single-focus toys over one scrubber with five panels. If a demo doesn’t earn its keep, cut it and let prose carry the beat.
- Keep them small, simple, visually clear. Client-only under `src/components/interactive/…`. Label math as illustrative (≠ `INFORMATION_SCHEMA`).
- Shared chrome lives in `schema-byte-budget/shared.tsx` (re-export from article-specific folders as needed).

### House defaults (stay consistent across examples)

- Money: integer minor units (`*_cents`) + `CHAR(3)` currency; mention `DECIMAL` as valid alternative.
- Public IDs: ULID-style `CHAR(26)` unique secondary; clustered PK stays `BIGINT UNSIGNED` unless teaching a deliberate exception.
- Charset/collation: `utf8mb4` / `utf8mb4_0900_ai_ci`.
- Primary ORM in snippets: **Prisma**; one-line contrasts for Rails/Django/Eloquent when useful.
- Brand names (Stripe, Discord, Prisma, BetterRX) are fine when they teach.

### Status

| Status | Meaning |
| --- | --- |
| **Shipped draft** | MDX + demos exist; plan updated to match what actually landed |
| **Plan only** | Stub wired in catalog; plan revised for voice/demo lessons; article not written yet |

---

## Arc

| Phase | Goal |
| --- | --- |
| **Part A — Foundations (1–10)** | Schema, indexes, queries, transactions — enough to design and debug everyday web-app SQL. |
| **Part B — Deep dives (11–20)** | InnoDB internals and operational edges that show up once traffic, concurrency, or migrations get real. |

Each article should: (1) orient the reader, (2) deep-dive the mechanism in casual first-person prose, (3) return to concrete app patterns / failure modes, (4) scatter small interactives where they earn attention.

---

## Part A — Foundations (~10)

| # | Working title | Proposed slug | Status | Why it made the cut |
| ---: | --- | --- | --- | --- |
| 1 | Tables, Types & Schema That Survive Production | `mysql-schema-types` | Shipped draft | Data-type and nullability mistakes are the most expensive early bugs (IDs, money, time, strings). |
| 2 | Primary Keys & the Clustered Index | `mysql-primary-keys` | Shipped draft | InnoDB *is* the clustered index — PK choice shapes every secondary index and lookup. |
| 3 | Secondary Indexes | `mysql-indexes` | Plan only | Composite keys, selectivity, and left-prefix — the daily performance lever. |
| 4 | SELECT, Filtering & Projection | `mysql-select` | Plan only | How `WHERE` / selected columns interact with indexes in real list/detail endpoints. |
| 5 | Sorting, LIMIT & Pagination | `mysql-pagination` | Plan only | `ORDER BY` + offset pagination is a classic web-app footgun; keyset pagination needs indexes. |
| 6 | JOINs That Scale | `mysql-joins` | Plan only | Nested-loop joins, join order, and ORM N+1 vs one fat join. |
| 7 | Writes: INSERT, UPDATE, DELETE & Upserts | `mysql-writes` | Plan only | Idempotent APIs, bulk inserts, and “affected rows” semantics apps get wrong. |
| 8 | Transactions & ACID for Request Handlers | `mysql-transactions` | Plan only | Request-scoped transactions, autocommit, and multi-step checkout/signup flows. |
| 9 | Isolation Levels & What Other Requests See | `mysql-isolation` | Plan only | MySQL’s default `REPEATABLE READ` surprises people coming from Postgres / ORMs. |
| 10 | EXPLAIN & Reading the Optimizer | `mysql-explain` | Plan only | Literacy tool for everything above — access types, key usage, row estimates. |

## Part B — Deep dives (~10)

| # | Working title | Proposed slug | Status | Why it made the cut |
| ---: | --- | --- | --- | --- |
| 11 | MVCC, Undo Logs & Long Transactions | `mysql-mvcc` | Plan only | Explains consistent reads, history list growth, and why “idle in transaction” kills prod. |
| 12 | Row Locks, Gap Locks & Deadlocks | `mysql-locks` | Plan only | Concurrent carts/inventory/booking — how InnoDB locks rows and gaps under RR. |
| 13 | The Buffer Pool & Hot Working Sets | `mysql-buffer-pool` | Plan only | Why RAM shape beats clever SQL once the working set doesn’t fit. |
| 14 | Redo, Doublewrite & Durability Tradeoffs | `mysql-durability` | Plan only | `innodb_flush_log_at_trx_commit`, crash safety, and when apps knowingly trade fsync for throughput. |
| 15 | Covering Indexes, ICP & Index-Only Access | `mysql-covering-indexes` | Plan only | Advanced index design after basics — fewer primary-key lookups under load. |
| 16 | Foreign Keys, Cascades & Integrity | `mysql-foreign-keys` | Plan only | DB-enforced integrity vs app-only FKs; cascade surprises in deletes. |
| 17 | JSON Columns, Generated Columns & Multi-Valued Indexes | `mysql-json` | Plan only | Flexible attributes without abandoning relational indexing (feature flags, sparse profiles). |
| 18 | Online DDL & Zero-Downtime Migrations | `mysql-online-ddl` | Plan only | Expand/contract migrations, Instant/ONLINE DDL, and lock traps during deploys. |
| 19 | Replication, Binlogs & Read Replicas | `mysql-replication` | Plan only | Scale reads, replica lag, and read-your-writes after a write on the primary. |
| 20 | Slow Query Forensics with Performance Schema | `mysql-perf-schema` | Plan only | Capstone diagnostic toolkit — digests, waits, and finding the real bottleneck. |

Stubs and `seriesList.postSlugs` are wired in catalog order above (`src/lib/content.ts` → `/posts/<slug>/`).

---

## Per-article plans

| File | Topic |
| --- | --- |
| [01-schema-types.md](./01-schema-types.md) | Tables, Types & Schema |
| [02-primary-keys.md](./02-primary-keys.md) | Primary Keys & Clustered Index |
| [03-indexes.md](./03-indexes.md) | Secondary Indexes |
| [04-select.md](./04-select.md) | SELECT, Filtering & Projection |
| [05-pagination.md](./05-pagination.md) | Sorting, LIMIT & Pagination |
| [06-joins.md](./06-joins.md) | JOINs That Scale |
| [07-writes.md](./07-writes.md) | Writes & Upserts |
| [08-transactions.md](./08-transactions.md) | Transactions & ACID |
| [09-isolation.md](./09-isolation.md) | Isolation Levels |
| [10-explain.md](./10-explain.md) | EXPLAIN & the Optimizer |
| [11-mvcc.md](./11-mvcc.md) | MVCC & Undo |
| [12-locks.md](./12-locks.md) | Locks & Deadlocks |
| [13-buffer-pool.md](./13-buffer-pool.md) | Buffer Pool |
| [14-durability.md](./14-durability.md) | Redo & Durability |
| [15-covering-indexes.md](./15-covering-indexes.md) | Covering Indexes & ICP |
| [16-foreign-keys.md](./16-foreign-keys.md) | Foreign Keys |
| [17-json.md](./17-json.md) | JSON & Generated Columns |
| [18-online-ddl.md](./18-online-ddl.md) | Online DDL |
| [19-replication.md](./19-replication.md) | Replication & Replicas |
| [20-perf-schema.md](./20-perf-schema.md) | Performance Schema Forensics |

---

## Explicitly deferred (not in the first 20)

Worthwhile later, but lower leverage for a first-pass web-dev curriculum: partitioning, full-text search, spatial types, Group Replication / InnoDB Cluster HA topology, compression, data-at-rest encryption, roles/privileges deep dive, window functions / CTEs as their own essay, NDB Cluster.
