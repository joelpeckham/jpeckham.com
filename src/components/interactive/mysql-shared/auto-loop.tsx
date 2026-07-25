"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type AutoLoopRenderArgs = {
  /** Progress within the current loop, 0–1. */
  t: number;
  /** Integer frame / phase when using discrete steps. */
  frame: number;
  /** Whether the loop is currently advancing. */
  playing: boolean;
  /** True when prefers-reduced-motion is on (static end frame). */
  reducedMotion: boolean;
};

type AutoLoopProps = {
  /** Loop duration in ms. */
  durationMs?: number;
  /** Discrete frame count. When set, `frame` steps 0…frameCount-1. */
  frameCount?: number;
  /** Pause when the element leaves the viewport. */
  pauseOffscreen?: boolean;
  /** Pause while the pointer is over the element. */
  pauseOnHover?: boolean;
  /** Hold at end before restarting (ms). */
  endHoldMs?: number;
  /** Hold at start before advancing (ms). */
  startHoldMs?: number;
  className?: string;
  children: (args: AutoLoopRenderArgs) => ReactNode;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Zero-control looping animation driver.
 * Pauses offscreen and respects prefers-reduced-motion (static end frame).
 */
export function AutoLoop({
  durationMs = 3200,
  frameCount,
  pauseOffscreen = true,
  pauseOnHover = true,
  endHoldMs = 600,
  startHoldMs = 200,
  className,
  children,
}: AutoLoopProps) {
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(!pauseOffscreen);
  const [hovered, setHovered] = useState(false);
  const [t, setT] = useState(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!pauseOffscreen) {
      setInView(true);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pauseOffscreen]);

  const playing =
    !reducedMotion && inView && !(pauseOnHover && hovered);

  const tick = useCallback(
    (elapsed: number) => {
      const cycle = startHoldMs + durationMs + endHoldMs;
      const pos = elapsed % cycle;
      if (pos < startHoldMs) return 0;
      if (pos > startHoldMs + durationMs) return 1;
      return (pos - startHoldMs) / durationMs;
    },
    [durationMs, endHoldMs, startHoldMs],
  );

  useEffect(() => {
    if (reducedMotion) {
      setT(1);
      return;
    }
    if (!playing) return;

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      setT(tick(now - start));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, reducedMotion, tick]);

  // When pausing mid-loop, freeze; when re-entering view after reduced motion off, resume from 0.
  useEffect(() => {
    if (!playing && !reducedMotion && !inView) {
      // keep current t frozen
    }
  }, [playing, reducedMotion, inView]);

  const frame =
    frameCount && frameCount > 0
      ? Math.min(frameCount - 1, Math.floor(t * frameCount))
      : 0;

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children({ t, frame, playing, reducedMotion })}
    </div>
  );
}
