"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CORPUS_STATS, PACK_SIZES_MIB } from "./model";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  TradeoffRow,
} from "./shared";

type View = "naive" | "packed" | "brotli";

const BARS: {
  id: View;
  label: string;
  accent: string;
  segments: { name: string; mib: number; color: string }[];
}[] = [
  {
    id: "naive",
    label: "Naive JSON",
    accent: "bg-red",
    segments: [
      {
        name: "words JSON",
        mib: PACK_SIZES_MIB.jsonWordsOnly,
        color: "bg-red",
      },
      {
        name: "perfect rhyme JSON",
        mib: PACK_SIZES_MIB.jsonPerfectRhyme,
        color: "bg-red/70",
      },
    ],
  },
  {
    id: "packed",
    label: "Custom .bin (raw)",
    accent: "bg-yellow",
    segments: [
      { name: "lexicon", mib: PACK_SIZES_MIB.lexiconRaw, color: "bg-blue" },
      { name: "stress", mib: PACK_SIZES_MIB.stressRaw, color: "bg-yellow" },
      { name: "variants", mib: PACK_SIZES_MIB.variantsRaw, color: "bg-paper" },
      {
        name: "rhyme perfect",
        mib: PACK_SIZES_MIB.rhymePerfectRaw,
        color: "bg-red",
      },
      { name: "rhyme end", mib: PACK_SIZES_MIB.rhymeEndRaw, color: "bg-red/70" },
      {
        name: "thesaurus",
        mib: PACK_SIZES_MIB.thesaurusRaw,
        color: "bg-ink",
      },
    ],
  },
  {
    id: "brotli",
    label: "On the wire (brotli)",
    accent: "bg-blue",
    segments: [
      { name: "lexicon", mib: PACK_SIZES_MIB.lexiconBrotli, color: "bg-blue" },
      { name: "stress", mib: PACK_SIZES_MIB.stressBrotli, color: "bg-yellow" },
      {
        name: "variants",
        mib: PACK_SIZES_MIB.variantsBrotli,
        color: "bg-paper",
      },
      {
        name: "rhyme perfect",
        mib: PACK_SIZES_MIB.rhymePerfectBrotli,
        color: "bg-red",
      },
      {
        name: "rhyme end",
        mib: PACK_SIZES_MIB.rhymeEndBrotli,
        color: "bg-red/70",
      },
      {
        name: "thesaurus",
        mib: PACK_SIZES_MIB.thesaurusBrotli,
        color: "bg-ink",
      },
    ],
  },
];

function totalOf(segments: { mib: number }[]): number {
  return segments.reduce((s, x) => s + x.mib, 0);
}

/**
 * Compare naive JSON brain dump vs packed bins vs brotli on the wire.
 */
export function WireBudgetDemo() {
  const [view, setView] = useState<View>("brotli");
  const active = BARS.find((b) => b.id === view)!;
  const total = totalOf(active.segments);
  const naiveTotal = totalOf(BARS[0]!.segments);
  const maxBar = Math.max(...BARS.map((b) => totalOf(b.segments)));

  return (
    <DemoShell
      title="Dictionary on the wire"
      blurb="Six binary packs. Shared word ids. Front-coding, uvarints, and 2-bit stress. Then brotli."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        {BARS.map((b) => (
          <Button
            key={b.id}
            type="button"
            size="sm"
            variant={view === b.id ? "ink" : "outline"}
            onClick={() => setView(b.id)}
          >
            {b.label}
          </Button>
        ))}
      </div>

      <Panel label={`${active.label} · ~${total.toFixed(2)} MiB`}>
        <div
          className="flex h-14 w-full overflow-hidden border-2 border-ink bg-paper"
          role="img"
          aria-label={`${active.label} uses about ${total.toFixed(2)} mebibytes`}
        >
          {active.segments.map((seg) => (
            <div
              key={seg.name}
              title={`${seg.name}: ${seg.mib.toFixed(2)} MiB`}
              className={cn(
                "relative h-full min-w-[3px] border-r border-ink/30 transition-all duration-300",
                seg.color,
              )}
              style={{
                flexGrow: seg.mib,
                flexBasis: 0,
                width: `${(seg.mib / maxBar) * 100}%`,
              }}
            />
          ))}
          {/* spacer so shorter bars don't look full-width */}
          {total < maxBar ? (
            <div
              className="h-full bg-paper"
              style={{ flexGrow: maxBar - total, flexBasis: 0 }}
              aria-hidden
            />
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {active.segments.map((seg) => (
            <span
              key={seg.name}
              className="inline-flex items-center gap-1.5 border border-ink/40 bg-white px-1.5 py-0.5 font-mono text-[10px]"
            >
              <span className={cn("size-2.5 shrink-0", seg.color)} />
              {seg.name}
              <span className="tabular-nums text-grey">
                {seg.mib.toFixed(2)}
              </span>
            </span>
          ))}
        </div>
      </Panel>

      <div className="grid gap-2 sm:grid-cols-3">
        <TradeoffRow
          label="Naive JSON (words + perfect rhyme)"
          value={`~${naiveTotal.toFixed(1)} MiB`}
          tone="bad"
        />
        <TradeoffRow
          label="All six packs, raw"
          value={`~${PACK_SIZES_MIB.totalRaw} MiB`}
          tone="warn"
        />
        <TradeoffRow
          label="All six packs, brotli"
          value={`~${PACK_SIZES_MIB.totalBrotli} MiB`}
          tone="ok"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip>{CORPUS_STATS.lemmas.toLocaleString()} lemmas</Chip>
        <Chip>{CORPUS_STATS.perfectKeys.toLocaleString()} perfect keys</Chip>
        <Chip>{CORPUS_STATS.endKeys.toLocaleString()} end keys</Chip>
        <Chip>
          {CORPUS_STATS.thesaurusHeads.toLocaleString()} thesaurus heads
        </Chip>
      </div>

      <OutcomeBanner
        tone="ok"
        title="~3.7 MiB brotli for the whole linguistic brain"
        detail="Lexicon, stress, poetic variants, both rhyme indexes, and the thesaurus — decoded in a worker after the editor is already interactive."
      />
    </DemoShell>
  );
}
