"use client";

import { useEffect, useRef } from "react";
import "./puzzle-solver.css";

const WIDGET_HTML = `
<div id="solver-app">
  <div id="controls">
    <div class="controlItem">
      <select aria-label="Select Heuristic Function" name="Heuristic Function" id="heurFunc">
        <option value="manhattan">Manhattan Distance</option>
        <option value="hamming">Hamming Distance</option>
      </select>
      <select aria-label="Select Search Algorithm" name="Search Function" id="searchFunc">
        <option value="astar">A-Star Search</option>
        <option value="bfs">Breadth First</option>
        <option value="bestfs">Greedy Best First</option>
      </select>
    </div>
    <div class="controlItem"></div>
    <div class="controlItem">
      <input role="button" type="button" value="Randomize \u21bb" class="inputButton" aria-label="Randomize Puzzle" onclick="randomizePuzzleString()" />
      <input type="text" name="Puzzle String" id="puzStr" placeholder="Puzzle String" aria-label="Input Puzzle String" maxlength="9" onchange="verifyPuzzleString()" onkeyup="verifyPuzzleString()" />
    </div>
    <input type="button" value="Solve \u2b62" class="inputButton" id="solveBtn" aria-label="Solve Puzzle" onclick="solve()" disabled />
  </div>
  <div class="divider"></div>
  <div id="timeMachine">
    <input class="inactiveSlider" type="range" name="Progress" id="timeSlider" aria-label="Solution Progress Slider" min="0" max="1000" value="0" disabled step="1" />
  </div>
  <div class="divider"></div>
  <div id="solutionArea">
    <div id="loading" class="invisible"></div>
    <div id="arrowNav">
      <p role="button" name="Animate Backward" class="bw" onclick="animateBackward()">\u25c0</p>
      <div id="puzzleContainer"></div>
      <p role="button" name="Animate Forward" class="fw" onclick="animateForward()">\u25b6</p>
    </div>
    <div class="puzzle invisible" id="puzzleTemplate">
      <div class="psquare" id="ps_0"><p></p></div>
      <div class="psquare" id="ps_1"><p></p></div>
      <div class="psquare" id="ps_2"><p></p></div>
      <div class="psquare" id="ps_3"><p></p></div>
      <div class="psquare" id="ps_4"><p></p></div>
      <div class="psquare" id="ps_5"><p></p></div>
      <div class="psquare" id="ps_6"><p></p></div>
      <div class="psquare" id="ps_7"><p></p></div>
      <div class="psquare" id="ps_8"><p></p></div>
    </div>
  </div>
  <div class="divider"></div>
  <div id="stats"><p id="statsText">Stats:</p></div>
</div>
`;

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

export function PuzzleSolver() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      await loadScript("/interactive/8puzzle/8puzzle.js");
      await loadScript("/interactive/8puzzle/main.js");
      if (cancelled) return;
      const w = window as unknown as { randomizePuzzleString?: () => void };
      if (typeof w.randomizePuzzleString === "function") {
        w.randomizePuzzleString();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="not-prose legacy-app"
      dangerouslySetInnerHTML={{ __html: WIDGET_HTML }}
    />
  );
}
