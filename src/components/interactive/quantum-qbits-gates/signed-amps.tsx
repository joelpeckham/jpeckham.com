import { type AmplitudeEntry } from "@/components/interactive/quantum-shared";

const INV_SQRT2 = 1 / Math.SQRT2;

/** Format a real amplitude with common fractions (±1, ±1/√2, 0). */
export function formatAmp(re: number, im = 0): string {
  if (Math.abs(im) >= 1e-9) {
    const reStr = Math.abs(re) < 1e-9 ? "" : re.toFixed(2);
    const imStr = `${im >= 0 ? "+" : ""}${im.toFixed(2)}i`;
    return reStr ? `${reStr}${imStr}` : imStr;
  }
  if (Math.abs(re - INV_SQRT2) < 1e-3) return "1/√2";
  if (Math.abs(re + INV_SQRT2) < 1e-3) return "−1/√2";
  if (Math.abs(re) < 1e-9) return "0";
  if (Math.abs(re - 1) < 1e-9) return "1";
  if (Math.abs(re + 1) < 1e-9) return "−1";
  return re.toFixed(3);
}

/** Signed α₀, α₁ readout under probability bars. */
export function SignedAmplitudes({ entries }: { entries: AmplitudeEntry[] }) {
  const a0 = entries.find((e) => e.label === "0");
  const a1 = entries.find((e) => e.label === "1");
  if (!a0 || !a1) return null;

  return (
    <p className="mt-2 border-t border-ink/20 pt-2 font-mono text-[10px] text-ink">
      α₀ = {formatAmp(a0.re, a0.im)}, α₁ = {formatAmp(a1.re, a1.im)}
    </p>
  );
}
