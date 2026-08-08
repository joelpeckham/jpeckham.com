"use client";

import { useState } from "react";
import {
  AmplitudeBar,
  Chip,
  DemoShell,
  Panel,
} from "@/components/interactive/quantum-shared";
import { Slider } from "@/components/ui/slider";

function fmtSigned(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(n).toFixed(2)}`;
}

/** One complex amplitude α = u + iv on the Argand plane. */
export function ComplexPlaneDemo() {
  const [u, setU] = useState(0.6);
  const [v, setV] = useState(0.4);

  const prob = u * u + v * v;
  const tooBig = prob > 1 + 1e-9;

  const size = 200;
  const pad = 24;
  const span = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const scale = span / 2;
  const px = cx + u * scale;
  const py = cy - v * scale;

  return (
    <DemoShell
      title="Amplitude on the plane"
      blurb="A single complex amplitude α = u + iv lives on the plane. Real part u runs horizontal, imaginary v runs vertical. |α|² is the probability weight."
      accent="blue"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_minmax(12rem,14rem)]">
        <Panel label="Controls">
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="font-mono text-xs text-grey">real u</span>
              <Slider
                min={-1}
                max={1}
                step={0.01}
                value={u}
                onValueChange={setU}
                accent="blue"
                aria-label="Real part u"
              />
              <span className="font-mono text-sm tabular-nums">{u.toFixed(2)}</span>
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-xs text-grey">imag v</span>
              <Slider
                min={-1}
                max={1}
                step={0.01}
                value={v}
                onValueChange={setV}
                accent="red"
                aria-label="Imaginary part v"
              />
              <span className="font-mono text-sm tabular-nums">{v.toFixed(2)}</span>
            </label>
          </div>
        </Panel>

        <Panel label="Complex plane" className="flex items-center justify-center">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="h-48 w-full max-w-[14rem] border-2 border-ink bg-paper"
            role="img"
            aria-label={`Amplitude at u=${u.toFixed(2)}, v=${v.toFixed(2)}`}
          >
            <line
              x1={pad}
              y1={cy}
              x2={size - pad}
              y2={cy}
              stroke="currentColor"
              strokeOpacity={0.25}
            />
            <line
              x1={cx}
              y1={pad}
              x2={cx}
              y2={size - pad}
              stroke="currentColor"
              strokeOpacity={0.25}
            />
            <circle
              cx={cx}
              cy={cy}
              r={scale}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeDasharray="4 4"
            />
            <line
              x1={cx}
              y1={cy}
              x2={px}
              y2={py}
              stroke="var(--blue)"
              strokeWidth={2}
            />
            <circle cx={px} cy={py} r={5} fill="var(--red)" stroke="var(--ink)" strokeWidth={2} />
          </svg>
        </Panel>
      </div>

      <Panel label="Readout">
        <p className="font-mono text-sm tabular-nums">
          α = {u.toFixed(2)} {fmtSigned(v)}i &nbsp;·&nbsp; |α|² = {prob.toFixed(4)}
        </p>
        <div className="mt-3">
          <AmplitudeBar entries={[{ label: "α", re: u, im: v }]} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone={tooBig ? "warn" : "ok"}>
            {tooBig ? "|α|² > 1: too big for a state" : "|α|² ≤ 1: fits in a unit state"}
          </Chip>
          {tooBig ? (
            <p className="font-mono text-[11px] text-grey">
              A normalized state needs Σ|αₓ|² = 1, so no single slot can exceed 1.
            </p>
          ) : null}
        </div>
      </Panel>
    </DemoShell>
  );
}
