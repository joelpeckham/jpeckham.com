import { Redis } from "@upstash/redis";
import { commandStillFresh, shouldAcceptEnqueue } from "./policy";
import {
  mergeParts,
  parseDjCatalog,
  parseDjCommand,
  parseDjLive,
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

export const DJ_MAX_COMMANDS = 32;
export const DJ_COMMAND_TTL_MS = 30_000;
export const DJ_LEASE_TTL_SEC = 20;

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

export type QueuedCommand = {
  command: DjCommand | null;
  expired: DjCommand | null;
};

export function inspectQueuedCommand(raw: unknown, now = Date.now()): QueuedCommand {
  if (!raw) return { command: null, expired: null };
  const value =
    typeof raw === "object"
      ? raw
      : (() => {
          try {
            return JSON.parse(String(raw)) as unknown;
          } catch {
            return null;
          }
        })();
  const command = parseDjCommand(value);
  if (!command) return { command: null, expired: null };
  if (!commandStillFresh(command.enqueuedAt, now, DJ_COMMAND_TTL_MS)) {
    return { command: null, expired: command };
  }
  return { command, expired: null };
}

function parseCommand(raw: unknown): DjCommand | null {
  return inspectQueuedCommand(raw).command;
}

export async function pushCommand(command: DjCommand): Promise<boolean> {
  const client = getDjRedis();
  const payload = JSON.stringify({ ...command, enqueuedAt: Date.now() });
  const accepted = await client.eval<[number, string], number>(
    `if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
     if redis.call('LLEN', KEYS[2]) >= tonumber(ARGV[1]) then return 0 end
     redis.call('RPUSH', KEYS[2], ARGV[2])
     return 1`,
    [DJ_DAEMON_KEY, DJ_COMMANDS_KEY],
    [DJ_MAX_COMMANDS, payload],
  );
  return accepted === 1;
}

export async function requeueCommand(command: DjCommand): Promise<void> {
  const enqueuedAt = command.enqueuedAt ?? Date.now();
  if (!commandStillFresh(enqueuedAt, Date.now(), DJ_COMMAND_TTL_MS)) return;
  const length = await getDjRedis().llen(DJ_COMMANDS_KEY);
  if (!shouldAcceptEnqueue(length, DJ_MAX_COMMANDS)) return;
  await getDjRedis().lpush(
    DJ_COMMANDS_KEY,
    JSON.stringify({ ...command, enqueuedAt }),
  );
}

export async function flushCommands(): Promise<void> {
  await getDjRedis().del(DJ_COMMANDS_KEY);
}

export async function popCommand(): Promise<DjCommand | null> {
  const raw = await getDjRedis().lpop<string>(DJ_COMMANDS_KEY);
  return parseCommand(raw);
}

async function blpopCommand(
  timeoutSec: number,
  signal?: AbortSignal,
): Promise<unknown> {
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
    signal,
  });
  if (!response.ok) {
    throw new Error(`blpop http ${response.status}`);
  }
  const json = (await response.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(json.error);
  const result = json.result;
  if (!result) return null;
  if (Array.isArray(result)) return result[1] ?? null;
  return result;
}

export async function popCommandBlocking(
  timeoutSec = 10,
  signal?: AbortSignal,
): Promise<QueuedCommand> {
  try {
    return inspectQueuedCommand(await blpopCommand(timeoutSec, signal));
  } catch (error) {
    if (signal?.aborted) return { command: null, expired: null };
    console.error("dj relay: blpop failed", error);
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { command: null, expired: null };
  }
}

function isLeaseValue(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value !== "0" && value !== "1";
}

export async function readDaemonGeneration(): Promise<string | null> {
  const value = await getDjRedis().get<string>(DJ_DAEMON_KEY);
  return isLeaseValue(value) ? value : null;
}

export async function claimDaemonLease(generation: string): Promise<boolean> {
  const client = getDjRedis();
  const created = await client.set(DJ_DAEMON_KEY, generation, {
    ex: DJ_LEASE_TTL_SEC,
    nx: true,
  });
  if (created === "OK") return true;
  const current = await readDaemonGeneration();
  if (current === generation) {
    await client.set(DJ_DAEMON_KEY, generation, { ex: DJ_LEASE_TTL_SEC });
    return true;
  }
  return false;
}

export async function refreshDaemonLease(generation: string): Promise<boolean> {
  const current = await readDaemonGeneration();
  if (current !== generation) return false;
  await getDjRedis().set(DJ_DAEMON_KEY, generation, { ex: DJ_LEASE_TTL_SEC });
  return true;
}

export async function ownsDaemonLease(generation: string): Promise<boolean> {
  const current = await readDaemonGeneration();
  return current === generation;
}

export async function writeLive(
  live: DjLive,
  generation?: string,
): Promise<boolean> {
  if (generation && !(await ownsDaemonLease(generation))) return false;
  const existing = await readLive();
  if (existing && existing.version >= live.version) return false;
  const client = getDjRedis();
  await Promise.all([
    client.set(DJ_LIVE_KEY, live),
    generation
      ? client.set(DJ_DAEMON_KEY, generation, { ex: DJ_LEASE_TTL_SEC })
      : Promise.resolve(),
  ]);
  return true;
}

export async function writeCatalog(
  catalog: DjCatalog,
  generation?: string,
): Promise<boolean> {
  if (generation && !(await ownsDaemonLease(generation))) return false;
  const existing = await readCatalog();
  if (existing && existing.catalogVersion >= catalog.catalogVersion) return false;
  await getDjRedis().set(DJ_CATALOG_KEY, catalog);
  return true;
}

export async function writeSnapshot(
  state: DjState,
  generation?: string,
): Promise<boolean> {
  if (generation && !(await ownsDaemonLease(generation))) return false;
  const existing = await readLive();
  if (existing && existing.version >= state.version) return false;
  const live: DjLive = {
    version: state.version,
    catalogVersion: state.catalogVersion ?? 0,
    daemonOnline: true,
    transport: state.transport,
    nowPlaying: state.nowPlaying,
    pending: state.pending,
    lastError: state.lastError,
    lastAck: state.lastAck,
    health: state.health,
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
    generation
      ? client.set(DJ_DAEMON_KEY, generation, { ex: DJ_LEASE_TTL_SEC })
      : Promise.resolve(),
  ]);
  return true;
}

export async function readLive(): Promise<DjLive | null> {
  return parseDjLive(await getDjRedis().get(DJ_LIVE_KEY));
}

export async function readCatalog(): Promise<DjCatalog | null> {
  return parseDjCatalog(await getDjRedis().get(DJ_CATALOG_KEY));
}

export async function markDaemonOffline(generation: string): Promise<void> {
  if (!(await ownsDaemonLease(generation))) return;
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
      version: nextLive?.version ?? 0,
      catalogVersion: nextLive?.catalogVersion ?? catalog?.catalogVersion ?? 0,
      daemonOnline: false,
      state: mergeParts(catalog, nextLive, false),
    } satisfies SnapshotEnvelope),
  ]);
}

export async function refreshDaemonHeartbeat(): Promise<void> {
  const current = await readDaemonGeneration();
  if (!current) return;
  await getDjRedis().set(DJ_DAEMON_KEY, current, { ex: DJ_LEASE_TTL_SEC });
}

export async function readDaemonOnline(): Promise<boolean> {
  return Boolean(await readDaemonGeneration());
}

export async function readSnapshot(): Promise<SnapshotEnvelope> {
  const [live, catalog, online, legacy] = await Promise.all([
    readLive(),
    readCatalog(),
    getDjRedis().get<string>(DJ_DAEMON_KEY),
    getDjRedis().get<SnapshotEnvelope>(DJ_SNAPSHOT_KEY),
  ]);
  const daemonOnline = isLeaseValue(online);
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
      ? {
          ...legacy.state,
          daemonOnline,
          catalogVersion: legacy.state.catalogVersion ?? 0,
        }
      : null,
  };
}
