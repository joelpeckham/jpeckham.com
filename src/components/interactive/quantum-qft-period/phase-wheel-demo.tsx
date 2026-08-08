"use client";

import { useMemo, useState } from "react";
import {
  AmplitudeBar,
  Chip,
  DemoShell,
  Panel,
  controlSelect,
  type AmplitudeEntry,
} from "@/components/interactive/quantum-shared";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { nearestPeak, qftProbabilities } from "./math";

const PERIODS = [3, 4, 5, 6] as const;

export function PhaseWheelDemo() {
  const [nQbits, setNQbits] = useState<4 | 5>(4);
  const [period, setPeriod] = useState(5);
  const [x0, setX0] = useState(0);
  const [measuredY, setMeasuredY] = useState(13);

  const dim = 2 ** nQbits;

  const probs = useMemo(
    () => qftProbabilities(nQbits, period, x0),
    [nQbits, period, x0],
  );

  const sorted = useMemo(
    () => [...probs].sort((a, b) => b.p - a.p),
    [probs],
  );

  const display = nQbits <= 4 ? probs : sorted.slice(0, 12);
  const ampEntries: AmplitudeEntry[] = display.map(({ y, p }) => ({
    label: String(y),
    re: Math.sqrt(p),
    im: 0,
  }));

  const peak = nearestPeak(measuredY, nQbits, period);
  const onPeak = peak.distance <= 0.5;
  const spacing = dim / period;

  const wheel = useMemo(() => {
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 16;
    const toPoint = (y: number) => {
      const angle = (2 * Math.PI * y) / dim - Math.PI / 2;
      return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    };
    const peakMarks = Array.from({ length: period }, (_, j) => {
      const yVal = (j * spacing) % dim;
      const pt = toPoint(yVal);
      return { j, yVal, x: pt.x, py: pt.y };
    });
    const measured = toPoint(measuredY);
    return { size, cx, cy, radius, peakMarks, measured };
  }, [dim, measuredY, period, spacing]);

  return (
    <DemoShell
      title="QFT peak phase wheel"
      blurb="Plain English: the QFT turns a comb with spacing r into bright spots near multiples of 2ⁿ/r. Drag y — blue means you are within ½ of a peak (Mermin’s “special” values)."
      accent="blue"
    >
      <Panel label="Register">
        <div className="flex flex-wrap gap-3">
          <label className="font-mono text-xs">
            <span className="text-grey">n qubits</span>
            <select
              className={cn(controlSelect, "ml-2")}
              value={nQbits}
              onChange={(e) => {
                const n = Number(e.target.value) as 4 | 5;
                setNQbits(n);
                setMeasuredY((y) => Math.min(y, 2 ** n - 1));
              }}
            >
              <option value={4}>4 (16 states)</option>
              <option value={5}>5 (32 states)</option>
            </select>
          </label>
          <label className="font-mono text-xs">
            <span className="text-grey">period r</span>
            <select
              className={cn(controlSelect, "ml-2")}
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            >
              {PERIODS.map((r) => (
                <option key={r} value={r}>
                  r = {r}
                </option>
              ))}
            </select>
          </label>
          <label className="font-mono text-xs">
            <span className="text-grey">offset x₀</span>
            <select
              className={cn(controlSelect, "ml-2")}
              value={x0}
              onChange={(e) => setX0(Number(e.target.value))}
            >
              {Array.from({ length: Math.min(period, 8) }, (_, i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel label={nQbits <= 4 ? "P(y) all states" : "Top 12 peaks"}>
          <AmplitudeBar entries={ampEntries} highlight={String(measuredY)} />
        </Panel>

        <Panel label="Phase wheel (y mod 2ⁿ)">
          <svg
            viewBox={`0 0 ${wheel.size} ${wheel.size}`}
            className="mx-auto h-48 w-full max-w-[14rem] border-2 border-ink bg-paper"
            role="img"
            aria-label={`Measured y=${measuredY} on period-${period} wheel`}
          >
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.radius}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.2}
            />
            {wheel.peakMarks.map(({ j, yVal, x, py }) => (
              <g key={j}>
                <line
                  x1={wheel.cx}
                  y1={wheel.cy}
                  x2={x}
                  y2={py}
                  stroke="var(--blue)"
                  strokeOpacity={0.25}
                  strokeDasharray="3 3"
                />
                <circle cx={x} cy={py} r={4} fill="var(--blue)" stroke="var(--ink)" strokeWidth={1.5} />
                <title>{`j=${j}, y≈${yVal.toFixed(1)}`}</title>
              </g>
            ))}
            <circle
              cx={wheel.measured.x}
              cy={wheel.measured.y}
              r={7}
              fill={onPeak ? "var(--blue)" : "var(--red)"}
              stroke="var(--ink)"
              strokeWidth={2}
            />
          </svg>
          <p className="mt-2 text-center font-mono text-[11px] tabular-nums text-grey">
            target j·2ⁿ/r ≈ {peak.target.toFixed(2)} · Δ={peak.distance.toFixed(2)}
          </p>
        </Panel>
      </div>

      <Panel label="Measured y">
        <label className="block space-y-2">
          <span className="font-mono text-xs text-grey">y = {measuredY}</span>
          <Slider
            min={0}
            max={dim - 1}
            step={1}
            value={measuredY}
            onValueChange={setMeasuredY}
            accent={onPeak ? "blue" : "red"}
            aria-label="Measured QFT output y"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone={onPeak ? "ok" : "bad"}>
            {onPeak ? "On peak (Δ ≤ 0.5)" : "Off peak"}
          </Chip>
          <Chip tone="ink">spacing 2ⁿ/r = {spacing.toFixed(2)}</Chip>
        </div>
      </Panel>
    </DemoShell>
  );
}
