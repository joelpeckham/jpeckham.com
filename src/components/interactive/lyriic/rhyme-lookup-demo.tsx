"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AutoLoop } from "@/components/interactive/mysql-shared";
import {
  RHYME_LEXICON,
  type RhymeMode,
  rhymeKeyFor,
  sortedBucket,
} from "./model";
import { Chip, DemoShell, OutcomeBanner, Panel } from "./shared";

const LOOKUPS = ["fun", "fire", "butter"] as const;

const STEPS = [
  "normalize → wordId",
  "wordId → keyIds",
  "keyId → Zipf bucket",
  "window + rank for UI",
] as const;

/**
 * Walk the O(1) rhyme lookup: word → id → keys → Zipf-ordered bucket.
 */
export function RhymeLookupDemo() {
  const [wordName, setWordName] = useState<(typeof LOOKUPS)[number]>("fun");
  const [mode, setMode] = useState<RhymeMode>("end");

  const word = useMemo(
    () => RHYME_LEXICON.find((w) => w.word === wordName)!,
    [wordName],
  );
  const wordId = RHYME_LEXICON.findIndex((w) => w.word === wordName);
  const key = rhymeKeyFor(word, mode);
  const bucket = useMemo(() => sortedBucket(word, mode), [word, mode]);

  return (
    <DemoShell
      title="Rhyme lookup walk"
      blurb="No IPA tokenization at query time. Integer ids and prebuilt buckets."
      accent="ink"
    >
      <div className="flex flex-wrap gap-2">
        {LOOKUPS.map((w) => (
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
          Perfect
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "end" ? "red" : "outline"}
          onClick={() => setMode("end")}
        >
          End
        </Button>
      </div>

      <AutoLoop
        key={`${wordName}-${mode}`}
        durationMs={3600}
        frameCount={STEPS.length}
        endHoldMs={800}
        startHoldMs={200}
      >
        {({ frame }) => (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {STEPS.map((label, i) => (
                <Chip key={label} tone={i === frame ? "ok" : "ink"}>
                  {i + 1}. {label}
                </Chip>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Panel label="Word map">
                <p className="font-mono text-sm">
                  <span className="text-grey">“{word.word}”</span>
                  <span className="mx-2">→</span>
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      frame >= 0 ? "text-blue" : "text-grey",
                    )}
                  >
                    id {wordId}
                  </span>
                </p>
              </Panel>

              <Panel label="Keys for word">
                <p
                  className={cn(
                    "font-display text-2xl leading-none",
                    frame >= 1 ? "opacity-100" : "opacity-30",
                  )}
                >
                  /{key}/
                </p>
                <p className="mt-1 font-mono text-[11px] text-grey">
                  {mode} key id (demo)
                </p>
              </Panel>

              <Panel label="Bucket (Zipf order)">
                <ul className="space-y-1 font-mono text-sm">
                  {bucket.length === 0 ? (
                    <li className="text-grey">empty in this toy lexicon</li>
                  ) : (
                    bucket.map((w, i) => (
                      <li
                        key={w.word}
                        className={cn(
                          "flex justify-between border-b border-ink/10 pb-0.5 transition-opacity",
                          frame >= 2 ? "opacity-100" : "opacity-25",
                          frame >= 3 && i === 0 && "bg-yellow px-1 font-bold",
                        )}
                      >
                        <span>{w.word}</span>
                        <span className="text-grey">{w.syllables} syl</span>
                      </li>
                    ))
                  )}
                </ul>
              </Panel>
            </div>
          </div>
        )}
      </AutoLoop>

      <OutcomeBanner
        tone="ok"
        title={
          mode === "end" && wordName === "fun"
            ? "fun → /ʌn/ → anyone, someone, …"
            : `${word.word} → /${key}/ → ${bucket.length} neighbor${bucket.length === 1 ? "" : "s"}`
        }
        detail="Production packs keep ~95k perfect keys and only ~2.3k end keys. End buckets are fatter; the UI windows the Zipf head before ranking for meter."
      />
    </DemoShell>
  );
}
