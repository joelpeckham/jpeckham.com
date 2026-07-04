"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { NeuralNetwork, mulberry32, type Matrix } from "./network";
import { NetworkGraph } from "./graph";
import { LossChart } from "./loss-chart";
import { DigitGlyph } from "./digit-glyph";
import { activationFill, activationText, INK, RED } from "./colors";
import {
  GRID_SIZE,
  INPUT_NODES,
  OUTPUT_NODES,
  targets,
  trainingData,
} from "./training-data";

const HIDDEN_DEFAULT = 6;
const HIDDEN_MIN = 1;
const HIDDEN_MAX = 20;
const LR_DEFAULT = 0.2;
const BATCH_DEFAULT = 500;
const STEPS_PER_FRAME = 12;

type Selection = number | "draw";

// An immutable snapshot of everything the UI renders. We recompute it (in event
// handlers, never during render) whenever the weights or the selected input
// change, so the render path never has to read the mutable network ref.
type ViewModel = {
  wih: Matrix;
  who: Matrix;
  input: number[];
  hidden: number[];
  output: number[];
  predicted: number;
  accuracy: number;
  loss: number | null;
  lossHistory: number[];
};

function createNetwork(hidden: number, learningRate: number): NeuralNetwork {
  return new NeuralNetwork(INPUT_NODES, hidden, OUTPUT_NODES, learningRate);
}

// A fixed-seed network for the very first render so the server- and
// client-rendered SVG match. Every subsequent rebuild uses Math.random.
function createInitialNetwork(): NeuralNetwork {
  return new NeuralNetwork(
    INPUT_NODES,
    HIDDEN_DEFAULT,
    OUTPUT_NODES,
    LR_DEFAULT,
    mulberry32(0x9e3779b9),
  );
}

function computeView(net: NeuralNetwork, input: number[]): ViewModel {
  const { hidden, output } = net.forward(input);
  let predicted = 0;
  for (let k = 1; k < output.length; k++) {
    if (output[k] > output[predicted]) predicted = k;
  }
  const history = net.lossHistory;
  return {
    wih: net.wih,
    who: net.who,
    input: input.slice(),
    hidden,
    output,
    predicted,
    accuracy: net.accuracy(trainingData),
    loss: history.length > 0 ? history[history.length - 1] : null,
    lossHistory: history,
  };
}

const controlInput =
  "w-16 border-2 border-ink bg-white px-2 py-1 font-mono text-sm focus-visible:outline-none";

export function NeuralNet() {
  const [hidden, setHidden] = useState(HIDDEN_DEFAULT);
  const [learningRate, setLearningRate] = useState(LR_DEFAULT);
  const [batch, setBatch] = useState(BATCH_DEFAULT);
  const [selected, setSelected] = useState<Selection>(0);
  const [drawn, setDrawn] = useState<number[]>(() =>
    new Array<number>(INPUT_NODES).fill(0),
  );
  const [iterations, setIterations] = useState(0);
  const [playing, setPlaying] = useState(false);

  // The network is a single stable instance kept in state (reading state during
  // render is fine). Training mutates it in place through methods; a rebuild
  // swaps in a fresh instance via setNet. Everything the UI draws comes from the
  // immutable `view` snapshot so weight changes reliably trigger re-renders.
  const [net, setNet] = useState<NeuralNetwork>(createInitialNetwork);
  const iterRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [view, setView] = useState<ViewModel>(() =>
    computeView(net, trainingData[0].bits),
  );

  const inputFor = useCallback(
    (sel: Selection, drawing: number[]): number[] =>
      sel === "draw" ? drawing : trainingData[sel].bits,
    [],
  );

  const rebuild = useCallback(
    (nextHidden: number, nextLr: number, sel: Selection, drawing: number[]) => {
      const fresh = createNetwork(nextHidden, nextLr);
      setNet(fresh);
      iterRef.current = 0;
      setIterations(0);
      setPlaying(false);
      setView(computeView(fresh, inputFor(sel, drawing)));
    },
    [inputFor],
  );

  const reset = useCallback(() => {
    rebuild(hidden, learningRate, selected, drawn);
  }, [rebuild, hidden, learningRate, selected, drawn]);

  const changeHidden = useCallback(
    (n: number) => {
      setHidden(n);
      rebuild(n, learningRate, selected, drawn);
    },
    [rebuild, learningRate, selected, drawn],
  );

  const changeLearningRate = useCallback(
    (n: number) => {
      setLearningRate(n);
      net.updateLearningRate(n);
      setView(computeView(net, inputFor(selected, drawn)));
    },
    [net, inputFor, selected, drawn],
  );

  const runSteps = useCallback(
    (count: number) => {
      for (let i = 0; i < count; i++) {
        const idx = iterRef.current % trainingData.length;
        net.train(trainingData[idx].bits, targets[idx]);
        iterRef.current++;
      }
      if (!mountedRef.current) return;
      setIterations(iterRef.current);
      setView(computeView(net, inputFor(selected, drawn)));
    },
    [net, inputFor, selected, drawn],
  );

  const trainBatch = useCallback(() => {
    setPlaying(false);
    runSteps(batch);
  }, [batch, runSteps]);

  // Continuous ("play") training loop.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      runSteps(STEPS_PER_FRAME);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, runSteps]);

  const selectImage = useCallback(
    (label: number) => {
      setSelected(label);
      setView(computeView(net, inputFor(label, drawn)));
    },
    [net, inputFor, drawn],
  );

  const selectDraw = useCallback(() => {
    setSelected("draw");
    setView(computeView(net, inputFor("draw", drawn)));
  }, [net, inputFor, drawn]);

  const setDrawing = useCallback(
    (next: number[]) => {
      setDrawn(next);
      setView(computeView(net, next));
    },
    [net],
  );

  const toggleDrawnPixel = useCallback(
    (i: number) => {
      const next = drawn.slice();
      next[i] = next[i] ? 0 : 1;
      setDrawing(next);
    },
    [drawn, setDrawing],
  );

  // --- tooltip (imperative to avoid re-rendering the graph on mouse move) ---
  const graphWrapRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const showTip = useCallback((text: string) => {
    const tip = tooltipRef.current;
    if (!tip) return;
    tip.textContent = text;
    tip.style.opacity = "1";
  }, []);

  const hideTip = useCallback(() => {
    const tip = tooltipRef.current;
    if (tip) tip.style.opacity = "0";
  }, []);

  const positionTip = useCallback((clientX: number, clientY: number) => {
    const wrap = graphWrapRef.current;
    const tip = tooltipRef.current;
    if (!wrap || !tip) return;
    const rect = wrap.getBoundingClientRect();
    tip.style.left = `${clientX - rect.left}px`;
    tip.style.top = `${clientY - rect.top}px`;
  }, []);

  const moveTip = useCallback(
    (e: React.MouseEvent) => positionTip(e.clientX, e.clientY),
    [positionTip],
  );

  // Touch/click: position then show the tip so nodes are inspectable without
  // hover. Tapping empty graph space (handled on the wrapper) hides it.
  const showTipAt = useCallback(
    (text: string, e: React.PointerEvent) => {
      positionTip(e.clientX, e.clientY);
      showTip(text);
    },
    [positionTip, showTip],
  );

  return (
    <div className="not-prose my-8 flex flex-col gap-5">
      {/* Controls */}
      <Card accent="blue">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <label className="flex w-full flex-col gap-1 font-mono text-xs uppercase tracking-[0.12em] sm:w-auto">
              Hidden neurons: {hidden}
              <input
                type="range"
                min={HIDDEN_MIN}
                max={HIDDEN_MAX}
                value={hidden}
                onChange={(e) => changeHidden(Number(e.target.value))}
                className="w-full accent-[color:var(--blue)] sm:w-44"
                aria-label="Number of hidden neurons"
              />
            </label>

            <label className="flex w-full flex-col gap-1 font-mono text-xs uppercase tracking-[0.12em] sm:w-auto">
              Learning rate: {learningRate.toFixed(2)}
              <input
                type="range"
                min={0.01}
                max={1}
                step={0.01}
                value={learningRate}
                onChange={(e) => changeLearningRate(Number(e.target.value))}
                className="w-full accent-[color:var(--red)] sm:w-44"
                aria-label="Learning rate"
              />
            </label>

            <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.12em]">
              Iterations / train
              <input
                type="number"
                min={1}
                max={5000}
                step={10}
                value={batch}
                onChange={(e) =>
                  setBatch(Math.max(1, Number(e.target.value) || 1))
                }
                className={controlInput}
                aria-label="Iterations per train click"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={playing ? "yellow" : "blue"}
              size="sm"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "Pause \u23f8" : "Play \u25b6"}
            </Button>
            <Button type="button" variant="ink" size="sm" onClick={trainBatch}>
              {`Train ${batch} \u2192`}
            </Button>
            <Button type="button" variant="red" size="sm" onClick={reset}>
              {"Reset \u21ba"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <Stat label="Iterations" value={iterations.toLocaleString()} />
        <Stat label="Accuracy" value={`${view.accuracy.toFixed(0)}%`} />
        <Stat
          label="Loss"
          value={view.loss === null ? "N/A" : view.loss.toFixed(5)}
        />
      </div>

      {/* Input selector */}
      <div className="flex flex-col gap-2">
        <span className="label">Input</span>
        <div className="flex flex-wrap items-center gap-2">
          {trainingData.map((sample) => {
            const isActive = selected === sample.label;
            return (
              <button
                key={sample.label}
                type="button"
                onClick={() => selectImage(sample.label)}
                aria-pressed={isActive}
                aria-label={`Feed the network the training image for ${sample.label}`}
                className={cn(
                  "border-2 border-ink bg-white p-1 transition-transform",
                  isActive
                    ? "shadow-hard"
                    : "opacity-60 hover:-translate-y-0.5 hover:opacity-100",
                )}
              >
                <DigitGlyph bits={sample.bits} size={34} />
              </button>
            );
          })}
          <button
            type="button"
            onClick={selectDraw}
            aria-pressed={selected === "draw"}
            aria-label="Draw your own digit for the network to classify"
            className={cn(
              "border-2 border-ink px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] transition-transform",
              selected === "draw"
                ? "bg-yellow text-ink shadow-hard"
                : "bg-white opacity-70 hover:-translate-y-0.5 hover:opacity-100",
            )}
          >
            Draw
          </button>
        </div>
      </div>

      {/* Draw pad */}
      {selected === "draw" ? (
        <Card>
          <div className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
            <DrawPad bits={drawn} onToggle={toggleDrawnPixel} />
            <div className="flex flex-col gap-2 text-sm">
              <p className="max-w-xs text-grey">
                Click cells to toggle pixels, then watch how the network — which
                only ever saw the ten images above — classifies your drawing.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDrawing(new Array(INPUT_NODES).fill(0))}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Graph */}
      <Card accent="red">
        <div
          ref={graphWrapRef}
          className="relative p-2"
          onMouseMove={moveTip}
          onPointerDown={hideTip}
        >
          <NetworkGraph
            wih={view.wih}
            who={view.who}
            input={view.input}
            hidden={view.hidden}
            output={view.output}
            predicted={view.predicted}
            showTip={showTip}
            hideTip={hideTip}
            showTipAt={showTipAt}
          />
          <div
            ref={tooltipRef}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap border-2 border-ink bg-yellow px-2 py-1 font-mono text-xs text-ink opacity-0 transition-opacity duration-100"
            style={{ left: 0, top: 0 }}
          />
        </div>
      </Card>

      {/* Output activation bars */}
      <div className="flex flex-col gap-2">
        <span className="label">Output activations</span>
        <div className="flex flex-col gap-1.5">
          {view.output.map((value, k) => {
            const isPred = k === view.predicted;
            return (
              <div key={k} className="flex items-center gap-3">
                <span className="w-4 text-right font-mono text-sm font-bold">
                  {k}
                </span>
                <div className="relative h-5 flex-1 border-2 border-ink bg-white">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.max(0, Math.min(1, value)) * 100}%`,
                      background: isPred ? RED : INK,
                    }}
                  />
                </div>
                <span className="w-14 text-right font-mono text-sm tabular-nums">
                  {value.toFixed(3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loss chart */}
      <div className="flex flex-col gap-2">
        <span className="label">Loss over iterations</span>
        <Card>
          <div className="p-3">
            <LossChart history={view.lossHistory} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[7rem] flex-col border-2 border-ink bg-white px-3 py-2">
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-grey">
        {label}
      </span>
      <span className="font-mono text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}

function DrawPad({
  bits,
  onToggle,
}: {
  bits: number[];
  onToggle: (i: number) => void;
}) {
  return (
    <div
      className="grid w-full max-w-[220px] gap-1 border-2 border-ink bg-white p-1"
      style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
    >
      {bits.map((bit, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onToggle(i)}
          aria-label={`Toggle pixel ${i}`}
          className="aspect-square w-full border border-grey-line"
          style={{ background: bit ? INK : "#ffffff" }}
        />
      ))}
    </div>
  );
}

// Small legend used inside the article to explain the node color scheme.
export function ActivationLegend() {
  const samples = [
    { label: "Weak activation", value: 0.1 },
    { label: "Medium activation", value: 0.5 },
    { label: "Strong activation", value: 0.95 },
  ];
  return (
    <div className="not-prose my-6 flex flex-wrap gap-4">
      {samples.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink font-mono text-xs"
            style={{
              background: activationFill(s.value),
              color: activationText(s.value),
            }}
          >
            {s.value}
          </span>
          <span className="font-mono text-sm">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
