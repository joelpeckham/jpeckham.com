import type { Metadata } from "next";
import Image from "next/image";
import { Tag } from "@/components/ui/tag";
import { Shape } from "@/components/ui/shape";
import { SectionHeading } from "@/components/ui/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description:
    "Joel Peckham is a software developer and former graphic designer based in Laramie, Wyoming.",
  alternates: { canonical: "/about/" },
};

const stack = [
  "Python",
  "PyTorch",
  "TypeScript",
  "React",
  "Next.js",
  "Machine Learning",
  "NLP",
  "Postgres",
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b-[3px] border-ink bg-ink text-paper">
        <div className="mx-auto grid max-w-[1240px] items-start gap-12 px-5 py-20 sm:px-8 md:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="label text-yellow">03 · About</span>
            <h1 className="mb-6 mt-3 font-display text-h1 font-black uppercase leading-[1.05] tracking-[-0.02em]">
              A developer who
              <br />
              sweats the seams.
            </h1>
            <p className="max-w-[560px] text-lg leading-normal">
              I&apos;m Joel — a software developer and former graphic designer
              based in Laramie, Wyoming. I graduated with a B.S. in Computer
              Science from Southern Adventist University in 2022. I work
              end-to-end and care as much about the seams as the surface. I&apos;m
              especially interested in AI and machine learning, and I&apos;m
              currently looking for a full-time software role. When I&apos;m not
              coding, I&apos;m outside — hiking, climbing, or skiing.
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

          <div className="relative mx-auto w-full max-w-[320px]">
            <Shape
              type="circle"
              color="var(--red)"
              size={140}
              className="pointer-events-none absolute -right-6 -top-6"
            />
            <Image
              src="/joel_peckham_laramie_software_developer_small.webp"
              alt="Portrait of Joel Peckham, a software developer based in Laramie, Wyoming."
              width={320}
              height={320}
              className="relative w-full border-2 border-paper object-cover shadow-[7px_7px_0_var(--red)]"
            />
          </div>
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
            <a
              href="mailto:mail@jpeckham.com"
              className="border-b-2 border-transparent pb-0.5 uppercase tracking-[0.04em] transition-colors hover:border-ink"
            >
              mail@jpeckham.com →
            </a>
          </li>
          <li className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-meta uppercase tracking-[0.18em] text-grey">
              Phone
            </span>
            <a
              href="tel:13076311986"
              className="border-b-2 border-transparent pb-0.5 uppercase tracking-[0.04em] transition-colors hover:border-ink"
            >
              +1 (307) 631-1986 →
            </a>
            <span className="text-xs text-grey">(Text message preferred.)</span>
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 pb-24 sm:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <SectionHeading index="05" eyebrow="Curriculum vitae" title="Resume" />
          <a
            href="/Joel_Peckham_Resume_2023.pdf"
            className={cn(buttonVariants({ variant: "ink", size: "sm" }))}
          >
            Download PDF →
          </a>
        </div>
        <object
          data="/Joel_Peckham_Resume_2023.pdf"
          type="application/pdf"
          className="h-[80vh] w-full border-2 border-ink shadow-hard"
          aria-label="Joel Peckham's resume"
        >
          <p className="p-6 text-ink">
            Your browser can&apos;t display embedded PDFs.{" "}
            <a
              href="/Joel_Peckham_Resume_2023.pdf"
              className="font-medium text-red underline decoration-2 underline-offset-2"
            >
              Download the resume instead.
            </a>
          </p>
        </object>
      </section>
    </>
  );
}
