# Asperabad DJ daemon

The Mac process that owns TIDAL. Phones use `https://jpeckham.com/dj/`. The site is only a Redis-backed relay.

## Setup

1. `vercel env pull .env.local --yes`
2. Set `DJ_REMOTE_SECRET` in Vercel (Production) and in `.env.local`. That PIN unlocks `/dj/`.
3. Confirm `.env.local` also has `DJ_DAEMON_SECRET`, `DJ_WS_URL` (defaults to `wss://jpeckham.com/api/dj/ws/`), and Upstash/KV keys.

## Run

```bash
pnpm dj
```

This keeps the laptop awake, talks to **production**, and restarts if the process dies. Fluid Compute must stay on so `/api/dj/ws/` can hold a WebSocket.

Startup order:

1. TIDAL launches (or relaunches) with the Chrome DevTools port.
2. The daemon connects to the production relay.
3. Phones open `https://jpeckham.com/dj/?k=PIN` once, then the PIN stays in session storage.

`pnpm dev` does not host this WebSocket. Use `pnpm dev:ws` (`vercel dev`) if you need a local relay, and set `DJ_WS_URL` to match.

## One table

There is one Redis namespace (`dj:commands`, `dj:live`, …). One `pnpm dj` at a time. Preview deployments that share the same KV will collide with production.

## Files

- `data/seed.json` — committed vibe catalog. The daemon does not write it.
- `data/state.json` — local runtime (characters, playlist ids, transport). Gitignored.
