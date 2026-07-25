"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SESSION_TZ_LABELS,
  simulateTimeDisplay,
  type SessionTz,
} from "./budget";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  TradeoffRow,
  controlSelect,
} from "./shared";

const ZONES: SessionTz[] = ["UTC", "America/Phoenix", "America/New_York"];

const CITY: Record<SessionTz, { short: string; vibe: string }> = {
  UTC: { short: "UTC", vibe: "Server default" },
  "America/Phoenix": { short: "Phoenix", vibe: "Patient / hospice" },
  "America/New_York": { short: "New York", vibe: "Job runner region" },
};

/** Respite stay starts at local midnight — the digits the user meant. */
const WRITTEN = "2026-03-15T00:00:00";
const INTENDED_DATE = "2026-03-15";

function clockDigits(local: string): { date: string; time: string } {
  const [date, time = "00:00:00"] = local.split(" ");
  return { date, time: time.slice(0, 5) };
}

function hoursDelta(fromLocal: string, toLocal: string): number {
  // Compare same calendar interpretation as hours difference of displayed clocks
  const a = Date.parse(fromLocal.replace(" ", "T") + "Z");
  const b = Date.parse(toLocal.replace(" ", "T") + "Z");
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 3_600_000);
}

export function TimeTypeDemo() {
  const [kind, setKind] = useState<"timestamp" | "datetime">("timestamp");
  const [writeTz, setWriteTz] = useState<SessionTz>("America/Phoenix");
  const [readTz, setReadTz] = useState<SessionTz>("America/New_York");

  const sim = useMemo(
    () =>
      simulateTimeDisplay({
        kind,
        writtenLocal: WRITTEN,
        writeSessionTz: writeTz,
        readSessionTz: readTz,
      }),
    [kind, writeTz, readTz],
  );

  const intended = clockDigits(WRITTEN.replace("T", " "));
  const displayed = clockDigits(sim.displayedLocal);
  const dateShifted = displayed.date !== INTENDED_DATE;
  const hourShift = hoursDelta(
    WRITTEN.replace("T", " "),
    sim.displayedLocal,
  );
  const shifted = kind === "timestamp" && (dateShifted || hourShift !== 0);

  const outcome = (() => {
    if (kind === "datetime") {
      return {
        tone: "ok" as const,
        title: "Job sees the wall-clock you stored",
        detail: `Digits stay ${intended.date} ${intended.time}. You still owe the app an explicit timezone, but the column won’t rewrite midnight.`,
      };
    }
    if (dateShifted) {
      return {
        tone: "bad" as const,
        title: "Wrong calendar day",
        detail: `Stay was meant for ${INTENDED_DATE}. Session in ${CITY[readTz].short} reads ${displayed.date}. Meds job fires on the wrong day.`,
      };
    }
    if (hourShift !== 0) {
      return {
        tone: "bad" as const,
        title:
          hourShift > 0
            ? `Job fires ${hourShift}h late`
            : `Job fires ${Math.abs(hourShift)}h early`,
        detail: `Phoenix midnight became ${displayed.time} in ${CITY[readTz].short}. “Starts now?” answered with the wrong clock.`,
      };
    }
    return {
      tone: "ok" as const,
      title: "Same session TZ, so it looks fine",
      detail:
        "Write and read agree for now. Change the job’s connection timezone later and this becomes a haunted pager.",
    };
  })();

  // Timeline: two midnight markers
  const writeOffsetPct = 20;
  const readOffsetPct = shifted
    ? Math.min(85, Math.max(15, writeOffsetPct + hourShift * 8))
    : writeOffsetPct;

  return (
    <DemoShell
      title="TIMESTAMP vs DATETIME"
      blurb="Schedule a Phoenix midnight respite start, then run the job from another region. Watch whether “now” is still midnight."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={kind === "datetime" ? "ink" : "outline"}
          onClick={() => setKind("datetime")}
        >
          DATETIME
        </Button>
        <Button
          type="button"
          size="sm"
          variant={kind === "timestamp" ? "ink" : "outline"}
          onClick={() => setKind("timestamp")}
        >
          TIMESTAMP
        </Button>
      </div>

      <OutcomeBanner {...outcome} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-grey">
            Write session ({CITY[writeTz].vibe})
          </span>
          <select
            className={controlSelect + " w-full"}
            value={writeTz}
            onChange={(e) => setWriteTz(e.target.value as SessionTz)}
          >
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {SESSION_TZ_LABELS[z]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-grey">
            Job session ({CITY[readTz].vibe})
          </span>
          <select
            className={controlSelect + " w-full"}
            value={readTz}
            onChange={(e) => setReadTz(e.target.value as SessionTz)}
          >
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {SESSION_TZ_LABELS[z]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CityClock
          city={CITY[writeTz].short}
          date={intended.date}
          time={intended.time}
          caption="User meant"
          tone="ok"
        />
        <CityClock
          city={CITY[readTz].short}
          date={displayed.date}
          time={displayed.time}
          caption="Job reads"
          tone={shifted ? "bad" : "ok"}
        />
      </div>

      <Panel label="Day boundary">
        <div className="relative mt-1 h-14 border-2 border-ink bg-paper">
          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-ink/30" />
          <Marker
            pct={writeOffsetPct}
            label="Meant"
            tone="ok"
          />
          <Marker
            pct={readOffsetPct}
            label="Job"
            tone={shifted ? "bad" : "ok"}
          />
        </div>
        <p className="mt-2 text-xs text-grey">
          {kind === "timestamp"
            ? `Stored as ${sim.storedLabel}. Session TZ converts on the way out.`
            : "DATETIME stored the digits literally, with no conversion step."}
        </p>
      </Panel>

      <Panel label="Tradeoffs">
        <TradeoffRow
          label="TZ conversion"
          value={sim.converts ? "On read/write" : "None"}
          tone={sim.converts ? "warn" : "ok"}
        />
        <TradeoffRow
          label="2038 ceiling"
          value={sim.timestamp2038Risk ? "Hits the wall" : "Not a TIMESTAMP issue"}
          tone={sim.timestamp2038Risk ? "bad" : "ok"}
        />
        <TradeoffRow
          label="Calendar day"
          value={dateShifted ? `Shifted to ${displayed.date}` : "Stable"}
          tone={dateShifted ? "bad" : "ok"}
        />
      </Panel>

      <div className="flex flex-wrap gap-2">
        {sim.converts ? (
          <Chip tone="warn">TZ converts on read</Chip>
        ) : (
          <Chip tone="ok">Event time stable</Chip>
        )}
        {sim.timestamp2038Risk ? (
          <Chip tone="bad">2038 TIMESTAMP risk</Chip>
        ) : null}
        {dateShifted ? <Chip tone="bad">Wrong calendar day</Chip> : null}
      </div>
    </DemoShell>
  );
}

function CityClock({
  city,
  date,
  time,
  caption,
  tone,
}: {
  city: string;
  date: string;
  time: string;
  caption: string;
  tone: "ok" | "bad";
}) {
  return (
    <div
      className={cn(
        "border-2 border-ink p-3 transition-colors duration-200",
        tone === "bad" ? "bg-red text-white" : "bg-white text-ink",
      )}
    >
      <p
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.12em]",
          tone === "bad" ? "text-white/80" : "text-grey",
        )}
      >
        {caption} · {city}
      </p>
      <p className="mt-2 font-display text-4xl leading-none tracking-tight tabular-nums">
        {time}
      </p>
      <p className="mt-1 font-mono text-sm tabular-nums">{date}</p>
    </div>
  );
}

function Marker({
  pct,
  label,
  tone,
}: {
  pct: number;
  label: string;
  tone: "ok" | "bad";
}) {
  return (
    <div
      className="absolute top-1 flex -translate-x-1/2 flex-col items-center transition-[left] duration-300 ease-out"
      style={{ left: `${pct}%` }}
    >
      <span
        className={cn(
          "border-2 border-ink px-1.5 py-0.5 font-mono text-[9px] uppercase",
          tone === "bad" ? "bg-red text-white" : "bg-blue text-white",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "mt-1 size-2.5 border-2 border-ink",
          tone === "bad" ? "bg-red" : "bg-blue",
        )}
      />
    </div>
  );
}
