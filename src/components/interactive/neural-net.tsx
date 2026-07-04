"use client";

import { useEffect, useRef } from "react";
import "./neural-net.css";

const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-legacy="${src}"]`,
    );
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.legacy = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

export function NeuralNet() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      await loadScript("/interactive/vendor/math.js");
      await loadScript("/interactive/vendor/chart.umd.min.js");
      await loadScript("/interactive/neuralnet/neuralNet.js");
    })();
  }, []);

  return (
    <div className="not-prose legacy-app">
      <div className="divider"></div>

      <div id="controls">
        <div className="controlGroup">
          <label htmlFor="hiddenNodes">
            Hidden Neurons:
            <input
              type="number"
              id="hiddenNodes"
              name="hiddenNodes"
              min="1"
              max="25"
              defaultValue="6"
            />
          </label>
          <label htmlFor="stepSize">
            Iterations:
            <input
              type="number"
              id="stepSize"
              name="stepSize"
              min="1"
              max="1000"
              defaultValue="500"
              step="10"
            />
          </label>
        </div>
        <div className="controlGroup">
          <button type="button" id="resetButton">
            Reset &#8634;
          </button>
          <button type="button" id="trainButton">
            Train &#8594;
          </button>
        </div>
      </div>

      <div className="divider"></div>

      <div id="trainingData">
        {digits.map((d) => (
          <div className="trainingImage" key={d}>
            <img
              className={d === 0 ? "selected" : undefined}
              src={`/projects/neuralNetCode/images/sprite${d}.png`}
              alt={`5x5 Pixel Image of the Numeral ${d}`}
            />
          </div>
        ))}
      </div>

      <div className="divider"></div>

      <div id="gaWrapper">
        <div id="circle"></div>
        <div id="graphAreaContainer">
          <div id="svgContainer">
            <svg
              width="100%"
              height="100%"
              id="edgesSvg"
              viewBox="0,0,100,100"
            ></svg>
          </div>
          <div id="graphArea">
            <div className="col1Wrapper">
              <div className="gaCol col_1 grid">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div className="node inputNode" key={i}></div>
                ))}
              </div>
            </div>
            <div className="gaCol col_2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="node hiddenNode" key={i}></div>
              ))}
            </div>
            <div className="gaCol col_3">
              {digits.map((d) => (
                <div className="outputPair" key={d}>
                  <img
                    src={`/projects/neuralNetCode/images/sprite${d}.png`}
                    alt={`5x5 Pixel Image of the Numeral ${d}`}
                  />
                  <div className="node outputNode"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="divider"></div>
      <p id="statsText">
        Iterations: <span id="trainingIterations">0</span> | Accuracy:{" "}
        <span id="accuracy">0</span>% | Loss: <span id="lossText">N/A</span>
      </p>
      <div className="divider"></div>
      <div className="chart-container">
        <canvas id="myChart"></canvas>
      </div>
    </div>
  );
}
