import Image from "next/image";
import { Shape } from "@/components/ui/shape";

/*
 * Triangle mask for the about-page portrait.
 *
 * Everything below is expressed in box fractions (0 = left/top, 1 = right/bottom)
 * so the mask scales with the responsive portrait box. To tweak the mask, edit
 * the constants in this block — they are the single source of truth.
 */

// Triangle vertices in box fractions (0–1). Apex is the top point.
const TRIANGLE = {
  apex: { x: 0.5, y: 0.3 },
  left: { x: 0, y: 1 },
  right: { x: 1, y: 1 },
};

// Rotation in degrees, applied around the triangle's centroid (positive = clockwise).
const ROTATION = -30;

// Uniform scale about the centroid (1 = unchanged, >1 grows, <1 shrinks).
const SCALE = 1.0;

// How far down the box the foreground cutout may escape the triangle (0–1).
const POP_TOP_HEIGHT = 0.7;

// Height / width of the portrait box. Must match the `aspect-4/5` class below
// so rotation looks true-to-angle instead of aspect-skewed.
const ASPECT = 5 / 4;

// The photos are rendered on a surface that extends this fraction of the box
// beyond every edge, so the triangle can grow past the visible frame (via SCALE
// or rotation) and still have photo underneath instead of being clipped to the
// box rectangle. Trade-off: a larger bleed zooms the photo in slightly. Bump
// this up if you need more headroom for a bigger SCALE.
const BLEED = 0.2;

// Remaps a box fraction (0–1) into the bled surface's fraction space, where the
// box occupies the middle and [-BLEED, 1 + BLEED] spans the full surface.
function toSurface(fraction: number) {
  return (fraction + BLEED) / (1 + 2 * BLEED);
}

/**
 * Builds the polygon `points` string, rotating and scaling the triangle around
 * its centroid. Vertices are lifted into an aspect-corrected (visually square)
 * space before the transform, then mapped back to box fractions, so ROTATION is
 * a true on-screen angle rather than a skewed one. Finally each point is remapped
 * into the bled surface's fraction space so it lines up with the enlarged photos.
 */
function trianglePoints() {
  const v = [TRIANGLE.apex, TRIANGLE.left, TRIANGLE.right].map((p) => ({
    x: p.x,
    y: p.y * ASPECT,
  }));
  const cx = (v[0].x + v[1].x + v[2].x) / 3;
  const cy = (v[0].y + v[1].y + v[2].y) / 3;
  const r = (ROTATION * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return v
    .map(({ x, y }) => {
      const dx = (x - cx) * SCALE;
      const dy = (y - cy) * SCALE;
      const rx = cx + dx * cos - dy * sin;
      const ry = cy + dx * sin + dy * cos;
      return `${toSurface(rx).toFixed(4)},${toSurface(ry / ASPECT).toFixed(4)}`;
    })
    .join(" ");
}

export function AboutPortrait() {
  const points = trianglePoints();

  // Pop rectangle: the band in which the cutout may escape the triangle. It runs
  // from the very top of the photo surface (so a head lifted into the bleed zone
  // by the zoom isn't clipped) down to POP_TOP_HEIGHT of the box.
  const surfaceScale = 1 / (1 + 2 * BLEED);
  const popRect = {
    x: toSurface(0),
    y: 0,
    width: surfaceScale,
    height: toSurface(POP_TOP_HEIGHT),
  };

  return (
    <div className="relative mx-auto w-full max-w-[340px] self-center">
      <Shape
        type="circle"
        color="var(--red)"
        size={140}
        className="pointer-events-none absolute -right-6 -top-6"
      />
      <div className="relative aspect-4/5 w-full">
        <svg aria-hidden="true" className="absolute h-0 w-0">
          <defs>
            <clipPath
              id="hero-triangle-clip"
              clipPathUnits="objectBoundingBox"
            >
              <polygon points={points} />
            </clipPath>
            {/* Triangle plus the top of the box, so only the upper body escapes */}
            <clipPath id="hero-pop-clip" clipPathUnits="objectBoundingBox">
              <polygon points={points} />
              <rect
                x={popRect.x}
                y={popRect.y}
                width={popRect.width}
                height={popRect.height}
              />
            </clipPath>
          </defs>
        </svg>
        {/*
          Enlarged photo surface: extends BLEED beyond the box on every side so a
          scaled-up triangle still has photo underneath. Clip coordinates are
          remapped into this surface via toSurface().
        */}
        <div className="absolute" style={{ inset: `-${BLEED * 100}%` }}>
          {/* Hard offset shadow for the triangle, echoing the card shadows */}
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-x-[10px] translate-y-[10px] bg-red [clip-path:url(#hero-triangle-clip)]"
          />
          {/* Full photo, masked to the triangle */}
          <Image
            src="/snowboard_full.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 340px, 90vw"
            className="object-cover [clip-path:url(#hero-triangle-clip)]"
          />
          {/* Foreground cutout: upper body pops out, feet stay inside the triangle */}
          <Image
            src="/snowboard_cutout.webp"
            alt="Joel Peckham snowboarding in the mountains near Laramie, Wyoming."
            fill
            priority
            sizes="(min-width: 768px) 340px, 90vw"
            className="object-cover [clip-path:url(#hero-pop-clip)]"
          />
        </div>
      </div>
    </div>
  );
}
