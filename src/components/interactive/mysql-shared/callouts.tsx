import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One-line takeaway under a demo embed. */
export function Takeaway({ children }: { children: ReactNode }) {
  // div (not p): MDX wraps children in <p>, so an outer <p> hydrates invalidly.
  return (
    <div
      className={cn(
        "not-prose my-4 border-l-4 border-blue bg-paper px-3 py-2",
        "font-mono text-sm leading-snug text-ink",
      )}
    >
      <span className="mr-2 text-[10px] uppercase tracking-[0.14em] text-grey">
        Takeaway
      </span>
      {children}
    </div>
  );
}

/** Short exercise box for PR / local practice. */
export function TryIt({ children }: { children: ReactNode }) {
  return (
    <aside
      className={cn(
        "not-prose my-6 border-2 border-ink bg-yellow px-4 py-3",
        "shadow-hard",
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70">
        Try it
      </p>
      <div className="mt-1 text-sm leading-relaxed text-ink [&_code]:font-mono [&_code]:text-[0.9em]">
        {children}
      </div>
    </aside>
  );
}
