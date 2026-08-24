"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AutoLoop,
  SortedKeyStrip,
} from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import { buildSargKeyScene, sargPreset } from "./model";
import { DemoShell } from "./shared";

/**
 * One switch: wrap updated_at in YEAR() or use a bare range.
 * Scanning beam vs seek-and-stop over the sorted key strip.
 */
export function SargabilityDemo() {
  const [wrapped, setWrapped] = useState(true);
  const id = wrapped ? "year-fn" : "sargable-year";
  const preset = useMemo(() => sargPreset(id), [id]);
  const scene = useMemo(() => buildSargKeyScene(id), [id]);

  return (
    <DemoShell
      title="Sargability"
      blurb="Flip the switch. YEAR() forces a scan. A bare range seeks."
      accent="blue"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant={wrapped ? "red" : "outline"}
          onClick={() => setWrapped(true)}
        >
          YEAR(updated_at)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!wrapped ? "ink" : "outline"}
          onClick={() => setWrapped(false)}
        >
          Bare date range
        </Button>
      </div>

      <div className="border-2 border-ink bg-ink px-3 py-2 font-mono text-[11px] text-paper">
        <span className="text-grey">WHERE </span>
        {preset.whereSql}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["org_id", "status", "updated_at"] as const).map((col, i) => {
          const lit = i < preset.litSegments;
          return (
            <div
              key={col}
              className={cn(
                "border-2 border-ink px-2 py-1 font-mono text-xs transition-colors",
                lit ? "bg-blue text-white" : "bg-paper text-ink/40",
              )}
            >
              {col}
            </div>
          );
        })}
      </div>

      <AutoLoop
        key={id}
        durationMs={scene.pointerMode === "scan" ? 2800 : 1600}
        endHoldMs={700}
        startHoldMs={200}
      >
        {({ t }) => {
          const path = scene.pointerPath;
          const idx =
            path.length === 0
              ? -1
              : path[Math.min(path.length - 1, Math.floor(t * path.length))];

          return (
            <div className="relative">
              {/* Scanning beam overlay for YEAR() mode */}
              {scene.pointerMode === "scan" ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 h-8 bg-red/25 mix-blend-multiply transition-none"
                  style={{
                    top: `${12 + t * 72}%`,
                  }}
                  aria-hidden
                />
              ) : null}
              <SortedKeyStrip
                keys={scene.keys}
                columns={scene.columns}
                highlight={{
                  kind: "contiguous",
                  start: scene.litStart,
                  end: scene.litEnd,
                }}
                pointerIndex={idx}
                pointerMode={scene.pointerMode}
                label={
                  scene.pointerMode === "scan"
                    ? "Scanning every open leaf. YEAR() cannot seek."
                    : "Seek to range, then stop"
                }
              />
            </div>
          );
        }}
      </AutoLoop>

      <BeamSync wrapped={wrapped} />

      <p className="font-mono text-[11px] text-grey">
        {wrapped
          ? "A function on the column freezes the date segment. Same idea as a broken leftmost prefix."
          : "Equalities, then a bare range. The B-tree walks one interval."}
      </p>
    </DemoShell>
  );
}

/** Live region so mode flips are announced. AutoLoop remount key handles reset. */
function BeamSync({ wrapped }: { wrapped: boolean }) {
  const msg = wrapped ? "Scanning mode" : "Seek mode";
  return (
    <span className="sr-only" aria-live="polite">
      {msg}
    </span>
  );
}
