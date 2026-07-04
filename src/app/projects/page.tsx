import type { Metadata } from "next";
import { ContentCard } from "@/components/content-card";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { allContent } from "@/lib/content";
import { defaultOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Software projects, machine learning experiments, and interactive demos by Joel Peckham.",
  alternates: { canonical: "/projects/" },
  openGraph: {
    url: "/projects/",
    title: "Projects",
    description:
      "Software projects, machine learning experiments, and interactive demos by Joel Peckham.",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Projects",
    description:
      "Software projects, machine learning experiments, and interactive demos by Joel Peckham.",
    images: [defaultOgImage.url],
  },
};

export default function ProjectsPage() {
  const sorted = allContent.filter((item) => item.kind === "project");

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24">
      <Reveal>
        <SectionHeading
          index="02"
          eyebrow="Selected work"
          title="Projects"
          accent="red"
        />
        <p className="mt-6 max-w-[560px] text-lg leading-normal">
          A mix of algorithms, machine learning, and interactive demos you can
          play with right in the browser.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {sorted.map((item, i) => (
          <Reveal key={item.slug} delay={Math.min(i, 5) * 60} className="h-full">
            <ContentCard item={item} index={i + 1} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
