"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const AboutReadyContext = createContext<(() => void) | null>(null);

/** Lets the portrait tell the about-page gate that its images have settled. */
export function useAboutReady() {
  return useContext(AboutReadyContext);
}

/**
 * Holds about-page children invisible until the portrait signals ready.
 * Uses visibility (not display) so images still get real layout for Next.js
 * `sizes` / `fill`. Children are passed from a Server Component so Node-only
 * modules (e.g. resume preview) stay off the client bundle.
 */
export function AboutReadyGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  return (
    <AboutReadyContext.Provider value={markReady}>
      <div
        className={cn(!ready && "invisible")}
        aria-busy={!ready}
        aria-hidden={!ready}
      >
        {children}
      </div>
    </AboutReadyContext.Provider>
  );
}
