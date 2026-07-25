"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  estimateColumn,
  sumMoneyLines,
  type SchemaColumn,
} from "./budget";
import {
  ByteStrip,
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  TradeoffRow,
} from "./shared";

type MoneyMode = "double" | "cents" | "decimal";

const MODES: { id: MoneyMode; label: string }[] = [
  { id: "double", label: "DOUBLE" },
  { id: "cents", label: "INT cents" },
  { id: "decimal", label: "DECIMAL(12,2)" },
];

const UNIT_CENTS = 10;

function moneyColumn(mode: MoneyMode): SchemaColumn {
  if (mode === "double") {
    return { id: "price", name: "price", kind: "double", nullable: false };
  }
  if (mode === "decimal") {
    return {
      id: "price",
      name: "price",
      kind: "decimal",
      precision: 12,
      scale: 2,
      nullable: false,
    };
  }
  return {
    id: "price",
    name: "price_cents",
    kind: "integer",
    intWidth: "int",
    unsigned: true,
    nullable: false,
  };
}

function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function MoneyModeDemo() {
  const [mode, setMode] = useState<MoneyMode>("double");
  const [lineCount, setLineCount] = useState(100);

  const column = useMemo(() => moneyColumn(mode), [mode]);
  const estimate = useMemo(() => estimateColumn(column), [column]);
  const sum = useMemo(
    () => sumMoneyLines(mode, lineCount, UNIT_CENTS),
    [mode, lineCount],
  );
  const exact = !sum.floatLies && sum.driftCents === 0;
  const previewLines = Math.min(lineCount, 6);

  const outcome = exact
    ? {
        tone: "ok" as const,
        title: "Invoice balances",
        detail: `${lineCount} × $0.10 = ${formatMoney(sum.expectedCents)}. No ghost pennies.`,
      }
    : sum.driftCents !== 0
      ? {
          tone: "bad" as const,
          title: `Truncate-to-cents: off by ${Math.abs(sum.driftCents)}¢`,
          detail: `Raw DOUBLE was ${sum.floatRaw}. Flooring to cents stored ${formatMoney(sum.storedTotalCents)} instead of ${formatMoney(sum.expectedCents)}.`,
        }
      : {
          tone: "warn" as const,
          title: "Float already lied — rounding papered over it",
          detail: `Raw sum is ${sum.floatRaw}, not ${(sum.expectedCents / 100).toFixed(2)}. Math.round happens to save you this time. Don’t bet the ledger on luck.`,
        };

  return (
    <DemoShell
      title="Money mode"
      blurb="Ring up a cart of $0.10 line items. Watch DOUBLE’s raw sum diverge — then see what a truncate-to-cents cast does to the invoice."
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

      <OutcomeBanner {...outcome} />

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

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel label="Receipt">
          <ul className="space-y-1 font-mono text-xs">
            {Array.from({ length: previewLines }, (_, i) => (
              <li
                key={i}
                className="flex justify-between gap-2 border-b border-ink/10 pb-1"
              >
                <span className="text-grey">item_{i + 1}</span>
                <span>$0.10</span>
              </li>
            ))}
            {lineCount > previewLines ? (
              <li className="text-grey">… +{lineCount - previewLines} more</li>
            ) : null}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t-2 border-ink pt-2 font-mono text-sm font-bold">
            <span>Expected</span>
            <span className="tabular-nums">
              {formatMoney(sum.expectedCents)}
            </span>
          </div>
        </Panel>

        <Panel label="What the column type did">
          {sum.floatRaw != null ? (
            <>
              <TradeoffRow
                label="Raw DOUBLE sum"
                value={String(sum.floatRaw)}
                tone="bad"
              />
              <TradeoffRow
                label="Truncate → cents"
                value={formatMoney(sum.storedTotalCents)}
                tone={sum.driftCents === 0 ? "warn" : "bad"}
              />
              <TradeoffRow
                label="Lucky Math.round"
                value={formatMoney(sum.roundedCents)}
                tone={
                  sum.roundedCents === sum.expectedCents ? "warn" : "bad"
                }
              />
            </>
          ) : (
            <TradeoffRow
              label="Stored total"
              value={formatMoney(sum.storedTotalCents)}
              tone="ok"
            />
          )}
          <TradeoffRow label="Column" value={estimate.label} />
          <TradeoffRow label="Bytes" value={`~${estimate.bytes}B`} />
          <p className="mt-2 text-xs text-grey">
            {exact
              ? "Integer cents (or DECIMAL) add like money."
              : "The binary float sum is already wrong before anyone formats currency. Truncation loses a cent; rounding is a coin flip."}
          </p>
        </Panel>
      </div>

      <div
        className={cn(
          "flex h-10 items-stretch overflow-hidden border-2 border-ink",
          exact ? "bg-blue/15" : "bg-red/15",
        )}
        role="img"
        aria-label="Balance meter"
      >
        <div
          className={cn(
            "flex items-center px-3 font-mono text-xs font-bold",
            exact ? "bg-blue text-white" : "bg-red text-white",
          )}
          style={{ width: exact ? "100%" : "70%" }}
        >
          {exact ? "Balanced" : "Ledger mismatch"}
        </div>
        {!exact ? (
          <div className="flex flex-1 items-center justify-end px-3 font-mono text-xs font-bold text-red">
            {sum.driftCents !== 0
              ? `${sum.driftCents}¢`
              : "float ≠ decimal"}
          </div>
        ) : null}
      </div>

      <ByteStrip columns={[estimate]} />

      <div className="flex flex-wrap gap-2">
        {exact ? (
          <Chip tone="ok">Money exact</Chip>
        ) : (
          <Chip tone="bad">Money approximate</Chip>
        )}
        <Chip>
          {column.name}: {estimate.label}
        </Chip>
      </div>
    </DemoShell>
  );
}
