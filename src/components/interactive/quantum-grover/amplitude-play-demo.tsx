"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AmplitudeBar,
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import {
  GROVER_DEMO_SIZES,
  basisLabel,
  initialAmplitudes,
  optimalIterations,
  probabilityOfMarked,
  qubitCount,
  runGrover,
  toAmplitudeEntries,
  type GroverDemoSize,
} from "./model";

const PLAY_MS = 600;

export function AmplitudePlayDemo() {
  const [N, setN] = useState<GroverDemoSize>(8);
  const n = qubitCount(N);
  const [marked, setMarked] = useState(0);
  const [iterations, setIterations] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);
  // Keep optimal in a ref so the interval always sees the current target.
  const optimalRef = useRef(optimalIterations(N, 1));

  const optimal = optimalIterations(N, 1);

  const amplitudes = runGrover(initialAmplitudes(N), [marked], iterations);
  const markedProb = probabilityOfMarked(amplitudes, [marked]);
  const highlight = basisLabel(marked, n);
  const entries = toAmplitudeEntries(amplitudes, n);

  function clearPlayTimer() {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    optimalRef.current = optimal;
  }, [optimal]);

  useEffect(() => () => clearPlayTimer(), []);

  function reset() {
    clearPlayTimer();
    setPlaying(false);
    setIterations(0);
  }

  function changeN(next: GroverDemoSize) {
    reset();
    setN(next);
    setMarked(0);
  }

  function step() {
    clearPlayTimer();
    setPlaying(false);
    // Allow one step past optimal so overshoot is visible (see TryIt).
    setIterations((k) => Math.min(k + 1, optimalRef.current + 1));
  }

  function play() {
    if (playing) {
      clearPlayTimer();
      setPlaying(false);
      return;
    }

    // Replay from the start once we've reached (or passed) the target.
    if (iterations >= optimalRef.current) {
      setIterations(0);
    }

    setPlaying(true);
    timerRef.current = window.setInterval(() => {
      setIterations((k) => {
        const target = optimalRef.current;
        const next = k + 1;
        if (next >= target) {
          clearPlayTimer();
          setPlaying(false);
          return target;
        }
        return next;
      });
    }, PLAY_MS);
  }

  const amplified =
    markedProb >= 0.95 || (iterations >= optimal && markedProb >= 0.85);

  return (
    <DemoShell
      title="Amplitude amplification"
      blurb="Start uniform. Oracle flips the marked ket. Diffusion inverts about the mean. Repeat until |a⟩ dominates."
      accent="blue"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Search space
          <select
            className={`${controlSelect} mt-1 block`}
            value={N}
            onChange={(e) => changeN(Number(e.target.value) as GroverDemoSize)}
            disabled={playing}
          >
            {GROVER_DEMO_SIZES.map((size) => (
              <option key={size} value={size}>
                N = {size} ({qubitCount(size)} qubits)
              </option>
            ))}
          </select>
        </label>

        <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-grey">
          Marked |a⟩
          <select
            className={`${controlSelect} mt-1 block min-w-[5.5rem]`}
            value={marked}
            onChange={(e) => {
              reset();
              setMarked(Number(e.target.value));
            }}
            disabled={playing}
          >
            {Array.from({ length: N }, (_, i) => (
              <option key={i} value={i}>
                |{basisLabel(i, n)}⟩
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="ink"
          onClick={step}
          disabled={playing || iterations > optimal}
        >
          Step
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={play}>
          {playing ? "Stop" : iterations >= optimal ? "Replay" : "Play"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={reset}
          disabled={playing && iterations === 0}
        >
          Reset
        </Button>
        <div className="ml-auto flex flex-wrap items-baseline gap-2 font-mono text-xs">
          <Chip tone={iterations === optimal ? "ok" : "ink"}>
            k = {iterations}
          </Chip>
          <span className="text-grey">
            target ≈ {optimal} (⌊π/(4θ)⌋)
          </span>
        </div>
      </div>

      {amplified ? (
        <OutcomeBanner
          tone="ok"
          title={`|a⟩ amplified to ${(markedProb * 100).toFixed(1)}%`}
          detail={`After ${iterations} Grover iteration${iterations === 1 ? "" : "s"}, measuring likely returns |${highlight}⟩.`}
        />
      ) : null}

      <Panel label="Basis amplitudes · red = marked">
        <AmplitudeBar entries={entries} highlight={highlight} />
      </Panel>

      <p className="font-mono text-[10px] text-grey">
        One iteration = oracle sign flip on |{highlight}⟩, then inversion about
        the uniform mean.
      </p>
    </DemoShell>
  );
}
