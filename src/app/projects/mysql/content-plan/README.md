# Learn MySQL — Master Content Plan

Audience: web application programmers who want database literacy spoon-fed — deep enough to reason about InnoDB and SQL under load, always tied back to request/response apps, ORMs, and production pain.

Primary research corpus: local MySQL 9.7 Reference Manual nodes under `sources/mysql-refman-9.7/` (gitignored). Cite the public HTML when linking from published posts: `https://dev.mysql.com/doc/refman/9.7/en/<node-id>.html`.

Interactive pattern: client demos under `src/components/interactive/`, motivated in prose then embedded mid-article (see article 1). Series glue: hub `/projects/mysql/` + topic posts `/posts/<slug>/`. Writing voice / citations: [`src/app/posts/README.md`](../../../posts/README.md).

---

## Arc

| Phase | Goal |
| --- | --- |
| **Part A — Foundations (1–10)** | Schema, indexes, queries, transactions — enough to design and debug everyday web-app SQL. |
| **Part B — Deep dives (11–20)** | InnoDB internals and operational edges that show up once traffic, concurrency, or migrations get real. |

Each article should: (1) orient the reader (series context on early posts; clear “why today” always), (2) deep-dive the mechanism in casual first-person prose, (3) return to concrete app patterns / failure modes, (4) optionally ship an interactive after you’ve explained why it exists.

---

## Part A — Foundations (~10)

| # | Working title | Proposed slug | Why it made the cut |
| ---: | --- | --- | --- |
| 1 | Tables, Types & Schema That Survive Production | `mysql-schema-types` | Data-type and nullability mistakes are the most expensive early bugs (IDs, money, time, strings). |
| 2 | Primary Keys & the Clustered Index | `mysql-primary-keys` | InnoDB *is* the clustered index — PK choice shapes every secondary index and lookup. |
| 3 | Secondary Indexes | `mysql-indexes` | Composite keys, selectivity, and left-prefix — the daily performance lever. |
| 4 | SELECT, Filtering & Projection | `mysql-select` | How `WHERE` / selected columns interact with indexes in real list/detail endpoints. |
| 5 | Sorting, LIMIT & Pagination | `mysql-pagination` | `ORDER BY` + offset pagination is a classic web-app footgun; keyset pagination needs indexes. |
| 6 | JOINs That Scale | `mysql-joins` | Nested-loop joins, join order, and ORM N+1 vs one fat join. |
| 7 | Writes: INSERT, UPDATE, DELETE & Upserts | `mysql-writes` | Idempotent APIs, bulk inserts, and “affected rows” semantics apps get wrong. |
| 8 | Transactions & ACID for Request Handlers | `mysql-transactions` | Request-scoped transactions, autocommit, and multi-step checkout/signup flows. |
| 9 | Isolation Levels & What Other Requests See | `mysql-isolation` | MySQL’s default `REPEATABLE READ` surprises people coming from Postgres / ORMs. |
| 10 | EXPLAIN & Reading the Optimizer | `mysql-explain` | Literacy tool for everything above — access types, key usage, row estimates. |

## Part B — Deep dives (~10)

| # | Working title | Proposed slug | Why it made the cut |
| ---: | --- | --- | --- |
| 11 | MVCC, Undo Logs & Long Transactions | `mysql-mvcc` | Explains consistent reads, history list growth, and why “idle in transaction” kills prod. |
| 12 | Row Locks, Gap Locks & Deadlocks | `mysql-locks` | Concurrent carts/inventory/booking — how InnoDB locks rows and gaps under RR. |
| 13 | The Buffer Pool & Hot Working Sets | `mysql-buffer-pool` | Why RAM shape beats clever SQL once the working set doesn’t fit. |
| 14 | Redo, Doublewrite & Durability Tradeoffs | `mysql-durability` | `innodb_flush_log_at_trx_commit`, crash safety, and when apps knowingly trade fsync for throughput. |
| 15 | Covering Indexes, ICP & Index-Only Access | `mysql-covering-indexes` | Advanced index design after basics — fewer primary-key lookups under load. |
| 16 | Foreign Keys, Cascades & Integrity | `mysql-foreign-keys` | DB-enforced integrity vs app-only FKs; cascade surprises in deletes. |
| 17 | JSON Columns, Generated Columns & Multi-Valued Indexes | `mysql-json` | Flexible attributes without abandoning relational indexing (feature flags, sparse profiles). |
| 18 | Online DDL & Zero-Downtime Migrations | `mysql-online-ddl` | Expand/contract migrations, Instant/ONLINE DDL, and lock traps during deploys. |
| 19 | Replication, Binlogs & Read Replicas | `mysql-replication` | Scale reads, replica lag, and read-your-writes after a write on the primary. |
| 20 | Slow Query Forensics with Performance Schema | `mysql-perf-schema` | Capstone diagnostic toolkit — digests, waits, and finding the real bottleneck. |

Stubs and `seriesList.postSlugs` are wired in catalog order above (`src/lib/content.ts` → `/posts/<slug>/`).

---

## Per-article plans

In-depth plans (sources, outline, interactivity, real-world tie-ins) live beside this file:

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
