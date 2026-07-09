import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type SliderAccent = "blue" | "red" | "ink";

const accentColor: Record<SliderAccent, string> = {
  blue: "var(--blue)",
  red: "var(--red)",
  ink: "var(--ink)",
};

const accentWash: Record<SliderAccent, string> = {
  blue: "color-mix(in srgb, var(--blue) 12%, transparent)",
  red: "color-mix(in srgb, var(--red) 12%, transparent)",
  ink: "color-mix(in srgb, var(--ink) 8%, transparent)",
};

function hatchStyle(accent: SliderAccent) {
  const color = accentColor[accent];
  return {
    backgroundColor: accentWash[accent],
    backgroundImage: `repeating-linear-gradient(-45deg, ${color} 0, ${color} 1px, transparent 1px, transparent 6px)`,
  };
}

type SliderProps = Omit<ComponentProps<"input">, "type" | "onChange"> & {
  accent?: SliderAccent;
  onValueChange?: (value: number) => void;
  onChange?: ComponentProps<"input">["onChange"];
};

export function Slider({
  accent = "ink",
  className,
  min = 0,
  max = 100,
  step = 1,
  value,
  disabled,
  onValueChange,
  onChange,
  ...props
}: SliderProps) {
  const numericValue = Number(value ?? min);
  const numericMin = Number(min);
  const numericMax = Number(max);
  const range = numericMax - numericMin;
  const pct =
    range === 0 ? 0 : ((numericValue - numericMin) / range) * 100;

  return (
    <div
      className={cn(
        "relative h-8 w-full border-2 border-ink bg-white has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-red has-[input:focus-visible]:outline-offset-2",
        disabled && "pointer-events-none opacity-45",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0"
        style={{
          width: `${pct}%`,
          ...hatchStyle(accent),
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-1.5 -translate-x-1/2 bg-ink"
        style={{ left: `${pct}%` }}
        aria-hidden
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange?.(event);
          onValueChange?.(Number(event.target.value));
        }}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0 focus-visible:outline-none"
        {...props}
      />
    </div>
  );
}
