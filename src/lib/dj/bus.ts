import { Redis } from "@upstash/redis";
import type { DjCommand, DjState } from "./protocol";

export const DJ_COMMANDS_KEY = "dj:commands";
export const DJ_SNAPSHOT_KEY = "dj:snapshot";
export const DJ_DAEMON_KEY = "dj:daemon";

export type SnapshotEnvelope = {
  version: number;
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

export async function popCommand(): Promise<DjCommand | null> {
  const raw = await getDjRedis().lpop<string>(DJ_COMMANDS_KEY);
  if (!raw) return null;
  if (typeof raw === "object") return raw as unknown as DjCommand;
  try {
    return JSON.parse(raw) as DjCommand;
  } catch {
    return null;
  }
}

export async function writeSnapshot(state: DjState): Promise<void> {
  const envelope: SnapshotEnvelope = {
    version: state.version,
    daemonOnline: true,
    state,
  };
  const client = getDjRedis();
  await Promise.all([
    client.set(DJ_SNAPSHOT_KEY, envelope),
    client.set(DJ_DAEMON_KEY, "1", { ex: 20 }),
  ]);
}

export async function markDaemonOffline(): Promise<void> {
  const client = getDjRedis();
  const current = await readSnapshot();
  const envelope: SnapshotEnvelope = {
    version: (current?.version ?? 0) + 1,
    daemonOnline: false,
    state: current?.state
      ? { ...current.state, daemonOnline: false, version: (current.version ?? 0) + 1 }
      : null,
  };
  await Promise.all([
    client.set(DJ_SNAPSHOT_KEY, envelope),
    client.del(DJ_DAEMON_KEY),
  ]);
}

export async function refreshDaemonHeartbeat(): Promise<void> {
  await getDjRedis().set(DJ_DAEMON_KEY, "1", { ex: 20 });
}

function isDaemonFlag(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

export async function readSnapshot(): Promise<SnapshotEnvelope> {
  const [envelope, online] = await Promise.all([
    getDjRedis().get<SnapshotEnvelope>(DJ_SNAPSHOT_KEY),
    getDjRedis().get<string>(DJ_DAEMON_KEY),
  ]);
  const daemonOnline = isDaemonFlag(online);
  if (!envelope) {
    return {
      version: 0,
      daemonOnline,
      state: null,
    };
  }
  return {
    ...envelope,
    daemonOnline: daemonOnline || Boolean(envelope.daemonOnline),
    state: envelope.state
      ? { ...envelope.state, daemonOnline }
      : null,
  };
}
