import type { Metadata } from "next";
import { ContentCard } from "@/components/content-card";
import { Reveal } from "@/components/reveal";
import { RestoreCardScrollOnMount } from "@/components/scroll-to-top";
import { SectionHeading } from "@/components/ui/section-heading";
import { projects } from "@/lib/content";
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
  const sorted = [...projects].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date),
  );

  return (
    <section
      aria-labelledby="projects-heading"
      className="mx-auto max-w-[1240px] px-5 py-20 pb-24 sm:px-8 sm:py-24"
    >
      <RestoreCardScrollOnMount />
      <Reveal>
        <SectionHeading
          index="02"
          eyebrow="Selected work"
          title="Projects"
          titleAs="h1"
          titleId="projects-heading"
          accent="red"
        />
        <p className="mt-6 max-w-[560px] text-lg leading-normal">
          A mix of algorithms, machine learning, and interactive demos you can
          play with right in the browser.
        </p>
      </Reveal>

      {sorted.length ? (
        <ul className="mt-12 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {sorted.map((item, i) => (
            <li key={item.slug} className="h-full">
              <Reveal
                delay={Math.min(i, 5) * 60}
                className="h-full"
              >
                <ContentCard item={item} index={i + 1} />
              </Reveal>
            </li>
          ))}
        </ul>
      ) : (
        <Reveal className="mt-12 border-2 border-dashed border-ink/25 bg-paper px-6 py-12 text-center">
          <p className="font-display text-h3 font-black uppercase tracking-light">
            Nothing here yet
          </p>
          <p className="mx-auto mt-3 max-w-[420px] leading-normal text-ink/70">
            Projects are on the way. Check back soon, or say hello if you want to
            build something together.
          </p>
        </Reveal>
      )}
    </section>
  );
}
