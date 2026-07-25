# 14 — Redo, Doublewrite & Durability Tradeoffs

| Field | Value |
| --- | --- |
| **Number** | 14 |
| **Title** | Redo, Doublewrite & Durability Tradeoffs |
| **Slug** | `mysql-durability` |
| **Tier** | Deep dive (Part B) |
| **Audience** | Web app programmers who already understand request-scoped transactions (Art. 08) and want the *physical* meaning of “COMMIT succeeded.” |
| **Series hub** | `/projects/mysql/` |
| **Post path** | `/posts/mysql-durability/` |
| **Prev / next** | 13 Buffer Pool → **14** → 15 Covering Indexes |
| **Status** | Plan only |

---

## Authoring contract

- **Status:** Plan only — stub wired; article not written yet.
- **Voice:** First person, casual/jokey, flowing prose. Run humanizer pass (`~/.cursor/skills/humanizer`) before publish.
- **No formulaic stamps:** No `**Why bother:**`, “App consequence:”, or “Things to Play With” laundry lists.
- **Citations:** IEEE `<Cite n={…} />` + `<References items={[…]} />` at bottom. Source technical claims; paraphrase refman only.
- **Interactives:** 3–5 small demos mid-article — **split** crash timeline, flush toggles, and doublewrite into separate embeds, not one dashboard. Shared chrome from `schema-byte-budget/shared.tsx`.
- **House defaults:** Integer cents; ULID public ids; `utf8mb4_0900_ai_ci`; Prisma in snippets.
- **Length:** Part B can run longer if every section earns it.

---

## Intent

After this article, a reader can explain what InnoDB actually does when a request handler’s transaction commits — and what “durable” means under real crash scenarios.

They should leave able to:

1. Trace the **write-ahead logging (WAL) path**: dirty pages in the buffer pool → redo records in the **log buffer** → redo log files on disk → crash recovery replay — without needing a DBA vocabulary dump.
2. Explain why the **doublewrite buffer** exists (torn page protection) and how it differs from redo (consistency of pages vs durability of committed changes).
3. Reason about `innodb_flush_log_at_trx_commit` values **0 / 1 / 2**: what each writes vs flushes at commit time, and roughly how much committed work can vanish on power loss vs `mysqld` crash.
4. Relate **binary log sync** (`sync_binlog`) to commit durability when binlogs are enabled — enough to know the “full durability pair” without rewriting Article 19 (replication).
5. Talk honestly with teammates about **knowingly trading durability for throughput** on SaaS workloads: which knobs, what failure mode, what product language to use (“may lose ~1s of commits on hard power loss”), and when *not* to trade.

**Out of scope (explicit):** full HA topologies (Group Replication, InnoDB Cluster), failover orchestration, backup strategy deep dive, `innodb_force_recovery` forensics as a primary topic, cloud-vendor storage SLA essays. Tease HA/replicas → Art. 19; force-recovery only as a recovery sidebar.

**Series glue:** Article 08 teased durability as “COMMIT waited for redo.” Article 13 covered the buffer pool (dirty pages live in RAM until flushed). This article is the missing link: *how commits become crash-safe* and *when teams loosen that promise*.

---

## Real-world hook

**Scene:** A billing SaaS (`POST /api/invoices/:id/pay`). The handler runs a multi-statement InnoDB transaction: mark invoice paid, insert ledger row, enqueue an outbox event. The ORM reports success; the API returns **200** with `{ "status": "paid" }`. Ninety milliseconds later the VM host loses power (or the cloud volume’s “fsync” was lying). On restart, the invoice is unpaid again. Support has a screenshot of the 200. Engineering has a dashboard green checkmark on “commit latency p99.” Nobody agrees what “durable” meant.

**Why this lands for web developers:**

- Most teams treat `COMMIT` as a product promise: *if we told the user it worked, it survives a crash.*
- Managed MySQL (RDS, Cloud SQL, PlanetScale-style, self-hosted on NVMe) still exposes `innodb_flush_log_at_trx_commit` and `sync_binlog`. Someone’s Terraform or “performance checklist” may have set them to `2` / `0` months ago for write QPS.
- The failure mode is **not** “partial rows inside one transaction” (atomicity still holds — Art. 08). It is **whole committed transactions disappearing** after the client was told they landed — or, with torn pages and doublewrite off, **corrupt pages** that refuse to start cleanly.

**Concrete teaching scenario for the whole piece:** a multi-tenant SaaS with hot write paths — checkout / pay invoice / credit balance — on MySQL 8+/9.x InnoDB. Primary narrative: *power loss after HTTP 200*. Secondary: *`mysqld` killed -9* (process crash, OS still up — different exposure under flush=2). Tertiary: *torn 16KB page write* during checkpoint flush (why doublewrite exists even when redo is perfect).

Tone: “Durability is a knob with a receipt. If you turn it, write the receipt in the runbook and the product SLA — not only in `my.cnf`.”

---

## Primary documentation sources

Cite local nodes under `sources/mysql-refman-9.7/nodes/` while drafting. Link the public HTML in the published post.

### Core (must read / cite in article)

| Node id | Local file | Public URL | Why it matters |
| --- | --- | --- | --- |
| `mysql-acid` | `nodes/mysql-acid.md` | https://dev.mysql.com/doc/refman/9.7/en/mysql-acid.html | Official D framing: durability = software × hardware (flush settings, doublewrite, `sync_binlog`, device write cache, UPS, `fsync` honesty). Also names doublewrite under Consistency. Vocabulary spine. |
| `innodb-redo-log` | `nodes/innodb-redo-log.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-redo-log.html | Redo log purpose: encode change requests; replay incomplete data-file updates on crash recovery; LSN progress; `#innodb_redo` files; capacity via `innodb_redo_log_capacity`. |
| `innodb-redo-log-buffer` | `nodes/innodb-redo-log-buffer.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-redo-log-buffer.html | Log buffer in memory; `innodb_log_buffer_size`; points at `innodb_flush_log_at_trx_commit` / `innodb_flush_log_at_timeout` as the flush policy knobs. |
| `innodb-doublewrite-buffer` | `nodes/innodb-doublewrite-buffer.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-doublewrite-buffer.html | Torn-page protection: write pages to doublewrite area before data-file positions; sequential chunk + `fsync`; `innodb_doublewrite` ON / DETECT_AND_RECOVER / DETECT_ONLY / OFF. |
| `innodb-parameters` | `nodes/innodb-parameters.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-parameters.html | **Authoritative 0/1/2 semantics** for `innodb_flush_log_at_trx_commit`; `innodb_flush_log_at_timeout`; hardware-lies caution; replication pairing with `sync_binlog=1`. Also `innodb_flush_method` (supporting). |
| `innodb-recovery` | `nodes/innodb-recovery.md` | https://dev.mysql.com/doc/refman/9.7/en/innodb-recovery.html | Crash recovery steps: redo application before accepting connections; rollback of incomplete txs; “transactions applied entirely or erased entirely” complements the flush-setting note. |
| `replication-options-binary-log` | `nodes/replication-options-binary-log.md` | https://dev.mysql.com/doc/refman/9.7/en/replication-options-binary-log.html | `sync_binlog` 0 / 1 / N — binary log durability for committed transactions; recommended pair with `innodb_flush_log_at_trx_commit=1`. |

### Supporting (cite where the beat needs them)

| Node id | Public URL | Use |
| --- | --- | --- |
| `optimizing-innodb-logging` | https://dev.mysql.com/doc/refman/9.7/en/optimizing-innodb-logging.html | Capacity / log buffer sizing as *throughput* levers that are *not* durability trades; keep distinct from flush=0/2. |
| `binary-log` | https://dev.mysql.com/doc/refman/9.7/en/binary-log.html | Light: binlog role in crash recovery / PITR; do not teach replication topology. |
| `innodb-introduction` | https://dev.mysql.com/doc/refman/9.7/en/innodb-introduction.html | One-paragraph “InnoDB does ACID + crash recovery” grounding if readers jump in mid-series. |
| `performance-schema-innodb-redo-log-files-table` | https://dev.mysql.com/doc/refman/9.7/en/performance-schema-innodb-redo-log-files-table.html | Optional ops sidebar: `performance_schema.innodb_redo_log_files` LSN ranges (from redo-log node examples). |
| `forcing-innodb-recovery` | https://dev.mysql.com/doc/refman/9.7/en/forcing-innodb-recovery.html | Mention-only if “corruption / won’t start” comes up; not a how-to centerpiece. |
| `innodb-disk-io` / `optimizing-innodb-diskio` | https://dev.mysql.com/doc/refman/9.7/en/innodb-disk-io.html / https://dev.mysql.com/doc/refman/9.7/en/optimizing-innodb-diskio.html | Optional: `innodb_flush_method` / fsync counting via `Innodb_data_fsyncs` for readers chasing commit latency. |

**Citation rule:** paraphrase carefully; cite with `<Cite />` / `<References />`; never paste Oracle prose.

---

## Article structure

Suggested H2 spine — sentence-case. Scatter **named mini-demos** mid-article; no mega crash stepper at the top. Teach WAL layers before flush knob alphabet soup.

1. **Part B opener + what today covers** — HTTP 200 then power loss hook.
2. **What COMMIT promised in article 08** — atomicity vs durability.
3. **WAL / redo path** — buffer pool dirty ≠ durable. *(Embed **WAL layer stack**.)*
4. **Log buffer and flush policy** — `innodb_flush_log_at_trx_commit` 0/1/2. *(Embed **Flush survival panel** — toggles update badges live.)*
5. **When crash hits** — before vs after COMMIT returns; power loss vs `kill -9`. *(Embed **Crash timing inject** on same panel.)*
6. **Doublewrite** — torn page protection, separate from redo flush. *(Embed **Torn page / doublewrite** — small side demo.)*
7. **Crash recovery in one page** — redo replay; whole commits lost, not half-applied.
8. **Binary log sync** — `sync_binlog` pair; tease 19. *(Optional collapsed **sync_binlog** row on flush panel.)*
9. **SaaS crash matrix + team language** — when flush=2 is acceptable vs ledger paths.
10. **Ops literacy** — `SHOW VARIABLES`; capacity vs durability confusion guard.
11. **Tie-back checklist** + bridge to 15.
12. **References** — IEEE list.

Do not end sections with “App consequence:” stamps.

---

## Deep-dive beats

Mechanisms and pitfalls that keep this from being a `my.cnf` cheat sheet:

### Beat A — WAL path in web-dev English

Teach a four-layer story (reuse Art. 13 buffer-pool language):

| Layer | Where | What happens on `UPDATE` / `COMMIT` |
| --- | --- | --- |
| Buffer pool | RAM | Page becomes dirty; readers may see it (isolation rules) |
| Redo log buffer | RAM | Redo records describe the change; not durable yet |
| Redo log files | Disk (`#innodb_redo`) | Durable journal once written **and flushed** per policy |
| Tablespace files (`.ibd`) | Disk | Updated asynchronously via checkpoint / flush; may lag far behind commits |

**Key teaching line:** InnoDB does **not** need to write the `.ibd` page before `COMMIT` returns. It needs the **redo** that can reconstruct that page change. That is write-ahead logging.

- Commit latency is often *fsync of redo* (and binlog), not “how big is my row.”

### Beat B — `innodb_flush_log_at_trx_commit` 0 / 1 / 2

From `innodb-parameters` (paraphrase precisely in the post):

| Value | At each `COMMIT` | Background flush | Full ACID durability? | Typical loss window on crash |
| ---: | --- | --- | --- | --- |
| **1** (default) | Write **and flush** redo to disk | — | Yes (software side) | Committed txs should survive OS/process crash *if* storage honors flush |
| **2** | **Write** redo to OS file cache; **do not** flush every commit | Flush ~once/sec (`innodb_flush_log_at_timeout`, default 1s) | No | ~up to 1s of commits on **power loss / OS crash**; often survives pure `mysqld` kill if OS cache still flushes |
| **0** | Neither write nor flush every commit | Write + flush ~once/sec | No | ~up to 1s (or N seconds if timeout raised) of commits on crash; larger exposure than 2 for process crashes |

Nuances the article must teach (docs call these out):

- Once-per-second flushing is **not** a hard guarantee — DDL / internal activity may flush more often; scheduling may flush less often.
- Raising `innodb_flush_log_at_timeout` to N can erase up to **N seconds** of transactions on unexpected exit.
- Crash recovery still makes each transaction **all-or-nothing** — you lose whole commits, you don’t half-apply a commit.
- Replication setups that care about durability: docs recommend **`innodb_flush_log_at_trx_commit=1`** and **`sync_binlog=1`**.

- Setting `2` is a *conscious SLA change*, not a free latency win.

### Beat C — Doublewrite ≠ redo flush

Common confusion: “doublewrite makes commits durable.”

Correct split:

- **Redo (+ flush policy):** “Did this committed transaction survive?”
- **Doublewrite:** “When InnoDB flushed a 16KB page to the data file and power died mid-write, can recovery find a good copy?”

From `innodb-doublewrite-buffer`:

- Pages go to the doublewrite area (sequential, typically one `fsync`) **before** their final positions in data files.
- Not “2× I/O cost” in the naive sense — batch sequential write.
- `innodb_doublewrite=OFF` is a integrity/performance trade (benchmarks, special atomic-write hardware stories); **DETECT_ONLY** writes metadata only (detect incomplete writes, don’t repair from doublewrite content).
- Disabling doublewrite dynamically OFF↔ON is restricted; teach “don’t casually flip in prod without knowing the rules.”

- Turning off doublewrite to chase TPS can buy silent page corruption risk — a worse failure class than “lost 200ms of orders.”

### Beat D — Hardware can lie about fsync

Both `innodb-parameters` and `sync_binlog` docs share the caution: OS and disk hardware may report flush complete when data is still in a volatile cache. Then even setting `1` / `1` is not physically durable under power loss.

Teach at product level (not a storage whitepaper):

- Battery-backed RAID / cloud volumes with documented power-fail behavior matter.
- “We set flush=1” ≠ “we tested kill -9 and power pull.”
- UPS / AZ failure stories belong next to this caution, lightly — then point at backups / replicas (Art. 19), not HA design here.

- Durability is a **stack** (InnoDB settings × filesystem × volume). Own the stack you deploy on.

### Beat E — SaaS crash matrix (teaching table)

Use the interactive’s scenarios as the article’s central table:

| Scenario | flush=1 + sync_binlog=1 | flush=2 | flush=0 |
| --- | --- | --- | --- |
| Power loss mid-commit (before COMMIT returns) | Uncommitted work rolled back; client should retry / not have seen success | Same atomicity | Same atomicity |
| Power loss **after** COMMIT returned | Committed work should survive (if storage honest) | Up to ~1s of *acknowledged* commits may vanish | Same / worse |
| `kill -9 mysqld` after COMMIT | Should survive | Often survives (data in OS page cache may still be on disk soon / already) | Higher chance recent commits never left the log buffer |
| Torn page during data-file flush | Doublewrite (if ON) repairs; redo still applies | Same page story — independent of flush=0/1/2 | Same |

Emphasize the scary cell: **client got 200, flush≠1, power loss** → product said durable, disk said maybe.

### Beat F — How to talk about the trade (team language)

Give readers phrases for PR / RFC / runbook:

- **Keep default (1):** “We require commit durability for money/ledger/inventory; p99 commit latency is a capacity problem, not a flush=2 problem.”
- **Accept flush=2:** “On hard power loss we may lose up to ~1 second of committed transactions. We accept this for ephemeral / rebuildable data (e.g. analytics scratch, session-ish tables on a dedicated instance). Money paths stay on a durable instance.”
- **Never silent:** Don’t inherit flush=0 from a sysbench blog post into the primary OLTP box.
- **Split instances:** Durable primary for ledger; relaxed settings only on workloads whose product owner signed the loss window.
- **Binlog:** If replicas / PITR matter, treat `sync_binlog=0` as a second durability hole — “primary thinks committed, replica never saw it” after crash (tease Art. 19).

### Beat G — Capacity vs durability (don’t confuse knobs)

From `optimizing-innodb-logging` / redo-log capacity:

- Growing `innodb_redo_log_capacity` / `innodb_log_buffer_size` reduces checkpoint pressure and write amplification — **performance**, not “weaker durability.”
- `ALTER INSTANCE DISABLE INNODB REDO_LOG` is for **bulk load into a new instance only**; unexpected stop with redo disabled → corruption / refuse restart. One stern callout; never a prod “optimization.”

- Scale redo capacity before you sacrifice flush=1.

### Beat H — Commit path vs outbox / HTTP

Reconnect to Art. 08 lightly:

- Returning 200 **before** `COMMIT` is an app bug (different from flush settings).
- Returning 200 **after** `COMMIT` with flush=2 is an **ops/SLA** choice.
- Outbox rows are only as durable as the transaction that wrote them — same flush policy.

---

## Interactive feature

Scatter **4–5 small client demos** under `src/components/interactive/mysql-durability/` (shared chrome from `schema-byte-budget/shared.tsx`). Split the old monolithic stepper.

### 1. WAL layer stack

- **Goal:** Dirty buffer pool page → redo log buffer → redo files → async `.ibd` — COMMIT can return before data file write.
- **Placement:** WAL path section (§3).
- **UX:** Vertical phase rail (RAID-style); one `UPDATE` + `COMMIT` story on `invoices`.

### 2. Flush survival panel

- **Goal:** `innodb_flush_log_at_trx_commit` 0/1/2 changes what survives power loss after COMMIT returned.
- **Placement:** Flush policy section (§4).
- **UX:** Segmented control 0|1|2; truth-table badges (“acknowledged commits at risk ~1s / buffer”).

### 3. Crash timing inject

- **Goal:** Crash *during* step 3 vs *after* step 4 (HTTP 200); power loss vs `kill -9` nuance for flush=2.
- **Placement:** Crash scenarios (§5); reuses #2 panel.
- **UX:** “Inject crash” at commit phase; survival copy updates per toggle.

### 4. Torn page / doublewrite

- **Goal:** 16KB page half-written during checkpoint; doublewrite ON repairs, OFF → corruption pain — **separate from** redo flush lesson.
- **Placement:** Doublewrite section (§6).
- **UX:** Single page graphic + ON/OFF toggle; no full commit timeline.

### 5. sync_binlog companion *(optional)*

- **Goal:** Second durability hole when binlog enabled; pair with flush=1.
- **Placement:** Binlog sync (§8). Collapsed “advanced” row on #2 if scope tight.

**Non-goals:** exact LSN math, `innodb_flush_method` matrix, replica promote.

---

## Example queries / schemas

Minimal schema aligned with the hook (integer cents; Art. 01 guidance):

```sql
CREATE TABLE invoices (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  status ENUM('draft','open','paid','void') NOT NULL,
  total_cents INT UNSIGNED NOT NULL,
  paid_at TIMESTAMP NULL,
  KEY (tenant_id, status)
) ENGINE=InnoDB;

CREATE TABLE ledger_entries (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  kind ENUM('charge','payment','refund') NOT NULL,
  amount_cents INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY (invoice_id),
  CONSTRAINT fk_ledger_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id)
) ENGINE=InnoDB;

CREATE TABLE outbox_events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  aggregate_type VARCHAR(32) NOT NULL,
  aggregate_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
```

**Request-handler transaction (what must become durable together):**

```sql
START TRANSACTION;

UPDATE invoices
SET status = 'paid', paid_at = CURRENT_TIMESTAMP
WHERE id = 1001 AND tenant_id = 7 AND status = 'open';

INSERT INTO ledger_entries (tenant_id, invoice_id, kind, amount_cents)
VALUES (7, 1001, 'payment', 2599);

INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
VALUES (
  'invoice',
  1001,
  'invoice.paid',
  JSON_OBJECT('invoice_id', 1001, 'total_cents', 2599)
);

COMMIT;
-- HTTP 200 only after COMMIT returns
```

**Inspect durability-related settings (ops literacy):**

```sql
SHOW GLOBAL VARIABLES WHERE Variable_name IN (
  'innodb_flush_log_at_trx_commit',
  'innodb_flush_log_at_timeout',
  'innodb_log_buffer_size',
  'innodb_redo_log_capacity',
  'innodb_doublewrite',
  'innodb_flush_method',
  'sync_binlog'
);

SHOW GLOBAL STATUS LIKE 'Innodb_redo_log%';
SHOW GLOBAL STATUS LIKE 'Innodb_data_fsyncs';
```

**Optional: peek active redo files (from refman examples):**

```sql
SELECT FILE_NAME, START_LSN, END_LSN
FROM performance_schema.innodb_redo_log_files;
```

**Demonstrate the trade (staging only — narrate, don’t encourage prod):**

```sql
-- Full software-side durability (default; required for ACID commit durability)
SET GLOBAL innodb_flush_log_at_trx_commit = 1;
SET GLOBAL sync_binlog = 1;

-- Conscious throughput trade: write redo at commit, fsync ~1/sec
SET GLOBAL innodb_flush_log_at_trx_commit = 2;

-- Aggressive trade: redo may sit in log buffer until ~1/sec flush
SET GLOBAL innodb_flush_log_at_trx_commit = 0;
```

**ORM sketch (commit-then-respond — same as Art. 08, durability lens):**

```ts
await prisma.$transaction(async (tx) => {
  await tx.invoice.updateMany({
    where: { id: 1001, tenantId: 7, status: "open" },
    data: { status: "paid", paidAt: new Date() },
  });
  await tx.ledgerEntry.create({ /* ... */ });
  await tx.outboxEvent.create({ /* ... */ });
});
// Only now: return NextResponse.json({ status: "paid" })
```

**Doublewrite check (read-only literacy):**

```sql
SHOW GLOBAL VARIABLES LIKE 'innodb_doublewrite';
-- ON / DETECT_AND_RECOVER = full torn-page protection
-- DETECT_ONLY = detect, don't repair from page images
-- OFF = no doublewrite (integrity trade)
```

---

## Tie-back checklist

Readers should be able to answer yes to each:

- [ ] I can explain why InnoDB can return from `COMMIT` before the `.ibd` page is written (redo / WAL).
- [ ] I know the log buffer is RAM and redo files are the durable journal — flush policy decides when RAM becomes disk.
- [ ] I can describe `innodb_flush_log_at_trx_commit` **0 vs 1 vs 2** in one sentence each, including the ~1 second loss window.
- [ ] I understand crash recovery replays redo and rolls back incomplete transactions — lost commits disappear whole, not half-applied.
- [ ] I can explain doublewrite as **torn-page** protection, separate from commit flush policy.
- [ ] I know the full-durability pair for transactional + binlog setups: `innodb_flush_log_at_trx_commit=1` and `sync_binlog=1`.
- [ ] I can name at least one SaaS situation where flush=2 is a documented trade — and one where it is unacceptable (money/ledger).
- [ ] I know hardware/`fsync` honesty can undermine even setting `1`, so durability is a stack.
- [ ] I will not disable redo logging or doublewrite on a production OLTP primary because a benchmark blog did.
- [ ] I return HTTP success **after** `COMMIT`, and I treat flush settings as part of the product durability story.

---

## Open questions / author notes

1. **Interactive scope** — Ship WAL stack + flush/crash panel + torn-page demo as separate embeds; merge doublewrite tab only if v1 schedule slips.
2. **flush=2 vs kill -9 nuance:** Docs emphasize loss on crash when logs aren’t flushed; industry teaching often says “2 survives mysqld crash, not OS/power.” Keep language aligned with the manual (“transactions for which logs have not been flushed can be lost”) while still giving the OS-cache intuition — label the kill -9 row as “often survives in practice, not a guarantee.”
3. **Managed MySQL defaults:** Confirm current defaults on common hosts (RDS parameter groups, etc.) when drafting — article should say “verify yours” rather than assert every cloud uses 1.
4. **Series glue:** Art. 08 must keep durability as a teaser only; Art. 13 should mention dirty pages flush asynchronously; Art. 19 owns replica/binlog topology — this article only owns `sync_binlog` as a durability twin.
5. **Money path vs multi-instance:** How hard to push “put relaxed durability on a different instance”? Enough for a callout; not a platform architecture essay.
6. **`innodb_flush_method`:** Easy rabbit hole. One short “O_DIRECT / fsync honesty” paragraph + link; interactive does not need it.
7. **DETECT_ONLY:** Mention for completeness; don’t center — most readers need ON vs OFF.
8. **Disable redo logging:** Stern warning box only; link `innodb-redo-log` section; never show as a prod tip.
9. **Component naming:** Avoid `Durability` alone (vague); prefer `DurabilityCrashStepper` / `MysqlCommitCrashTimeline`.
10. **Word count:** If long, cut optimizing-capacity deep tips first; never cut the 0/1/2 table or the crash matrix.
11. **Legal/docs paraphrase:** Don’t paste Oracle prose; paraphrase flush semantics carefully — this is one of the most mis-summarized MySQL settings on the internet (especially 0 vs 2).
12. **Hub / seriesList:** When the post ships, add `mysql-durability` as #14 between buffer pool and covering indexes.

---

## Drafting checklist (when writing the post)

- [ ] Part B opener; scatter WAL/flush/crash/doublewrite demos mid-article — not one top stepper
- [ ] `<Cite />` / `<References />` (especially `innodb-parameters` for 0/1/2)
- [ ] Humanizer pass; first-person voice; crash matrix includes power loss *after* HTTP 200
- [ ] Doublewrite separated from redo flush; no HA topology leakage
- [ ] Forward to 15 and 19 (binlog); back-link 08/13
)
