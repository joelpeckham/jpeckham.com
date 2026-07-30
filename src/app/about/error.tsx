"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AboutError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-[1240px] px-5 py-24 text-center sm:px-8">
      <p className="label text-grey">Resume preview unavailable</p>
      <h1 className="mt-2 font-display text-h2 font-black uppercase tracking-[-0.02em]">
        I could not load the resume preview.
      </h1>
      <p className="mx-auto mt-3 max-w-[480px] text-ink/80">
        The resume source may be missing. Run{" "}
        <code className="font-mono text-sm">git submodule update --init</code>,
        or download the PDF.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Try again
        </button>
        <Link
          href="/Joel_Peckham_Resume.pdf"
          className={cn(buttonVariants({ variant: "ink", size: "lg" }))}
        >
          Download PDF
        </Link>
      </div>
    </div>
  );
}
