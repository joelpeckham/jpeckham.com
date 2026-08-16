"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CLASSIFICATION_LABEL,
  CONCEPT_LABEL,
  CONCEPT_PRIORITY,
  PIPELINE_PRESETS,
  runPipeline,
  type MoveClassification,
} from "./model";
import { Chip, DemoShell, OutcomeBanner, Panel } from "./shared";

function toneFor(classification: MoveClassification): "ok" | "warn" | "bad" {
  if (classification === "blunder" || classification === "mistake") return "bad";
  if (classification === "inaccuracy") return "warn";
  return "ok";
}

function formatCp(cp: number): string {
  const sign = cp > 0 ? "+" : "";
  return `${sign}${cp}`;
}

export function EvalDeltaPipelineDemo() {
  const [presetId, setPresetId] = useState(PIPELINE_PRESETS[0]!.id);
  const preset =
    PIPELINE_PRESETS.find((p) => p.id === presetId) ?? PIPELINE_PRESETS[0]!;
  const result = useMemo(() => runPipeline(preset), [preset]);
  const tone = toneFor(result.classification);

  return (
    <DemoShell
      title="Two searches, one sentence"
      blurb="Stockfish on the position before the move, then after. The delta is the loss. First matching concept wins. A template fills the slots."
      accent="blue"
    >
      <div className="flex flex-wrap gap-2">
        {PIPELINE_PRESETS.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={presetId === p.id ? "ink" : "outline"}
            onClick={() => setPresetId(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel label={`Before · MultiPV ${preset.beforeSearch.multipv} · ${preset.beforeSearch.movetimeMs}ms`}>
          <p className="font-display text-3xl leading-none tracking-tight">
            {formatCp(preset.evalBeforeWhiteCp)}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            White-eval, cp
          </p>
        </Panel>
        <Panel label={`After · MultiPV ${preset.afterSearch.multipv} · ${preset.afterSearch.movetimeMs}ms`}>
          <p className="font-display text-3xl leading-none tracking-tight">
            {formatCp(preset.evalAfterWhiteCp)}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            White-eval, cp
          </p>
        </Panel>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip>
          {preset.playedSan} by {preset.mover === "w" ? "White" : "Black"}
        </Chip>
        <Chip tone={result.lossCp > 200 ? "bad" : result.lossCp > 50 ? "warn" : "ok"}>
          loss {Math.round(result.lossCp)} cp
        </Chip>
        <Chip tone={tone}>{CLASSIFICATION_LABEL[result.classification]}</Chip>
        {result.nudge ? <Chip tone="bad">Auto-open</Chip> : <Chip>Wait until asked</Chip>}
      </div>

      <Panel label="Concept priority · first match wins">
        <ol className="flex flex-wrap gap-1.5">
          {CONCEPT_PRIORITY.map((concept, i) => {
            const winner = concept === result.concept;
            return (
              <li
                key={concept}
                className={cn(
                  "border-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
                  winner
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/30 bg-white text-grey",
                )}
              >
                {i + 1}. {CONCEPT_LABEL[concept]}
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel label="Coach card">
        <p className="text-sm leading-relaxed text-ink">{result.explanation}</p>
      </Panel>

      <OutcomeBanner
        tone={tone}
        title={CLASSIFICATION_LABEL[result.classification]}
        detail={
          result.nudge
            ? "Blunders open the card. The sentence never says centipawn."
            : "The label is for the strip. The useful part is the clause the template filled in."
        }
      />
    </DemoShell>
  );
}
