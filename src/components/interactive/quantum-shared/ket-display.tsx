"use client";

import { cn } from "@/lib/utils";

/** Dirac ket chip: |label⟩ */
export function KetDisplay({
  label,
  size = "md",
  tone = "ink",
}: {
  label: string;
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "blue" | "red" | "yellow";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border-2 border-ink font-mono tabular-nums",
        size === "sm" && "px-1.5 py-0.5 text-xs",
        size === "md" && "px-2 py-1 text-sm",
        size === "lg" && "px-3 py-1.5 text-base",
        tone === "ink" && "bg-white text-ink",
        tone === "blue" && "bg-blue text-white",
        tone === "red" && "bg-red text-white",
        tone === "yellow" && "bg-yellow text-ink",
      )}
      aria-label={`ket ${label}`}
    >
      |{label}⟩
    </span>
  );
}
