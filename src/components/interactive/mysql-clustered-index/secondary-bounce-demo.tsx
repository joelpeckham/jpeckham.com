"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  SvgBtree,
  type SvgBtreeNode,
} from "@/components/interactive/mysql-shared";
import { makeToyRows } from "./model";
import { DemoShell } from "./shared";

function secondaryTree(
  rows: { id: number; email: string }[],
): Record<string, SvgBtreeNode> {
  const sorted = [...rows].sort((a, b) => a.email.localeCompare(b.email));
  const mid = Math.ceil(sorted.length / 2);
  const left = sorted.slice(0, mid);
  const right = sorted.slice(mid);
  return {
    "s-root": {
      id: "s-root",
      level: "root",
      label: "email",
      children: ["s-leaf-l", "s-leaf-r"],
    },
    "s-leaf-l": {
      id: "s-leaf-l",
      level: "leaf",
      label: "",
      keys: left.map((r) => r.id),
      children: [],
    },
    "s-leaf-r": {
      id: "s-leaf-r",
      level: "leaf",
      label: "",
      keys: right.map((r) => r.id),
      children: [],
    },
  };
}

function clusteredTree(
  rows: { id: number }[],
): Record<string, SvgBtreeNode> {
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  const mid = Math.ceil(sorted.length / 2);
  return {
    "c-root": {
      id: "c-root",
      level: "root",
      label: `≤ ${sorted[mid - 1]?.id ?? 0}`,
      children: ["c-leaf-l", "c-leaf-r"],
    },
    "c-leaf-l": {
      id: "c-leaf-l",
      level: "leaf",
      label: "",
      keys: sorted.slice(0, mid).map((r) => r.id),
      children: [],
    },
    "c-leaf-r": {
      id: "c-leaf-r",
      level: "leaf",
      label: "",
      keys: sorted.slice(mid).map((r) => r.id),
      children: [],
    },
  };
}

function pathForPk(
  tree: Record<string, SvgBtreeNode>,
  rootId: string,
  pk: number,
): string[] {
  const root = tree[rootId];
  if (!root) return [];
  for (const cid of root.children ?? []) {
    if (tree[cid]?.keys?.includes(pk)) return [rootId, cid];
  }
  return [rootId];
}

/**
 * Two trees: descend secondary (email→PK), leap, descend clustered (PK→row).
 */
export function SecondaryBounceDemo() {
  const rows = useMemo(() => makeToyRows(4, 9), []);
  const sec = useMemo(() => secondaryTree(rows), [rows]);
  const clus = useMemo(() => clusteredTree(rows), [rows]);
  const [targetId, setTargetId] = useState(2);
  const [manual, setManual] = useState(false);
  const [phase, setPhase] = useState<"sec" | "leap" | "clus" | "done">("sec");
  const [secProgress, setSecProgress] = useState(0);
  const [clusProgress, setClusProgress] = useState(0);
  const [leapT, setLeapT] = useState(0);
  const rafRef = useRef(0);
  const cycleIdx = useRef(0);

  const target = rows.find((r) => r.id === targetId) ?? rows[0];
  const secPath = pathForPk(sec, "s-root", target.id);
  const clusPath = pathForPk(clus, "c-root", target.id);

  const runBounce = useCallback((id: number) => {
    cancelAnimationFrame(rafRef.current);
    setTargetId(id);
    setPhase("sec");
    setSecProgress(0);
    setClusProgress(0);
    setLeapT(0);

    const t0 = performance.now();
    const secDur = 700;
    const leapDur = 400;
    const clusDur = 700;

    const tick = (now: number) => {
      const elapsed = now - t0;
      if (elapsed < secDur) {
        setPhase("sec");
        setSecProgress(elapsed / secDur);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (elapsed < secDur + leapDur) {
        setPhase("leap");
        setSecProgress(1);
        setLeapT((elapsed - secDur) / leapDur);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (elapsed < secDur + leapDur + clusDur) {
        setPhase("clus");
        setLeapT(1);
        setClusProgress((elapsed - secDur - leapDur) / clusDur);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      setPhase("done");
      setClusProgress(1);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Idle auto-cycle until the user clicks.
  useEffect(() => {
    if (manual) return;
    runBounce(rows[0].id);
    const id = window.setInterval(() => {
      cycleIdx.current = (cycleIdx.current + 1) % rows.length;
      runBounce(rows[cycleIdx.current].id);
    }, 3400);
    return () => window.clearInterval(id);
  }, [manual, rows, runBounce]);

  const done = phase === "done";

  return (
    <DemoShell
      title="Secondary bounce"
      blurb="Click an email. Hop 1 finds the primary key. Hop 2 loads the clustered row."
      accent="yellow"
    >
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <Button
            key={row.id}
            type="button"
            size="sm"
            variant={targetId === row.id ? "ink" : "outline"}
            onClick={() => {
              setManual(true);
              runBounce(row.id);
            }}
          >
            {row.email.split("@")[0]}
          </Button>
        ))}
      </div>

      <div className="relative grid gap-2 sm:grid-cols-2">
        <div className="border-2 border-ink bg-white p-2">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            1 · secondary
          </p>
          <SvgBtree
            nodes={sec}
            rootId="s-root"
            pathIds={secPath}
            progress={
              phase === "sec"
                ? secProgress
                : phase === "leap" || phase === "clus" || done
                  ? 1
                  : 0
            }
            highlightKey={
              phase === "leap" || phase === "clus" || done ? target.id : null
            }
            accent="yellow"
            width={220}
            height={140}
          />
          <p className="mt-1 truncate font-mono text-[10px] text-grey">
            {target.email.split("@")[0]} → pk {target.id}
          </p>
        </div>

        <div className="border-2 border-ink bg-white p-2">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
            2 · clustered
          </p>
          <SvgBtree
            nodes={clus}
            rootId="c-root"
            pathIds={phase === "clus" || done ? clusPath : []}
            progress={phase === "clus" || done ? clusProgress : 0}
            highlightKey={done ? target.id : null}
            accent="blue"
            width={220}
            height={140}
          />
          <p className="mt-1 font-mono text-[10px] text-grey">
            {done ? `row · ${target.status}` : "primary key → row"}
          </p>
        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-[42%] hidden -translate-x-1/2 sm:block"
          aria-hidden
        >
          <div
            className="font-display text-3xl leading-none text-red"
            style={{
              opacity:
                phase === "leap"
                  ? 0.5 + leapT * 0.5
                  : phase === "clus" || done
                    ? 1
                    : 0.2,
              transform: `translateX(${phase === "leap" ? (leapT - 0.5) * 28 : 0}px)`,
            }}
          >
            →
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
