"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { sumMoneyLines } from "./budget";
import { DemoShell } from "./shared";

type MoneyMode = "double" | "cents" | "decimal";

const MODES: { id: MoneyMode; label: string }[] = [
  { id: "double", label: "DOUBLE" },
  { id: "cents", label: "INT cents" },
  { id: "decimal", label: "DECIMAL" },
];

const UNIT_CENTS = 10;

function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

/**
 * Ledger vs reality: DOUBLE drifts off the rail as line items accumulate;
 * INT cents and DECIMAL stay locked.
 */
export function MoneyModeDemo() {
  const [mode, setMode] = useState<MoneyMode>("double");
  const [lineCount, setLineCount] = useState(80);

  const sum = useMemo(
    () => sumMoneyLines(mode, lineCount, UNIT_CENTS),
    [mode, lineCount],
  );
  const exact = !sum.floatLies && sum.driftCents === 0;

  const samples = useMemo(() => {
    const n = 40;
    const pts: { expected: number; actual: number; err: number }[] = [];
    for (let i = 1; i <= n; i++) {
      const lines = Math.max(1, Math.round((lineCount * i) / n));
      const s = sumMoneyLines(mode, lines, UNIT_CENTS);
      const expected = s.expectedCents / 100;
      const actual =
        mode === "double" && s.floatRaw != null ? s.floatRaw : expected;
      pts.push({ expected, actual, err: actual - expected });
    }
    return pts;
  }, [mode, lineCount]);

  const w = 320;
  const h = 120;
  const pad = 20;
  const railY = h / 2;

  // Amplify error so the gap is visible (raw float error is tiny in absolute $)
  const amp = 8000;
  const actualPath = samples
    .map((p, i) => {
      const x = pad + (i / Math.max(1, samples.length - 1)) * (w - pad * 2);
      const y =
        mode === "double"
          ? Math.min(h - 8, Math.max(8, railY - p.err * amp))
          : railY;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const gapPath =
    mode === "double"
      ? (() => {
          const top = samples.map((_, i) => {
            const x =
              pad + (i / Math.max(1, samples.length - 1)) * (w - pad * 2);
            return `${x.toFixed(1)},${railY}`;
          });
          const bot = [...samples].reverse().map((p, ri) => {
            const i = samples.length - 1 - ri;
            const x =
              pad + (i / Math.max(1, samples.length - 1)) * (w - pad * 2);
            const y = Math.min(h - 8, Math.max(8, railY - p.err * amp));
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          });
          return `M${top.join(" L")} L${bot.join(" L")} Z`;
        })()
      : "";

  const errCents =
    mode === "double" && sum.floatRaw != null
      ? Math.abs(sum.floatRaw * 100 - sum.expectedCents)
      : 0;

  const last = samples[samples.length - 1];
  const lastY =
    mode === "double" && last
      ? Math.min(h - 8, Math.max(8, railY - last.err * amp))
      : railY;

  return (
    <DemoShell
      title="Money mode"
      blurb="Crank the cart. DOUBLE drifts off the ledger rail. INT and DECIMAL stay locked."
    >
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Button
            key={m.id}
            type="button"
            size="sm"
            variant={mode === m.id ? "ink" : "outline"}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </Button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 flex items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-grey">
          <span>Line items @ $0.10</span>
          <span className="tabular-nums text-ink">{lineCount}</span>
        </span>
        <Slider
          accent="red"
          min={1}
          max={200}
          step={1}
          value={lineCount}
          onValueChange={setLineCount}
        />
      </label>

      <div className="border-2 border-ink bg-white p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            Ledger rail vs stored sum
          </p>
          <p
            className={cn(
              "font-mono text-xs font-bold tabular-nums",
              exact ? "text-blue" : "text-red",
            )}
          >
            {exact
              ? formatMoney(sum.expectedCents)
              : `drift ${errCents.toFixed(2)}¢`}
          </p>
        </div>

        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-36 w-full bg-paper"
          role="img"
          aria-label="Money drift chart"
        >
          <line
            x1={pad}
            y1={railY}
            x2={w - pad}
            y2={railY}
            stroke="currentColor"
            strokeWidth={2}
            opacity={0.35}
          />
          <text
            x={pad}
            y={14}
            fill="currentColor"
            opacity={0.5}
            fontSize={9}
            fontFamily="monospace"
          >
            exact
          </text>

          {gapPath ? (
            <path d={gapPath} fill="var(--red, #dc2626)" opacity={0.22} />
          ) : null}

          <path
            d={actualPath}
            fill="none"
            stroke={exact ? "var(--blue, #1d4ed8)" : "var(--red, #dc2626)"}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle
            cx={w - pad}
            cy={lastY}
            r={5}
            fill={exact ? "var(--blue, #1d4ed8)" : "var(--red, #dc2626)"}
            stroke="currentColor"
            strokeWidth={2}
          />
        </svg>

        <p className="mt-2 font-mono text-[11px] text-grey">
          {exact
            ? `${lineCount} × $0.10 = ${formatMoney(sum.expectedCents)}. Locked.`
            : `Expected ${formatMoney(sum.expectedCents)}. DOUBLE raw is ${sum.floatRaw}. The gap grows with cart size.`}
        </p>
      </div>
    </DemoShell>
  );
}
