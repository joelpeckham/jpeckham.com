import type { Metadata } from "next";
import { ContentCard } from "@/components/content-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { allContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Software projects, machine learning experiments, and interactive demos by Joel Peckham.",
  alternates: { canonical: "/projects/" },
};

export default function ProjectsPage() {
  const sorted = allContent.filter((item) => item.kind === "project");

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24">
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

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {sorted.map((item, i) => (
          <ContentCard key={item.slug} item={item} index={i + 1} />
        ))}
      </div>
    </div>
  );
}
