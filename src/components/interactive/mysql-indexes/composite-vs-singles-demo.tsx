"use client";

import { AutoLoop } from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import { DemoShell } from "./shared";

const WHERE =
  "org_id = ? AND status = 'open' AND assignee_id = ? ORDER BY updated_at";

/** Smoothstep ease — no hard corners. */
function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Map global loop time → lane progress.
 * Composite races ahead and parks; singles crawl through four phases.
 */
function laneProgress(t: number, kind: "composite" | "singles"): number {
  if (kind === "composite") {
    // Done by ~40% of the loop, then hold.
    return easeInOut(Math.min(1, t / 0.4));
  }
  // Singles: slow overall, with slight ease between stages.
  return easeInOut(Math.min(1, t / 0.92));
}

function singlesStage(progress: number): number {
  // 0..3 stage index from progress
  if (progress < 0.28) return 0;
  if (progress < 0.52) return 1;
  if (progress < 0.76) return 2;
  return 3;
}

const SINGLES_STAGES = ["3 scans", "∩ merge", "filesort", "bounce"] as const;
const COMPOSITE_STAGES = ["range walk", "done"] as const;

/**
 * Looping race: composite does one seek; singles do merge → sort → bounce.
 */
export function CompositeVsSinglesDemo() {
  return (
    <DemoShell
      title="Composite vs three singles"
      blurb="Same WHERE. Watch the race. Watch the write tax."
      accent="red"
    >
      <div className="border-2 border-ink bg-ink px-3 py-2 font-mono text-[11px] text-paper">
        <span className="text-grey">WHERE </span>
        {WHERE}
      </div>

      <AutoLoop
        durationMs={4000}
        endHoldMs={1200}
        startHoldMs={400}
        pauseOnHover={false}
      >
        {({ t }) => {
          const comp = laneProgress(t, "composite");
          const singles = laneProgress(t, "singles");
          const stageIdx = singlesStage(singles);

          return (
            <div className="grid gap-3 sm:grid-cols-2">
              <RaceLane
                title="One composite"
                subtitle="KEY (org, status, assignee, updated_at)"
                progress={comp}
                tone="ok"
                stages={COMPOSITE_STAGES}
                activeStage={comp >= 1 ? 1 : 0}
                writeTax="1 INSERT → 1 index write"
                status={comp >= 1 ? "Finished" : "Seeking…"}
              />
              <RaceLane
                title="Three singles"
                subtitle="KEY(org) · KEY(status) · KEY(assignee)"
                progress={singles}
                tone="bad"
                stages={SINGLES_STAGES}
                activeStage={stageIdx}
                writeTax="1 INSERT → 3 index writes"
                status={
                  singles >= 1
                    ? "Finished late"
                    : `${SINGLES_STAGES[stageIdx]}…`
                }
              />
            </div>
          );
        }}
      </AutoLoop>
    </DemoShell>
  );
}

function RaceLane({
  title,
  subtitle,
  progress,
  tone,
  stages,
  activeStage,
  writeTax,
  status,
}: {
  title: string;
  subtitle: string;
  progress: number;
  tone: "ok" | "bad";
  stages: readonly string[];
  activeStage: number;
  writeTax: string;
  status: string;
}) {
  const done = progress >= 0.995;
  // Keep marker inside the track (marker is 12px wide).
  const pct = Math.min(100, Math.max(0, progress * 100));

  return (
    <div
      className={cn(
        "border-2 border-ink bg-white p-3 transition-colors duration-500",
        done && tone === "ok" && "bg-blue/10",
        done && tone === "bad" && "bg-red/10",
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
        {title}
      </p>
      <p className="mt-0.5 truncate font-mono text-[10px] text-ink/70">
        {subtitle}
      </p>

      {/* Track — fill via scaleX; marker via left (no CSS transition fighting rAF) */}
      <div className="relative mt-4 h-5 border-2 border-ink bg-paper">
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-full origin-left",
            tone === "ok" ? "bg-blue" : "bg-red",
          )}
          style={{ transform: `scaleX(${progress})` }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 border-2 border-ink bg-yellow"
          style={{
            // Clamp so the 14px marker stays inside the track.
            left: `clamp(7px, ${pct}%, calc(100% - 7px))`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {stages.map((label, i) => {
          const reached = i <= activeStage;
          const active = i === activeStage && !done;
          return (
            <span
              key={label}
              className={cn(
                "border border-ink px-1.5 py-0.5 font-mono text-[9px] uppercase transition-colors duration-300",
                active && "bg-ink text-white",
                reached && !active && "bg-paper text-ink",
                !reached && "opacity-30",
              )}
            >
              {label}
            </span>
          );
        })}
      </div>

      <p className="mt-3 font-mono text-[10px] text-grey">{writeTax}</p>
      {/* Fixed-height status so finish copy doesn't shove the layout */}
      <p
        className={cn(
          "mt-1 h-6 font-display text-lg leading-none",
          tone === "ok" ? "text-blue" : "text-red",
          done ? "opacity-100" : "opacity-70",
        )}
      >
        {status}
      </p>
    </div>
  );
}
