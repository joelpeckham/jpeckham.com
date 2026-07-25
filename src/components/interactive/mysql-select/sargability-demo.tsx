"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SortedKeyStrip,
  StepPlayer,
} from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import {
  SARG_PRESETS,
  TICKETS_INDEX,
  buildSargKeyScene,
  sargPreset,
  type SargPresetId,
} from "./model";
import { Chip, DemoShell, OutcomeBanner } from "./shared";

export function SargabilityDemo() {
  const [id, setId] = useState<SargPresetId>("year-fn");
  const [step, setStep] = useState(-1);
  const preset = useMemo(() => sargPreset(id), [id]);
  const scene = useMemo(() => buildSargKeyScene(id), [id]);

  useEffect(() => {
    setStep(-1);
  }, [id]);

  const pointerIndex =
    step >= 0 && step < scene.pointerPath.length
      ? scene.pointerPath[step]
      : -1;

  const caption =
    step < 0
      ? scene.pointerMode === "scan"
        ? "Play: pointer visits every open row (YEAR can't seek)"
        : "Play: pointer seeks to the matching range"
      : scene.pointerMode === "scan"
        ? `Scanning open leaf ${step + 1}/${scene.pointerPath.length} — filter YEAR after`
        : `Range walk ${step + 1}/${scene.pointerPath.length}`;

  return (
    <DemoShell
      title="Sargability toggles"
      blurb="Same inbox intent, different WHERE shapes. Watch the pointer seek a range — or scan every leaf."
      accent="blue"
    >
      <div className="flex flex-wrap gap-2">
        {SARG_PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={id === p.id ? "ink" : "outline"}
            onClick={() => setId(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="border-2 border-ink bg-ink px-3 py-2 font-mono text-[11px] leading-relaxed text-paper sm:text-xs">
        <span className="text-grey">WHERE </span>
        {preset.whereSql}
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Index ({TICKETS_INDEX.join(", ")})
        </p>
        <div className="flex flex-wrap gap-2">
          {TICKETS_INDEX.map((col, i) => {
            const lit = i < preset.litSegments;
            return (
              <div
                key={col}
                className={cn(
                  "border-2 border-ink px-2 py-1.5 font-mono text-xs transition-colors duration-300",
                  lit ? "bg-blue text-white" : "bg-paper text-ink/50",
                )}
              >
                {col}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip tone={preset.access === "ALL" ? "bad" : "ok"}>
          access ≈ {preset.access}
        </Chip>
        <Chip tone="ink">{preset.litSegments}/3 prefix lit</Chip>
        <Chip tone={scene.pointerMode === "scan" ? "warn" : "ok"}>
          {scene.pointerMode === "scan" ? "scan pointer" : "seek pointer"}
        </Chip>
      </div>

      <StepPlayer
        stepCount={scene.pointerPath.length}
        step={step}
        onStepChange={setStep}
        intervalMs={scene.pointerMode === "scan" ? 380 : 500}
        caption={caption}
      />

      <SortedKeyStrip
        keys={scene.keys}
        columns={scene.columns}
        highlight={{
          kind: "contiguous",
          start: scene.litStart,
          end: scene.litEnd,
        }}
        pointerIndex={pointerIndex}
        pointerMode={scene.pointerMode}
        label={
          scene.pointerMode === "scan"
            ? "Sorted keys — YEAR() forces a scan of the open run"
            : "Sorted keys — sargable range seek"
        }
      />

      <OutcomeBanner
        tone={preset.tone}
        title={preset.title}
        detail={preset.reason}
      />
    </DemoShell>
  );
}
