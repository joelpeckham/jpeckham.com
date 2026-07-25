"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export type SvgBtreeNode = {
  id: string;
  /** Display label for interior nodes (e.g. "≤ 6"). */
  label: string;
  /** Leaf keys shown as clickable chips. */
  keys?: number[];
  children?: string[];
  level: "root" | "branch" | "leaf";
};

export type SvgBtreeLayoutNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: SvgBtreeNode;
};

export type SvgBtreeEdge = {
  fromId: string;
  toId: string;
  /** Cubic bezier path `d` attribute. */
  d: string;
  /** Flattened polyline points for path-length animation [x,y][]. */
  points: { x: number; y: number }[];
};

type SvgBtreeProps = {
  nodes: Record<string, SvgBtreeNode>;
  rootId: string;
  /** Node ids on the active descent path (root → leaf). */
  pathIds?: string[];
  /** Progress of the traveling dot along the full path, 0–1. */
  progress?: number;
  /** Highlighted leaf key (found target). */
  highlightKey?: number | null;
  /** Click a leaf key to seek. */
  onKeyClick?: (key: number) => void;
  /** Optional secondary accent for "hop 2" trees. */
  accent?: "blue" | "yellow" | "ink";
  className?: string;
  width?: number;
  height?: number;
};

const NODE_H = 28;
const LEAF_H = 32;
const LEVEL_GAP = 72;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Layout a 3-level toy tree into SVG coordinates. */
export function layoutSvgBtree(
  nodes: Record<string, SvgBtreeNode>,
  rootId: string,
  width: number,
): { laid: SvgBtreeLayoutNode[]; edges: SvgBtreeEdge[] } {
  const root = nodes[rootId];
  if (!root) return { laid: [], edges: [] };

  const branches = (root.children ?? []).map((id) => nodes[id]).filter(Boolean);
  const leaves: SvgBtreeNode[] = [];
  for (const b of branches) {
    for (const cid of b.children ?? []) {
      if (nodes[cid]) leaves.push(nodes[cid]);
    }
  }

  const padX = 16;
  const usable = width - padX * 2;
  const laid: SvgBtreeLayoutNode[] = [];

  const rootW = 88;
  laid.push({
    id: root.id,
    x: width / 2 - rootW / 2,
    y: 12,
    width: rootW,
    height: NODE_H,
    node: root,
  });

  const branchW = 80;
  const branchCount = Math.max(1, branches.length);
  branches.forEach((b, i) => {
    const slot = usable / branchCount;
    const cx = padX + slot * i + slot / 2;
    laid.push({
      id: b.id,
      x: cx - branchW / 2,
      y: 12 + LEVEL_GAP,
      width: branchW,
      height: NODE_H,
      node: b,
    });
  });

  const leafCount = Math.max(1, leaves.length);
  const leafW = Math.min(96, usable / leafCount - 8);
  leaves.forEach((leaf, i) => {
    const slot = usable / leafCount;
    const cx = padX + slot * i + slot / 2;
    laid.push({
      id: leaf.id,
      x: cx - leafW / 2,
      y: 12 + LEVEL_GAP * 2,
      width: leafW,
      height: LEAF_H,
      node: leaf,
    });
  });

  const byId = new Map(laid.map((n) => [n.id, n]));
  const edges: SvgBtreeEdge[] = [];

  function edgeBetween(fromId: string, toId: string) {
    const a = byId.get(fromId);
    const b = byId.get(toId);
    if (!a || !b) return;
    const x1 = a.x + a.width / 2;
    const y1 = a.y + a.height;
    const x2 = b.x + b.width / 2;
    const y2 = b.y;
    const midY = (y1 + y2) / 2;
    const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
    const points = sampleCubic(x1, y1, x1, midY, x2, midY, x2, y2, 12);
    edges.push({ fromId, toId, d, points });
  }

  for (const cid of root.children ?? []) edgeBetween(root.id, cid);
  for (const b of branches) {
    for (const cid of b.children ?? []) edgeBetween(b.id, cid);
  }

  return { laid, edges };
}

function sampleCubic(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  n: number,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push({
      x:
        u * u * u * x0 +
        3 * u * u * t * x1 +
        3 * u * t * t * x2 +
        t * t * t * x3,
      y:
        u * u * u * y0 +
        3 * u * u * t * y1 +
        3 * u * t * t * y2 +
        t * t * t * y3,
    });
  }
  return pts;
}

function pointAlong(
  points: { x: number; y: number }[],
  t: number,
): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  if (t <= 0) return points[0];
  if (t >= 1) return points[points.length - 1];
  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.hypot(dx, dy);
    lengths.push(total);
  }
  if (total === 0) return points[0];
  const target = t * total;
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i] >= target) {
      const seg = lengths[i] - lengths[i - 1];
      const local = seg === 0 ? 0 : (target - lengths[i - 1]) / seg;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * local,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * local,
      };
    }
  }
  return points[points.length - 1];
}

/**
 * Geometric SVG B-tree with optional path highlight and traveling dot.
 */
export function SvgBtree({
  nodes,
  rootId,
  pathIds = [],
  progress = 0,
  highlightKey = null,
  onKeyClick,
  accent = "blue",
  className,
  width = 420,
  height = 220,
}: SvgBtreeProps) {
  const { laid, edges } = useMemo(
    () => layoutSvgBtree(nodes, rootId, width),
    [nodes, rootId, width],
  );

  const pathSet = useMemo(() => new Set(pathIds), [pathIds]);

  const pathEdges = useMemo(() => {
    const result: SvgBtreeEdge[] = [];
    for (let i = 0; i < pathIds.length - 1; i++) {
      const edge = edges.find(
        (e) => e.fromId === pathIds[i] && e.toId === pathIds[i + 1],
      );
      if (edge) result.push(edge);
    }
    return result;
  }, [edges, pathIds]);

  const allPathPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    for (const e of pathEdges) {
      // Avoid duplicating junction points.
      if (pts.length === 0) pts.push(...e.points);
      else pts.push(...e.points.slice(1));
    }
    return pts;
  }, [pathEdges]);

  const eased = easeInOut(Math.min(1, Math.max(0, progress)));
  const dot =
    allPathPoints.length > 0 ? pointAlong(allPathPoints, eased) : null;
  const showDot = progress > 0 && progress < 1.001 && pathIds.length > 1;

  const accentFill =
    accent === "yellow" ? "var(--yellow, #f5d76e)" : accent === "ink" ? "var(--ink, #1a1a1a)" : "var(--blue, #3b6cff)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-auto w-full select-none", className)}
      role="img"
      aria-label="B-tree diagram"
    >
      {edges.map((e) => {
        const onPath =
          pathSet.has(e.fromId) &&
          pathSet.has(e.toId) &&
          pathIds.indexOf(e.toId) === pathIds.indexOf(e.fromId) + 1;
        return (
          <path
            key={`${e.fromId}-${e.toId}`}
            d={e.d}
            fill="none"
            stroke={onPath ? accentFill : "currentColor"}
            strokeWidth={onPath ? 2.5 : 1.25}
            className={onPath ? "opacity-100" : "opacity-25"}
            strokeLinecap="round"
          />
        );
      })}

      {laid.map((n) => {
        const onPath = pathSet.has(n.id);
        const isLeaf = n.node.level === "leaf";
        const reached =
          onPath &&
          (progress >= 1 ||
            pathIds.indexOf(n.id) <
              Math.floor(eased * Math.max(1, pathIds.length - 1)) + 1);
        return (
          <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
            <rect
              width={n.width}
              height={n.height}
              rx={2}
              fill={
                reached && onPath
                  ? accent === "yellow"
                    ? "var(--yellow, #f5d76e)"
                    : accent === "ink"
                      ? "var(--ink, #1a1a1a)"
                      : "var(--blue, #3b6cff)"
                  : "var(--paper, #f7f4ef)"
              }
              stroke="var(--ink, #1a1a1a)"
              strokeWidth={2}
              opacity={onPath || pathIds.length === 0 ? 1 : 0.35}
            />
            {isLeaf && n.node.keys ? (
              <foreignObject width={n.width} height={n.height}>
                <div className="flex h-full items-center justify-center gap-0.5 px-0.5">
                  {n.node.keys.map((k) => {
                    const hit = highlightKey === k && onPath && progress >= 0.95;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => onKeyClick?.(k)}
                        className={cn(
                          "min-w-[1.1rem] border border-ink/40 px-0.5 font-mono text-[10px] leading-tight",
                          hit && "bg-white font-bold text-ink",
                          !hit &&
                            (reached && onPath
                              ? accent === "ink"
                                ? "text-white"
                                : "text-ink"
                              : "text-ink"),
                          onKeyClick && "cursor-pointer hover:bg-white/80",
                        )}
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
              </foreignObject>
            ) : (
              <text
                x={n.width / 2}
                y={n.height / 2 + 4}
                textAnchor="middle"
                fill={
                  reached && onPath && accent === "ink"
                    ? "#fff"
                    : "var(--ink, #1a1a1a)"
                }
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {n.node.label}
              </text>
            )}
          </g>
        );
      })}

      {showDot && dot ? (
        <circle
          cx={dot.x}
          cy={dot.y}
          r={6}
          fill="var(--red, #dc2626)"
          stroke="var(--ink, #1a1a1a)"
          strokeWidth={2}
        />
      ) : null}
    </svg>
  );
}

/** Convert clustered-index toy tree into SvgBtreeNode map. */
export function toSvgBtreeNodes(
  tree: Record<
    string,
    {
      id: string;
      level: "root" | "branch" | "leaf";
      separators: number[];
      keys: number[];
      children: string[];
    }
  >,
): Record<string, SvgBtreeNode> {
  const out: Record<string, SvgBtreeNode> = {};
  for (const [id, n] of Object.entries(tree)) {
    out[id] = {
      id,
      level: n.level,
      keys: n.level === "leaf" ? n.keys : undefined,
      children: n.children,
      label:
        n.level === "leaf"
          ? n.keys.join(" ")
          : n.separators.length
            ? `≤ ${n.separators[0]}`
            : n.level,
    };
  }
  return out;
}
