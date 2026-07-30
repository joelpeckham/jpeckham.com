import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Shape } from "@/components/ui/shape";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page is not on jpeckham.com.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-[1240px] flex-col items-center justify-center overflow-hidden px-5 text-center">
      <Shape
        type="circle"
        color="var(--yellow)"
        size={160}
        className="pointer-events-none absolute -z-10 left-[4%] top-[12%] hidden md:block"
      />
      <Shape
        type="triangle"
        color="var(--blue)"
        size={120}
        className="pointer-events-none absolute -z-10 bottom-[14%] right-[6%] hidden md:block"
      />

      <p className="label text-grey" aria-hidden="true">
        Error 404
      </p>
      <p
        className="my-2 font-display text-mega font-black uppercase leading-[0.92] tracking-[-0.02em] text-red"
        aria-hidden="true"
      >
        404
      </p>
      <h1 className="font-display text-h2 font-black uppercase tracking-[-0.02em]">
        This page wandered off.
      </h1>
      <p className="mt-3 max-w-[420px] text-ink/80">
        It doesn&apos;t exist, or it moved.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "ink", size: "lg" }), "mt-8")}
      >
        Back home
      </Link>
    </div>
  );
}
