import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvFile(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

export function loadDaemonEnv() {
  const root = resolve(import.meta.dirname, "../..");
  parseEnvFile(resolve(root, ".env"));
  parseEnvFile(resolve(root, ".env.local"));
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Pull env with \`vercel env pull .env.local --yes\`.`);
  }
  return value;
}

export function wsUrl(): string {
  return process.env.DJ_WS_URL ?? "wss://jpeckham.com/api/dj/ws/";
}

export const tidalAppPath =
  process.env.TIDAL_APP_PATH ?? "/Applications/TIDAL.app";
export const tidalCdpPort = Number(process.env.TIDAL_CDP_PORT ?? 9222);
