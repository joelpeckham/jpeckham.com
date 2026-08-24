import type { Metadata } from "next";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";

const description =
  "An older graphic design portfolio from Joel Peckham. He no longer takes design work, but he still likes to show this off.";

export const metadata: Metadata = {
  title: "Design",
  description,
  alternates: { canonical: "/design/" },
  openGraph: {
    url: "/design/",
    title: "Design",
    description,
    images: [
      {
        url: "/design-portfolio/page-1.svg",
        width: 612,
        height: 792,
        alt: "Joel Peckham design portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Design",
    description,
    images: ["/design-portfolio/page-1.svg"],
  },
};

const PAGE_COUNT = 5;
const pages = Array.from({ length: PAGE_COUNT }, (_, i) => i + 1);

export default function DesignPage() {
  return (
    <>
      <section
        aria-labelledby="design-heading"
        className="relative overflow-hidden border-b-[3px] border-ink bg-ink text-paper"
      >
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:py-28">
          <span className="label text-yellow">04 · Design</span>
          <h1
            id="design-heading"
            className="mb-6 mt-3 max-w-[16ch] font-display text-h1 font-black uppercase leading-[1.05] tracking-light"
          >
            An old portfolio
            <br />
            I&apos;m still proud of.
          </h1>
          <p className="max-w-[620px] text-lg leading-relaxed">
            Before I wrote software, I worked as a graphic designer. I
            don&apos;t take design jobs anymore. I kept this portfolio because I
            still love how it turned out. It&apos;s a snapshot of an earlier
            chapter: logos, packaging, and layout work I&apos;m proud of.
          </p>
          <div className="mt-8">
            <a
              href="/designPortfolio.pdf"
              className={cn(buttonVariants({ variant: "yellow", size: "md" }))}
            >
              Download PDF →
            </a>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="portfolio-heading"
        className="mx-auto max-w-[1240px] px-5 py-16 pb-24 sm:px-8 sm:py-20 sm:pb-28"
      >
        <h2 id="portfolio-heading" className="sr-only">
          Portfolio pages
        </h2>
        <ol className="flex list-none flex-col gap-8 p-0 sm:gap-12">
          {pages.map((page, i) => {
            const image = (
              <Image
                src={`/design-portfolio/page-${page}.svg`}
                alt={`Design portfolio, page ${page} of ${PAGE_COUNT}`}
                width={612}
                height={792}
                priority={page === 1}
                unoptimized
                className="mx-auto block h-auto w-full border-2 border-ink"
              />
            );

            return (
              <li key={page}>
                {page === 1 ? (
                  image
                ) : (
                  <Reveal threshold={0.01} delay={Math.min(i - 1, 5) * 60}>
                    {image}
                  </Reveal>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
