"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AutoLoop } from "@/components/interactive/mysql-shared";
import {
  RHYME_LEXICON,
  type RhymeMode,
  keyStartIndex,
  rhymeKeyFor,
} from "./model";
import { Chip, DemoShell, OutcomeBanner, Panel } from "./shared";

const PICKS = ["desire", "anyone", "butter", "fire", "banana"] as const;

/**
 * Animate cutting a rhyme key out of IPA phones.
 * Perfect starts at last primary stress; end starts at the last nucleus.
 */
export function RhymeKeyDemo() {
  const [wordName, setWordName] = useState<(typeof PICKS)[number]>("desire");
  const [mode, setMode] = useState<RhymeMode>("perfect");
  const word = useMemo(
    () => RHYME_LEXICON.find((w) => w.word === wordName)!,
    [wordName],
  );
  const start = keyStartIndex(word, mode);
  const key = rhymeKeyFor(word, mode);

  return (
    <DemoShell
      title="Rhyme keys from IPA"
      blurb="Build time does the phonology once. Query time only compares integer key ids."
      accent="blue"
    >
      <div className="flex flex-wrap gap-2">
        {PICKS.map((w) => (
          <Button
            key={w}
            type="button"
            size="sm"
            variant={wordName === w ? "ink" : "outline"}
            onClick={() => setWordName(w)}
          >
            {w}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "perfect" ? "blue" : "outline"}
          onClick={() => setMode("perfect")}
        >
          Perfect rhyme
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "end" ? "red" : "outline"}
          onClick={() => setMode("end")}
        >
          End rhyme
        </Button>
      </div>

      <AutoLoop
        key={`${wordName}-${mode}`}
        durationMs={2200}
        endHoldMs={700}
        startHoldMs={250}
      >
        {({ t }) => {
          // Sweep a cut-line from the left toward the key start, then light the key.
          const reveal = Math.min(1, t * 1.25);
          const cutAt = Math.floor(reveal * (start + 1));
          const keyLit = t > 0.55;

          return (
            <div className="space-y-3">
              <Panel label={`IPA phones · ${word.word}`}>
                <div className="flex flex-wrap gap-1.5">
                  {word.phones.map((p, i) => {
                    const inKey = i >= start;
                    const reached = i < cutAt || (keyLit && inKey);
                    const dropped = i < start && reached;
                    return (
                      <span
                        key={`${p.phone}-${i}`}
                        className={cn(
                          "inline-flex min-w-[2.25rem] flex-col items-center border-2 border-ink px-1.5 py-1 font-mono text-sm transition-colors duration-150",
                          inKey && keyLit
                            ? mode === "perfect"
                              ? "bg-blue text-white"
                              : "bg-red text-white"
                            : dropped
                              ? "bg-paper text-ink/35 line-through"
                              : "bg-white text-ink",
                        )}
                      >
                        <span>{p.phone}</span>
                        {p.isVowel ? (
                          <span className="text-[9px] uppercase tracking-[0.1em] opacity-70">
                            {p.stress === 1
                              ? "ˈ"
                              : p.stress === 2
                                ? "ˌ"
                                : "·"}
                          </span>
                        ) : (
                          <span className="text-[9px] opacity-40">—</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </Panel>

              <div className="flex flex-wrap items-center gap-2">
                <Chip tone={mode === "perfect" ? "ok" : "bad"}>
                  {mode} key
                </Chip>
                <p
                  className={cn(
                    "font-display text-3xl leading-none tracking-tight transition-opacity",
                    keyLit ? "opacity-100" : "opacity-30",
                  )}
                >
                  /{key}/
                </p>
              </div>
            </div>
          );
        }}
      </AutoLoop>

      <OutcomeBanner
        tone={mode === "perfect" ? "ok" : "warn"}
        title={
          mode === "perfect"
            ? "Perfect: from the last primary stress through the coda"
            : "End: last vowel nucleus through the coda (stress ignored)"
        }
        detail={
          mode === "perfect"
            ? `desire → /${wordName === "desire" ? "aɪɚ" : key}/. Same key as fire and hire.`
            : `anyone and fun both end in /ʌn/. Perfect keys stay apart (/ɛniwʌn/ vs /ʌn/).`
        }
      />
    </DemoShell>
  );
}
