export const INK = "#141210";
export const PAPER_WHITE = "#ffffff";
export const RED = "#e1352a";
export const BLUE = "#1f45d8";
export const GREY_LINE = "#cfc7b5";

const INK_RGB = [20, 18, 16] as const;
const WHITE_RGB = [255, 255, 255] as const;

// Map an activation in [0,1] to a fill between white (0) and ink (1), matching
// the "black pixel = 1" convention used for the input images.
export function activationFill(a: number): string {
  const t = Math.max(0, Math.min(1, a));
  const r = Math.round(WHITE_RGB[0] + (INK_RGB[0] - WHITE_RGB[0]) * t);
  const g = Math.round(WHITE_RGB[1] + (INK_RGB[1] - WHITE_RGB[1]) * t);
  const b = Math.round(WHITE_RGB[2] + (INK_RGB[2] - WHITE_RGB[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// A readable text color for a node whose background is `activationFill(a)`.
export function activationText(a: number): string {
  return a > 0.55 ? PAPER_WHITE : INK;
}

export type EdgeStyle = {
  stroke: string;
  width: number;
  opacity: number;
};

// Positive weights lean red, negative weights lean blue; magnitude (relative to
// the strongest weight in the layer) drives width and opacity.
export function edgeStyle(weight: number, maxAbs: number): EdgeStyle {
  const t = maxAbs === 0 ? 0 : Math.min(1, Math.abs(weight) / maxAbs);
  return {
    stroke: weight >= 0 ? RED : BLUE,
    width: 0.4 + 3.2 * t,
    opacity: 0.12 + 0.7 * t,
  };
}
