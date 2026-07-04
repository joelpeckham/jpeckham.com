// Generates favicons / touch icons from the design system: Jost Black "JP"
// in ink on paper, thick ink frame, red dot accent (matches the site header).
// Usage: node scripts/generate-favicons.mjs
import { readFileSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = process.cwd();
const fontPath = join(root, "src/app/og/fonts/Jost-Black.ttf");
const outDir = join(root, "public/favicon");

const colors = {
  paper: "#f1ebdd",
  ink: "#141210",
  red: "#e1352a",
};

const SIZE = 512;

function buildSvg({ frame = true, fill = 0.7 } = {}) {
  const font = opentype.parse(readFileSync(fontPath).buffer);

  // Measure at a reference size, then scale so JP + dot spans `fill` of the
  // canvas width.
  const refSize = 100;
  const refBounds = font
    .getPath("JP", 0, 0, refSize, { kerning: true })
    .getBoundingBox();
  const refWidth = refBounds.x2 - refBounds.x1;

  // Red dot sits after the JP like a full stop, resting on the baseline.
  const dotRadiusRatio = 0.115; // relative to font size
  const dotGapRatio = 0.09;
  const refTotal = refWidth + refSize * (dotGapRatio + dotRadiusRatio * 2);
  const fontSize = (refSize * SIZE * fill) / refTotal;

  const bounds = font
    .getPath("JP", 0, 0, fontSize, { kerning: true })
    .getBoundingBox();
  const textHeight = bounds.y2 - bounds.y1;
  const dotRadius = fontSize * dotRadiusRatio;
  const dotGap = fontSize * dotGapRatio;
  const totalWidth = bounds.x2 - bounds.x1 + dotGap + dotRadius * 2;

  const originX = (SIZE - totalWidth) / 2 - bounds.x1;
  const originY = (SIZE - textHeight) / 2 - bounds.y1;

  const path = font.getPath("JP", originX, originY, fontSize, {
    kerning: true,
  });
  const d = path.toPathData(2);

  const dotCx = originX + bounds.x2 + dotGap + dotRadius;
  const dotCy = originY; // baseline
  const dotStroke = fontSize * 0.033;

  const frameWidth = 28;
  const frameRect = frame
    ? `<rect x="${frameWidth / 2}" y="${frameWidth / 2}" width="${SIZE - frameWidth}" height="${SIZE - frameWidth}" fill="none" stroke="${colors.ink}" stroke-width="${frameWidth}"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${colors.paper}"/>
  ${frameRect}
  <path d="${d}" fill="${colors.ink}"/>
  <circle cx="${dotCx}" cy="${dotCy - dotRadius}" r="${dotRadius - dotStroke / 2}" fill="${colors.red}" stroke="${colors.ink}" stroke-width="${dotStroke}"/>
</svg>`;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const framed = Buffer.from(buildSvg({ frame: true, fill: 0.66 }));
  // The frame turns to mud below ~48px, so small favicons drop it and let
  // the letters fill nearly the whole canvas.
  const plain = Buffer.from(buildSvg({ frame: false, fill: 0.94 }));

  const targets = [
    { name: "favicon-16x16.png", size: 16, src: plain },
    { name: "favicon-32x32.png", size: 32, src: plain },
    { name: "apple-touch-icon.png", size: 180, src: framed },
    { name: "android-chrome-192x192.png", size: 192, src: framed },
    { name: "android-chrome-512x512.png", size: 512, src: framed },
  ];

  for (const { name, size, src } of targets) {
    const png = await sharp(src).resize(size, size).png().toBuffer();
    await writeFile(join(outDir, name), png);
    console.log(`wrote ${name}`);
  }

  const icoSources = await Promise.all(
    [16, 32, 48].map((size) =>
      sharp(plain).resize(size, size).png().toBuffer(),
    ),
  );
  await writeFile(join(outDir, "favicon.ico"), await pngToIco(icoSources));
  console.log("wrote favicon.ico");
}

await main();
