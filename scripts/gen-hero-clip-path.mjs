// Generates the two matched clip-path polygons used by `.hero-triangle` in
// src/app/globals.css: an upward triangle and a circle that share the exact
// same number of points in the same clockwise order, so the browser can
// interpolate between them point-for-point for a smooth triangle -> circle
// "inflate" on hover.
//
// A CSS clip-path morph only interpolates when both polygons have equal point
// counts, so the triangle's straight edges are oversampled to match the
// circle's resolution. Increase POINTS_PER_EDGE for a rounder circle.
//
// Usage: node scripts/gen-hero-clip-path.mjs

const POINTS_PER_EDGE = 32; // total points = 3 * POINTS_PER_EDGE
const TOTAL = POINTS_PER_EDGE * 3;

// Trim to 2 decimals without trailing zeros (keeps the CSS compact).
const fmt = (n) => `${Number(n.toFixed(2))}%`;
const toPolygon = (pts) =>
  `polygon(${pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join(", ")})`;

// Triangle vertices, clockwise starting at the apex so point 0 sits at top
// center — matching the circle's first point.
const vertices = [
  [50, 0], // apex (top center)
  [100, 100], // bottom right
  [0, 100], // bottom left
];

const trianglePoints = [];
for (let edge = 0; edge < 3; edge++) {
  const [x0, y0] = vertices[edge];
  const [x1, y1] = vertices[(edge + 1) % 3];
  // t in [0, 1) so shared vertices aren't duplicated between adjacent edges.
  for (let i = 0; i < POINTS_PER_EDGE; i++) {
    const t = i / POINTS_PER_EDGE;
    trianglePoints.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
  }
}

// Circle points, clockwise starting at top center (-90deg).
const circlePoints = [];
for (let k = 0; k < TOTAL; k++) {
  const angle = ((-90 + (360 * k) / TOTAL) * Math.PI) / 180;
  circlePoints.push([50 + 50 * Math.cos(angle), 50 + 50 * Math.sin(angle)]);
}

console.log(`/* ${TOTAL} points, clockwise from top */`);
console.log("TRIANGLE:");
console.log(toPolygon(trianglePoints));
console.log("");
console.log("CIRCLE:");
console.log(toPolygon(circlePoints));
