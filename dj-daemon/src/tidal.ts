import { execSync, spawn } from "node:child_process";
import http from "node:http";
import WebSocket from "ws";
import { tidalAppPath, tidalCdpPort } from "./env";

type CdpTarget = {
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
};

async function httpGet(url: string, timeoutMs = 2500): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`timeout fetching ${url}`));
    });
  });
}

export async function isCdpAvailable(): Promise<boolean> {
  try {
    const body = await httpGet(`http://127.0.0.1:${tidalCdpPort}/json/version`);
    return body.includes("TIDAL") || body.includes("Electron");
  } catch {
    return false;
  }
}

function isTidalRunning(): boolean {
  try {
    const out = execSync("pgrep -f 'TIDAL.app/Contents/MacOS/TIDAL$'", {
      encoding: "utf8",
      timeout: 3000,
    });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

export async function ensureTidalWithCdp(): Promise<void> {
  if (await isCdpAvailable()) return;

  if (isTidalRunning()) {
    console.error("TIDAL is running without CDP. Relaunching with the debug port...");
    try {
      execSync('osascript -e \'tell application "TIDAL" to quit\'', {
        timeout: 5000,
      });
    } catch {
      execSync("pkill -f 'TIDAL.app/Contents/MacOS/TIDAL$'", { timeout: 3000 });
    }
    await delay(2000);
  }

  console.error(`Launching TIDAL with --remote-debugging-port=${tidalCdpPort}`);
  spawn(
    "open",
    ["-a", tidalAppPath, "--args", `--remote-debugging-port=${tidalCdpPort}`],
    { detached: true, stdio: "ignore" },
  ).unref();

  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await isCdpAvailable()) return;
    await delay(500);
  }
  throw new Error("Timed out waiting for TIDAL CDP");
}

async function findMainTarget(): Promise<CdpTarget> {
  const raw = await httpGet(`http://127.0.0.1:${tidalCdpPort}/json`);
  const targets = JSON.parse(raw) as CdpTarget[];
  const main = targets.find(
    (target) =>
      target.type === "page" &&
      (target.url.includes("desktop.tidal.com") ||
        target.url.includes("listen.tidal.com") ||
        target.url.includes("tidal.com")),
  );
  if (!main) {
    throw new Error(
      `No TIDAL page target. Saw: ${targets.map((t) => `${t.type}:${t.url}`).join(", ")}`,
    );
  }
  return main;
}

export async function evaluate<T = unknown>(
  expression: string,
  options?: { awaitPromise?: boolean; timeoutMs?: number },
): Promise<T> {
  const target = await findMainTarget();
  const timeoutMs = options?.timeoutMs ?? 8000;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let settled = false;

    const finish = (error?: Error, value?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // ignore
      }
      if (error) reject(error);
      else resolve(value as T);
    };

    const timer = setTimeout(() => {
      finish(new Error("CDP evaluation timed out"));
    }, timeoutMs);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: "Runtime.evaluate",
          params: {
            expression,
            returnByValue: true,
            awaitPromise: options?.awaitPromise ?? false,
          },
        }),
      );
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as {
          id?: number;
          result?: {
            result?: { value?: T };
            exceptionDetails?: {
              text?: string;
              exception?: { description?: string };
            };
          };
        };
        if (msg.id !== 1) return;
        if (msg.result?.exceptionDetails) {
          const ex = msg.result.exceptionDetails;
          finish(
            new Error(ex.exception?.description ?? ex.text ?? "JS evaluation error"),
          );
          return;
        }
        finish(undefined, msg.result?.result?.value);
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });

    ws.on("error", (error) => {
      finish(new Error(`CDP socket: ${error.message}`));
    });
  });
}

export async function spaNavigate(spaPath: string): Promise<void> {
  await evaluate(
    `(() => {
      const path = ${JSON.stringify(spaPath)};
      const link = document.querySelector('a[href="' + path + '"]');
      if (link) { link.click(); return "link"; }
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
      return "pushState";
    })()`,
  );
  await delay(2800);
}

async function waitForTracks(timeoutMs = 10000): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await evaluate<number>(
      `document.querySelectorAll('a[href*="/track/"]').length`,
    );
    if ((count ?? 0) > 0) return count;
    await delay(400);
  }
  return 0;
}

async function clickInlinePlay(): Promise<boolean> {
  return (
    (await evaluate<boolean>(
      `(() => {
        const playBtns = [...document.querySelectorAll('button[aria-label="Play"]')];
        const inline = playBtns.filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width <= 20 && r.width > 0;
        });
        if (inline[0]) { inline[0].click(); return true; }
        if (playBtns[0]) { playBtns[0].click(); return true; }
        return false;
      })()`,
    )) === true
  );
}

async function clickTransport(label: string): Promise<boolean> {
  return (
    (await evaluate<boolean>(
      `(() => {
        const label = ${JSON.stringify(label)};
        const btns = [...document.querySelectorAll("button[aria-label]")];
        const shuffleIdx = btns.findIndex((b) => b.getAttribute("aria-label") === "Shuffle");
        if (shuffleIdx !== -1) {
          for (let i = shuffleIdx; i < Math.min(btns.length, shuffleIdx + 8); i++) {
            if (btns[i]?.getAttribute("aria-label") === label) {
              btns[i].click();
              return true;
            }
          }
        }
        const fallback = btns.find((b) => b.getAttribute("aria-label") === label);
        if (fallback) { fallback.click(); return true; }
        return false;
      })()`,
    )) === true
  );
}

export async function playTidalTrack(tidalId: string): Promise<boolean> {
  await spaNavigate(`/track/${tidalId}`);
  await waitForTracks();
  return clickInlinePlay();
}

export async function pausePlayback(): Promise<boolean> {
  return clickTransport("Pause");
}

export async function resumePlayback(): Promise<boolean> {
  return clickTransport("Play");
}

export async function nextTrack(): Promise<boolean> {
  return clickTransport("Next");
}

export async function previousTrack(): Promise<boolean> {
  return clickTransport("Previous");
}

export async function setVolume(level: number): Promise<boolean> {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));
  const result = await evaluate<string>(
    `(() => {
      const open = document.querySelector('button[aria-label="Volume"]');
      if (open) open.click();
      const slider = document.querySelector('input[type="range"][aria-label*="olume"], input[type="range"][data-test*="olume"]');
      if (!slider) return "missing";
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      if (!setter) return "no_setter";
      setter.call(slider, ${clamped});
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
      return "set";
    })()`,
  );
  return result === "set";
}

export type PlayerBarInfo = {
  isPlaying: boolean;
  title: string | null;
  artist: string | null;
};

export async function readPlayerBar(): Promise<PlayerBarInfo> {
  const result = await evaluate<PlayerBarInfo>(
    `(() => {
      const hasPause = !!document.querySelector('button[aria-label="Pause"]');
      const links = [...document.querySelectorAll("a")].filter((a) => {
        const r = a.getBoundingClientRect();
        return r.top > window.innerHeight - 120 && r.top < window.innerHeight;
      });
      const trackLink = links.find((a) => a.href?.includes("/track/"));
      const artistLink = links.find((a) => a.href?.includes("/artist/"));
      return {
        isPlaying: hasPause,
        title: trackLink?.textContent?.trim() || null,
        artist: artistLink?.textContent?.trim() || null,
      };
    })()`,
  );
  return result ?? { isPlaying: false, title: null, artist: null };
}

export type SearchHit = {
  tidalId: string;
  title: string;
  artist: string;
  tidalUrl: string;
};

export async function searchTidal(query: string): Promise<SearchHit[]> {
  const path = `/search/${encodeURIComponent(query)}`;
  await spaNavigate(path);
  await delay(2000);
  const hits = await evaluate<SearchHit[]>(
    `(() => {
      const rows = [];
      const seen = new Set();
      for (const a of document.querySelectorAll('a[href*="/track/"]')) {
        const href = a.getAttribute("href") || a.href || "";
        const match = href.match(/\\/track\\/(\\d+)/);
        if (!match || seen.has(match[1])) continue;
        seen.add(match[1]);
        const title = (a.textContent || "").trim();
        if (!title) continue;
        let artist = "";
        const row = a.closest("div, li, article, tr");
        const artistLink = row?.querySelector('a[href*="/artist/"]');
        if (artistLink) artist = (artistLink.textContent || "").trim();
        rows.push({
          tidalId: match[1],
          title,
          artist,
          tidalUrl: "https://listen.tidal.com/track/" + match[1],
        });
        if (rows.length >= 8) break;
      }
      return rows;
    })()`,
  );
  return Array.isArray(hits) ? hits : [];
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
