"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Expandable “what this symbol means” coach for math-weak readers. */
export function MathAside({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <aside
      className={cn(
        "not-prose my-6 border-2 border-ink bg-paper",
        "shadow-hard",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey">
            Math side quest
          </p>
          <p className="mt-0.5 font-display text-lg leading-none tracking-tight">
            {title}
          </p>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink/70">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div className="border-t-2 border-ink px-4 py-3 text-sm leading-relaxed text-ink [&_code]:font-mono [&_code]:text-[0.9em] [&_p]:mb-2 [&_p:last-child]:mb-0">
          {children}
        </div>
      ) : null}
    </aside>
  );
}
