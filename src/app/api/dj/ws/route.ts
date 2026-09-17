import { connection } from "next/server";
import { experimental_upgradeWebSocket } from "@vercel/functions";
import type { WebSocket } from "ws";
import {
  markDaemonOffline,
  popCommand,
  pushCommand,
  readSnapshot,
  refreshDaemonHeartbeat,
  writeSnapshot,
} from "@/lib/dj/bus";
import {
  parseWireMessage,
  type DaemonMessage,
  type DjCommand,
  type DjState,
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

async function runDaemonSocket(ws: WebSocket) {
  let alive = true;
  ws.once("close", () => {
    alive = false;
  });

  ws.on("message", (data) => {
    const raw = typeof data === "string" ? data : data.toString();
    const message = parseWireMessage(raw);
    if (!message || message.type !== "snapshot") return;
    const snapshot = (message as DaemonMessage).snapshot;
    if (!snapshot) return;
    void writeSnapshot(snapshot).catch((error: unknown) => {
      console.error("dj relay: failed to persist snapshot", error);
    });
  });

  const initial = await readSnapshot();
  send(ws, {
    type: "ready",
    daemonOnline: true,
    snapshot: initial.state,
  });

  try {
    while (alive && ws.readyState === ws.OPEN) {
      await refreshDaemonHeartbeat();
      const command = await popCommand();
      if (!alive) break;
      if (command) send(ws, command);
      else await sleep(250);
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
  const first = await readSnapshot();
  send(ws, {
    type: "ready",
    daemonOnline: first.daemonOnline,
    snapshot: first.state,
  });
  lastVersion = first.version;

  while (alive && ws.readyState === ws.OPEN) {
    await sleep(350);
    if (!alive) break;
    const envelope = await readSnapshot();
    const snapshot: DjState | null = envelope.state
      ? { ...envelope.state, daemonOnline: envelope.daemonOnline }
      : envelope.daemonOnline
        ? null
        : ({
            version: envelope.version,
            daemonOnline: false,
            vibes: [],
            characters: [],
            transport: {
              playing: false,
              vibeId: null,
              queue: [],
              queueIndex: 0,
              volume: 80,
              oneshot: null,
            },
            nowPlaying: null,
            search: null,
          } satisfies DjState);
    if (envelope.version !== lastVersion) {
      lastVersion = envelope.version;
      if (snapshot) {
        send(ws, { type: "snapshot", snapshot });
      } else {
        send(ws, {
          type: "ready",
          daemonOnline: envelope.daemonOnline,
          snapshot: null,
        });
      }
    }
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
