import WebSocket from "ws";
import { tidalCdpPort } from "./env";
import type { SearchHit } from "./tidal";

type Token = {
  authorization: string;
  userId: string;
};

let cached: { token: Token; expires: number } | null = null;

function userIdFromAuth(authorization: string): string | null {
  try {
    const payload = authorization.replace(/^Bearer\s+/i, "").split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: number | string;
    };
    return json.uid != null ? String(json.uid) : null;
  } catch {
    return null;
  }
}

async function captureAccessToken(): Promise<Token> {
  if (cached && cached.expires > Date.now() + 10_000) return cached.token;

  const raw = await fetch(`http://127.0.0.1:${tidalCdpPort}/json`).then((res) => res.text());
  const targets = JSON.parse(raw) as {
    type: string;
    url: string;
    webSocketDebuggerUrl?: string;
  }[];
  const main = targets.find(
    (target) =>
      target.type === "page" &&
      target.webSocketDebuggerUrl &&
      (target.url.includes("desktop.tidal.com") || target.url.includes("tidal.com")),
  );
  if (!main?.webSocketDebuggerUrl) throw new Error("No TIDAL page for API session");

  const ws = new WebSocket(main.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });

  let authorization = "";
  let nextId = 1;
  const pending = new Map<number, (value: unknown) => void>();

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString()) as {
      id?: number;
      method?: string;
      params?: { request?: { headers?: Record<string, string> } };
    };
    if (msg.method === "Network.requestWillBeSent") {
      const header =
        msg.params?.request?.headers?.Authorization ??
        msg.params?.request?.headers?.authorization;
      if (header?.startsWith("Bearer ") && !authorization) authorization = header;
    }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg);
      pending.delete(msg.id);
    }
  });

  const send = (method: string, params: Record<string, unknown> = {}) => {
    const id = nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`CDP ${method} timed out`)), 8000);
      pending.set(id, (value) => {
        clearTimeout(timer);
        resolve(value);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send("Network.enable");
  await send("Runtime.evaluate", {
    expression:
      "fetch('https://api.tidal.com/v1/sessions?countryCode=US',{headers:{accept:'application/json'}}).catch(()=>{})",
    awaitPromise: true,
    returnByValue: true,
  });

  const start = Date.now();
  while (!authorization && Date.now() - start < 4000) {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (!authorization) {
    await send("Runtime.evaluate", {
      expression:
        "(() => { history.pushState({}, '', '/my-collection/playlists'); dispatchEvent(new PopStateEvent('popstate')); return true; })()",
      returnByValue: true,
    });
    while (!authorization && Date.now() - start < 8000) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  try {
    ws.close();
  } catch {
    // ignore
  }
  const userId = userIdFromAuth(authorization);
  if (!authorization || !userId) throw new Error("Could not capture TIDAL session");

  const token = { authorization, userId };
  cached = { token, expires: Date.now() + 20 * 60_000 };
  return token;
}

async function tidalRequest(
  method: string,
  path: string,
  options?: { form?: URLSearchParams; headers?: Record<string, string> },
): Promise<{ status: number; etag: string | null; json: unknown }> {
  const token = await captureAccessToken();
  const url = path.startsWith("http") ? path : `https://api.tidal.com${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      authorization: token.authorization,
      accept: "application/json",
      "x-tidal-client-version": "2026.9.15",
      ...(options?.form ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      ...options?.headers,
    },
    body: options?.form?.toString(),
  });
  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  return { status: response.status, etag: response.headers.get("etag"), json };
}

export async function searchTracksApi(query: string): Promise<SearchHit[]> {
  const result = await tidalRequest(
    "GET",
    `/v1/search/tracks?query=${encodeURIComponent(query)}&limit=8&offset=0&countryCode=US`,
  );
  const items =
    (result.json as { items?: { id: number; title: string; artist?: { name?: string }; artists?: { name?: string }[] }[] })
      ?.items ?? [];
  return items.map((item) => ({
    tidalId: String(item.id),
    title: item.title,
    artist:
      item.artist?.name ??
      (item.artists ?? []).map((artist) => artist.name).filter(Boolean).join(", "),
    tidalUrl: `https://listen.tidal.com/track/${item.id}`,
  }));
}

function playlistTitle(name: string) {
  return `Asperabad · ${name}`;
}

async function findPlaylistId(title: string): Promise<string | undefined> {
  const token = await captureAccessToken();
  const result = await tidalRequest(
    "GET",
    `/v1/users/${token.userId}/playlists?limit=50&offset=0&countryCode=US`,
  );
  const items =
    (result.json as { items?: { uuid?: string; title?: string }[] })?.items ?? [];
  return items.find((item) => item.title === title)?.uuid;
}

async function playlistTrackIds(uuid: string): Promise<string[]> {
  const result = await tidalRequest(
    "GET",
    `/v1/playlists/${uuid}/items?limit=100&offset=0&countryCode=US`,
  );
  const items =
    (result.json as { items?: { item?: { id?: number } }[] })?.items ?? [];
  return items.map((row) => String(row.item?.id ?? "")).filter(Boolean);
}

async function addTracks(uuid: string, trackIds: string[]) {
  if (trackIds.length === 0) return;
  const meta = await tidalRequest("GET", `/v1/playlists/${uuid}?countryCode=US`);
  const added = await tidalRequest(
    "POST",
    `/v1/playlists/${uuid}/items?countryCode=US`,
    {
      form: new URLSearchParams({
        trackIds: trackIds.join(","),
        onDupes: "ADD",
      }),
      headers: { "if-none-match": meta.etag ?? "*" },
    },
  );
  if (added.status >= 400) {
    throw new Error(`Could not add tracks to TIDAL playlist (${added.status})`);
  }
}

async function replaceTracks(uuid: string, trackIds: string[]): Promise<boolean> {
  const current = await playlistTrackIds(uuid);
  if (current.join(",") === trackIds.join(",")) return true;
  if (current.length > 0) {
    const meta = await tidalRequest("GET", `/v1/playlists/${uuid}?countryCode=US`);
    const removed = await tidalRequest(
      "DELETE",
      `/v1/playlists/${uuid}/items?countryCode=US`,
      {
        form: new URLSearchParams({
          order: current.map((_, index) => String(index)).join(","),
        }),
        headers: { "if-none-match": meta.etag ?? "*" },
      },
    );
    if (removed.status >= 400) return false;
  }
  await addTracks(uuid, trackIds);
  const next = await playlistTrackIds(uuid);
  return next.join(",") === trackIds.join(",");
}

export async function syncVibePlaylist(
  vibeName: string,
  trackIds: string[],
  existingId?: string,
): Promise<string> {
  const title = playlistTitle(vibeName);
  let uuid = existingId ?? (await findPlaylistId(title));

  if (uuid) {
    if (await replaceTracks(uuid, trackIds)) return uuid;
    await tidalRequest("DELETE", `/v1/playlists/${uuid}?countryCode=US`);
    uuid = undefined;
  }

  const token = await captureAccessToken();
  const created = await tidalRequest(
    "POST",
    `/v1/users/${token.userId}/playlists?countryCode=US`,
    {
      form: new URLSearchParams({
        title,
        description: "Managed by Asperabad DJ. Safe to leave; the daemon rewrites it.",
      }),
    },
  );
  const createdUuid = (created.json as { uuid?: string } | null)?.uuid;
  if (created.status >= 400 || !createdUuid) {
    throw new Error(`Could not create TIDAL playlist “${title}”`);
  }
  await addTracks(createdUuid, trackIds);
  return createdUuid;
}

export async function syncAnthemPlaylist(trackId: string): Promise<string> {
  return syncVibePlaylist("Anthem", [trackId]);
}
