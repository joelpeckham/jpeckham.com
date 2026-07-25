"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StepPlayer } from "@/components/interactive/mysql-shared";
import { cn } from "@/lib/utils";
import {
  TOY_BTREE_PICK_KEYS,
  btreeDescentSteps,
  toyBtree,
  toyClusteredRow,
  type BtreeNode,
} from "./model";
import { DemoShell, OutcomeBanner } from "./shared";

export function BtreeDescentDemo() {
  const tree = useMemo(() => toyBtree(), []);
  const [target, setTarget] = useState<(typeof TOY_BTREE_PICK_KEYS)[number]>(8);
  const [step, setStep] = useState(-1);

  const steps = useMemo(
    () => btreeDescentSteps(tree, target),
    [tree, target],
  );

  useEffect(() => {
    setStep(-1);
  }, [target]);

  const revealedThrough = step;
  const pathIds = steps
    .slice(0, Math.max(0, revealedThrough + 1))
    .map((s) => s.nodeId);
  const current = step >= 0 ? steps[step] : undefined;
  const leafReached =
    step >= 0 && steps[step]?.direction === "leaf";
  const row = leafReached ? toyClusteredRow(target) : null;

  const caption =
    step < 0
      ? "Play or step: walk root → branch → leaf"
      : (current?.comparison ?? "");

  return (
    <DemoShell
      title="B-tree descent"
      blurb="Pick a key. Step the walk: each interior page only steers. The leaf is the row."
      accent="ink"
    >
      <div className="flex flex-wrap gap-2">
        {TOY_BTREE_PICK_KEYS.map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={target === key ? "ink" : "outline"}
            onClick={() => setTarget(key)}
          >
            {key}
          </Button>
        ))}
      </div>

      <StepPlayer
        stepCount={steps.length}
        step={step}
        onStepChange={setStep}
        intervalMs={550}
        caption={caption}
      />

      <OutcomeBanner
        tone="ok"
        title={
          leafReached
            ? `Found ${target} — leaf holds the whole row`
            : `Seeking key ${target}`
        }
        detail={
          leafReached
            ? "Clustered index: that leaf entry is the row payload, not a pointer to a heap."
            : "Interior separators only choose a child. Play the descent to see each comparison."
        }
      />

      <div className="space-y-0 border-2 border-ink bg-white p-3">
        <TreeRow
          nodes={[tree.root]}
          pathIds={pathIds}
          currentId={current?.nodeId}
          target={target}
          direction={current?.direction}
        />
        <EdgeRow
          activeLeft={pathIds.includes("b-left")}
          activeRight={pathIds.includes("b-right")}
          fromCurrent={current?.nodeId === "root"}
          direction={current?.nodeId === "root" ? current.direction : undefined}
        />
        <TreeRow
          nodes={[tree["b-left"], tree["b-right"]]}
          pathIds={pathIds}
          currentId={current?.nodeId}
          target={target}
          direction={current?.direction}
        />
        <EdgeRow
          four
          activeSlots={[
            pathIds.includes("leaf-a"),
            pathIds.includes("leaf-b"),
            pathIds.includes("leaf-c"),
            pathIds.includes("leaf-d"),
          ]}
        />
        <TreeRow
          nodes={[
            tree["leaf-a"],
            tree["leaf-b"],
            tree["leaf-c"],
            tree["leaf-d"],
          ]}
          pathIds={pathIds}
          currentId={current?.nodeId}
          target={target}
          direction={current?.direction}
          showRowBadge={leafReached}
        />
      </div>

      {row ? (
        <div className="border-2 border-ink bg-blue px-3 py-2 font-mono text-xs text-white transition-colors duration-300">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/70">
            Clustered leaf payload
          </p>
          <p className="mt-1">
            id={row.id} · email={row.email} · status={row.status}
          </p>
        </div>
      ) : null}
    </DemoShell>
  );
}

function EdgeRow({
  activeLeft,
  activeRight,
  four,
  activeSlots,
  fromCurrent,
  direction,
}: {
  activeLeft?: boolean;
  activeRight?: boolean;
  four?: boolean;
  activeSlots?: boolean[];
  fromCurrent?: boolean;
  direction?: "left" | "right" | "leaf";
}) {
  if (four && activeSlots) {
    return (
      <div className="grid grid-cols-4 gap-1.5 py-1">
        {activeSlots.map((on, i) => (
          <div
            key={i}
            className={cn(
              "flex justify-center font-mono text-sm transition-colors",
              on ? "text-blue" : "text-ink/20",
            )}
          >
            ↓
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 py-1">
      <div
        className={cn(
          "flex justify-center font-mono text-sm transition-colors",
          activeLeft || (fromCurrent && direction === "left")
            ? "text-blue"
            : "text-ink/20",
        )}
      >
        ↓
      </div>
      <div
        className={cn(
          "flex justify-center font-mono text-sm transition-colors",
          activeRight || (fromCurrent && direction === "right")
            ? "text-blue"
            : "text-ink/20",
        )}
      >
        ↓
      </div>
    </div>
  );
}

function TreeRow({
  nodes,
  pathIds,
  currentId,
  target,
  direction,
  showRowBadge,
}: {
  nodes: BtreeNode[];
  pathIds: string[];
  currentId: string | undefined;
  target: number;
  direction?: "left" | "right" | "leaf";
  showRowBadge?: boolean;
}) {
  void direction;
  return (
    <div
      className={cn(
        "grid gap-1.5",
        nodes.length === 1 && "grid-cols-1",
        nodes.length === 2 && "grid-cols-2",
        nodes.length === 4 && "grid-cols-4",
      )}
    >
      {nodes.map((node) => {
        const onPath = pathIds.includes(node.id);
        const isCurrent = node.id === currentId;
        const isLeafHit = showRowBadge && node.level === "leaf" && onPath;
        return (
          <div
            key={node.id}
            className={cn(
              "border-2 border-ink px-1.5 py-1 font-mono text-[10px] transition-colors duration-200",
              isCurrent && "bg-ink text-white",
              onPath && !isCurrent && "bg-blue text-white",
              !onPath && "bg-paper text-ink opacity-40",
            )}
          >
            {node.level === "leaf" ? (
              <div className="flex flex-wrap items-center gap-1">
                {node.keys.map((k) => (
                  <span
                    key={k}
                    className={cn(
                      "px-0.5",
                      k === target && onPath && "bg-white font-bold text-ink",
                    )}
                  >
                    {k}
                  </span>
                ))}
                {isLeafHit ? (
                  <span className="ml-auto border border-white/50 bg-white/20 px-1 uppercase tracking-wide">
                    row
                  </span>
                ) : null}
              </div>
            ) : (
              <span>
                {node.level}: sep {node.separators.join(", ")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
