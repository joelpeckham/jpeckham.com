import { GRID_SIZE } from "./training-data";

const INK = "#141210";

type DigitGlyphProps = {
  bits: number[];
  size?: number;
  className?: string;
  showBorder?: boolean;
};

// Renders a 5x5 bitmap as a crisp inline SVG so we never depend on external
// sprite images.
export function DigitGlyph({
  bits,
  size = 44,
  className,
  showBorder = true,
}: DigitGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-hidden="true"
    >
      {bits.map((bit, i) => {
        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;
        return (
          <rect
            key={i}
            x={col}
            y={row}
            width={1}
            height={1}
            fill={bit ? INK : "#ffffff"}
          />
        );
      })}
      {/* thin grid so empty cells stay legible */}
      {showBorder ? (
        <rect
          x={0}
          y={0}
          width={GRID_SIZE}
          height={GRID_SIZE}
          fill="none"
          stroke={INK}
          strokeWidth={0.08}
        />
      ) : null}
    </svg>
  );
}
