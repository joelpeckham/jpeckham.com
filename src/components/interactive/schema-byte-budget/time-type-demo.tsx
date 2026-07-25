"use client";

import { AutoLoop } from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import { DemoShell } from "./shared";

const ZONES = [
  { id: "UTC", label: "UTC", offset: 0 },
  { id: "NY", label: "New York", offset: -4 },
  { id: "Boise", label: "Boise", offset: -6 },
] as const;

/** Fixed instant: 2026-03-15 00:00:00 America/Phoenix (MST = UTC-7) → 07:00 UTC */
const UTC_HOUR = 7;
const UTC_DATE = "Mar 15";

function wallClock(utcHour: number, offset: number): {
  hour: number;
  date: string;
} {
  let h = utcHour + offset;
  let date = UTC_DATE;
  if (h < 0) {
    h += 24;
    date = "Mar 14";
  } else if (h >= 24) {
    h -= 24;
    date = "Mar 16";
  }
  return { hour: h, date };
}

function ClockFace({
  hour,
  label,
  muted,
  polaroid,
}: {
  hour: number;
  label: string;
  muted?: boolean;
  polaroid?: boolean;
}) {
  // 12-hour face; minute fixed at 0 for the teaching instant
  const angle = ((hour % 12) / 12) * 360;
  return (
    <div
      className={cn(
        "flex flex-col items-center",
        polaroid && "border-2 border-ink bg-white p-2 shadow-hard",
        muted && "opacity-60",
      )}
    >
      <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden>
        <circle
          cx="32"
          cy="32"
          r="30"
          className="fill-paper stroke-ink"
          strokeWidth="2"
        />
        {[0, 3, 6, 9].map((h) => {
          const a = ((h / 12) * 360 - 90) * (Math.PI / 180);
          const x = 32 + Math.cos(a) * 22;
          const y = 32 + Math.sin(a) * 22;
          return (
            <circle key={h} cx={x} cy={y} r="1.5" className="fill-ink" />
          );
        })}
        <line
          x1="32"
          y1="32"
          x2={32 + Math.sin((angle * Math.PI) / 180) * 16}
          y2={32 - Math.cos((angle * Math.PI) / 180) * 16}
          className="stroke-ink"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="2" className="fill-ink" />
      </svg>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-grey">
        {label}
      </p>
      <p className="font-mono text-xs font-bold tabular-nums">
        {String(hour).padStart(2, "0")}:00
      </p>
    </div>
  );
}

/**
 * Looping: TIMESTAMP re-renders as session TZ cycles; DATETIME is a polaroid
 * that never changes.
 */
export function TimeTypeDemo() {
  return (
    <DemoShell
      title="TIMESTAMP vs DATETIME"
      blurb="One instant. TIMESTAMP shapeshifts with the session; DATETIME is a photo of a clock."
    >
      <AutoLoop durationMs={3600} frameCount={ZONES.length} endHoldMs={700}>
        {({ frame }) => {
          const zone = ZONES[frame] ?? ZONES[0];
          const ts = wallClock(UTC_HOUR, zone.offset);
          // DATETIME stored as Phoenix local midnight digits — never moves
          const dt = { hour: 0, date: "Mar 15" };

          return (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-2 border-ink bg-white p-3">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
                  TIMESTAMP · session = {zone.label}
                </p>
                <div className="flex justify-around gap-2">
                  {ZONES.map((z) => {
                    const c = wallClock(UTC_HOUR, z.offset);
                    const active = z.id === zone.id;
                    return (
                      <div
                        key={z.id}
                        className={cn(
                          "transition-all duration-300",
                          active ? "scale-110" : "scale-90 opacity-40",
                        )}
                      >
                        <ClockFace
                          hour={c.hour}
                          label={z.label}
                          muted={!active}
                        />
                        {active ? (
                          <p className="mt-1 text-center font-mono text-[10px] text-red">
                            {c.date}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 font-mono text-[11px] text-grey">
                  Reads as {ts.date} {String(ts.hour).padStart(2, "0")}:00 in{" "}
                  {zone.label}
                </p>
              </div>

              <div className="border-2 border-ink bg-yellow/40 p-3">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
                  DATETIME · polaroid
                </p>
                <div className="flex justify-center">
                  <ClockFace
                    hour={dt.hour}
                    label="stored digits"
                    polaroid
                  />
                </div>
                <p className="mt-3 text-center font-mono text-[11px] text-grey">
                  Always {dt.date} 00:00 — session TZ never rewrites it
                </p>
              </div>
            </div>
          );
        }}
      </AutoLoop>
    </DemoShell>
  );
}
