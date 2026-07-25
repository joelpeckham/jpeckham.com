"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  INNODB_PAGE_USABLE_BYTES,
  estimateColumn,
  rowsPerPage,
  varcharWorstCaseBytes,
  type Charset,
} from "./budget";
import {
  ByteStrip,
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  TradeoffRow,
  controlInput,
} from "./shared";

function visualizeSample(sample: string, charset: Charset): {
  display: string;
  truncates: boolean;
  units: { ch: string; bytes: number; ok: boolean }[];
} {
  const units: { ch: string; bytes: number; ok: boolean }[] = [];
  let display = "";
  let truncates = false;
  for (const ch of sample) {
    const cp = ch.codePointAt(0) ?? 0;
    const isSupplementary = cp > 0xffff;
    const bytes =
      charset === "utf8mb3"
        ? isSupplementary
          ? 0
          : cp <= 0x7f
            ? 1
            : cp <= 0x7ff
              ? 2
              : 3
        : isSupplementary
          ? 4
          : cp <= 0x7f
            ? 1
            : cp <= 0x7ff
              ? 2
              : 3;
    const ok = !(charset === "utf8mb3" && isSupplementary);
    if (!ok) truncates = true;
    else display += ch;
    units.push({ ch, bytes: ok ? bytes : 0, ok });
  }
  return { display, truncates, units };
}

export function VarcharCharsetDemo() {
  const [length, setLength] = useState(255);
  const [charset, setCharset] = useState<Charset>("utf8mb4");
  const [sample, setSample] = useState("Café 😀");

  const worst = useMemo(
    () => varcharWorstCaseBytes(length, charset),
    [length, charset],
  );

  const estimate = useMemo(
    () =>
      estimateColumn({
        id: "title",
        name: "title",
        kind: "varchar",
        length,
        charset,
        nullable: false,
      }),
    [length, charset],
  );

  const viz = useMemo(
    () => visualizeSample(sample, charset),
    [sample, charset],
  );

  // Pretend this column is the whole row — how many fit on a page?
  const rpp = rowsPerPage(worst.bytes);
  const nearKb = worst.bytes >= 1000;
  const kbPct = Math.min(100, (worst.bytes / 1024) * 100);

  const outcome = viz.truncates
    ? {
        tone: "bad" as const,
        title: "Emoji doesn’t fit",
        detail: `utf8mb3 can’t store supplementary-plane chars. Strict mode errors; loose mode stores “${viz.display || "(empty)"}” and eats the rest.`,
      }
    : nearKb
      ? {
          tone: "warn" as const,
          title: `~${worst.bytes}B declared, about a kilobyte`,
          detail: `Only ~${rpp} of these columns fit on a 16KB page. Cargo-cult VARCHAR(255) is how list endpoints get chubby.`,
        }
      : {
          tone: "ok" as const,
          title: "Fits modern text",
          detail: `utf8mb4 + a product-sized length. Worst-case ~${worst.bytes}B → roughly ${rpp} rows/page if this were the whole row.`,
        };

  return (
    <DemoShell
      title="VARCHAR byte budget"
      blurb="Characters aren’t bytes. Drag the length, flip the charset, and watch page packing + emoji survival change."
    >
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={charset === "utf8mb4" ? "ink" : "outline"}
          onClick={() => setCharset("utf8mb4")}
        >
          utf8mb4
        </Button>
        <Button
          type="button"
          size="sm"
          variant={charset === "utf8mb3" ? "ink" : "outline"}
          onClick={() => setCharset("utf8mb3")}
        >
          utf8mb3 / utf8
        </Button>
      </div>

      <OutcomeBanner {...outcome} />

      <label className="block">
        <span className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-grey">
          <span>VARCHAR length</span>
          <span className="tabular-nums text-ink">{length}</span>
        </span>
        <Slider
          accent="blue"
          min={1}
          max={512}
          step={1}
          value={length}
          onValueChange={setLength}
        />
      </label>

      <Panel label="Kilobyte thermometer (declared budget)">
        <div className="relative h-8 overflow-hidden border-2 border-ink bg-paper">
          <div
            className={cn(
              "h-full transition-[width] duration-200 ease-out",
              nearKb ? "bg-red" : "bg-blue",
            )}
            style={{ width: `${kbPct}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold tabular-nums">
            {worst.bytes}B / 1024B
          </span>
        </div>
        <p className="mt-2 font-mono text-xs tabular-nums text-grey">
          {length} × {worst.perChar}B + {worst.prefix}B prefix
        </p>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel label="Sample → stored">
          <input
            className={controlInput}
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            aria-label="Sample string"
          />
          <div className="mt-3 flex flex-wrap gap-1">
            {viz.units.map((u, i) => (
              <span
                key={`${u.ch}-${i}`}
                className={cn(
                  "inline-flex min-w-[2.5rem] flex-col items-center border-2 border-ink px-1 py-1 font-mono text-xs transition-colors",
                  u.ok ? "bg-white" : "bg-red text-white",
                )}
                title={
                  u.ok
                    ? `${u.bytes} byte${u.bytes === 1 ? "" : "s"}`
                    : "won’t store"
                }
              >
                <span className="text-base leading-none">{u.ch}</span>
                <span
                  className={cn(
                    "mt-1 text-[9px] uppercase",
                    u.ok ? "text-grey" : "text-white/80",
                  )}
                >
                  {u.ok ? `${u.bytes}B` : "nope"}
                </span>
              </span>
            ))}
          </div>
          {viz.truncates ? (
            <p className="mt-2 font-mono text-xs text-red">
              Survives as:{" "}
              <span className="font-bold">
                {viz.display.length ? viz.display : "(truncated)"}
              </span>
            </p>
          ) : null}
        </Panel>

        <Panel label="If this column were the whole row">
          <TradeoffRow
            label="Rows / 16KB page"
            value={`~${rpp}`}
            tone={rpp < 20 ? "bad" : rpp < 40 ? "warn" : "ok"}
          />
          <TradeoffRow
            label="Usable page bytes"
            value={INNODB_PAGE_USABLE_BYTES.toLocaleString()}
          />
          <TradeoffRow
            label="Length prefix"
            value={`${worst.prefix} byte${worst.prefix === 1 ? "" : "s"}`}
          />
          <div className="mt-3 grid grid-cols-8 gap-1">
            {Array.from({ length: Math.min(rpp, 32) }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "aspect-square border border-ink/40",
                  nearKb ? "bg-red/70" : "bg-blue/70",
                )}
              />
            ))}
            {rpp > 32 ? (
              <div className="col-span-8 font-mono text-[10px] text-grey">
                +{rpp - 32} more rows packed into the page
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <ByteStrip columns={[estimate]} />

      <div className="flex flex-wrap gap-2">
        {charset === "utf8mb4" ? (
          <Chip tone="ok">Emoji OK</Chip>
        ) : (
          <Chip tone="bad">utf8mb3 truncation risk</Chip>
        )}
        {nearKb ? <Chip tone="warn">Near 1KB column budget</Chip> : null}
      </div>
    </DemoShell>
  );
}
