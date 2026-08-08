"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Chip,
  DemoShell,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import {
  GROVER_DEMO_SIZES,
  groverAngle,
  optimalIterations,
  qubitCount,
  rotationComponents,
  type GroverDemoSize,
} from "./model";

const SVG = 280;
const PAD = 36;
const R = SVG - PAD * 2;

function toSvg(x: number, y: number): { sx: number; sy: number } {
  const cx = SVG / 2;
  const cy = SVG / 2;
  return {
    sx: cx + x * R,
    sy: cy - y * R,
  };
}

export function GeometricRotationDemo() {
  const [N, setN] = useState<GroverDemoSize>(8);
  const [iterations, setIterations] = useState(0);

  const theta = groverAngle(N, 1);
  const optimal = optimalIterations(N, 1);
  const initial = rotationComponents(0, N, 1);
  const current = rotationComponents(iterations, N, 1);

  const s0 = toSvg(initial.aPerp, initial.aParallel);
  const sk = toSvg(current.aPerp, current.aParallel);
  const markedProb = current.aParallel * current.aParallel;

  function reset() {
    setIterations(0);
  }

  function step() {
    setIterations((k) => Math.min(k + 1, optimal + 1));
  }

  return (
    <DemoShell
      title="Grover as a rotation"
      blurb="V reflects about |a⊥⟩, W reflects about |s⟩. Two reflections = one rotation by 2θ toward |a⟩."
      accent="yellow"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          N
          <select
            className={`${controlSelect} mt-1 block`}
            value={N}
            onChange={(e) => {
              setN(Number(e.target.value) as GroverDemoSize);
              reset();
            }}
          >
            {GROVER_DEMO_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} states · {qubitCount(size)} qubits
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="ink"
            onClick={step}
            disabled={iterations > optimal}
          >
            Step
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
        <div className="ml-auto flex flex-wrap gap-2 font-mono text-xs">
          <Chip tone="ink">sin θ = 1/√N = {(1 / Math.sqrt(N)).toFixed(3)}</Chip>
          <Chip tone={iterations === optimal ? "ok" : "warn"}>
            k = {iterations} · P(|a⟩) = {(markedProb * 100).toFixed(1)}%
          </Chip>
        </div>
      </div>

      <Panel label="|a⊥⟩ horizontal · |a⟩ vertical">
        <svg
          viewBox={`0 0 ${SVG} ${SVG}`}
          className="mx-auto block w-full max-w-sm"
          role="img"
          aria-label={`Grover rotation after ${iterations} iterations`}
        >
          {/* axes */}
          <line
            x1={PAD}
            y1={SVG / 2}
            x2={SVG - PAD}
            y2={SVG / 2}
            className="stroke-ink/25"
            strokeWidth={2}
          />
          <line
            x1={SVG / 2}
            y1={PAD}
            x2={SVG / 2}
            y2={SVG - PAD}
            className="stroke-ink/25"
            strokeWidth={2}
          />

          {/* axis labels */}
          <text
            x={SVG - PAD + 4}
            y={SVG / 2 + 4}
            className="fill-grey font-mono text-[10px]"
          >
            |a⊥⟩
          </text>
          <text
            x={SVG / 2 + 6}
            y={PAD - 8}
            className="fill-grey font-mono text-[10px]"
          >
            |a⟩
          </text>

          {/* initial |s⟩ ghost */}
          <line
            x1={SVG / 2}
            y1={SVG / 2}
            x2={s0.sx}
            y2={s0.sy}
            className="stroke-blue/35"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
          <circle cx={s0.sx} cy={s0.sy} r={4} className="fill-blue/40" />

          {/* current state */}
          <line
            x1={SVG / 2}
            y1={SVG / 2}
            x2={sk.sx}
            y2={sk.sy}
            className="stroke-red"
            strokeWidth={3}
          />
          <circle cx={sk.sx} cy={sk.sy} r={5} className="fill-red" />

          {/* arc hint */}
          <path
            d={describeArc(SVG / 2, SVG / 2, R * 0.35, initial.angleRad, current.angleRad)}
            fill="none"
            className="stroke-yellow"
            strokeWidth={2}
            strokeDasharray="3 2"
          />
        </svg>
      </Panel>

      <p className="text-sm text-grey">
        Start at |s⟩ (dashed blue), already θ above |a⊥⟩. After k steps the
        state sits at (2k+1)θ. Near k ≈ ⌊π/(4θ)⌋ the red vector is almost
        vertical — measuring returns |a⟩ with high probability. One more step
        overshoots.
      </p>

      <div className="flex flex-wrap gap-2">
        <Chip tone="ink">θ = {(theta * (180 / Math.PI)).toFixed(1)}°</Chip>
        <Chip tone="warn">each step +2θ</Chip>
        <Chip tone="ok">
          target k = {optimal} · angle {(current.angleRad * (180 / Math.PI)).toFixed(1)}°
        </Chip>
      </div>
    </DemoShell>
  );
}

/** SVG arc from angle a to b (math coords: CCW from +x). */
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  a: number,
  b: number,
): string {
  const x1 = cx + radius * Math.cos(a);
  const y1 = cy - radius * Math.sin(a);
  const x2 = cx + radius * Math.cos(b);
  const y2 = cy - radius * Math.sin(b);
  const large = Math.abs(b - a) > Math.PI ? 1 : 0;
  const sweep = b >= a ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} ${sweep} ${x2} ${y2}`;
}
