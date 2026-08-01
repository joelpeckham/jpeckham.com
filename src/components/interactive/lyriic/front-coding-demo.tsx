"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AutoLoop } from "@/components/interactive/mysql-shared";
import { FRONT_CODE_SAMPLE, frontCodeWords } from "./model";
import { Chip, DemoShell, OutcomeBanner, Panel, TradeoffRow } from "./shared";

/**
 * Step through front-coding on a sorted lemma cluster.
 * Shared prefix is blue; stored "rest" is ink; skipped bytes fade out.
 */
export function FrontCodingDemo() {
  const { entries, rawTotal, storedTotal } = useMemo(
    () => frontCodeWords([...FRONT_CODE_SAMPLE]),
    [],
  );
  const [manualStep, setManualStep] = useState<number | null>(null);
  const saved = rawTotal - storedTotal;
  const keptPct = Math.round((storedTotal / rawTotal) * 100);

  return (
    <DemoShell
      title="Front-coding"
      blurb="Sorted words share prefixes. Store the overlap once as a length, then only the new tail."
      accent="blue"
    >
      <AutoLoop
        durationMs={entries.length * 900}
        frameCount={entries.length}
        endHoldMs={900}
        startHoldMs={300}
      >
        {({ frame }) => {
          const step = manualStep ?? frame;
          return (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {entries.map((e, i) => (
                  <Button
                    key={e.word}
                    type="button"
                    size="sm"
                    variant={step === i ? "ink" : "outline"}
                    onClick={() => setManualStep(i)}
                  >
                    {e.word}
                  </Button>
                ))}
                {manualStep != null ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setManualStep(null)}
                  >
                    Auto
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Panel label="As plain strings">
                  <ul className="space-y-1.5 font-mono text-sm">
                    {entries.map((e, i) => (
                      <li
                        key={e.word}
                        className={cn(
                          "border-b border-ink/10 pb-1 transition-opacity",
                          i === step ? "opacity-100" : "opacity-40",
                        )}
                      >
                        <span className="text-ink">{e.word}</span>
                        <span className="ml-2 text-grey">{e.rawBytes}B</span>
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel label="Front-coded on the wire">
                  <ul className="space-y-1.5 font-mono text-sm">
                    {entries.map((e, i) => {
                      const active = i === step;
                      const revealed = i <= step;
                      return (
                        <li
                          key={e.word}
                          className={cn(
                            "border-b border-ink/10 pb-1 transition-opacity",
                            revealed ? "opacity-100" : "opacity-25",
                          )}
                        >
                          {revealed ? (
                            <>
                              <span className="text-grey">
                                shared={e.shared}{" "}
                              </span>
                              {e.shared > 0 ? (
                                <span
                                  className={cn(
                                    "bg-blue/15 text-blue",
                                    active && "bg-blue text-white",
                                  )}
                                >
                                  {e.word.slice(0, e.shared)}
                                </span>
                              ) : null}
                              <span
                                className={cn(
                                  "font-bold",
                                  active ? "bg-yellow" : "text-ink",
                                )}
                              >
                                {e.rest}
                              </span>
                              <span className="ml-2 text-grey">
                                {e.storedBytes}B
                              </span>
                            </>
                          ) : (
                            <span className="text-grey">…</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              </div>
            </div>
          );
        }}
      </AutoLoop>

      <div className="grid gap-2 sm:grid-cols-3">
        <TradeoffRow label="Raw characters" value={`${rawTotal} B`} />
        <TradeoffRow label="Front-coded" value={`${storedTotal} B`} tone="ok" />
        <TradeoffRow
          label="Prefix eliminated"
          value={`${saved} B (${100 - keptPct}%)`}
          tone="ok"
        />
      </div>

      <OutcomeBanner
        tone="ok"
        title={`${100 - keptPct}% fewer character bytes in this cluster`}
        detail="On the real lexicon (~276k lemmas) front-coding drops stored character payload to about 31% of the raw letters before gzip/brotli even starts."
      />

      <Chip>shared:u8 + restLen:u16LE + UTF-8 rest</Chip>
    </DemoShell>
  );
}
