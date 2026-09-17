import { Redis } from "@upstash/redis";
import {
  mergeParts,
  type DjCatalog,
  type DjCommand,
  type DjLive,
  type DjState,
} from "./protocol";

export const DJ_COMMANDS_KEY = "dj:commands";
export const DJ_SNAPSHOT_KEY = "dj:snapshot";
export const DJ_CATALOG_KEY = "dj:catalog";
export const DJ_LIVE_KEY = "dj:live";
export const DJ_DAEMON_KEY = "dj:daemon";

export type SnapshotEnvelope = {
  version: number;
  catalogVersion: number;
  daemonOnline: boolean;
  state: DjState | null;
};

let redis: Redis | null = null;

export function getDjRedis(): Redis {
  if (redis) return redis;
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Upstash Redis is not configured. Expected KV_REST_API_URL and KV_REST_API_TOKEN.",
    );
  }
  redis = new Redis({ url, token });
  return redis;
}

export async function pushCommand(command: DjCommand): Promise<void> {
  await getDjRedis().rpush(DJ_COMMANDS_KEY, JSON.stringify(command));
}

function parseCommand(raw: unknown): DjCommand | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as DjCommand;
  try {
    return JSON.parse(String(raw)) as DjCommand;
  } catch {
    return null;
  }
}

export async function popCommand(): Promise<DjCommand | null> {
  const raw = await getDjRedis().lpop<string>(DJ_COMMANDS_KEY);
  return parseCommand(raw);
}

async function blpopCommand(timeoutSec: number): Promise<unknown> {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis is not configured.");
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(["BLPOP", DJ_COMMANDS_KEY, String(timeoutSec)]),
  });
  const json = (await response.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(json.error);
  const result = json.result;
  if (!result) return null;
  if (Array.isArray(result)) return result[1] ?? null;
  return result;
}

export async function popCommandBlocking(timeoutSec = 10): Promise<DjCommand | null> {
  try {
    return parseCommand(await blpopCommand(timeoutSec));
  } catch (error) {
    console.error("dj relay: blpop failed, falling back to lpop", error);
    const command = await popCommand();
    if (!command) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return command;
  }
}

function isDaemonFlag(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

export async function writeLive(live: DjLive): Promise<void> {
  const client = getDjRedis();
  await Promise.all([
    client.set(DJ_LIVE_KEY, live),
    client.set(DJ_DAEMON_KEY, "1", { ex: 20 }),
  ]);
}

export async function writeCatalog(catalog: DjCatalog): Promise<void> {
  await getDjRedis().set(DJ_CATALOG_KEY, catalog);
}

export async function writeSnapshot(state: DjState): Promise<void> {
  const live: DjLive = {
    version: state.version,
    catalogVersion: state.catalogVersion ?? 0,
    daemonOnline: true,
    transport: state.transport,
    nowPlaying: state.nowPlaying,
    search: state.search,
    pending: state.pending,
    lastError: state.lastError,
  };
  const catalog: DjCatalog = {
    catalogVersion: state.catalogVersion ?? 0,
    vibes: state.vibes,
    characters: state.characters,
  };
  const envelope: SnapshotEnvelope = {
    version: state.version,
    catalogVersion: state.catalogVersion ?? 0,
    daemonOnline: true,
    state,
  };
  const client = getDjRedis();
  await Promise.all([
    client.set(DJ_LIVE_KEY, live),
    client.set(DJ_CATALOG_KEY, catalog),
    client.set(DJ_SNAPSHOT_KEY, envelope),
    client.set(DJ_DAEMON_KEY, "1", { ex: 20 }),
  ]);
}

export async function readLive(): Promise<DjLive | null> {
  return getDjRedis().get<DjLive>(DJ_LIVE_KEY);
}

export async function readCatalog(): Promise<DjCatalog | null> {
  return getDjRedis().get<DjCatalog>(DJ_CATALOG_KEY);
}

export async function markDaemonOffline(): Promise<void> {
  const client = getDjRedis();
  const [live, catalog] = await Promise.all([readLive(), readCatalog()]);
  const nextLive: DjLive | null = live
    ? {
        ...live,
        version: live.version + 1,
        daemonOnline: false,
        pending: null,
      }
    : null;
  await Promise.all([
    nextLive ? client.set(DJ_LIVE_KEY, nextLive) : Promise.resolve(),
    client.del(DJ_DAEMON_KEY),
    client.set(DJ_SNAPSHOT_KEY, {
      version: (nextLive?.version ?? 0),
      catalogVersion: nextLive?.catalogVersion ?? catalog?.catalogVersion ?? 0,
      daemonOnline: false,
      state: mergeParts(catalog, nextLive, false),
    } satisfies SnapshotEnvelope),
  ]);
}

export async function refreshDaemonHeartbeat(): Promise<void> {
  await getDjRedis().set(DJ_DAEMON_KEY, "1", { ex: 20 });
}

export async function readDaemonOnline(): Promise<boolean> {
  return isDaemonFlag(await getDjRedis().get<string>(DJ_DAEMON_KEY));
}

export async function readSnapshot(): Promise<SnapshotEnvelope> {
  const [live, catalog, online, legacy] = await Promise.all([
    readLive(),
    readCatalog(),
    getDjRedis().get<string>(DJ_DAEMON_KEY),
    getDjRedis().get<SnapshotEnvelope>(DJ_SNAPSHOT_KEY),
  ]);
  const daemonOnline = isDaemonFlag(online);
  if (live || catalog) {
    const state = mergeParts(catalog, live, daemonOnline);
    return {
      version: state.version,
      catalogVersion: state.catalogVersion,
      daemonOnline,
      state,
    };
  }
  if (!legacy) {
    return {
      version: 0,
      catalogVersion: 0,
      daemonOnline,
      state: null,
    };
  }
  return {
    ...legacy,
    catalogVersion: legacy.catalogVersion ?? legacy.state?.catalogVersion ?? 0,
    daemonOnline,
    state: legacy.state
      ? { ...legacy.state, daemonOnline, catalogVersion: legacy.state.catalogVersion ?? 0 }
      : null,
  };
}
