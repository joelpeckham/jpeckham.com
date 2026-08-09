import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLink } from "@/components/ui/arrow-link";
import { buttonVariants } from "@/components/ui/button";
import { ContentCard } from "@/components/content-card";
import { Reveal } from "@/components/reveal";
import { RestoreCardScrollOnMount } from "@/components/scroll-to-top";
import { SectionHeading } from "@/components/ui/section-heading";
import { Shape } from "@/components/ui/shape";
import { JsonLd, personJsonLd, websiteJsonLd } from "@/lib/json-ld";
import { publishedContent } from "@/lib/content";
import { defaultOgImage } from "@/lib/site";
import { cn, cssVars } from "@/lib/utils";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", images: [defaultOgImage] },
  twitter: { card: "summary_large_image", images: [defaultOgImage.url] },
};

const FEATURED_PROJECT_COUNT = 6;

export default function Home() {
  const projects = publishedContent.filter((item) => item.kind === "project");
  const featuredProjects = projects.slice(0, FEATURED_PROJECT_COUNT);
  const hasMoreProjects = projects.length > featuredProjects.length;

  return (
    <>
      <RestoreCardScrollOnMount />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={personJsonLd()} />
      <section className="relative overflow-hidden border-b-[3px] border-ink bg-paper">
        <span
          aria-hidden="true"
          className="absolute -right-10 -top-10 [--shape-size:150px] hero-enter sm:-right-16 sm:-top-16 sm:[--shape-size:260px]"
          style={cssVars({ "--enter-delay": "150ms" })}
        >
          <span
            className="block size-(--shape-size) animate-drift rounded-[50%] bg-blue transition-[border-radius,rotate] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] [@media(hover:hover)]:hover:rotate-90 [@media(hover:hover)]:hover:rounded-none"
            style={cssVars({ "--drift-dur": "9s", "--drift-delay": "800ms" })}
          />
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -right-6 [--shape-size:130px] hero-enter sm:-bottom-16 sm:right-16 sm:[--shape-size:180px] md:-bottom-20 md:right-48 md:[--shape-size:220px]"
          style={cssVars({ "--enter-delay": "250ms" })}
        >
          <Shape
            type="half"
            color="var(--yellow)"
            className="border-ink animate-drift"
            style={cssVars({ "--drift-dur": "10s", "--drift-delay": "1000ms" })}
          />
        </span>
        <span
          aria-hidden="true"
          className="absolute right-16 top-1/2 hidden -translate-y-1/2 rotate-[18deg] lg:block"
        >
          <span
            className="block hero-enter"
            style={cssVars({ "--enter-delay": "350ms" })}
          >
            <span
              className="hero-triangle block size-24 animate-drift bg-red"
              style={cssVars({ "--drift-dur": "11s", "--drift-delay": "900ms" })}
            />
          </span>
        </span>

        <div className="pointer-events-none relative mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
          <span className="label enter text-grey">
            Joel Peckham · Full-stack · AI · Laramie, WY
          </span>
          <h1
            className="mb-6 mt-3 max-w-[900px] enter font-display text-[clamp(3rem,10vw,8rem)] font-black uppercase leading-[0.92] tracking-[-0.02em]"
            style={cssVars({ "--enter-delay": "80ms" })}
          >
            I make
            <br />
            software
            <br />
            <span className="whitespace-nowrap">that helps</span>
            <br />
            <span
              className="inline-block hero-enter text-red"
              style={cssVars({ "--enter-delay": "360ms" })}
            >
              people.
            </span>
          </h1>
          <p
            className="max-w-[520px] enter text-lg leading-normal"
            style={cssVars({ "--enter-delay": "200ms" })}
          >
            I&apos;m Joel Peckham, a full-stack and AI developer. I build tools,
            train models, and put most of it here so you can try it yourself.
          </p>
          <div
            className="pointer-events-auto mt-8 flex flex-wrap gap-4 enter"
            style={cssVars({ "--enter-delay": "300ms" })}
          >
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

      <section className="mx-auto max-w-[1240px] px-5 pb-24 pt-20 sm:px-8 sm:pb-28 sm:pt-24">
        <Reveal>
          <SectionHeading
            index="01"
            eyebrow="Selected work"
            title="Latest work"
            accent="blue"
          />
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {featuredProjects.map((item, i) => (
            <Reveal
              key={item.slug}
              delay={Math.min(i, 5) * 60}
              className="h-full"
            >
              <ContentCard item={item} index={i + 1} />
            </Reveal>
          ))}
        </div>
        {hasMoreProjects ? (
          <Reveal className="mt-10">
            <ArrowLink href="/projects/">View all projects</ArrowLink>
          </Reveal>
        ) : null}
      </section>
    </>
  );
}
