import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  CoverArt,
  COVER_HEIGHT,
  COVER_WIDTH,
  type Unit,
} from "@/components/cover-art";
import { allContent, contentLabel } from "@/lib/content";

export const dynamic = "force-static";

export function generateStaticParams() {
  return allContent.map((item) => ({ slug: item.slug }));
}

const ogUnit: Unit = (n) => `${n}px`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const item = allContent.find((c) => c.slug === slug);
  if (!item) {
    return new Response("Not found", { status: 404 });
  }

  const fontsDir = join(process.cwd(), "src/app/og/fonts");
  const [jost, jetbrainsMono] = await Promise.all([
    readFile(join(fontsDir, "Jost-Black.ttf")),
    readFile(join(fontsDir, "JetBrainsMono-Medium.ttf")),
  ]);

  return new ImageResponse(
    (
      <CoverArt
        art={item.art}
        u={ogUnit}
        label={contentLabel(item)}
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
