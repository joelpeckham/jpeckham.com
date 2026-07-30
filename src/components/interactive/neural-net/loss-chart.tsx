import { useEffect, useMemo, useRef, useState } from "react";

const RED = "#e1352a";
const INK = "#141210";
const GRID = "#cfc7b5";

// Fallback size used for the very first (server) render before the container is
// measured on the client.
const DEFAULT_W = 640;
const DEFAULT_H = 240;
const PAD_L = 58;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 34;

function movingAverage(values: number[], window: number): number[] {
  if (values.length < window) return values.slice();
  const out: number[] = [];
  for (let i = 0; i <= values.length - window; i++) {
    let sum = 0;
    for (let j = i; j < i + window; j++) sum += values[j];
    out.push(sum / window);
  }
  return out;
}

// Smooth (moving average) then downsample the loss history to at most `size`
// points so the chart stays cheap to render no matter how long training runs.
function downsample(
  history: number[],
  size = 120,
): { x: number; y: number }[] {
  if (history.length === 0) return [];
  const smoothed = movingAverage(history, Math.min(10, history.length));
  if (smoothed.length <= size) {
    return smoothed.map((y, i) => ({ x: i, y }));
  }
  const step = smoothed.length / size;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < size; i++) {
    const idx = Math.floor(i * step);
    points.push({ x: idx, y: smoothed[idx] });
  }
  points.push({ x: smoothed.length - 1, y: smoothed[smoothed.length - 1] });
  return points;
}

export function LossChart({ history }: { history: number[] }) {
  const points = useMemo(() => downsample(history), [history]);

  // Measure the container so the SVG can fill whatever height the layout gives
  // it (the chart shares a stretched two-column row on wide viewports). Drawing
  // at real pixel coordinates keeps the axis text and line crisp instead of
  // stretching a fixed viewBox.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [{ w, h }, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ w: rect.width, h: rect.height });
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasData = points.length > 0;
  const maxX = hasData ? Math.max(points[points.length - 1].x, 1) : 1;
  const maxY = hasData ? Math.max(...points.map((p) => p.y), 0.001) : 1;
  const minY = 0;

  const plotW = w - PAD_L - PAD_R;
  const plotH = h - PAD_T - PAD_B;

  const sx = (x: number) => PAD_L + (maxX === 0 ? 0 : (x / maxX) * plotW);
  const sy = (y: number) =>
    PAD_T + plotH - (maxY === minY ? 0 : ((y - minY) / (maxY - minY)) * plotH);

  const path = hasData
    ? (points.length === 1
        ? [{ x: 0, y: points[0].y }, points[0]]
        : points
      )
        .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x)} ${sy(p.y)}`)
        .join(" ")
    : "";

  const yTicks = [0, 0.5, 1].map((t) => minY + (maxY - minY) * t);

  return (
    <div ref={wrapRef} className="h-full min-h-[180px] w-full">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="block h-full w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Loss over training iterations"
      >
        {/* axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke={INK} strokeWidth={2} />
        <line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke={INK} strokeWidth={2} />

        {/* y gridlines + labels */}
        {yTicks.map((t, i) => {
          const y = sy(t);
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={PAD_L + plotW} y2={y} stroke={GRID} strokeWidth={1} />
              <text
                x={PAD_L - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={13}
                fontFamily="var(--font-mono)"
                fill={INK}
              >
                {t.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* axis titles */}
        <text
          x={PAD_L + plotW / 2}
          y={h - 6}
          textAnchor="middle"
          fontSize={13}
          fontFamily="var(--font-mono)"
          fill={INK}
        >
          Iteration
        </text>

        {hasData ? (
          <path d={path} fill="none" stroke={RED} strokeWidth={2.5} />
        ) : (
          <text
            x={PAD_L + plotW / 2}
            y={PAD_T + (plotH / 2) - 10}
            textAnchor="middle"
            fontSize={15}
            fontFamily="var(--font-mono)"
            fill={GRID}
          >
            Train to plot the loss
          </text>
        )}
      </svg>
    </div>
  );
}
