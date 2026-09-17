import { captureAuthorization, clearCapturedAuthorization, type SearchHit } from "./tidal";

type Token = {
  authorization: string;
  userId: string;
};

export type PlaylistTrack = {
  tidalId: string;
  title: string;
  artist: string;
  tidalUrl: string;
};

export type LoadedPlaylist = {
  uuid: string;
  tracks: PlaylistTrack[];
  etag: string | null;
  unchanged?: boolean;
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

function artistName(item: {
  artist?: { name?: string };
  artists?: { name?: string }[];
}): string {
  return (
    item.artist?.name ??
    (item.artists ?? []).map((artist) => artist.name).filter(Boolean).join(", ")
  );
}

async function captureAccessToken(): Promise<Token> {
  if (cached && cached.expires > Date.now() + 10_000) return cached.token;
  const authorization = await captureAuthorization();
  const userId = userIdFromAuth(authorization);
  if (!authorization || !userId) throw new Error("Could not capture TIDAL session");
  const token = { authorization, userId };
  cached = { token, expires: Date.now() + 20 * 60_000 };
  return token;
}

function clearToken() {
  cached = null;
  clearCapturedAuthorization();
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
  if (response.status === 401) {
    clearToken();
  }
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

async function tidalRequestRetry(
  method: string,
  path: string,
  options?: { form?: URLSearchParams; headers?: Record<string, string> },
) {
  const first = await tidalRequest(method, path, options);
  if (first.status !== 401) return first;
  return tidalRequest(method, path, options);
}

export async function searchTracksApi(query: string): Promise<SearchHit[]> {
  const result = await tidalRequestRetry(
    "GET",
    `/v1/search/tracks?query=${encodeURIComponent(query)}&limit=8&offset=0&countryCode=US`,
  );
  const items =
    (result.json as { items?: { id: number; title: string; artist?: { name?: string }; artists?: { name?: string }[] }[] })
      ?.items ?? [];
  return items.map((item) => ({
    tidalId: String(item.id),
    title: item.title,
    artist: artistName(item),
    tidalUrl: `https://listen.tidal.com/track/${item.id}`,
  }));
}

function playlistTitle(name: string) {
  return `Asperabad · ${name}`;
}

async function findPlaylistId(title: string): Promise<string | undefined> {
  const token = await captureAccessToken();
  let offset = 0;
  while (true) {
    const result = await tidalRequestRetry(
      "GET",
      `/v1/users/${token.userId}/playlists?limit=50&offset=${offset}&countryCode=US`,
    );
    if (result.status >= 400) throw tidalFailure("list TIDAL playlists", result);
    const items =
      (result.json as { items?: { uuid?: string; title?: string }[] })?.items ?? [];
    const match = items.find((item) => item.title === title)?.uuid;
    if (match) return match;
    if (items.length < 50) return undefined;
    offset += 50;
  }
}

async function playlistMeta(uuid: string): Promise<{ etag: string | null } | null> {
  const result = await tidalRequestRetry("GET", `/v1/playlists/${uuid}?countryCode=US`);
  if (result.status === 404) return null;
  if (result.status >= 400) throw tidalFailure("load TIDAL playlist", result);
  return { etag: result.etag };
}

export async function playlistItems(uuid: string): Promise<PlaylistTrack[]> {
  const tracks: PlaylistTrack[] = [];
  let offset = 0;
  while (true) {
    const result = await tidalRequestRetry(
      "GET",
      `/v1/playlists/${uuid}/items?limit=100&offset=${offset}&countryCode=US`,
    );
    if (result.status >= 400) {
      throw tidalFailure("load TIDAL playlist tracks", result);
    }
    const items =
      (
        result.json as {
          items?: {
            item?: {
              id?: number;
              title?: string;
              artist?: { name?: string };
              artists?: { name?: string }[];
            };
          }[];
        }
      )?.items ?? [];
    for (const row of items) {
      const id = row.item?.id;
      const title = row.item?.title;
      if (!id || !title) continue;
      tracks.push({
        tidalId: String(id),
        title,
        artist: artistName(row.item ?? {}),
        tidalUrl: `https://listen.tidal.com/track/${id}`,
      });
    }
    if (items.length < 100) break;
    offset += 100;
  }
  return tracks;
}

function tidalFailure(action: string, result: { status: number; json: unknown }) {
  const json = result.json as { userMessage?: string; subStatus?: number } | null;
  const detail = json?.userMessage ? `: ${json.userMessage}` : "";
  return new Error(`Could not ${action} (${result.status}${detail})`);
}

export async function addTracks(uuid: string, trackIds: string[]) {
  if (trackIds.length === 0) return;
  const meta = await tidalRequestRetry("GET", `/v1/playlists/${uuid}?countryCode=US`);
  const added = await tidalRequestRetry(
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
    console.error("TIDAL add failed", added.status, added.json);
    throw tidalFailure("add tracks to TIDAL playlist", added);
  }
}

async function deletePlaylistItems(uuid: string, indices: number[]) {
  if (indices.length === 0) return { status: 200, json: null };
  const unique = [...new Set(indices.filter((index) => index >= 0))].sort((a, b) => b - a);
  const meta = await tidalRequestRetry("GET", `/v1/playlists/${uuid}?countryCode=US`);
  return tidalRequestRetry(
    "DELETE",
    `/v1/playlists/${uuid}/items/${unique.join(",")}?countryCode=US`,
    { headers: { "if-none-match": meta.etag ?? "*" } },
  );
}

async function createPlaylist(title: string): Promise<string> {
  const token = await captureAccessToken();
  const created = await tidalRequestRetry(
    "POST",
    `/v1/users/${token.userId}/playlists?countryCode=US`,
    {
      form: new URLSearchParams({
        title,
        description: "Asperabad DJ anthem. Managed from the remote.",
      }),
    },
  );
  const createdUuid = (created.json as { uuid?: string } | null)?.uuid;
  if (created.status >= 400 || !createdUuid) {
    throw new Error(`Could not create TIDAL playlist “${title}”`);
  }
  return createdUuid;
}

async function loadPlaylistByUuid(
  uuid: string,
  ifNoneMatch?: string,
): Promise<LoadedPlaylist | null> {
  const meta = await playlistMeta(uuid);
  if (!meta) return null;
  if (ifNoneMatch && meta.etag && meta.etag === ifNoneMatch) {
    return { uuid, tracks: [], etag: meta.etag, unchanged: true };
  }
  return { uuid, tracks: await playlistItems(uuid), etag: meta.etag };
}

export async function loadVibePlaylist(
  vibeName: string,
  existingId?: string,
  options?: { ifNoneMatch?: string },
): Promise<LoadedPlaylist> {
  const title = playlistTitle(vibeName);
  if (existingId) {
    const loaded = await loadPlaylistByUuid(existingId, options?.ifNoneMatch);
    if (loaded) return loaded;
  }
  const uuid = await findPlaylistId(title);
  if (!uuid) {
    throw new Error(`TIDAL playlist “${title}” was not found`);
  }
  const loaded = await loadPlaylistByUuid(uuid, options?.ifNoneMatch);
  if (!loaded) {
    throw new Error(`TIDAL playlist “${title}” was not found`);
  }
  return loaded;
}

function sameTrackSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const counts = new Map<string, number>();
  for (const id of left) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const id of right) {
    const count = counts.get(id);
    if (!count) return false;
    counts.set(id, count - 1);
  }
  return true;
}

export async function replaceTracks(uuid: string, trackIds: string[]): Promise<boolean> {
  const current = (await playlistItems(uuid)).map((track) => track.tidalId);
  if (sameTrackSet(current, trackIds)) return true;
  if (current.length > 0) {
    const removed = await deletePlaylistItems(
      uuid,
      current.map((_, index) => index),
    );
    if (removed.status >= 400) {
      console.error("TIDAL replace-delete failed", removed.status, removed.json);
      return false;
    }
  }
  await addTracks(uuid, trackIds);
  const next = (await playlistItems(uuid)).map((track) => track.tidalId);
  return next.join(",") === trackIds.join(",");
}

export async function syncAnthemPlaylist(trackId: string): Promise<string> {
  let uuid: string;
  try {
    uuid = (await loadVibePlaylist("Anthem")).uuid;
  } catch {
    uuid = await createPlaylist(playlistTitle("Anthem"));
  }
  if (await replaceTracks(uuid, [trackId])) return uuid;
  await tidalRequestRetry("DELETE", `/v1/playlists/${uuid}?countryCode=US`);
  const created = await createPlaylist(playlistTitle("Anthem"));
  await addTracks(created, [trackId]);
  return created;
}
