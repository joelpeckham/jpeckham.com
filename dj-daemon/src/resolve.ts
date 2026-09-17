import type { DjTrack } from "@/lib/dj/protocol";
import { searchTidal } from "./tidal";

export function parseTidalUrl(input: string): { type: string; id: string } | null {
  const urlMatch = input.match(
    /(?:https?:\/\/)?(?:listen\.|www\.)?tidal\.com\/(?:browse\/)?(track|album|playlist|mix|artist)\/([^\s?#]+)/i,
  );
  if (urlMatch) return { type: urlMatch[1]!, id: urlMatch[2]! };
  const short = input.match(/^(track|album|playlist|mix|artist)\/([^\s]+)$/i);
  if (short) return { type: short[1]!, id: short[2]! };
  if (/^\d+$/.test(input.trim())) return { type: "track", id: input.trim() };
  return null;
}

export function parseSpotifyTrackUrl(input: string): string | null {
  const match = input.match(
    /(?:https?:\/\/)?open\.spotify\.com\/track\/([A-Za-z0-9]+)/i,
  );
  return match?.[1] ?? null;
}

export async function resolveViaOdesli(url: string): Promise<Partial<DjTrack> | null> {
  try {
    const endpoint = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}&userCountry=US`;
    const response = await fetch(endpoint, {
      headers: { "User-Agent": "asperabad-dj/1.0" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      linksByPlatform?: { tidal?: { url?: string } };
      entitiesByUniqueId?: Record<
        string,
        { apiProvider?: string; type?: string; title?: string; artistName?: string }
      >;
    };
    const tidalUrl = data.linksByPlatform?.tidal?.url;
    const tidalId = tidalUrl?.match(/\/track\/(\d+)/)?.[1];
    let title: string | undefined;
    let artist: string | undefined;
    for (const entity of Object.values(data.entitiesByUniqueId ?? {})) {
      if (entity.apiProvider === "tidal" && entity.type === "song") {
        title = entity.title;
        artist = entity.artistName;
        break;
      }
    }
    if (!tidalId && !title) return null;
    return { tidalId, tidalUrl, title, artist };
  } catch {
    return null;
  }
}

export async function resolveTrackInput(
  input: string,
  fallback?: { title?: string; artist?: string },
): Promise<Partial<DjTrack>> {
  const tidal = parseTidalUrl(input);
  if (tidal?.type === "track") {
    return {
      tidalId: tidal.id,
      tidalUrl: `https://listen.tidal.com/track/${tidal.id}`,
      title: fallback?.title,
      artist: fallback?.artist,
    };
  }

  const spotifyId = parseSpotifyTrackUrl(input);
  if (spotifyId) {
    const odesli = await resolveViaOdesli(
      `https://open.spotify.com/track/${spotifyId}`,
    );
    if (odesli?.tidalId) {
      return {
        ...odesli,
        spotifyUrl: `https://open.spotify.com/track/${spotifyId}`,
      };
    }
  }

  if (/^https?:\/\//i.test(input)) {
    const odesli = await resolveViaOdesli(input);
    if (odesli) return odesli;
  }

  const query = fallback?.title
    ? `${fallback.title} ${fallback.artist ?? ""}`.trim()
    : input;
  const hits = await searchTidal(query);
  const first = hits[0];
  if (!first) return {};
  return {
    title: first.title,
    artist: first.artist,
    tidalId: first.tidalId,
    tidalUrl: first.tidalUrl,
  };
}
