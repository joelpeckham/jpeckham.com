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

function secretsEqual(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function hostnameAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "jpeckham.com" ||
    host === "www.jpeckham.com" ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
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
      const raw = typeof data === "string" ? data : data?.toString?.() ?? "";
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

async function runDaemonSocket(ws: WebSocket) {
  const generation = crypto.randomUUID();
  let alive = true;
  let persistTail = Promise.resolve();
  ws.once("close", () => {
    alive = false;
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
      .then(() => persistDaemonMessage(message as DaemonMessage, generation))
      .catch((error: unknown) => {
        console.error("dj relay: failed to persist snapshot", error);
      });
  });

  await claimDaemonLease(generation);
  const initial = await readSnapshot();
  send(ws, {
    type: "ready",
    daemonOnline: true,
    snapshot: initial.state,
  });

  try {
    while (alive && ws.readyState === ws.OPEN) {
      if (!(await refreshDaemonLease(generation))) break;
      const command = await popCommandBlocking(10);
      if (!alive || ws.readyState !== ws.OPEN) {
        if (command) await requeueCommand(command);
        break;
      }
      if (!command) continue;
      if (!send(ws, command)) {
        await requeueCommand(command);
        break;
      }
    }
  } finally {
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
    const command = parseDjCommand(parseWireMessage(raw));
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
      });
  });

  let lastVersion = -1;
  let lastCatalogVersion = -1;
  let lastOnline = false;
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

  while (alive && ws.readyState === ws.OPEN) {
    await sleep(250);
    if (!alive) break;
    const [live, daemonOnline] = await Promise.all([
      readLive(),
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
    if (current.catalogVersion !== lastCatalogVersion) {
      const catalog = await readCatalog();
      if (catalog && catalog.catalogVersion === current.catalogVersion) {
        send(ws, { type: "catalog", catalog });
        lastCatalogVersion = current.catalogVersion;
      }
    }
    const changed =
      current.version !== lastVersion || daemonOnline !== lastOnline;
    if (!changed) continue;
    lastVersion = current.version;
    lastOnline = daemonOnline;
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

  return experimental_upgradeWebSocket(async (ws) => {
    try {
      const raw = await waitForHello(ws);
      const hello = parseWireMessage(raw);
      if (!hello || hello.type !== "hello") {
        send(ws, { type: "error", code: "hello", message: "expected hello" });
        ws.close();
        return;
      }

      if (hello.role === "daemon") {
        const secret = process.env.DJ_DAEMON_SECRET;
        if (!secret || !secretsEqual(hello.secret, secret)) {
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
        const secret = process.env.DJ_REMOTE_SECRET;
        if (!secret || !secretsEqual(hello.secret, secret)) {
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
