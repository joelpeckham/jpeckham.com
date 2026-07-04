import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ContentCard } from "@/components/content-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Shape } from "@/components/ui/shape";
import { JsonLd, personJsonLd, websiteJsonLd } from "@/lib/json-ld";
import { allContent } from "@/lib/content";
import { defaultOgImage } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", images: [defaultOgImage] },
  twitter: { card: "summary_large_image", images: [defaultOgImage.url] },
};

export default function Home() {
  const projects = allContent.filter((item) => item.kind === "project");
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={personJsonLd()} />
      <section className="relative overflow-hidden border-b-[3px] border-ink bg-paper">
        <Shape
          type="circle"
          color="var(--blue)"
          className="pointer-events-none absolute -right-10 -top-10 [--shape-size:150px] sm:-right-16 sm:-top-16 sm:[--shape-size:260px]"
        />
        <Shape
          type="half"
          color="var(--yellow)"
          className="pointer-events-none absolute -bottom-12 -right-6 border-ink [--shape-size:130px] sm:-bottom-16 sm:right-16 sm:[--shape-size:180px] md:-bottom-20 md:right-48 md:[--shape-size:220px]"
        />
        <Shape
          type="triangle"
          color="var(--red)"
          size={96}
          className="pointer-events-none absolute right-16 top-1/2 hidden -translate-y-1/2 rotate-[18deg] lg:block"
        />

        <div className="relative mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
          <span className="label text-grey">
            Joel Peckham · Full-stack · AI · Laramie, WY
          </span>
          <h1 className="mb-6 mt-3 max-w-[900px] font-display text-mega font-black uppercase leading-[0.92] tracking-[-0.02em]">
            I build
            <br />
            things <br />{" "}
            <span className="whitespace-nowrap">
              that <span className="text-red">ship.</span>
            </span>
          </h1>
          <p className="max-w-[520px] text-lg leading-normal">
            Joel Peckham — Full-stack and AI developer. I build tools, train
            models, and turn algorithms into things you can click on.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/projects/"
              className={cn(buttonVariants({ variant: "ink", size: "lg" }))}
            >
              View work →
            </Link>
            <a
              href="mailto:mail@jpeckham.com"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Say hello
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24">
        <SectionHeading
          index="01"
          eyebrow="Selected work"
          title="Latest work"
          accent="blue"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {projects.map((item, i) => (
            <ContentCard key={item.slug} item={item} index={i + 1} />
          ))}
        </div>
      </section>
    </>
  );
}
