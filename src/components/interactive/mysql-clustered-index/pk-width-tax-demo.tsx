"use client";

import { AutoLoop } from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import { DemoShell } from "./shared";

const SECONDARIES = ["email", "status", "org_id", "created"] as const;

type Bag = "slim" | "fat";

/**
 * Looping luggage metaphor: one insert stamps a PK copy into every secondary.
 * Alternates skinny BIGINT briefcase vs fat CHAR(36) trunk.
 */
export function PkWidthTaxDemo() {
  return (
    <DemoShell
      title="Secondary luggage"
      blurb="Every secondary index entry carries a copy of the primary key."
      accent="blue"
    >
      <AutoLoop durationMs={2800} endHoldMs={900} startHoldMs={300}>
        {({ t }) => {
          // 0–0.45 BIGINT cycle, 0.45–0.55 switch, 0.55–1 CHAR(36) cycle
          const bag: Bag = t < 0.5 ? "slim" : "fat";
          const localT = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
          // Stamp progress: bag appears, then copies fly to each secondary.
          const stamp = Math.min(1, localT / 0.25);
          const copyProgress = Math.max(0, (localT - 0.2) / 0.55);
          const copiesLit = Math.floor(copyProgress * SECONDARIES.length);

          return (
            <div className="border-2 border-ink bg-white p-3">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
                    Insert one row
                  </p>
                  <LuggageBag bag={bag} stamp={stamp} />
                </div>
                <p
                  className={cn(
                    "font-mono text-xs font-bold tabular-nums",
                    bag === "slim" ? "text-blue" : "text-red",
                  )}
                >
                  {bag === "slim" ? "BIGINT · 8B" : "CHAR(36) · 36B"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SECONDARIES.map((name, i) => {
                  const lit = i < copiesLit || (i === copiesLit && copyProgress > 0);
                  const fill =
                    i < copiesLit
                      ? 1
                      : i === copiesLit
                        ? (copyProgress * SECONDARIES.length) % 1
                        : 0;
                  return (
                    <div
                      key={name}
                      className={cn(
                        "border-2 border-ink p-2 transition-colors duration-200",
                        lit ? "bg-paper" : "bg-white opacity-50",
                      )}
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-grey">
                        idx · {name}
                      </p>
                      <div className="mt-1.5 flex h-10 items-end gap-0.5">
                        <div className="h-full w-3 bg-ink" title="indexed col" />
                        <div
                          className={cn(
                            "border-2 border-ink transition-all duration-150",
                            bag === "slim" ? "bg-blue" : "bg-red",
                          )}
                          style={{
                            width: bag === "slim" ? 14 : 36,
                            height: `${Math.max(8, fill * 100)}%`,
                            opacity: fill > 0 ? 1 : 0.15,
                          }}
                          title="PK copy"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 font-mono text-[11px] text-grey">
                {bag === "slim"
                  ? "A skinny primary key means skinny copies in every secondary index."
                  : "A fat primary key taxes every secondary index."}
              </p>
            </div>
          );
        }}
      </AutoLoop>
    </DemoShell>
  );
}

function LuggageBag({ bag, stamp }: { bag: Bag; stamp: number }) {
  const w = bag === "slim" ? 28 : 64;
  const h = bag === "slim" ? 36 : 44;
  return (
    <div
      className="relative mt-1"
      style={{
        width: w + 8,
        height: h + 8,
        transform: `scale(${0.85 + stamp * 0.15})`,
        opacity: 0.35 + stamp * 0.65,
      }}
    >
      <div
        className={cn(
          "absolute bottom-0 border-2 border-ink",
          bag === "slim" ? "bg-blue" : "bg-red",
        )}
        style={{ width: w, height: h, left: 4 }}
      />
      {/* Handle */}
      <div
        className="absolute border-2 border-ink bg-paper"
        style={{
          width: bag === "slim" ? 12 : 20,
          height: 8,
          left: bag === "slim" ? 12 : 26,
          top: 0,
        }}
      />
    </div>
  );
}
