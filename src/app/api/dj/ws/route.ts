import { connection } from "next/server";
import { experimental_upgradeWebSocket } from "@vercel/functions";
import type { WebSocket } from "ws";
import {
  markDaemonOffline,
  popCommandBlocking,
  pushCommand,
  readCatalog,
  readDaemonOnline,
  readLive,
  readSnapshot,
  refreshDaemonHeartbeat,
  writeCatalog,
  writeLive,
  writeSnapshot,
} from "@/lib/dj/bus";
import {
  emptyState,
  parseWireMessage,
  type DaemonMessage,
  type DjCommand,
  type DjLive,
} from "@/lib/dj/protocol";

export const runtime = "nodejs";
export const maxDuration = 800;
export const dynamic = "force-dynamic";

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
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

async function persistDaemonMessage(message: DaemonMessage) {
  if (message.type === "snapshot" && message.snapshot) {
    await writeSnapshot({
      ...message.snapshot,
      catalogVersion: message.snapshot.catalogVersion ?? 0,
    });
    return;
  }
  if (message.type === "live") {
    await writeLive(message.live);
    return;
  }
  if (message.type === "catalog") {
    await writeCatalog(message.catalog);
  }
}

async function runDaemonSocket(ws: WebSocket) {
  let alive = true;
  ws.once("close", () => {
    alive = false;
  });

  ws.on("message", (data) => {
    const raw = typeof data === "string" ? data : data.toString();
    const message = parseWireMessage(raw);
    if (
      !message ||
      (message.type !== "snapshot" &&
        message.type !== "live" &&
        message.type !== "catalog")
    ) {
      return;
    }
    void persistDaemonMessage(message as DaemonMessage).catch((error: unknown) => {
      console.error("dj relay: failed to persist snapshot", error);
    });
  });

  await refreshDaemonHeartbeat();
  const initial = await readSnapshot();
  send(ws, {
    type: "ready",
    daemonOnline: true,
    snapshot: initial.state,
  });

  try {
    while (alive && ws.readyState === ws.OPEN) {
      await refreshDaemonHeartbeat();
      const command = await popCommandBlocking(10);
      if (!alive) break;
      if (command) send(ws, command);
    }
  } finally {
    await markDaemonOffline().catch((error: unknown) => {
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
    const message = parseWireMessage(raw);
    if (!message || message.type !== "command") return;
    void pushCommand(message as DjCommand).catch((error: unknown) => {
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
    await sleep(150);
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
      search: null,
      pending: null,
    };
    if (current.catalogVersion !== lastCatalogVersion) {
      const catalog = await readCatalog();
      if (catalog) send(ws, { type: "catalog", catalog });
      lastCatalogVersion = current.catalogVersion;
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

export async function GET() {
  await connection();

  return experimental_upgradeWebSocket(async (ws) => {
    try {
      const raw = await waitForHello(ws);
      const hello = parseWireMessage(raw);
      if (!hello || hello.type !== "hello") {
        send(ws, { type: "error", message: "expected hello" });
        ws.close();
        return;
      }

      if (hello.role === "daemon") {
        const secret = process.env.DJ_DAEMON_SECRET;
        if (!secret || hello.secret !== secret) {
          send(ws, { type: "error", message: "daemon secret rejected" });
          ws.close();
          return;
        }
        await runDaemonSocket(ws);
        return;
      }

      if (hello.role === "remote") {
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
