import { execSync, spawn } from "node:child_process";
import http from "node:http";
import WebSocket from "ws";
import { tidalAppPath, tidalCdpPort } from "./env";

type CdpTarget = {
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
};

type PendingCdp = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type CdpSession = {
  ws: WebSocket;
  debuggerUrl: string;
  nextId: number;
  pending: Map<number, PendingCdp>;
};

let session: CdpSession | null = null;
let connecting: Promise<CdpSession> | null = null;
let capturedAuthorization = "";

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
    [
      "-a",
      tidalAppPath,
      "--args",
      `--remote-debugging-port=${tidalCdpPort}`,
      "--remote-debugging-address=127.0.0.1",
    ],
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

function resetSession(reason = "CDP session closed") {
  if (!session) return;
  const current = session;
  session = null;
  for (const item of current.pending.values()) {
    clearTimeout(item.timer);
    item.reject(new Error(reason));
  }
  current.pending.clear();
  try {
    current.ws.close();
  } catch {
    // ignore
  }
}

function attachSession(ws: WebSocket, debuggerUrl: string): CdpSession {
  const next: CdpSession = {
    ws,
    debuggerUrl,
    nextId: 1,
    pending: new Map(),
  };
  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString()) as {
      id?: number;
      method?: string;
      params?: { request?: { headers?: Record<string, string> } };
      result?: {
        result?: { value?: unknown };
        exceptionDetails?: {
          text?: string;
          exception?: { description?: string };
        };
      };
      error?: { message?: string };
    };
    if (msg.method === "Network.requestWillBeSent") {
      const header =
        msg.params?.request?.headers?.Authorization ??
        msg.params?.request?.headers?.authorization;
      if (header?.startsWith("Bearer ")) capturedAuthorization = header;
    }
    if (!msg.id || !next.pending.has(msg.id)) return;
    const pending = next.pending.get(msg.id)!;
    next.pending.delete(msg.id);
    clearTimeout(pending.timer);
    if (msg.error) {
      pending.reject(new Error(msg.error.message ?? "CDP error"));
      return;
    }
    if (msg.result?.exceptionDetails) {
      const ex = msg.result.exceptionDetails;
      pending.reject(new Error(ex.exception?.description ?? ex.text ?? "JS evaluation error"));
      return;
    }
    pending.resolve(msg.result?.result?.value);
  });
  ws.on("close", () => {
    if (session === next) resetSession();
  });
  ws.on("error", () => {
    if (session === next) resetSession("CDP socket error");
  });
  return next;
}

async function ensureSession(): Promise<CdpSession> {
  if (session && session.ws.readyState === WebSocket.OPEN) return session;
  if (connecting) return connecting;
  connecting = (async () => {
    const target = await findMainTarget();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });
    session = attachSession(ws, target.webSocketDebuggerUrl);
    await cdpSend("Network.enable");
    return session;
  })();
  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

async function cdpSend(
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 8000,
): Promise<unknown> {
  const current = await ensureSession();
  const id = current.nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      current.pending.delete(id);
      reject(new Error(`CDP ${method} timed out`));
    }, timeoutMs);
    current.pending.set(id, { resolve, reject, timer });
    current.ws.send(JSON.stringify({ id, method, params }));
  });
}

export function clearCapturedAuthorization() {
  capturedAuthorization = "";
}

function authorizationExpiry(authorization: string): number {
  try {
    const payload = authorization.replace(/^Bearer\s+/i, "").split(".")[1];
    if (!payload) return 0;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
    };
    return typeof json.exp === "number" ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function pokeSessionFetch() {
  await evaluate(
    "fetch('https://api.tidal.com/v1/sessions',{credentials:'include',headers:{accept:'application/json'}}).catch(()=>{})",
    { awaitPromise: true },
  );
}

export async function captureAuthorization(
  options?: { force?: boolean },
): Promise<string> {
  const previous = capturedAuthorization;
  if (options?.force) capturedAuthorization = "";
  else if (capturedAuthorization) return capturedAuthorization;
  await ensureSession();
  await pokeSessionFetch();
  const start = Date.now();
  while (!capturedAuthorization && Date.now() - start < 4000) {
    await delay(100);
  }
  if (!capturedAuthorization) {
    const playing = await readPlayerBar()
      .then((info) => info.isPlaying)
      .catch(() => false);
    if (!playing) {
      await evaluate(
        "(() => { history.pushState({}, '', '/my-collection/playlists'); dispatchEvent(new PopStateEvent('popstate')); return true; })()",
      );
    } else {
      await pokeSessionFetch();
    }
    while (!capturedAuthorization && Date.now() - start < 8000) {
      await delay(100);
    }
  }
  if (!capturedAuthorization && previous && authorizationExpiry(previous) > Date.now() + 60_000) {
    capturedAuthorization = previous;
    return previous;
  }
  if (!capturedAuthorization) throw new Error("Could not capture TIDAL session");
  return capturedAuthorization;
}

export async function evaluate<T = unknown>(
  expression: string,
  options?: { awaitPromise?: boolean; timeoutMs?: number },
): Promise<T> {
  const run = () =>
    cdpSend(
      "Runtime.evaluate",
      {
        expression,
        returnByValue: true,
        awaitPromise: options?.awaitPromise ?? false,
      },
      options?.timeoutMs ?? 8000,
    ) as Promise<T>;

  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/session closed|socket/i.test(message)) throw error;
    resetSession(message);
    return run();
  }
}

export async function currentPath(): Promise<string> {
  return (await evaluate<string>("location.pathname")) ?? "";
}

export async function spaNavigate(spaPath: string): Promise<void> {
  const already = await currentPath();
  if (already === spaPath || already.endsWith(spaPath)) return;
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
  const start = Date.now();
  while (Date.now() - start < 4000) {
    const path = await currentPath();
    if (path === spaPath || path.endsWith(spaPath)) return;
    await delay(200);
  }
}

async function waitForTracks(timeoutMs = 10000): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await evaluate<number>(
      `document.querySelectorAll('a[href*="/track/"]').length`,
    );
    if ((count ?? 0) > 0) return count;
    await delay(200);
  }
  return 0;
}

async function clickHeroPlay(): Promise<boolean> {
  return (
    (await evaluate<boolean>(
      `(() => {
        const playBtns = [...document.querySelectorAll('button[aria-label="Play"]')];
        const hero = playBtns.find((b) => {
          const r = b.getBoundingClientRect();
          return r.width >= 36 && r.height >= 36 && r.top > 40 && r.top < window.innerHeight * 0.62;
        });
        if (hero) { hero.click(); return true; }
        const footerPlay = playBtns.find((b) => {
          const r = b.getBoundingClientRect();
          return r.top > window.innerHeight - 140 && r.width > 0;
        });
        if (footerPlay) { footerPlay.click(); return true; }
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
  return clickHeroPlay();
}

async function waitForPlaylist(playlistId: string, timeoutMs = 4000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await evaluate<boolean>(
      `(() => {
        const id = ${JSON.stringify(playlistId)};
        const onPage = location.pathname.includes("/playlist/" + id);
        const playAll = document.querySelector(
          '[data-test="playlist-header-container"] [data-test="play-all"], [data-test="playlist-header-container"] [data-test="shuffle-all"]',
        );
        const rows = [...document.querySelectorAll('[data-test="tracklist-row"]')].filter(
          (row) =>
            !row.closest('[data-test="media-table-suggested-items"]') &&
            !row.querySelector('[data-test="add-suggested-item-to-playlist-button"]'),
        );
        return Boolean(onPage && playAll && rows.length > 0);
      })()`,
    );
    if (ready) return true;
    await delay(200);
  }
  return false;
}

async function clickPlaylistShuffleAll(): Promise<boolean> {
  return (
    (await evaluate<boolean>(
      `(() => {
        const btn =
          document.querySelector('[data-test="playlist-header-container"] [data-test="shuffle-all"]') ||
          document.querySelector('[data-test="playlist-page"] [data-test="shuffle-all"]');
        if (!btn) return false;
        btn.click();
        return true;
      })()`,
    )) === true
  );
}

async function clickPlaylistTrackPlay(tidalId: string): Promise<boolean> {
  return (
    (await evaluate<boolean>(
      `(() => {
        const id = ${JSON.stringify(tidalId)};
        const rows = [...document.querySelectorAll('[data-test="tracklist-row"]')].filter(
          (row) =>
            !row.closest('[data-test="media-table-suggested-items"]') &&
            !row.querySelector('[data-test="add-suggested-item-to-playlist-button"]'),
        );
        const row = rows.find((item) => {
          const href = item.querySelector('a[href*="/track/"]')?.getAttribute("href") || "";
          return href.includes("/track/" + id);
        });
        const btn = row?.querySelector('[data-test="play-button"]');
        if (!btn) return false;
        btn.click();
        return true;
      })()`,
    )) === true
  );
}

async function waitForPlaylistStart(
  previous: PlayerBarInfo,
  allowedTidalIds?: string[],
  timeoutMs = 5000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = await readPlayerBar();
    if (!info.isPlaying || !info.tidalId) {
      await delay(200);
      continue;
    }
    const switched = info.tidalId !== previous.tidalId || !previous.tidalId;
    if (!switched) {
      await delay(200);
      continue;
    }
    if (allowedTidalIds?.length) {
      if (allowedTidalIds.includes(info.tidalId)) return true;
    } else {
      return true;
    }
    await delay(200);
  }
  return false;
}

async function waitForPlaylistTrack(
  playlistId: string,
  tidalId: string,
  timeoutMs = 4000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await evaluate<boolean>(
      `(() => {
        const id = ${JSON.stringify(tidalId)};
        const onPage = location.pathname.includes("/playlist/" + ${JSON.stringify(playlistId)});
        const rows = [...document.querySelectorAll('[data-test="tracklist-row"]')].filter(
          (row) =>
            !row.closest('[data-test="media-table-suggested-items"]') &&
            !row.querySelector('[data-test="add-suggested-item-to-playlist-button"]'),
        );
        return Boolean(
          onPage &&
            rows.some((item) => {
              const href = item.querySelector('a[href*="/track/"]')?.getAttribute("href") || "";
              return href.includes("/track/" + id);
            }),
        );
      })()`,
    );
    if (ready) return true;
    await delay(200);
  }
  return false;
}

export async function playTidalPlaylist(
  playlistId: string,
  expectedTidalId?: string,
  allowedTidalIds?: string[],
): Promise<boolean> {
  const previous = await readPlayerBar();
  const path = await currentPath();
  const onPage = path.includes(`/playlist/${playlistId}`);
  if (!onPage) {
    await spaNavigate(`/playlist/${playlistId}`);
    if (!(await waitForPlaylist(playlistId))) {
      await evaluate(
        `location.assign(${JSON.stringify(`https://desktop.tidal.com/playlist/${playlistId}`)})`,
      );
      if (!(await waitForPlaylist(playlistId))) return false;
    }
  } else if (!(await waitForPlaylist(playlistId, 1500))) {
    // already on the page; keep going even if rows are still painting
  }
  await setShuffleOn();
  if (expectedTidalId) {
    if (!(await waitForPlaylistTrack(playlistId, expectedTidalId))) return false;
    if (await clickPlaylistTrackPlay(expectedTidalId)) {
      return waitForPlayingTrack(expectedTidalId, 4000);
    }
    return false;
  }
  if (await clickPlaylistShuffleAll()) {
    return waitForPlaylistStart(previous, allowedTidalIds);
  }
  return false;
}

async function waitForPlayingTrack(tidalId: string, timeoutMs = 4000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = await readPlayerBar();
    if (info.tidalId === tidalId && info.isPlaying) return true;
    await delay(200);
  }
  return false;
}

export async function setShuffleOn(): Promise<void> {
  await evaluate(
    `(() => {
      const btn =
        document.querySelector('[data-test="footer-player"] [data-test="shuffle"]') ||
        document.querySelector('[data-test="play-controls"] [data-test="shuffle"]');
      if (!btn) return false;
      const pressed =
        btn.getAttribute("aria-pressed") === "true" ||
        btn.getAttribute("aria-checked") === "true";
      if (!pressed) btn.click();
      return true;
    })()`,
  );
}

export async function skipPlayback(direction: "next" | "prev"): Promise<boolean> {
  const previous = await readPlayerBar();
  const item = direction === "next" ? "Next" : "Previous";
  const clicked =
    clickPlaybackMenu(item) ||
    (await (async () => {
      const labels =
        direction === "next"
          ? ["Next", "Next track"]
          : ["Previous", "Previous track"];
      for (const label of labels) {
        if (await clickTransport(label)) return true;
      }
      return false;
    })());
  if (!clicked) return false;
  const next = await waitForPlayerChange(previous, 5000);
  return Boolean(
    (next.tidalId && next.tidalId !== previous.tidalId) ||
      (next.title && previous.title && next.title !== previous.title),
  );
}

export async function pausePlayback(): Promise<boolean> {
  if (clickPlaybackMenu("Pause")) return true;
  return clickTransport("Pause");
}

export async function resumePlayback(): Promise<boolean> {
  if (clickPlaybackMenu("Play")) return true;
  return clickTransport("Play");
}

export async function waitForPlayingState(
  wantPlaying: boolean,
  timeoutMs = 4000,
): Promise<PlayerBarInfo> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = await readPlayerBar();
    if (info.isPlaying === wantPlaying) return info;
    await delay(150);
  }
  return readPlayerBar();
}

function clickPlaybackMenu(item: string): boolean {
  try {
    execSync(
      `osascript -e 'tell application "System Events" to tell process "TIDAL" to click menu item "${item}" of menu "Playback" of menu bar 1'`,
      { timeout: 4000, stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

export async function setVolume(level: number): Promise<boolean> {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));
  try {
    execSync(`osascript -e 'set volume output volume ${clamped}'`, {
      timeout: 3000,
      stdio: "ignore",
    });
    return true;
  } catch (error) {
    console.error("system volume failed", error);
    return false;
  }
}

export type PlayerBarInfo = {
  isPlaying: boolean;
  title: string | null;
  artist: string | null;
  tidalId: string | null;
};

export async function readPlayerBar(): Promise<PlayerBarInfo> {
  const result = await evaluate<PlayerBarInfo>(
    `(() => {
      const root =
        document.querySelector('[data-test="footer-player"]') ||
        document.querySelector('[data-test="play-controls"]')?.closest("footer, aside, div") ||
        document;
      const hasPause = !!root.querySelector('button[aria-label="Pause"]');
      const links = [...root.querySelectorAll("a")];
      const trackLink = links.find((a) => a.href?.includes("/track/"));
      const artistLink = links.find((a) => a.href?.includes("/artist/"));
      const id = trackLink?.href?.match(/\\/track\\/(\\d+)/)?.[1] || null;
      return {
        isPlaying: hasPause,
        title: trackLink?.textContent?.trim() || null,
        artist: artistLink?.textContent?.trim() || null,
        tidalId: id,
      };
    })()`,
  );
  return result ?? { isPlaying: false, title: null, artist: null, tidalId: null };
}

export async function waitForPlayerChange(
  previous: PlayerBarInfo,
  timeoutMs = 1500,
): Promise<PlayerBarInfo> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = await readPlayerBar();
    if (info.tidalId && info.tidalId !== previous.tidalId) return info;
    if (info.title && previous.title && info.title !== previous.title) return info;
    if (info.isPlaying !== previous.isPlaying && (info.title || info.tidalId)) return info;
    await delay(150);
  }
  return readPlayerBar();
}

export type SearchHit = {
  tidalId: string;
  title: string;
  artist: string;
  tidalUrl: string;
};

export async function searchTidalInSession(query: string): Promise<SearchHit[]> {
  const hits = await evaluate<SearchHit[]>(
    `(() => {
      const query = ${JSON.stringify(query)};
      const urls = [
        "/v1/search/top-hits?query=" + encodeURIComponent(query) + "&limit=10&offset=0&types=TRACKS&countryCode=US",
        "/v1/search?query=" + encodeURIComponent(query) + "&limit=10&offset=0&types=TRACKS&countryCode=US",
      ];
      const parse = (data) => {
        const items = data?.tracks?.items || data?.items || [];
        return items.slice(0, 8).map((item) => {
          const id = String(item.id ?? item.tidalId ?? "");
          const artist = item.artist?.name
            || (item.artists || []).map((a) => a.name).filter(Boolean).join(", ");
          return {
            tidalId: id,
            title: item.title || item.name || "",
            artist: artist || "",
            tidalUrl: id ? "https://listen.tidal.com/track/" + id : "",
          };
        }).filter((row) => row.tidalId && row.title);
      };
      return (async () => {
        for (const url of urls) {
          try {
            const response = await fetch(url, { credentials: "include" });
            if (!response.ok) continue;
            const rows = parse(await response.json());
            if (rows.length) return rows;
          } catch {}
        }
        return [];
      })();
    })()`,
    { awaitPromise: true, timeoutMs: 8000 },
  );
  return Array.isArray(hits) ? hits : [];
}

export async function searchTidal(query: string): Promise<SearchHit[]> {
  const sessionHits = await searchTidalInSession(query);
  if (sessionHits.length > 0) return sessionHits;
  const path = `/search/${encodeURIComponent(query)}`;
  await spaNavigate(path);
  await delay(800);
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
