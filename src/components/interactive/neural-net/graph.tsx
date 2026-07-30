import { useMemo } from "react";
import type { Matrix } from "./network";
import { GRID_SIZE } from "./training-data";
import {
  activationFill,
  edgeStyle,
  GREY_LINE,
  INK,
  RED,
} from "./colors";

const VB_W = 700;
const VB_H = 480;

const CELL = 22;
const GAP = 6;
const GRID_TOTAL = GRID_SIZE * CELL + (GRID_SIZE - 1) * GAP;
const GRID_X = 24;
const GRID_Y = (VB_H - GRID_TOTAL) / 2;

const HIDDEN_X = 330;
const OUTPUT_X = 560;
const NODE_R_DEFAULT = 16;
const NODE_R_MIN = 5;

const SPREAD_TOP = 56;
const SPREAD_BOTTOM = VB_H - 56;
const SPREAD_SPAN = SPREAD_BOTTOM - SPREAD_TOP;

function nodeRadius(count: number): number {
  if (count <= 1) return NODE_R_DEFAULT;
  const maxForCount = SPREAD_SPAN / (2 * (count - 1));
  return Math.max(NODE_R_MIN, Math.min(NODE_R_DEFAULT, maxForCount));
}

function spread(i: number, count: number): number {
  if (count <= 1) return (SPREAD_TOP + SPREAD_BOTTOM) / 2;
  return SPREAD_TOP + (SPREAD_SPAN * i) / (count - 1);
}

// Invisible wider stroke so weight lines stay tappable on touch screens.
const EDGE_HIT_WIDTH = 14;

function maxAbs(m: Matrix): number {
  let max = 0;
  for (const row of m) {
    for (const v of row) {
      const a = Math.abs(v);
      if (a > max) max = a;
    }
  }
  return max;
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const dx = (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
}

type Point = { x: number; y: number };

export type NetworkGraphProps = {
  wih: Matrix;
  who: Matrix;
  input: number[];
  hidden: number[];
  output: number[];
  predicted: number;
  showTip: (text: string) => void;
  hideTip: () => void;
  /**
   * Touch/click handler. Positions and shows the tip at the pointer, so the
   * graph is inspectable on phones where there is no hover. Passed the label
   * text plus the originating pointer event.
   */
  showTipAt: (text: string, e: React.PointerEvent) => void;
};

export function NetworkGraph({
  wih,
  who,
  input,
  hidden,
  output,
  predicted,
  showTip,
  hideTip,
  showTipAt,
}: NetworkGraphProps) {
  const hiddenCount = hidden.length;

  const positions = useMemo(() => {
    const inputPos: Point[] = input.map((_, i) => {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      return {
        x: GRID_X + col * (CELL + GAP) + CELL / 2,
        y: GRID_Y + row * (CELL + GAP) + CELL / 2,
      };
    });
    const hiddenPos: Point[] = hidden.map((_, j) => ({
      x: HIDDEN_X,
      y: spread(j, hiddenCount),
    }));
    const outputPos: Point[] = output.map((_, k) => ({
      x: OUTPUT_X,
      y: spread(k, output.length),
    }));
    return { inputPos, hiddenPos, outputPos };
    // Positions only depend on the layer sizes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.length, hiddenCount, output.length]);

  const { inputPos, hiddenPos, outputPos } = positions;

  const maxAbsIH = maxAbs(wih);
  const maxAbsHO = maxAbs(who);
  const hiddenR = nodeRadius(hiddenCount);
  const outputR = nodeRadius(output.length);

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="h-auto w-full select-none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Neural network graph. Left: 25 input pixels. Middle: hidden neurons. Right: 10 output digits."
    >
      {/* input -> hidden edges */}
      <g fill="none">
        {hiddenPos.map((h, j) =>
          inputPos.map((p, i) => {
            const w = wih[j][i];
            const s = edgeStyle(w, maxAbsIH);
            const text = `input ${i} \u2192 hidden ${j}: ${w.toFixed(4)}`;
            const d = curve(p.x, p.y, h.x, h.y);
            return (
              <g key={`ih-${j}-${i}`}>
                <path
                  d={d}
                  stroke="transparent"
                  strokeWidth={EDGE_HIT_WIDTH}
                  style={{ pointerEvents: "stroke" }}
                  onMouseEnter={() => showTip(text)}
                  onMouseLeave={hideTip}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    showTipAt(text, e);
                  }}
                />
                <path
                  d={d}
                  stroke={s.stroke}
                  strokeWidth={s.width}
                  strokeOpacity={s.opacity}
                  style={{ pointerEvents: "none" }}
                />
              </g>
            );
          }),
        )}
      </g>

      {/* hidden -> output edges */}
      <g fill="none">
        {outputPos.map((o, k) =>
          hiddenPos.map((h, j) => {
            const w = who[k][j];
            const s = edgeStyle(w, maxAbsHO);
            const text = `hidden ${j} \u2192 output ${k}: ${w.toFixed(4)}`;
            const d = curve(h.x, h.y, o.x, o.y);
            return (
              <g key={`ho-${k}-${j}`}>
                <path
                  d={d}
                  stroke="transparent"
                  strokeWidth={EDGE_HIT_WIDTH}
                  style={{ pointerEvents: "stroke" }}
                  onMouseEnter={() => showTip(text)}
                  onMouseLeave={hideTip}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    showTipAt(text, e);
                  }}
                />
                <path
                  d={d}
                  stroke={s.stroke}
                  strokeWidth={s.width}
                  strokeOpacity={s.opacity}
                  style={{ pointerEvents: "none" }}
                />
              </g>
            );
          }),
        )}
      </g>

      {/* input nodes (pixels) */}
      <g>
        {inputPos.map((p, i) => (
          <rect
            key={`in-${i}`}
            x={p.x - CELL / 2}
            y={p.y - CELL / 2}
            width={CELL}
            height={CELL}
            fill={activationFill(input[i])}
            stroke={INK}
            strokeWidth={1.5}
            shapeRendering="crispEdges"
            style={{ pointerEvents: "all" }}
            onMouseEnter={() =>
              showTip(`pixel ${i}: ${input[i] ? "on (1)" : "off (0)"}`)
            }
            onMouseLeave={hideTip}
            onPointerDown={(e) => {
              e.stopPropagation();
              showTipAt(`pixel ${i}: ${input[i] ? "on (1)" : "off (0)"}`, e);
            }}
          />
        ))}
      </g>

      {/* hidden nodes */}
      <g>
        {hiddenPos.map((h, j) => (
          <circle
            key={`hn-${j}`}
            cx={h.x}
            cy={h.y}
            r={hiddenR}
            fill={activationFill(hidden[j])}
            stroke={INK}
            strokeWidth={2}
            style={{ pointerEvents: "all" }}
            onMouseEnter={() =>
              showTip(`hidden ${j} activation: ${hidden[j].toFixed(3)}`)
            }
            onMouseLeave={hideTip}
            onPointerDown={(e) => {
              e.stopPropagation();
              showTipAt(`hidden ${j} activation: ${hidden[j].toFixed(3)}`, e);
            }}
          />
        ))}
      </g>

      {/* output nodes + digit labels */}
      <g>
        {outputPos.map((o, k) => (
          <g key={`on-${k}`}>
            {k === predicted ? (
              <circle
                cx={o.x}
                cy={o.y}
                r={outputR + 5}
                fill="none"
                stroke={RED}
                strokeWidth={3}
              />
            ) : null}
            <circle
              cx={o.x}
              cy={o.y}
              r={outputR}
              fill={activationFill(output[k])}
              stroke={INK}
              strokeWidth={2}
              style={{ pointerEvents: "all" }}
              onMouseEnter={() =>
                showTip(`output ${k} activation: ${output[k].toFixed(3)}`)
              }
              onMouseLeave={hideTip}
              onPointerDown={(e) => {
                e.stopPropagation();
                showTipAt(`output ${k} activation: ${output[k].toFixed(3)}`, e);
              }}
            />
            <text
              x={o.x + outputR + 12}
              y={o.y + 5}
              fontSize={Math.max(14, outputR + 2)}
              fontFamily="var(--font-mono)"
              fontWeight={700}
              fill={k === predicted ? RED : INK}
            >
              {k}
            </text>
          </g>
        ))}
      </g>

      {/* column labels */}
      <g fontFamily="var(--font-mono)" fontSize={13} fill={GREY_LINE}>
        <text x={GRID_X + GRID_TOTAL / 2} y={GRID_Y - 14} textAnchor="middle">
          INPUT
        </text>
        <text x={HIDDEN_X} y={SPREAD_TOP - 24} textAnchor="middle">
          HIDDEN
        </text>
        <text x={OUTPUT_X} y={SPREAD_TOP - 24} textAnchor="middle">
          OUTPUT
        </text>
      </g>
    </svg>
  );
}
