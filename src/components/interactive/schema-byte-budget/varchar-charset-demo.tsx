"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Charset } from "./budget";
import { DemoShell, controlInput } from "./shared";

function charBytes(ch: string, charset: Charset): { bytes: number; ok: boolean } {
  const cp = ch.codePointAt(0) ?? 0;
  const isSupplementary = cp > 0xffff;
  if (charset === "utf8mb3") {
    if (isSupplementary) return { bytes: 0, ok: false };
    if (cp <= 0x7f) return { bytes: 1, ok: true };
    if (cp <= 0x7ff) return { bytes: 2, ok: true };
    return { bytes: 3, ok: true };
  }
  if (isSupplementary) return { bytes: 4, ok: true };
  if (cp <= 0x7f) return { bytes: 1, ok: true };
  if (cp <= 0x7ff) return { bytes: 2, ok: true };
  return { bytes: 3, ok: true };
}

/**
 * Type text; each character is a tile whose width = its byte cost.
 * Emoji fatten under utf8mb4 or shatter under utf8mb3.
 */
export function VarcharCharsetDemo() {
  const [charset, setCharset] = useState<Charset>("utf8mb4");
  const [sample, setSample] = useState("Café 😀");

  const units = useMemo(() => {
    return [...sample].map((ch) => {
      const { bytes, ok } = charBytes(ch, charset);
      return { ch, bytes, ok };
    });
  }, [sample, charset]);

  const total = units.reduce((s, u) => s + (u.ok ? u.bytes : 0), 0);
  const shattered = units.some((u) => !u.ok);

  return (
    <DemoShell
      title="Charset tiles"
      blurb="Each character’s tile width is its byte cost. Emoji need utf8mb4."
    >
      <div className="flex flex-wrap gap-2">
        {(["utf8mb4", "utf8mb3"] as const).map((c) => (
          <Button
            key={c}
            type="button"
            size="sm"
            variant={charset === c ? "ink" : "outline"}
            onClick={() => setCharset(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      <input
        className={controlInput}
        value={sample}
        onChange={(e) => setSample(e.target.value)}
        spellCheck={false}
        aria-label="Sample text"
        placeholder="Type here…"
      />

      <div className="flex min-h-[4.5rem] flex-wrap content-start items-end gap-1 border-2 border-ink bg-white p-3">
        {units.length === 0 ? (
          <p className="font-mono text-xs text-grey">Type something…</p>
        ) : (
          units.map((u, i) => {
            const w = u.ok ? Math.max(28, u.bytes * 22) : 36;
            return (
              <div
                key={`${i}-${u.ch}`}
                className={cn(
                  "flex flex-col items-center justify-end border-2 border-ink transition-all duration-200",
                  u.ok && u.bytes === 1 && "bg-blue text-white",
                  u.ok && u.bytes === 2 && "bg-yellow text-ink",
                  u.ok && u.bytes === 3 && "bg-ink text-white",
                  u.ok && u.bytes >= 4 && "bg-red text-white",
                  !u.ok && "bg-paper text-red",
                )}
                style={{
                  width: w,
                  height: u.ok ? 40 + u.bytes * 6 : 36,
                  transform: u.ok ? undefined : "rotate(-8deg) scale(0.9)",
                  opacity: u.ok ? 1 : 0.55,
                }}
                title={u.ok ? `${u.bytes} byte(s)` : "utf8mb3 can’t store this"}
              >
                <span
                  className={cn(
                    "text-lg leading-none",
                    !u.ok && "line-through decoration-2",
                  )}
                >
                  {u.ch}
                </span>
                <span className="font-mono text-[9px] opacity-80">
                  {u.ok ? `${u.bytes}B` : "✗"}
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="font-mono text-[11px] text-grey">
        {shattered
          ? "Supplementary-plane chars shatter under utf8mb3."
          : `${total} bytes · wider tiles = more storage per character.`}
      </p>
    </DemoShell>
  );
}
