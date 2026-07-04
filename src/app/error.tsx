"use client";

import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-[1240px] flex-col items-center justify-center px-5 text-center">
      <p className="label text-grey">Something went wrong</p>
      <h1 className="mt-2 font-display text-h2 font-black uppercase tracking-[-0.02em]">
        This page hit a snag.
      </h1>
      <p className="mt-3 max-w-[420px] text-ink/80">
        An unexpected error occurred while loading this page.
      </p>
      <button
        type="button"
        onClick={reset}
        className={cn(buttonVariants({ variant: "ink", size: "lg" }), "mt-8")}
      >
        Try again
      </button>
    </div>
  );
}
