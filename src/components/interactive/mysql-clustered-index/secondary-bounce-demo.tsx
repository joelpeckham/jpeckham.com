"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { makeToyRows } from "./model";
import { DemoShell, OutcomeBanner } from "./shared";

export function SecondaryBounceDemo() {
  const rows = useMemo(() => makeToyRows(4, 9), []);
  const [targetId, setTargetId] = useState(2);
  const [hop, setHop] = useState(0);

  const target = rows.find((r) => r.id === targetId) ?? rows[0];

  useEffect(() => {
    const t1 = window.setTimeout(() => setHop(1), 160);
    const t2 = window.setTimeout(() => setHop(2), 380);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [targetId]);

  function selectTarget(id: number) {
    setTargetId(id);
    setHop(0);
  }

  return (
    <DemoShell
      title="Secondary bounce"
      blurb="Click an email. Hop 1 finds the PK; hop 2 loads the clustered row."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <Button
            key={row.id}
            type="button"
            size="sm"
            variant={targetId === row.id ? "ink" : "outline"}
            onClick={() => selectTarget(row.id)}
          >
            {row.email.split("@")[0]}
          </Button>
        ))}
      </div>

      <OutcomeBanner
        tone="warn"
        title="2 hops for WHERE email = ?"
        detail={
          hop < 1
            ? `Looking up ${target.email}…`
            : hop === 1
              ? `Secondary leaf: ${target.email} → PK ${target.id}`
              : `Clustered leaf ${target.id}: status=${target.status}`
        }
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="border-2 border-ink bg-white p-2">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            1 · email → pk
          </p>
          <div className="space-y-1">
            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "flex justify-between gap-2 border border-ink/30 px-2 py-1 font-mono text-[11px] transition-colors",
                  hop >= 1 && row.id === target.id
                    ? "border-ink bg-yellow"
                    : "bg-paper",
                )}
              >
                <span className="truncate">{row.email}</span>
                <span className="shrink-0 font-bold">→ {row.id}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-2 border-ink bg-white p-2">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            2 · pk → row
          </p>
          <div className="space-y-1">
            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "flex justify-between gap-2 border border-ink/30 px-2 py-1 font-mono text-[11px] transition-colors",
                  hop >= 2 && row.id === target.id
                    ? "border-ink bg-blue text-white"
                    : "bg-paper",
                )}
              >
                <span className="font-bold">#{row.id}</span>
                <span className="truncate opacity-90">{row.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
