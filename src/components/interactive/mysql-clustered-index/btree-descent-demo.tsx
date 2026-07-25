"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SvgBtree,
  toSvgBtreeNodes,
} from "@/components/interactive/mysql-shared";
import {
  btreeDescentPath,
  toyBtree,
  toyClusteredRow,
} from "./model";
import { DemoShell } from "./shared";

const ALL_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Click any leaf key — a dot descends the SVG B-tree to the clustered row.
 */
export function BtreeDescentDemo() {
  const tree = useMemo(() => toyBtree(), []);
  const svgNodes = useMemo(() => toSvgBtreeNodes(tree), [tree]);
  const [target, setTarget] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);

  const pathIds = useMemo(
    () => (target === null ? [] : btreeDescentPath(tree, target)),
    [tree, target],
  );

  const runDescent = useCallback((key: number) => {
    cancelAnimationFrame(rafRef.current);
    setTarget(key);
    setProgress(0);
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-in-out
      const eased =
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setProgress(eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // One idle demo descent on mount.
  const autoPlayed = useRef(false);
  useEffect(() => {
    if (autoPlayed.current) return;
    autoPlayed.current = true;
    const id = window.setTimeout(() => runDescent(8), 600);
    return () => window.clearTimeout(id);
  }, [runDescent]);

  const leafDone = progress >= 0.98 && target !== null;
  const row = leafDone && target !== null ? toyClusteredRow(target) : null;

  return (
    <DemoShell
      title="B-tree descent"
      blurb="Click a leaf key. Interior pages only steer — the leaf is the row."
      accent="ink"
    >
      <div className="border-2 border-ink bg-white p-2">
        <SvgBtree
          nodes={svgNodes}
          rootId="root"
          pathIds={pathIds}
          progress={progress}
          highlightKey={leafDone ? target : null}
          onKeyClick={runDescent}
          accent="blue"
          width={440}
          height={230}
        />
      </div>

      {row ? (
        <div className="border-2 border-ink bg-blue px-3 py-2 font-mono text-xs text-white">
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/70">
            Clustered leaf
          </span>
          <p className="mt-0.5">
            id={row.id} · {row.email} · {row.status}
          </p>
        </div>
      ) : (
        <p className="font-mono text-[11px] text-grey">
          Keys {ALL_KEYS[0]}–{ALL_KEYS[ALL_KEYS.length - 1]} · click any leaf
        </p>
      )}
    </DemoShell>
  );
}
