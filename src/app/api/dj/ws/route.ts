import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { experimental_upgradeWebSocket } from "@vercel/functions";
import type { WebSocket } from "ws";
import {
  claimDaemonLease,
  markDaemonOffline,
  popCommandBlocking,
  pushCommand,
  readCatalog,
  readDaemonOnline,
  readLive,
  readSnapshot,
  refreshDaemonLease,
  requeueCommand,
  writeCatalog,
  writeLive,
  writeSnapshot,
} from "@/lib/dj/bus";
import {
  emptyState,
  parseDjCommand,
  parseWireMessage,
  type DaemonMessage,
  type DjLive,
} from "@/lib/dj/protocol";

export const runtime = "nodejs";
export const maxDuration = 800;
export const dynamic = "force-dynamic";

const HELLO_WINDOW_MS = 60_000;
const HELLO_MAX_FAILURES = 8;
const helloFails = new Map<string, { count: number; resetAt: number }>();

function secretsEqual(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function isProduction() {
  return process.env.VERCEL_ENV === "production";
}

function hostnameAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "jpeckham.com" || host === "www.jpeckham.com") return true;
  if (!isProduction() && (host === "localhost" || host === "127.0.0.1")) {
    return true;
  }
  return false;
}

function isAllowedUpgrade(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return hostnameAllowed(new URL(origin).hostname);
    } catch {
      return false;
    }
  }
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0] ?? "";
  return hostnameAllowed(hostname);
}

function remoteOriginAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (isProduction()) {
    if (!origin) return false;
    try {
      return hostnameAllowed(new URL(origin).hostname);
    } catch {
      return false;
    }
  }
  if (!origin) return true;
  try {
    return hostnameAllowed(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function helloAllowed(ip: string): boolean {
  const now = Date.now();
  const entry = helloFails.get(ip);
  if (!entry || now > entry.resetAt) {
    helloFails.set(ip, { count: 0, resetAt: now + HELLO_WINDOW_MS });
    return true;
  }
  return entry.count < HELLO_MAX_FAILURES;
}

function recordHelloFail(ip: string) {
  const now = Date.now();
  const entry = helloFails.get(ip);
  if (!entry || now > entry.resetAt) {
    helloFails.set(ip, { count: 1, resetAt: now + HELLO_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function send(ws: WebSocket, payload: unknown): boolean {
  if (ws.readyState !== ws.OPEN) return false;
  ws.send(JSON.stringify(payload));
  return true;
}

function waitForHello(ws: WebSocket, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("hello timeout"));
    }, timeoutMs);

    const onMessage = (data: unknown) => {
      const raw = typeof data === "string" ? data : Buffer.from(data as Buffer).toString();
      cleanup();
      resolve(raw);
    };
    const onClose = () => {
      cleanup();
      reject(new Error("closed before hello"));
    };

    function cleanup() {
      clearTimeout(timer);
      ws.off("message", onMessage);
      ws.off("close", onClose);
    }

    ws.once("message", onMessage);
    ws.once("close", onClose);
  });
}

async function persistDaemonMessage(
  message: DaemonMessage,
  generation: string,
) {
  if (message.type === "snapshot" && message.snapshot) {
    await writeSnapshot(
      {
        ...message.snapshot,
        catalogVersion: message.snapshot.catalogVersion ?? 0,
      },
      generation,
    );
    return;
  }
  if (message.type === "live") {
    await writeLive(message.live, generation);
    return;
  }
  if (message.type === "catalog") {
    await writeCatalog(message.catalog, generation);
  }
}

async function nackExpired(id: string, generation: string) {
  const live = await readLive();
  if (!live) return;
  await writeLive(
    {
      ...live,
      version: live.version + 1,
      lastError: "Command expired before the daemon could run it",
      lastAck: { id, ok: false, error: "expired" },
    },
    generation,
  );
}

async function runDaemonSocket(ws: WebSocket) {
  const generation = crypto.randomUUID();
  let alive = true;
  let closed = false;
  let persistTail = Promise.resolve();
  const abort = new AbortController();
  ws.once("close", () => {
    alive = false;
    closed = true;
    abort.abort();
  });

  ws.on("message", (data) => {
    const raw = typeof data === "string" ? data : data.toString();
    const message = parseWireMessage(raw);
    if (!message) return;
    if (message.type === "ping") {
      send(ws, { type: "pong" });
      return;
    }
    if (
      message.type !== "snapshot" &&
      message.type !== "live" &&
      message.type !== "catalog"
    ) {
      return;
    }
    persistTail = persistTail
      .then(() => {
        if (closed) return;
        return persistDaemonMessage(message as DaemonMessage, generation);
      })
      .catch((error: unknown) => {
        console.error("dj relay: failed to persist snapshot", error);
      });
  });

  const claimedAt = Date.now();
  while (alive && ws.readyState === ws.OPEN) {
    if (await claimDaemonLease(generation)) break;
    if (Date.now() - claimedAt > 25_000) {
      send(ws, {
        type: "error",
        code: "lease",
        message: "another daemon holds the table",
      });
      ws.close();
      return;
    }
    await sleep(400);
  }
  if (!alive || ws.readyState !== ws.OPEN) return;

  const initial = await readSnapshot();
  send(ws, {
    type: "ready",
    daemonOnline: true,
    snapshot: initial.state,
  });

  try {
    while (alive && ws.readyState === ws.OPEN) {
      if (!(await refreshDaemonLease(generation))) break;
      const popped = await popCommandBlocking(10, abort.signal);
      if (!alive || ws.readyState !== ws.OPEN) {
        if (popped.command) await requeueCommand(popped.command);
        break;
      }
      if (popped.expired) {
        await nackExpired(popped.expired.id, generation).catch(() => undefined);
        continue;
      }
      if (!popped.command) continue;
      if (!send(ws, popped.command)) {
        await requeueCommand(popped.command);
        break;
      }
    }
  } finally {
    closed = true;
    abort.abort();
    await persistTail.catch(() => undefined);
    await markDaemonOffline(generation).catch((error: unknown) => {
      console.error("dj relay: failed to mark daemon offline", error);
    });
  }
}

async function runRemoteSocket(ws: WebSocket) {
  let alive = true;
  ws.once("close", () => {
    alive = false;
  });

  ws.on("message", (data) => {
    const raw = typeof data === "string" ? data : data.toString();
    const parsed = parseWireMessage(raw);
    const command = parsed ? parseDjCommand(parsed) : null;
    if (!command) return;
    void pushCommand(command)
      .then((queued) => {
        if (!queued) {
          send(ws, {
            type: "error",
            code: "queue",
            message: "Command was not accepted",
          });
        }
      })
      .catch((error: unknown) => {
        console.error("dj relay: failed to queue command", error);
        send(ws, {
          type: "error",
          code: "queue",
          message: "Command was not accepted",
        });
      });
  });

  let lastVersion = -1;
  let lastCatalogVersion = -1;
  let lastOnline = false;
  let lastError: string | undefined;
  let lastAckId: string | undefined;
  let lastHealth = "";
  const first = await readSnapshot();
  send(ws, {
    type: "ready",
    daemonOnline: first.daemonOnline,
    snapshot: first.state
      ? { ...first.state, daemonOnline: first.daemonOnline }
      : null,
  });
  lastVersion = first.version;
  lastCatalogVersion = first.catalogVersion;
  lastOnline = first.daemonOnline;
  lastError = first.state?.lastError;
  lastAckId = first.state?.lastAck?.id;
  lastHealth = JSON.stringify(first.state?.health ?? null);

  while (alive && ws.readyState === ws.OPEN) {
    await sleep(250);
    if (!alive) break;
    const [live, catalog, daemonOnline] = await Promise.all([
      readLive(),
      readCatalog(),
      readDaemonOnline(),
    ]);
    const current: DjLive = live ?? {
      version: lastVersion,
      catalogVersion: lastCatalogVersion,
      daemonOnline,
      transport: emptyState().transport,
      nowPlaying: null,
      pending: null,
    };
    if (catalog && catalog.catalogVersion > lastCatalogVersion) {
      send(ws, { type: "catalog", catalog });
      lastCatalogVersion = catalog.catalogVersion;
    }
    const health = JSON.stringify(current.health ?? null);
    const changed =
      current.version !== lastVersion ||
      daemonOnline !== lastOnline ||
      current.catalogVersion !== lastCatalogVersion ||
      current.lastError !== lastError ||
      current.lastAck?.id !== lastAckId ||
      health !== lastHealth;
    if (!changed) continue;
    lastVersion = current.version;
    lastOnline = daemonOnline;
    lastError = current.lastError;
    lastAckId = current.lastAck?.id;
    lastHealth = health;
    send(ws, {
      type: "live",
      live: { ...current, daemonOnline },
    });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  await connection();

  if (!isAllowedUpgrade(request)) {
    return new Response("forbidden", { status: 403 });
  }

  const ip = clientIp(request);

  return experimental_upgradeWebSocket(async (ws) => {
    try {
      if (!helloAllowed(ip)) {
        send(ws, { type: "error", code: "rate", message: "too many attempts" });
        ws.close();
        return;
      }
      const raw = await waitForHello(ws);
      const hello = parseWireMessage(raw);
      if (!hello || hello.type !== "hello") {
        recordHelloFail(ip);
        send(ws, { type: "error", code: "hello", message: "expected hello" });
        ws.close();
        return;
      }

      if (hello.role === "daemon") {
        const secret = process.env.DJ_DAEMON_SECRET;
        if (!secret || !secretsEqual(hello.secret, secret)) {
          recordHelloFail(ip);
          send(ws, {
            type: "error",
            code: "unauthorized",
            message: "daemon secret rejected",
          });
          ws.close();
          return;
        }
        await runDaemonSocket(ws);
        return;
      }

      if (hello.role === "remote") {
        if (!remoteOriginAllowed(request)) {
          recordHelloFail(ip);
          send(ws, { type: "error", code: "forbidden", message: "origin rejected" });
          ws.close();
          return;
        }
        const secret = process.env.DJ_REMOTE_SECRET;
        if (!secret || !secretsEqual(hello.secret, secret)) {
          recordHelloFail(ip);
          send(ws, {
            type: "error",
            code: "unauthorized",
            message: "remote secret rejected",
          });
          ws.close();
          return;
        }
        await runRemoteSocket(ws);
        return;
      }

      send(ws, { type: "error", message: "unknown role" });
      ws.close();
    } catch (error) {
      console.error("dj relay:", error);
      try {
        ws.close();
      } catch {
        // already closed
      }
    }
  });
}
