"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  RHYME_LEXICON,
  STRESS_LABEL,
  type StressCode,
  packStressPattern,
  stressToBinaryString,
} from "./model";
import { Chip, DemoShell, OutcomeBanner, Panel } from "./shared";

const STRESS_WORDS = RHYME_LEXICON.filter((w) => w.syllables >= 2);

function cycleStress(code: StressCode): StressCode {
  return ((code + 1) % 3) as StressCode;
}

/**
 * Click syllables to cycle 0/1/2 stress. Watch 2-bit cells fill a u32.
 */
export function StressPackDemo() {
  const [word, setWord] = useState(STRESS_WORDS[0]!.word);
  const [patternByWord, setPatternByWord] = useState<Record<string, StressCode[]>>(
    () => Object.fromEntries(STRESS_WORDS.map((w) => [w.word, [...w.stress]])),
  );

  const base = STRESS_WORDS.find((w) => w.word === word) ?? STRESS_WORDS[0]!;
  const live = patternByWord[word] ?? [...base.stress];
  const packed = packStressPattern(live);
  const bits = stressToBinaryString(packed, live.length);
  const hex = `0x${packed.toString(16).padStart(8, "0")}`;

  return (
    <DemoShell
      title="2-bit stress packing"
      blurb="Each syllable gets two bits: unstressed, primary, or secondary. Sixteen syllables fit in one u32."
      accent="red"
    >
      <div className="flex flex-wrap gap-2">
        {STRESS_WORDS.map((w) => (
          <Button
            key={w.word}
            type="button"
            size="sm"
            variant={word === w.word ? "ink" : "outline"}
            onClick={() => setWord(w.word)}
          >
            {w.word}
          </Button>
        ))}
      </div>

      <Panel label="Tap a syllable to cycle stress">
        <div className="flex flex-wrap gap-2">
          {live.map((code, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const next = [...live];
                next[i] = cycleStress(code);
                setPatternByWord((prev) => ({ ...prev, [word]: next }));
              }}
              className={cn(
                "min-w-[4.5rem] border-2 border-ink px-2 py-2 text-left transition-colors",
                code === 1 && "bg-red text-white",
                code === 2 && "bg-yellow text-ink",
                code === 0 && "bg-paper text-ink",
              )}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
                syl {i + 1}
              </p>
              <p className="font-display text-xl leading-none">{code}</p>
              <p className="mt-1 font-mono text-[10px]">
                {STRESS_LABEL[code]}
              </p>
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
        <Panel label="Bit lanes (low syllable → low bits)">
          <div className="flex flex-wrap gap-1">
            {live.map((code, i) => {
              const pair = (code & 3).toString(2).padStart(2, "0");
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="flex gap-0.5">
                    {[...pair].reverse().map((bit, bi) => (
                      <span
                        key={bi}
                        className={cn(
                          "flex size-8 items-center justify-center border-2 border-ink font-mono text-sm font-bold",
                          bit === "1" ? "bg-ink text-paper" : "bg-white text-grey",
                        )}
                      >
                        {bit}
                      </span>
                    ))}
                  </div>
                  <span className="font-mono text-[10px] text-grey">
                    {"<< "}
                    {i * 2}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 break-all font-mono text-xs text-grey">
            packed bits (high→low): {bits}
          </p>
        </Panel>

        <Panel label="One word → one u32">
          <p className="font-display text-3xl leading-none tracking-tight">
            {hex}
          </p>
          <p className="mt-2 font-mono text-sm tabular-nums text-grey">
            decimal {packed}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip>{live.length} syllables</Chip>
            <Chip>{live.length * 2} bits used</Chip>
            <Chip tone="ok">4 bytes stored</Chip>
          </div>
        </Panel>
      </div>

      <OutcomeBanner
        tone="ok"
        title="276k words × 4 bytes ≈ 1.05 MiB"
        detail="The whole stress table is a dense Uint32Array. No strings. After brotli it shrinks to about 90 KB on the wire."
      />
    </DemoShell>
  );
}
