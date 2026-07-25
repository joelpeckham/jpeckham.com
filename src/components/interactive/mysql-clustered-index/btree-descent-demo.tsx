"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  btreeDescentPath,
  TOY_BTREE_PICK_KEYS,
  toyBtree,
  type BtreeNode,
} from "./model";
import { DemoShell, OutcomeBanner } from "./shared";

export function BtreeDescentDemo() {
  const tree = useMemo(() => toyBtree(), []);
  const [target, setTarget] = useState<(typeof TOY_BTREE_PICK_KEYS)[number]>(8);
  const path = useMemo(
    () => btreeDescentPath(tree, target),
    [tree, target],
  );
  const leafId = path[path.length - 1];

  return (
    <DemoShell
      title="B-tree descent"
      blurb="Pick a key. The path lights up: root → branch → leaf. Interior pages only steer."
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

      <OutcomeBanner
        tone="ok"
        title={`Found ${target} in the leaf`}
        detail="In a clustered index that leaf holds the whole row, not a pointer. Next section is that punchline."
      />

      <div className="space-y-2 border-2 border-ink bg-white p-3">
        <TreeRow
          nodes={[tree.root]}
          path={path}
          target={target}
          leafId={leafId}
        />
        <TreeRow
          nodes={[tree["b-left"], tree["b-right"]]}
          path={path}
          target={target}
          leafId={leafId}
        />
        <TreeRow
          nodes={[
            tree["leaf-a"],
            tree["leaf-b"],
            tree["leaf-c"],
            tree["leaf-d"],
          ]}
          path={path}
          target={target}
          leafId={leafId}
        />
      </div>
    </DemoShell>
  );
}

function TreeRow({
  nodes,
  path,
  target,
  leafId,
}: {
  nodes: BtreeNode[];
  path: string[];
  target: number;
  leafId: string | undefined;
}) {
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
        const onPath = path.includes(node.id);
        const isLeafHit = node.id === leafId;
        return (
          <div
            key={node.id}
            className={cn(
              "border-2 border-ink px-1.5 py-1 font-mono text-[10px] transition-colors",
              onPath ? "bg-blue text-white" : "bg-paper text-ink opacity-45",
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
