import type { Metadata } from "next";
import { Tag } from "@/components/ui/tag";
import { SectionHeading } from "@/components/ui/section-heading";
import { AboutPortrait } from "@/components/about-portrait";
import { AboutReadyGate } from "@/components/about-ready-gate";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResumePreview } from "@/components/resume-preview";
import { Reveal } from "@/components/reveal";
import { ArrowLink } from "@/components/ui/arrow-link";
import { JsonLd, profilePageJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: { absolute: "About Joel Peckham, Software & AI Developer" },
  description:
    "Joel Peckham is a software engineer at BetterRx in Laramie, Wyoming. He builds hospice pharmacy software.",
  alternates: { canonical: "/about/" },
  openGraph: {
    url: "/about/",
    title: "About Joel Peckham",
    description:
      "Joel Peckham is a software engineer at BetterRx in Laramie, Wyoming. He builds hospice pharmacy software.",
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
      "Joel Peckham is a software engineer at BetterRx in Laramie, Wyoming. He builds hospice pharmacy software.",
    images: ["/snowboard_joel.webp"],
  },
};

const stack = [
  { label: "PHP", href: "https://www.php.net/" },
  { label: "Laravel", href: "https://laravel.com/" },
  { label: "Livewire", href: "https://livewire.laravel.com/" },
  { label: "TypeScript", href: "https://www.typescriptlang.org/" },
  { label: "React", href: "https://react.dev/" },
  { label: "Next.js", href: "https://nextjs.org/" },
  { label: "Tailwind CSS", href: "https://tailwindcss.com/" },
  { label: "Postgres", href: "https://www.postgresql.org/" },
] as const;

export default function AboutPage() {
  return (
    <>
      <JsonLd data={profilePageJsonLd()} />
      <AboutReadyGate>
        <section className="relative overflow-hidden border-b-[3px] border-ink bg-ink text-paper">
          <div className="mx-auto grid max-w-[1240px] items-start gap-10 px-5 py-20 sm:gap-12 sm:px-8 sm:py-24 md:grid-cols-[1.3fr_minmax(0,1fr)] lg:py-28">
            <div className="min-w-0">
              <span className="label text-yellow">03 · About</span>
              <h1 className="mb-6 mt-3 font-display text-h1 font-black uppercase leading-[1.05] tracking-[-0.02em]">
                Hi, I&apos;m Joel.
                <br />
                Nice to meet you.
              </h1>
              <p className="max-w-[560px] text-lg leading-relaxed">
                I&apos;m a software developer and former graphic designer in
                Laramie, Wyoming. I earned a B.S. in Computer Science in 2022. I
                work across the full stack. I like doing things right{" "}
                <em>before </em> they come back to bite me. For the last three
                years I&apos;ve been at{" "}
                <a
                  href="https://www.betterrx.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow underline decoration-yellow/50 underline-offset-[3px] transition-colors hover:text-yellow-hi hover:decoration-yellow-hi"
                >
                  BetterRx
                </a>
                . We build hospice pharmacy software, and I think it&apos;s the
                best on the market. When I&apos;m not coding, I&apos;m outside
                hiking, climbing, or skiing.
              </p>
              <div
                aria-label="Tech stack"
                className="mt-8 flex max-w-[560px] flex-wrap gap-2"
              >
                {stack.map((t) => (
                  <a
                    key={t.label}
                    href={t.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex transition-colors hover:text-yellow hover:[&_span]:border-yellow"
                  >
                    <Tag className="border-paper text-paper">{t.label}</Tag>
                  </a>
                ))}
              </div>
            </div>

            <AboutPortrait className="min-w-0 md:justify-self-end" />
          </div>
        </section>

        <Reveal
          as="section"
          className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8"
        >
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
              <ArrowLink href="tel:13076311986">+1 (307) 631-1986</ArrowLink>
              <span className="text-xs text-grey">(I prefer a text.)</span>
            </li>
            <li className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-meta uppercase tracking-[0.18em] text-grey">
                GitHub
              </span>
              <ArrowLink href="https://github.com/joelpeckham" external>
                github.com/joelpeckham
              </ArrowLink>
            </li>
            <li className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-meta uppercase tracking-[0.18em] text-grey">
                LinkedIn
              </span>
              <ArrowLink
                href="https://www.linkedin.com/in/joelpeckham/"
                external
              >
                linkedin.com/in/joelpeckham
              </ArrowLink>
            </li>
            <li className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-meta uppercase tracking-[0.18em] text-grey">
                X
              </span>
              <ArrowLink href="https://x.com/peckham_joel" external>
                x.com/peckham_joel
              </ArrowLink>
            </li>
          </ul>
        </Reveal>

        <Reveal
          as="section"
          className="mx-auto max-w-[1240px] px-5 pb-24 sm:px-8"
        >
          <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading
              index="05"
              eyebrow="Curriculum vitae"
              title="Resume"
            />
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
        </Reveal>
      </AboutReadyGate>
    </>
  );
}
