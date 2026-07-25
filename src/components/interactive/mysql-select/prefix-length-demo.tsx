"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PREFIX_DEFAULT_PREDS,
  TICKETS_INDEX,
  evaluatePrefixHighlight,
  type PrefixPredKey,
  type PrefixPredState,
} from "./model";
import { Chip, DemoShell, OutcomeBanner } from "./shared";

const PRED_KEYS: PrefixPredKey[] = [
  "org_id",
  "status",
  "updated_at",
  "assignee_id",
];

const CYCLE = ["off", "eq", "gt"] as const;

function nextState(
  current: "eq" | "gt" | "off" | undefined,
): "eq" | "gt" | "off" {
  const idx = CYCLE.indexOf(current ?? "off");
  return CYCLE[(idx + 1) % CYCLE.length] ?? "off";
}

const LABEL: Record<"eq" | "gt" | "off", string> = {
  off: "off",
  eq: "=",
  gt: ">",
};

export function PrefixLengthDemo() {
  const [preds, setPreds] = useState<PrefixPredState>({
    ...PREFIX_DEFAULT_PREDS,
  });

  const verdict = useMemo(() => evaluatePrefixHighlight(preds), [preds]);

  function cycle(key: PrefixPredKey) {
    setPreds((prev) => ({
      ...prev,
      [key]: nextState(prev[key]),
    }));
  }

  function resetInbox() {
    setPreds({ ...PREFIX_DEFAULT_PREDS });
  }

  return (
    <DemoShell
      title="Prefix length for this query"
      blurb="Fixed index from article 03. Toggle predicates — see how much key_len you'd expect to light up."
      accent="red"
    >
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={resetInbox}>
          Reset inbox shape
        </Button>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Predicates (tap to cycle)
        </p>
        <div className="flex flex-wrap gap-2">
          {PRED_KEYS.map((key) => {
            const op = preds[key] ?? "off";
            const inIndex = (TICKETS_INDEX as readonly string[]).includes(key);
            const litIdx = TICKETS_INDEX.indexOf(
              key as (typeof TICKETS_INDEX)[number],
            );
            const lit = inIndex && litIdx >= 0 && litIdx < verdict.litCount;
            return (
              <button
                key={key}
                type="button"
                onClick={() => cycle(key)}
                className={cn(
                  "border-2 border-ink px-2 py-1.5 text-left font-mono text-xs transition-colors",
                  lit && "bg-blue text-white",
                  !lit && op !== "off" && "bg-yellow text-ink",
                  op === "off" && "bg-paper text-ink",
                )}
              >
                <span className="block text-[10px] uppercase tracking-[0.1em] opacity-70">
                  {key}
                  {!inIndex ? " (not in idx)" : ""}
                </span>
                <span className="font-bold">{LABEL[op]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          idx (org_id, status, updated_at)
        </p>
        <div className="flex h-12 w-full overflow-hidden border-2 border-ink">
          {TICKETS_INDEX.map((col, i) => (
            <div
              key={col}
              className={cn(
                "flex flex-1 items-center justify-center border-r border-ink/30 font-mono text-xs font-bold transition-colors duration-300 last:border-r-0",
                i < verdict.litCount
                  ? "bg-blue text-white"
                  : "bg-paper text-ink/40",
              )}
            >
              {col}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip tone={verdict.access === "ALL" ? "bad" : "ok"}>
          ≈ {verdict.access}
        </Chip>
        <Chip tone="ink">{verdict.keyLenHint}</Chip>
      </div>

      <OutcomeBanner
        tone={verdict.tone}
        title={verdict.title}
        detail={verdict.reason}
      />
    </DemoShell>
  );
}
