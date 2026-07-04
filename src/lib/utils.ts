import type { CSSProperties } from "react";
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The theme defines custom font-size utilities (text-body, text-h1, ...) and
// custom color utilities (text-paper, text-ink, ...) that share the `text-`
// prefix. Without this config tailwind-merge can't tell them apart, treats
// them as conflicting, and drops one — e.g. Button's `text-paper text-body`
// lost its color and rendered ink-on-ink.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["mega", "hero", "h1", "h2", "h3", "h4", "body", "meta"] },
      ],
      "text-color": [
        {
          text: [
            "paper",
            "paper-2",
            "ink",
            "white",
            "red",
            "red-deep",
            "blue",
            "blue-deep",
            "yellow",
            "yellow-hi",
            "grey",
            "grey-line",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Type-safe escape hatch for setting CSS custom properties (e.g. `--enter-delay`)
 * via the inline `style` prop, which `CSSProperties` doesn't type by default.
 */
export function cssVars(
  vars: Record<`--${string}`, string | number>,
): CSSProperties {
  return vars as CSSProperties;
}
