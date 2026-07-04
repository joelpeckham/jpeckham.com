import type { Metadata } from "next";
import { Tag } from "@/components/ui/tag";
import { SectionHeading } from "@/components/ui/section-heading";
import { AboutPortrait } from "@/components/about-portrait";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResumePreview } from "@/components/resume-preview";
import { ArrowLink } from "@/components/ui/arrow-link";
import { JsonLd, profilePageJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: { absolute: "About Joel Peckham — Software & AI Developer" },
  description:
    "Joel Peckham is a software engineer at BetterRx, building the best hospice pharmacy solution on the market. Based in Laramie, Wyoming.",
  alternates: { canonical: "/about/" },
  openGraph: {
    url: "/about/",
    title: "About Joel Peckham",
    description:
      "Joel Peckham is a software engineer at BetterRx, building the best hospice pharmacy solution on the market. Based in Laramie, Wyoming.",
    images: [
      {
        url: "/snowboard_joel.webp",
        width: 960,
        height: 1200,
        alt: "Joel Peckham snowboarding",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Joel Peckham",
    description:
      "Joel Peckham is a software engineer at BetterRx, building the best hospice pharmacy solution on the market. Based in Laramie, Wyoming.",
    images: ["/snowboard_joel.webp"],
  },
};

const stack = [
  "PHP",
  "Laravel",
  "Livewire",
  "TypeScript",
  "React",
  "Next.js",
  "Tailwind CSS",
  "Postgres",
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={profilePageJsonLd()} />
      <section className="border-b-[3px] border-ink bg-ink text-paper">
        <div className="mx-auto grid max-w-[1240px] items-start gap-12 px-5 py-20 sm:px-8 md:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="label text-yellow">03 · About</span>
            <h1 className="mb-6 mt-3 font-display text-h1 font-black uppercase leading-[1.05] tracking-[-0.02em]">
              I make software
              <br />
              that helps people.
            </h1>
            <p className="max-w-[560px] text-lg leading-normal">
              I&apos;m Joel — a software developer and former graphic designer
              based in Laramie, Wyoming. I graduated with a B.S. in Computer
              Science from Southern Adventist University in 2022. I work
              end-to-end and care as much about the seams as the surface. For the
              last three years I&apos;ve been at{" "}
              <a
                href="https://www.betterrx.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow underline decoration-yellow/50 underline-offset-[3px] transition-colors hover:text-yellow-hi hover:decoration-yellow-hi"
              >
                BetterRx
              </a>
              , building the best
              hospice pharmacy solution on the market. When I&apos;m not coding,
              I&apos;m outside — hiking, climbing, or skiing.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {stack.map((t) => (
                <Tag
                  key={t}
                  className="border-paper text-paper"
                >
                  {t}
                </Tag>
              ))}
            </div>
          </div>

          <AboutPortrait />
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8">
        <SectionHeading
          index="04"
          eyebrow="Say hello"
          title="Contact"
          accent="blue"
        />
        <ul className="mt-8 space-y-4 font-mono">
          <li className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-meta uppercase tracking-[0.18em] text-grey">
              Email
            </span>
            <ArrowLink href="mailto:mail@jpeckham.com">
              mail@jpeckham.com
            </ArrowLink>
          </li>
          <li className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-meta uppercase tracking-[0.18em] text-grey">
              Phone
            </span>
            <ArrowLink href="tel:13076311986">
              +1 (307) 631-1986
            </ArrowLink>
            <span className="text-xs text-grey">(Text message preferred.)</span>
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 pb-24 sm:px-8">
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading index="05" eyebrow="Curriculum vitae" title="Resume" />
          <a
            href="/Joel_Peckham_Resume.pdf"
            className={cn(
              buttonVariants({ variant: "ink", size: "sm" }),
              "shrink-0",
            )}
          >
            Download PDF →
          </a>
        </div>
        <ResumePreview />
      </section>
    </>
  );
}
