"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";
import { useAboutReady } from "@/components/about-ready-gate";
import { cn, cssVars } from "@/lib/utils";

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

// Extra rotation added to the mask on hover (positive = clockwise). Only the
// clip region rotates — the photo pixels stay put — so it reads as the triangle
// frame turning, not the subject moving.
const HOVER_ROTATION = 10;

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
 * Computes the triangle's three vertices at a given rotation, in the bled
 * surface's fraction space. Vertices are lifted into an aspect-corrected
 * (visually square) space before the transform, then mapped back to box
 * fractions, so the angle is a true on-screen angle rather than a skewed one.
 * Finally each point is remapped into the bled surface's fraction space so it
 * lines up with the enlarged photos.
 */
function triangleVertices(rotationDeg: number) {
  const v = [TRIANGLE.apex, TRIANGLE.left, TRIANGLE.right].map((p) => ({
    x: p.x,
    y: p.y * ASPECT,
  }));
  const cx = (v[0].x + v[1].x + v[2].x) / 3;
  const cy = (v[0].y + v[1].y + v[2].y) / 3;
  const r = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return v.map(({ x, y }) => {
    const dx = (x - cx) * SCALE;
    const dy = (y - cy) * SCALE;
    const rx = cx + dx * cos - dy * sin;
    const ry = cy + dx * sin + dy * cos;
    return { x: toSurface(rx), y: toSurface(ry / ASPECT) };
  });
}

type Vertex = { x: number; y: number };

// CSS `polygon()` format (percentages) for the animatable clip-path. Base and
// hover polygons keep the same point count/order so the browser interpolates
// them for a smooth mask rotation.
function toCssPolygon(pts: Vertex[]) {
  return `polygon(${pts
    .map((p) => `${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%`)
    .join(", ")})`;
}

// Number of <Image> layers that must fire onLoad / onError before the portrait
// is considered ready. Matches the three layers rendered below.
const IMAGE_LAYER_COUNT = 3;

type AboutPortraitProps = {
  className?: string;
};

export function AboutPortrait({ className }: AboutPortraitProps = {}) {
  // The two CSS polygons the shadow and photo morph between on hover. Only the
  // clip region rotates, so the pixels never move.
  const basePts = triangleVertices(ROTATION);
  const hoverPts = triangleVertices(ROTATION + HOVER_ROTATION);
  const clipBase = toCssPolygon(basePts);
  const clipHover = toCssPolygon(hoverPts);

  // Static top band (in bled-surface fractions) where the head may escape the
  // triangle. Expressed as an inset() so the cutout's head layer stays put while
  // its body layer rotates with the triangle. Left/right insets are symmetric
  // because toSurface() centers the box in the bled surface.
  const bandInset = `inset(0 ${((1 - toSurface(1)) * 100).toFixed(2)}% ${(
    (1 - toSurface(POP_TOP_HEIGHT)) *
    100
  ).toFixed(2)}% ${(toSurface(0) * 100).toFixed(2)}%)`;

  const markReady = useAboutReady();
  const loadedRef = useRef(0);
  const readyFiredRef = useRef(false);
  const markLayerSettled = useCallback(() => {
    loadedRef.current += 1;
    if (
      !readyFiredRef.current &&
      loadedRef.current >= IMAGE_LAYER_COUNT
    ) {
      readyFiredRef.current = true;
      markReady?.();
    }
  }, [markReady]);

  return (
    <div
      className={cn(
        "group relative mx-auto mb-8 w-full max-w-[340px] self-center md:mb-0",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute -right-6 -top-6 block size-[140px] rounded-[50%] bg-red transition-[border-radius,rotate] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [@media(hover:hover)]:hover:rotate-90 [@media(hover:hover)]:hover:rounded-none"
      />
      <div className="relative aspect-4/5 w-full">
        {/*
          Enlarged photo surface: extends BLEED beyond the box on every side so a
          scaled-up triangle still has photo underneath. Clip coordinates are
          remapped into this surface via toSurface().
        */}
        <div
          className="absolute"
          style={{
            inset: `-${BLEED * 100}%`,
            ...cssVars({ "--clip-base": clipBase, "--clip-hover": clipHover }),
          }}
        >
          {/* Hard offset shadow for the triangle, echoing the card shadows. The
              mask rotates on hover by morphing the clip-path polygon; the pixels
              never move. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 translate-x-[10px] translate-y-[10px] bg-red [clip-path:var(--clip-base)] transition-[clip-path] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [@media(hover:hover)]:group-hover:[clip-path:var(--clip-hover)]"
          />
          {/* Full photo, masked to the triangle */}
          <Image
            src="/snowboard_full.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 340px, 90vw"
            className="object-cover [clip-path:var(--clip-base)] transition-[clip-path] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [@media(hover:hover)]:group-hover:[clip-path:var(--clip-hover)]"
            onLoad={markLayerSettled}
            onError={markLayerSettled}
          />
          {/* Foreground cutout, body layer: clipped to the same rotating triangle
              as the photo so the snowboard and feet clip cleanly during the mask
              rotation. */}
          <Image
            src="/snowboard_cutout.webp"
            alt="Joel Peckham snowboarding in the mountains near Laramie, Wyoming."
            fill
            priority
            sizes="(min-width: 768px) 340px, 90vw"
            className="object-cover [clip-path:var(--clip-base)] transition-[clip-path] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [@media(hover:hover)]:group-hover:[clip-path:var(--clip-hover)]"
            onLoad={markLayerSettled}
            onError={markLayerSettled}
          />
          {/* Foreground cutout, head layer: clipped to the static top band so the
              upper body keeps popping out above the triangle and never gets cut
              by the rotation. Same image, so it unions seamlessly with the body
              layer. */}
          <Image
            src="/snowboard_cutout.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 340px, 90vw"
            className="object-cover"
            style={{ clipPath: bandInset }}
            onLoad={markLayerSettled}
            onError={markLayerSettled}
          />
        </div>
      </div>
    </div>
  );
}
