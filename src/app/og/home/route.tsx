import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  CoverArt,
  COVER_HEIGHT,
  COVER_WIDTH,
  type Unit,
} from "@/components/cover-art";
import type { CoverArtSpec } from "@/lib/content";

export const dynamic = "force-static";

const ogUnit: Unit = (n) => `${n}px`;

const homeArt: CoverArtSpec = {
  bg: "ink",
  headline: ["JOEL", "PECKHAM"],
  icon: "network",
  variant: "band",
  label: "Full-stack · AI Developer",
};

export async function GET() {
  const fontsDir = join(process.cwd(), "src/app/og/fonts");
  const [jost, jetbrainsMono] = await Promise.all([
    readFile(join(fontsDir, "Jost-Black.ttf")),
    readFile(join(fontsDir, "JetBrainsMono-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <CoverArt
        art={homeArt}
        u={ogUnit}
        fontDisplay="Jost"
        fontMono="JetBrains Mono"
      />
    ),
    {
      width: COVER_WIDTH,
      height: COVER_HEIGHT,
      fonts: [
        { name: "Jost", data: jost, weight: 900, style: "normal" },
        {
          name: "JetBrains Mono",
          data: jetbrainsMono,
          weight: 500,
          style: "normal",
        },
      ],
    },
  );
}
