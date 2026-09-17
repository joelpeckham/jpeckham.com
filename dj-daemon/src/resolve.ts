import type { DjTrack } from "@/lib/dj/protocol";
import { searchTracksApi } from "./tidal-api";
import { searchTidal, type SearchHit } from "./tidal";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreHit(hit: SearchHit, title?: string, artist?: string): number {
  if (!title) return 0;
  const hitTitle = normalize(hit.title);
  const wantTitle = normalize(title);
  if (!hitTitle || !wantTitle) return 0;
  let score = 0;
  if (hitTitle === wantTitle) score += 4;
  else if (hitTitle.includes(wantTitle) || wantTitle.includes(hitTitle)) score += 3;
  else {
    const words = wantTitle.split(" ").filter((word) => word.length > 3);
    const matched = words.filter((word) => hitTitle.includes(word)).length;
    if (words.length && matched / words.length >= 0.6) score += 2;
  }
  if (artist) {
    const hitArtist = normalize(hit.artist);
    const wantArtist = normalize(artist).split(" ")[0] ?? "";
    if (wantArtist && hitArtist.includes(wantArtist)) score += 1;
  }
  return score;
}

function pickSearchHit(
  hits: SearchHit[],
  fallback?: { title?: string; artist?: string },
): SearchHit | undefined {
  if (hits.length === 0) return undefined;
  if (!fallback?.title) return hits[0];
  const ranked = hits
    .map((hit) => ({ hit, score: scoreHit(hit, fallback.title, fallback.artist) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0] && ranked[0].score >= 1 ? ranked[0].hit : hits[0];
}

export function searchQuery(title: string, artist: string): string {
  const composer = (artist.split(",")[0] ?? "").trim();
  const lastName = composer.split(/\s+/).filter(Boolean).at(-1) ?? composer;
  const work =
    title.match(
      /symphony no\.?\s*\d+|serenade|cello concerto|violin concerto|romeo and juliet|the planets|second waltz|new world|water goblin|lilac|lvst|intercessor|dance of the knights/i,
    )?.[0] ?? title.split(/[:(\u2013]/)[0]?.trim() ?? title;
  const movement = title.match(
    /allegretto|adagio|scherzo|finale|allegro|waltz|mars|molto vivace|con fuoco/i,
  )?.[0];
  return [lastName, work, movement].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

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
  options?: { allowNavigate?: boolean },
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
    ? searchQuery(fallback.title, fallback.artist ?? "")
    : input;
  const sessionHits = await searchTracksApi(query).catch(() => []);
  const sessionMatch = pickSearchHit(sessionHits, fallback);
  if (sessionMatch?.tidalId) {
    return {
      tidalId: sessionMatch.tidalId,
      tidalUrl: sessionMatch.tidalUrl,
      title: fallback?.title ?? sessionMatch.title,
      artist: fallback?.artist ?? sessionMatch.artist,
    };
  }

  if (!options?.allowNavigate) return {};

  const hits = await searchTidal(query);
  const match = pickSearchHit(hits, fallback);
  if (!match) return {};
  return {
    title: fallback?.title ?? match.title,
    artist: fallback?.artist ?? match.artist,
    tidalId: match.tidalId,
    tidalUrl: match.tidalUrl,
  };
}
