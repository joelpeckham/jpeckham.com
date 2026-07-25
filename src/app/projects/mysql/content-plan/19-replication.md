# Article 19 — Replication, Binlogs & Read Replicas

| Field | Value |
| --- | --- |
| **Number** | 19 |
| **Title** | Replication, Binlogs & Read Replicas |
| **Slug** | `mysql-replication` |
| **Tier** | Deep dive (Part B) |
| **Role in arc** | Operational scale-out chapter — after schema/query/InnoDB literacy, teach why web apps add read replicas, how the binary log makes async copies work, and how to keep request handlers from serving stale reads after writes. |
| **Depends on** | 08 Transactions; 14 Durability (binlog vs redo mental model); light awareness of 18 Online DDL (DDL also ships through binlog). |
| **Feeds into** | 20 Performance Schema forensics (replication Performance Schema tables as monitoring path); deferred ops/HA (Group Replication / InnoDB Cluster). |
| **Published path** | `/posts/mysql-replication/` |
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

---

## Intent

Teach web developers the **async primary → replica** model they actually deploy: why read-heavy apps offload `SELECT`s, what the binary log is for, why lag exists, and how to keep POST-then-GET flows from lying.

After this article, a reader should be able to:

1. Explain, in one sentence, why MySQL replication is a fit for **high-read / low-write** web apps (`replication`, `replication-solutions-scaleout`).
2. Sketch the data path: client write → primary commit → **binary log event** → replica **receiver** (relay log) → replica **applier** → readable on replica (`replication-implementation`, `replication-threads`, `replica-logs`).
3. Name what the binlog is *for* (replication + point-in-time recovery) and what it is *not* (not a general query log; `SELECT`s are not logged) (`binary-log`).
4. Predict **read-your-writes** bugs after a write: redirect/refresh hits a lagging replica and the new row “vanishes.”
5. Choose an app-layer pattern: **primary for writes**, replica for bulk reads; **session sticky / “use primary until caught up”** after mutating requests; ORM/framework knobs in Rails / Prisma / Laravel.
6. Monitor lag at a literacy level: `SHOW REPLICA STATUS` fields that matter (`Replica_IO_Running`, `Replica_SQL_Running`, `Seconds_Behind_Source`, GTID sets) and know that `Seconds_Behind_Source` is an imperfect proxy (`show-replica-status`, `replication-administration-status`).
7. Know GTIDs exist as the modern way to track “has this transaction landed?” without file/pos math — light treatment only (`replication-gtids`, `replication-gtids-concepts`).
8. Leave Group Replication / InnoDB Cluster / full HA failover as **later/ops** (one short “not this essay” box).

**Out of scope (defer):** provisioning a replica from scratch (`replication-howto` workshop), multi-source topologies, delayed replicas as primary topic, semisync tuning thesis (one paragraph max), Group Replication / InnoDB Cluster / InnoDB ReplicaSet HA design, NDB “synchronous” contrast beyond a footnote, binlog encryption ops, privilege-checks deep dive, cascade-across-engines traps as a full section (one callout from `innodb-and-mysql-replication`).

---

## Real-world hook

**Scene:** A Rails / Next.js / Laravel storefront. Product browse and search crush the primary’s CPU. Ops adds two managed read replicas and flips the ORM “reader” pool. Dashboard looks green. Then support tickets spike:

> “I updated my profile / placed an order / published a post — refreshed — and the old data came back for a few seconds.”

**What actually happened:**

1. `POST /orders` (or `PATCH /profile`) ran on the **primary** and committed.
2. The redirect `GET` (or SPA refetch) was load-balanced to a **replica** still applying an older binlog position.
3. The app told the truth for that connection — the replica simply hadn’t caught up yet. Async replication is working as designed (`replication`: “asynchronous by default”).

**Companies / surfaces that make this concrete:**

- **Shopify-style storefront** — catalog/browse/search on replicas; checkout writes on primary; thank-you page must see the new order.
- **GitHub-style feed** — timeline reads scale out; starring / commenting must not bounce the user to a stale feed.
- **SaaS admin settings** — `PUT /settings` then immediately render the settings page from a reader pool → “save didn’t stick” UX.
- **Analytics / reporting** — heavy `SELECT`s intentionally on replicas (or a dedicated analytics replica) so OLTP primary stays write-responsive (`replication` advantages: analytics off primary).

**The emotional beat:** Read replicas are not “more MySQL, same consistency.” They are a **throughput trade**: more `SELECT` capacity in exchange for **eventual visibility**. The rest of the article is how the binlog creates that lag window — and how request handlers close it when users just wrote something.

---

## Primary documentation sources

Cite the public HTML from published posts. Local research corpus: `sources/mysql-refman-9.7/nodes/<id>.md` (gitignored; do not paste Oracle prose into MDX).

Public URL pattern: `https://dev.mysql.com/doc/refman/9.7/en/<node-id>.html`.

### Core (must cite / teach from)

| Node id | Public URL | Why it matters for this article |
| --- | --- | --- |
| `replication` | https://dev.mysql.com/doc/refman/9.7/en/replication.html | Chapter framing: source → replicas; async by default; scale-out / backups / analytics advantages; GTID vs file/pos methods; SBR/RBR/mixed; semisync & delayed as existence proofs — not the main path. |
| `replication-implementation` | https://dev.mysql.com/doc/refman/9.7/en/replication-implementation.html | Mental model: source keeps changes in binary log; replica **pulls** events and replays them; independent pace per replica; relay log + position bookkeeping. |
| `binary-log` | https://dev.mysql.com/doc/refman/9.7/en/binary-log.html | What binlog events are; dual purpose (replication + PITR); `SELECT`/`SHOW` not logged; enabled by default in 9.7 (with init caveats); `server_id` uniqueness for topologies; purge caution while replicas need old files. |
| `replication-solutions-scaleout` | https://dev.mysql.com/doc/refman/9.7/en/replication-solutions-scaleout.html | **The web-app thesis:** high reads / low writes; send writes to source, reads to replicas; `safe_reader_*` / `safe_writer_*` abstraction — maps directly to ORM reader/writer pools. |
| `replication-threads` | https://dev.mysql.com/doc/refman/9.7/en/replication-threads.html | Binlog Dump (source) + receiver I/O + SQL applier (+ coordinator/workers) — vocabulary for “where lag can hide.” |
| `replica-logs` | https://dev.mysql.com/doc/refman/9.7/en/replica-logs.html | Relay log + connection/applier metadata repositories — replica’s local copy of the stream before apply. |
| `show-replica-status` | https://dev.mysql.com/doc/refman/9.7/en/show-replica-status.html | Ops literacy: `Replica_IO_Running` / `Replica_SQL_Running` / `Seconds_Behind_Source` / GTID sets; caveats that `Seconds_Behind_Source` is not wall-clock truth on slow nets / multithreaded appliers. |
| `replication-administration-status` | https://dev.mysql.com/doc/refman/9.7/en/replication-administration-status.html | “Checking replication status” workflow; heartbeat idea; pointer to Performance Schema replication tables. |
| `innodb-and-mysql-replication` | https://dev.mysql.com/doc/refman/9.7/en/innodb-and-mysql-replication.html | Failed/rolled-back txs are **not** in the binlog (so not replicated); short InnoDB note so readers don’t invent “replicas undo failed checkouts.” |

### Supporting (cite lightly; don’t derail)

| Node id | Public URL | Use |
| --- | --- | --- |
| `replication-formats` | https://dev.mysql.com/doc/refman/9.7/en/replication-formats.html | One beat: row-based is default; statement vs row vs mixed — enough to know what “events” usually mean today. |
| `replication-gtids` | https://dev.mysql.com/doc/refman/9.7/en/replication-gtids.html | Light: GTIDs identify transactions across the topology; simplify positioning/failover vs file+pos. |
| `replication-gtids-concepts` | https://dev.mysql.com/doc/refman/9.7/en/replication-gtids-concepts.html | Light: `SOURCE_UUID:TXN_ID` shape; auto-skip / apply-at-most-once intuition; `gtid_executed` as “what’s been applied.” |
| `replication-semisync` | https://dev.mysql.com/doc/refman/9.7/en/replication-semisync.html | One paragraph: async default vs semisync “ack receipt to at least N replicas before commit returns” — still not “replica has *applied*.” |
| `replication-solutions` | https://dev.mysql.com/doc/refman/9.7/en/replication-solutions.html | Umbrella for scale-out / backup / switchover — link, don’t tour. |
| `binary-log-formats` | https://dev.mysql.com/doc/refman/9.7/en/binary-log-formats.html | Optional footnote if readers ask “what’s in a binlog event.” |
| `performance-schema-replication-tables` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-replication-tables.html | Teaser → article 20: table-shaped status vs `SHOW REPLICA STATUS`. |
| `group-replication` | https://dev.mysql.com/doc/refman/9.7/en/group-replication.html | **Mention-only** “later/ops” for multi-primary / consensus HA — not this article’s thesis. |
| `mysql-innodb-replicaset-introduction` | https://dev.mysql.com/doc/refman/9.7/en/mysql-innodb-replicaset-introduction.html | Optional one-liner under “managed HA products exist.” |
| `point-in-time-recovery-binlog` | https://dev.mysql.com/doc/refman/9.7/en/point-in-time-recovery-binlog.html | One sentence: same binlog powers PITR after restore — dual-purpose reminder. |
| `purge-binary-logs` | https://dev.mysql.com/doc/refman/9.7/en/purge-binary-logs.html | Ops callout: don’t purge source logs still needed by lagging replicas. |

**Citation rule:** paraphrase + `<Cite />` / `<References />`; never paste Oracle wording into the published post.

---

## Article structure

Suggested H2 spine — sentence-case. Scatter **named mini-demos** mid-article; no mega timeline at top.

1. **Part B opener + what today covers** — save-then-refresh stale read hook.
2. **Why web apps add read replicas** — scale-out model.
3. **The binary log is the stream** — not the query log. *(Embed **Binlog stream gutter** on write.)*
4. **How a replica catches up** — pull, relay, apply.
5. **Async by default** — commit ≠ visible on replica. *(Embed **Lag scrubber stale read**.)*
6. **Formats & GTIDs (literacy pass)** — row-based; light GTID vocabulary.
7. **Read-your-writes after POST** — patterns. *(Embed **Read target toggle** — replica vs primary.)*
8. **App wiring: Rails / Prisma / Laravel** — force primary after mutation.
9. **Monitoring lag** — `SHOW REPLICA STATUS`. *(Embed **Replica status decoder** — fields light up with scrubber.)*
10. **InnoDB + replication gotchas (short)**
11. **What this article is not** — Group Replication / HA deferral.
12. **Tie-back checklist** + further reading.
13. **References** — IEEE list.

---

## Deep-dive beats

Teach these ideas in order. Weave handler implications into prose — no “App implication:” stamp lines.

### Beat A — Replicas buy read capacity, not a second primary

- From `replication` / `replication-solutions-scaleout`: one source owns writes/updates; replicas absorb `SELECT` load; model fits browse-heavy sites.
- Mental model diagram (prose or small SVG): `[App] --writes--> [Primary] ; [App] --reads--> [Replica₁…ₙ]`.
- If your traffic is write-heavy (ingest pipelines, high-churn counters), replicas won’t magically fix primary CPU — you need different tools (sharding, queues, caching). Say this early so readers don’t cargo-cult “add replicas.”

### Beat B — The binary log is the change tape

- Primary records modifying events in the binary log (`binary-log`, `replication-implementation`).
- `SELECT` does not go into the binlog — replicas never “replay reads.”
- Binlog also enables point-in-time recovery after restore — same artifact, two jobs (`binary-log`, `point-in-time-recovery-binlog`).
- Anything that must exist on a replica had to commit on the primary (or be applied via replication). App-only caches are a separate consistency problem.

### Beat C — Pull, relay, apply (where lag lives)

- Replica **pulls** binlog events (does not wait for a push) (`replication-implementation`).
- Path: source **Binlog Dump** thread → replica **receiver (I/O)** → **relay log** → **applier (SQL)** (+ optional parallel workers) (`replication-threads`, `replica-logs`).
- Lag can be network/IO (receiver behind), apply backlog (applier behind), or deliberate delay — teach the first two as the common web-app case.
- “replica is up” ≠ “replica has my transaction.” Health checks that only ping `SELECT 1` miss apply lag.

### Beat D — Async commit vs visible-on-replica

- Default replication is asynchronous: primary does not wait for replicas to apply before returning success to the client (`replication`).
- Semisync (footnote): source can wait for **receipt/log** on ≥1 replica before commit returns — still not a guarantee the applier finished (`replication-semisync`). Fully sync / consensus HA is Group Replication / NDB territory → later/ops.
- HTTP 200 on `POST` means “durable on primary” (subject to durability settings from article 14), not “safe to read from any replica.”

### Beat E — Read-your-writes is an application contract

- Classic sequence: write primary → redirect GET → load balancer picks lagging replica → stale HTML/JSON.
- Patterns to teach (pick 2–3 as first-class; mention others):
  1. **Primary for all writes; default reads to replica; after a mutating request in this session, force primary for N seconds / until request ends.**
  2. **Sticky “writer” connection for the rest of the browser session** after first write (cookie/session flag).
  3. **Read-your-writes critical paths always hit primary** (checkout confirmation, settings, “my just-created resource”) even if the rest of the site uses replicas.
  4. Optional advanced: wait until replica’s executed GTID set contains the write’s GTID (ops-y; mention, don’t build a tutorial).
- Tie to frameworks in Beat F.

### Beat F — Framework / ORM wiring (Rails, Prisma, Laravel)

Keep examples short and idiomatic — teach the *routing rule*, not every API.

**Rails (Active Record multiple databases):**

- Writer vs reader roles (`connecting_to`, `role: :reading` / `:writing`).
- Automatic role switching middleware can send GETs to replica — **exactly** the stale-after-POST footgun if a GET follows a write in the same user flow.
- Pattern: after write, `ActiveRecord::Base.connected_to(role: :writing)` for the follow-up read, or disable replica for that controller action / use `while_preventing_writes` carefully (don’t confuse “prevent writes” with “force primary reads”).
- Call out: “reading” role after redirect is the bug class.

**Prisma:**

- `@prisma/client` + driver adapters / `datasource` URLs: primary URL vs `readReplicas` extension / accelerate / proxy patterns (word carefully — Prisma’s replica APIs evolve; teach the principle: **explicit primary for mutations and for read-your-writes paths**).
- Pattern: `prisma.$primary()` / equivalent for post-mutation reads; bulk list endpoints use replica client.
- Avoid pinning the article to one package version’s exact method names — show a thin `db.writer` / `db.reader` wrapper.

**Laravel:**

- `DB::connection('mysql')` vs `mysql::read` / `sticky` option in `config/database.php`.
- Laravel’s `sticky` (when enabled) uses the writer for the remainder of the request lifecycle after a write within that request — good for same-request read-your-writes; **does not** fix the next HTTP request after redirect unless session affinity or primary-forced routes exist.
- Pattern: critical confirmation routes → `DB::connection('mysql')` (write connection) for reads; list/index → read connection.

**Shared teaching line:** ORMs automate “GET → replica,” which is great for scale and terrible for confirmation pages unless you opt out.

### Beat G — Monitoring lag (developer-useful, not a runbook)

- Run on the replica: `SHOW REPLICA STATUS\G` (`show-replica-status`, `replication-administration-status`).
- Field decoder (teach these first):
  - `Replica_IO_Running` / `Replica_SQL_Running` — both `Yes` for healthy stream/apply.
  - `Seconds_Behind_Source` — useful heuristic, **not** precise wall time; weak on slow networks; multithreaded applier caveats (`show-replica-status`).
  - `Retrieved_Gtid_Set` vs `Executed_Gtid_Set` — received vs applied (when GTIDs enabled).
  - `Last_IO_Error` / `Last_SQL_Error` — “it’s broken,” not “it’s lagging.”
- Product metrics should alert on lag thresholds that match UX SLOs (e.g. p95 confirmation freshness), not only on thread death.
- Teaser: Performance Schema `replication_*` tables → article 20.

### Beat H — GTID literacy (light)

- GTID = `SOURCE_UUID:TRANSACTION_ID` uniquely names a committed transaction across the topology (`replication-gtids-concepts`).
- Consistency intuition: if every GTID committed on the source is in the replica’s executed set, they’re consistent for those transactions (`replication-gtids`).
- You usually don’t manipulate GTIDs from Rails/Prisma — but managed DBs and failover tooling do. Enough vocabulary to read status output and vendor docs.

### Beat I — InnoDB notes that prevent wrong mental models

- Failed / rolled-back transactions are **not** written to the binary log, so replicas never see them (`innodb-and-mysql-replication`). Ties to article 08.
- Engine mismatch / cascade surprises exist if replica tables aren’t InnoDB with the same FKs — one cautionary paragraph, link article 16; don’t derail into cascade thesis.
- “I rolled back the checkout” does not need a compensating delete on replicas — it never replicated.

### Beat J — Later/ops box (explicit deferral)

Short callout, not a section series:

> **Not covering here:** Group Replication, InnoDB Cluster / ReplicaSet, automatic primary election, multi-primary writes, or full failover runbooks (`group-replication`, related HA docs). Those solve **availability** with different consistency/latency tradeoffs. This article is about **read scale-out** with classic async source/replica and the app patterns that make it safe.

---

## Interactive feature

Scatter **4 small client demos** under `src/components/interactive/mysql-replication/` (shared chrome from `schema-byte-budget/shared.tsx`).

### 1. Binlog stream gutter

- **Goal:** Write on primary → binlog event chip → relay → apply lights up as lag drains.
- **Placement:** Binlog stream section (§3).

### 2. Lag scrubber stale read

- **Goal:** After commit, replica still shows old row until lag = 0.
- **Placement:** Async default (§5) and read-your-writes (§7). **Primary wow moment.**

### 3. Read target toggle

- **Goal:** Same query on replica (stale) vs primary (consistent confirmation page).
- **Placement:** Read-your-writes (§7).

### 4. Replica status decoder

- **Goal:** `Seconds_Behind_Source`, IO/SQL running badges update with lag scrubber — monitoring literacy.
- **Placement:** Monitoring lag (§9).

**Non-goals:** Group Replication, semisync ack, real MySQL, GTID wait API.

Embed demos mid-article — not at top.

---

## Example queries / schemas

Minimal schema for article snippets + interactive story:

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','paid','cancelled') NOT NULL,
  total_cents INT UNSIGNED NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_orders_user_updated (user_id, updated_at)
) ENGINE=InnoDB;

CREATE TABLE user_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
```

### Write on primary (checkout / settings)

```sql
-- runs on PRIMARY (writer connection)
START TRANSACTION;

UPDATE orders
SET status = 'paid'
WHERE id = 1001 AND user_id = 7 AND status = 'pending';

-- app checks ROW_COUNT() / affected rows

COMMIT;
-- Client gets HTTP 200 here. Replicas may still show status='pending'.
```

```sql
-- settings save on PRIMARY
UPDATE user_profiles
SET display_name = 'Ada'
WHERE user_id = 7;
```

### Stale read on replica vs forced primary

```sql
-- DANGEROUS after the write if this hits a lagging replica:
SELECT id, status, total_cents
FROM orders
WHERE id = 1001 AND user_id = 7;

-- SAFE confirmation path: same SQL, but on the PRIMARY / writer role
```

### Monitoring (on replica)

```sql
SHOW REPLICA STATUS\G
-- Watch:
--   Replica_IO_Running
--   Replica_SQL_Running
--   Seconds_Behind_Source
--   Retrieved_Gtid_Set
--   Executed_Gtid_Set
--   Last_IO_Error / Last_SQL_Error
```

Optional GTID literacy (when enabled):

```sql
SELECT @@GLOBAL.gtid_executed\G
-- Compare conceptually to the source's executed set after a write.
```

### App-layer sketches (routing, not full apps)

**Rails — force writer after mutation:**

```ruby
def show
  # Confirmation / redirect target after create
  ActiveRecord::Base.connected_to(role: :writing) do
    @order = Order.find(params[:id])
  end
end
```

**Prisma-shaped wrapper (illustrative):**

```ts
// writer for mutations + read-your-writes; reader for list/browse
export const db = {
  writer: prisma,           // primary URL
  reader: prismaReader,     // replica URL / extension
};

await db.writer.order.update({ where: { id }, data: { status: "paid" } });
const order = await db.writer.order.findUnique({ where: { id } }); // not reader
```

**Laravel — sticky helps same request; confirmation route still pin writer:**

```php
// config: mysql sticky=true helps mid-request reads after write

// Explicit primary for thank-you / settings show:
$order = DB::connection('mysql')->table('orders')->where('id', $id)->first();

// Browse/list can use read connection:
$orders = DB::connection('mysql::read')->table('orders')->where('user_id', $uid)->paginate();
```

### Scale-out abstraction (mirror the manual’s teaching)

Narrate the `replication-solutions-scaleout` idea as four app functions:

```text
safe_writer_connect()  → primary pool
safe_reader_connect()  → replica pool (or primary if no replica)
safe_writer_statement() → INSERT/UPDATE/DELETE (+ post-write reads you care about)
safe_reader_statement() → browse/list/search SELECTs
```

---

## Tie-back checklist

Closing “so what do I do in my app?” list. Symptom → mechanism → action.

| If you see… | Remember… | Do this |
| --- | --- | --- |
| User saves, refresh shows old row for a few seconds | Async apply lag (Beats C–E) | Force primary (or sticky writer) on confirmation / post-mutation GETs |
| Primary CPU high on read-mostly traffic | Scale-out model (Beat A) | Reader pool for browse/search; keep writes on primary |
| “Replica healthy” but stale data | `SELECT 1` ≠ caught up (Beat C/G) | Monitor `Seconds_Behind_Source` / GTID executed gap; alert on UX SLO |
| Checkout rolled back but you fear replica divergence | Failed txs not binlogged (Beat I) | Trust rollback; don’t invent compensating replica deletes |
| ORM “automatically uses replica for reads” | Framework defaults (Beat F) | Audit redirect/show actions after `create`/`update` |
| Lag spikes during heavy reports | Analytics on OLTP primary/replica (Beat A) | Move warehouse-style queries off the user-facing replica set |
| Wondering about multi-primary / auto-failover | Later/ops (Beat J) | Stay on classic source/replica for this series; revisit HA separately |
| Need table-shaped replication metrics | Article 20 teaser | Performance Schema `replication_*` tables |

**Forward links:** durability / commit visibility on primary → **14**; online DDL shipping through binlog → **18**; forensics / P_S → **20**. Back-links: transactions (**08**) for commit/rollback; isolation (**09**) for “what another session sees” vs “what another *server* has applied” — different axes, call out explicitly.

**Definition of done for this article:** reader can draw the binlog→relay→apply path, explain why a 200 on POST doesn’t guarantee replica freshness, and name the framework knob they’d flip for a thank-you page.

---

## Open questions / author notes

1. **Managed MySQL wording:** Many readers use RDS / Cloud SQL / PlanetScale / Vitess / ProxySQL. Keep engine concepts MySQL-native; add a short “your vendor wraps `SHOW REPLICA STATUS`” note without teaching each console.
2. **Prisma API churn:** Replica helpers change across Prisma releases / Accelerate / driver adapters. Prefer a durable `writer`/`reader` wrapper narrative; verify method names at draft time against current Prisma docs.
3. **Rails automatic role switching:** Be precise — middleware that sends GETs to replicas is the footgun; don’t smear Active Record unfairly. Link to current Rails multi-db guides when drafting.
4. **Laravel `sticky`:** Document the same-request boundary clearly so readers don’t think sticky fixes the next navigation after redirect.
5. **Semisync depth:** Cap at one paragraph; it tempts an HA digression. Emphasize “ack received ≠ applied.”
6. **GTID depth:** Literacy only — format, executed set, why ops likes it. No `CHANGE REPLICATION SOURCE TO` workshop.
7. **Group Replication temptation:** Series README already defers HA cluster topology. Keep the later/ops box short; do not compare consensus protocols.
8. **Interactive fidelity:** Fabricated lag is fine; scatter embeds mid-article — not at top.
9. **Terminology:** Prefer current terms **source/replica** (and `SHOW REPLICA STATUS`) while acknowledging older “master/slave” strings in legacy docs/tools once.
10. **Coordination with 14 (durability):** Binlog flush vs InnoDB redo can confuse readers. One clarifying sentence: article 14 = crash safety on *this* server; this article = *copying* committed changes to another server. Cross-link, don’t retell redo.
11. **Coordination with 18 (online DDL):** DDL also replicates; long DDL can spike lag. One sentence + link — no migration workshop here.
12. **Legal:** Original teaching prose only; link refman nodes; local `sources/mysql-refman-9.7/` stays gitignored (`sources/README.md`).
13. **Series glue:** Register slug `mysql-replication` in hub `seriesList.postSlugs` when publishing; place after online DDL (**18**), before Performance Schema (**20**).
14. **Tone check:** Empower app developers to use replicas safely — not scare them into “never use replicas.”

---

## Drafting checklist (when writing the post)

- [ ] Scatter replication demos mid-article; lag scrubber makes stale read obvious
- [ ] `<Cite />` / `<References />`; humanizer pass; first-person voice
- [ ] Rails / Prisma / Laravel force-primary sketches; distinguish 14 (durability on primary) vs this article (copying commits)
- [ ] Later/ops box for Group Replication — short

---

## Draft success metrics (for later editing)

- A reader can explain async lag in one breath using “binlog → relay → apply.”
- Interactive makes stale-vs-primary-read *visually* obvious with the lag scrubber.
- Rails / Prisma / Laravel each get a concrete “force primary after write” sketch.
- Zero sections that require provisioning a replica or designing Group Replication.
- Closing checklist maps every major failure mode to an app action.
)
