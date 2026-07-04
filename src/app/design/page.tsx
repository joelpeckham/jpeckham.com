import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const description =
  "An older graphic design portfolio from Joel Peckham, a software engineer and former designer. He no longer takes on design work, but still likes to show this off.";

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
      <section className="border-b-[3px] border-ink bg-ink text-paper">
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8">
          <span className="label text-yellow">Design</span>
          <h1 className="mb-6 mt-3 max-w-[16ch] font-display text-h1 font-black uppercase leading-[1.05] tracking-[-0.02em]">
            An old portfolio
            <br />
            I&apos;m still proud of.
          </h1>
          <p className="max-w-[620px] text-lg leading-normal">
            Before I was a software engineer, I worked as a graphic designer. I
            don&apos;t take on design work anymore, but I kept this portfolio
            around because I still love how it turned out. Consider it a snapshot
            of an earlier chapter — logos, packaging, and layout work I&apos;m
            proud of.
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

      <section className="mx-auto max-w-[960px] px-5 py-16 sm:px-8">
        <div className="flex flex-col gap-8 sm:gap-12">
          {pages.map((page) => (
            <img
              key={page}
              src={`/design-portfolio/page-${page}.svg`}
              alt={`Design portfolio, page ${page}`}
              width={612}
              height={792}
              loading={page === 1 ? "eager" : "lazy"}
              decoding="async"
              className="h-auto w-full border-2 border-ink shadow-hard"
            />
          ))}
        </div>
      </section>
    </>
  );
}
