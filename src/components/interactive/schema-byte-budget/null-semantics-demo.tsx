"use client";

import { AutoLoop } from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import { DemoShell } from "./shared";

type Kind = "true" | "false" | "null";

const ROWS: { id: string; kind: Kind; label: string }[] = [
  { id: "r1", kind: "false", label: "card" },
  { id: "r2", kind: "true", label: "cash" },
  { id: "r3", kind: "null", label: "NULL" },
  { id: "r4", kind: "true", label: "check" },
  { id: "r5", kind: "false", label: "card" },
  { id: "r6", kind: "null", label: "NULL" },
];

/**
 * Rows ride a conveyor into `payment_type != 'card'`.
 * FALSE drops left, TRUE passes right, NULL falls through a trapdoor.
 */
export function NullSemanticsDemo() {
  return (
    <DemoShell
      title="NULL ≠ anything"
      blurb={`WHERE payment_type != 'card'. NULL is UNKNOWN, so it falls through.`}
    >
      <AutoLoop durationMs={4800} endHoldMs={500} startHoldMs={200}>
        {({ t }) => {
          // Stagger rows across the loop
          return (
            <div className="border-2 border-ink bg-white p-3 overflow-hidden">
              <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
                payment_type != &apos;card&apos;
              </p>

              <div className="relative mx-auto h-48 max-w-md">
                {/* Conveyor belt */}
                <div className="absolute left-2 right-2 top-10 h-3 border-2 border-ink bg-paper" />

                {/* Gate */}
                <div className="absolute left-1/2 top-4 z-10 w-24 -translate-x-1/2 border-2 border-ink bg-ink px-1 py-0.5 text-center font-mono text-[9px] text-white">
                  != gate
                </div>

                {/* Trapdoor under gate */}
                <div className="absolute left-1/2 top-[4.5rem] z-0 flex w-20 -translate-x-1/2 flex-col items-center">
                  <div className="h-8 w-16 border-2 border-dashed border-red bg-red/10" />
                  <p className="mt-1 font-mono text-[9px] uppercase text-red">
                    UNKNOWN
                  </p>
                </div>

                {/* FALSE bin */}
                <div className="absolute bottom-2 left-2 border-2 border-ink bg-red/20 px-2 py-1 font-mono text-[9px] uppercase">
                  FALSE
                </div>
                {/* TRUE bin */}
                <div className="absolute bottom-2 right-2 border-2 border-ink bg-blue/20 px-2 py-1 font-mono text-[9px] uppercase">
                  TRUE
                </div>

                {ROWS.map((row, i) => {
                  const start = i / ROWS.length;
                  const local = (t - start + 1) % 1;
                  // 0–0.45: approach gate from left
                  // 0.45–0.7: branch
                  // 0.7–1: settle in bin / pit
                  let x = 8;
                  let y = 32;
                  let opacity = 1;

                  if (local < 0.4) {
                    x = 8 + (local / 0.4) * 42;
                    y = 32;
                  } else if (local < 0.65) {
                    const b = (local - 0.4) / 0.25;
                    if (row.kind === "null") {
                      x = 50;
                      y = 32 + b * 55;
                    } else if (row.kind === "false") {
                      x = 50 - b * 38;
                      y = 32 + b * 50;
                    } else {
                      x = 50 + b * 38;
                      y = 32 + b * 50;
                    }
                  } else {
                    const b = (local - 0.65) / 0.35;
                    opacity = 1 - b * 0.3;
                    if (row.kind === "null") {
                      x = 50;
                      y = 88;
                      opacity = 0.5 + Math.sin(b * Math.PI) * 0.3;
                    } else if (row.kind === "false") {
                      x = 12;
                      y = 88;
                    } else {
                      x = 88;
                      y = 88;
                    }
                  }

                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-bold",
                        row.kind === "null" && "bg-yellow",
                        row.kind === "true" && "bg-blue text-white",
                        row.kind === "false" && "bg-red text-white",
                      )}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        opacity,
                      }}
                    >
                      {row.label}
                    </div>
                  );
                })}
              </div>

              <p className="mt-2 text-center font-mono text-[11px] text-grey">
                NULL is neither TRUE nor FALSE. It drops out of both branches.
              </p>
            </div>
          );
        }}
      </AutoLoop>
    </DemoShell>
  );
}
