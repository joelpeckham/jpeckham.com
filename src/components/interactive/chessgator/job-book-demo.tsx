"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  JOB_BOOK_LINE,
  staleMessage,
  takeResult,
  type JobRecord,
  type TakeResultOutcome,
} from "./model";
import { Chip, DemoShell, OutcomeBanner, Panel } from "./shared";

const SEARCH_MS = 2000;

type Flight = JobRecord & {
  startedAt: number;
  outcome: TakeResultOutcome | "inflight";
};

type LogLine = {
  id: string;
  text: string;
  tone: "ok" | "bad" | "ink";
};

function plyLabel(id: string): string {
  return JOB_BOOK_LINE.find((p) => p.id === id)?.san ?? id;
}

export function JobBookDemo() {
  const [currentId, setCurrentId] = useState(JOB_BOOK_LINE[2]!.id);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [now, setNow] = useState(0);
  const seq = useRef(1);
  const currentRef = useRef(currentId);
  const flightsRef = useRef(flights);

  useEffect(() => {
    currentRef.current = currentId;
    flightsRef.current = flights;
  }, [currentId, flights]);

  useEffect(() => {
    if (!flights.some((f) => f.outcome === "inflight")) return;
    const id = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(id);
  }, [flights]);

  function nextSeq() {
    const n = seq.current;
    seq.current += 1;
    return n;
  }

  function pushLog(text: string, tone: LogLine["tone"]) {
    const id = `log-${nextSeq()}`;
    setLog((prev) => [{ id, text, tone }, ...prev].slice(0, 6));
  }

  function rewindTo(nodeId: string) {
    setCurrentId(nodeId);
    pushLog(`pointer → ${plyLabel(nodeId)} (${nodeId})`, "ink");
  }

  function startSearch(startedAt: number) {
    const requestId = `r${nextSeq()}`;
    const job: Flight = {
      requestId,
      gameNodeId: currentId,
      cancelled: false,
      startedAt,
      outcome: "inflight",
    };
    setFlights((prev) => [job, ...prev].slice(0, 8));
    pushLog(`search ${requestId} tagged ${currentId}`, "ink");

    window.setTimeout(() => {
      const target = flightsRef.current.find((f) => f.requestId === requestId);
      const outcome = takeResult(currentRef.current, target, job.gameNodeId);
      setFlights((prev) =>
        prev.map((f) => (f.requestId === requestId ? { ...f, outcome } : f)),
      );
      if (outcome === "stale") {
        pushLog(staleMessage(job.gameNodeId, currentRef.current), "bad");
      } else if (outcome === "applied") {
        pushLog(`${requestId} applied at ${plyLabel(job.gameNodeId)}`, "ok");
      } else if (outcome === "cancelled") {
        pushLog(`${requestId} cancelled`, "bad");
      }
    }, SEARCH_MS);
  }

  const inflight = flights.filter((f) => f.outcome === "inflight");
  const last = flights[0];

  return (
    <DemoShell
      title="Drop the late result"
      blurb="Every search is tagged with a gameNodeId. Rewind while one is in flight and takeResult rejects it instead of writing a card onto the wrong position."
      accent="red"
    >
      <div className="flex flex-wrap items-center gap-0">
        {JOB_BOOK_LINE.map((ply, i) => (
          <div key={ply.id} className="flex items-center">
            {i > 0 ? (
              <span className="px-1 font-mono text-grey" aria-hidden>
                —
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => rewindTo(ply.id)}
              className={cn(
                "border-2 px-2 py-1 font-mono text-xs uppercase tracking-[0.08em]",
                currentId === ply.id
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/40 bg-white text-ink",
              )}
            >
              {ply.san}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="ink"
          onClick={() => startSearch(Date.now())}
        >
          Analyze {plyLabel(currentId)}
        </Button>
        <Chip>current = {currentId}</Chip>
        {inflight.length > 0 ? (
          <Chip tone="warn">{inflight.length} in flight</Chip>
        ) : (
          <Chip>idle</Chip>
        )}
      </div>

      {inflight.length > 0 ? (
        <Panel label="In flight">
          <ul className="space-y-2">
            {inflight.map((f) => {
              const elapsed = Math.min(SEARCH_MS, Math.max(0, now - f.startedAt));
              const pct = (elapsed / SEARCH_MS) * 100;
              const staleAlready = f.gameNodeId !== currentId;
              return (
                <li key={f.requestId}>
                  <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.08em]">
                    <span>
                      {f.requestId} @ {f.gameNodeId}
                    </span>
                    <span className={staleAlready ? "text-red" : "text-grey"}>
                      {staleAlready ? "will drop" : "still current"}
                    </span>
                  </div>
                  <div className="h-3 border-2 border-ink bg-paper">
                    <div
                      className={cn(
                        "h-full",
                        staleAlready ? "bg-red" : "bg-blue",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      <Panel label="Job book">
        {log.length === 0 ? (
          <p className="text-sm text-grey">
            Start a search, then click an earlier ply before it finishes.
          </p>
        ) : (
          <ul className="space-y-1 font-mono text-xs">
            {log.map((line) => (
              <li
                key={line.id}
                className={cn(
                  line.tone === "ok" && "text-blue",
                  line.tone === "bad" && "text-red",
                  line.tone === "ink" && "text-ink",
                )}
              >
                {line.text}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {last && last.outcome !== "inflight" ? (
        <OutcomeBanner
          tone={last.outcome === "applied" ? "ok" : "bad"}
          title={last.outcome === "applied" ? "Applied" : "Dropped"}
          detail={
            last.outcome === "applied"
              ? `${last.requestId} matched ${currentId}, so the card can attach to this node.`
              : `${last.requestId} belonged to ${last.gameNodeId}. The pointer is ${currentId}.`
          }
        />
      ) : null}
    </DemoShell>
  );
}
