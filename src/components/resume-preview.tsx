import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Fragment } from "react";
import Link from "next/link";
import {
  parseResume,
  type InlineNode,
  type ResumeBlock,
  type ResumeSection,
} from "@/lib/parse-resume-tex";

function isSafeHref(href: string): boolean {
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return true;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function renderInline(nodes: InlineNode[], keyPrefix = "n") {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.value}</Fragment>;
      case "bold":
        return (
          <strong key={key} className="font-semibold text-ink">
            {renderInline(node.children, key)}
          </strong>
        );
      case "italic":
        return (
          <em key={key} className="italic">
            {renderInline(node.children, key)}
          </em>
        );
      case "link":
        if (!isSafeHref(node.href)) {
          return (
            <Fragment key={key}>{renderInline(node.children, key)}</Fragment>
          );
        }
        return (
          <a
            key={key}
            href={node.href}
            className="text-red underline decoration-2 underline-offset-2 hover:text-red-deep"
            {...(node.href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {renderInline(node.children, key)}
          </a>
        );
    }
  });
}

function Block({ block, index }: { block: ResumeBlock; index: number }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-body leading-relaxed text-ink">
          {renderInline(block.content, `p${index}`)}
        </p>
      );
    case "subheading":
      return (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h4 className="font-display text-h4 font-bold text-ink">
              {renderInline(block.title, `sh${index}t`)}
            </h4>
            <span className="font-mono text-xs uppercase tracking-[0.04em] text-grey">
              {renderInline(block.dates, `sh${index}d`)}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm text-grey">
            <span className="italic">
              {renderInline(block.subtitle, `sh${index}s`)}
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.04em]">
              {renderInline(block.location, `sh${index}l`)}
            </span>
          </div>
        </div>
      );
    case "note":
      return (
        <p className="text-sm italic text-grey">
          {renderInline(block.content, `nt${index}`)}
        </p>
      );
    case "item":
      return (
        <li className="ml-5 list-[square] pl-1 text-body leading-relaxed text-ink marker:text-red">
          <span className="font-semibold text-ink">
            {renderInline(block.label, `it${index}l`)}
          </span>
          {": "}
          {renderInline(block.body, `it${index}b`)}
        </li>
      );
  }
}

function Section({ section }: { section: ResumeSection }) {
  const items: { block: ResumeBlock; index: number }[] = [];
  const rendered: React.ReactNode[] = [];

  const flushItems = () => {
    if (items.length === 0) return;
    rendered.push(
      <ul key={`ul-${rendered.length}`} className="space-y-2">
        {items.map(({ block, index }) => (
          <Block key={`item-${index}`} block={block} index={index} />
        ))}
      </ul>,
    );
    items.length = 0;
  };

  section.blocks.forEach((block, index) => {
    if (block.type === "item") {
      items.push({ block, index });
      return;
    }
    flushItems();
    rendered.push(<Block key={`b-${index}`} block={block} index={index} />);
  });
  flushItems();

  return (
    <section className="space-y-4">
      <h3 className="font-mono text-meta font-medium uppercase tracking-[0.18em] text-grey">
        {section.title}
      </h3>
      <div className="h-0.5 bg-ink" />
      <div className="space-y-4 pt-1">{rendered}</div>
    </section>
  );
}

export async function ResumePreview() {
  let resume;
  try {
    const tex = await readFile(
      join(process.cwd(), "resume", "main.tex"),
      "utf8",
    );
    resume = parseResume(tex);
  } catch {
    return (
      <div className="border-2 border-ink bg-white p-6 shadow-hard sm:p-10">
        <p className="text-body leading-relaxed text-ink/80">
          Resume preview is unavailable. The resume source may not be checked
          out — run{" "}
          <code className="font-mono text-sm">git submodule update --init</code>{" "}
          or{" "}
          <Link
            href="/Joel_Peckham_Resume.pdf"
            className="text-red underline decoration-2 underline-offset-2 hover:text-red-deep"
          >
            download the PDF
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <article className="border-2 border-ink bg-white p-6 shadow-hard sm:p-10">
      <header className="border-b-2 border-ink pb-6">
        <h2 className="font-display text-h2 font-black uppercase tracking-[-0.02em] text-ink">
          {resume.name}
        </h2>
        {resume.title ? (
          <p className="mt-1 font-mono text-sm uppercase tracking-[0.18em] text-grey">
            {resume.title}
          </p>
        ) : null}
        {resume.contacts.length > 0 ? (
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-ink">
            {resume.contacts.map((contact, i) => (
              <Fragment key={`c-${i}`}>
                {i > 0 ? <span className="text-grey">/</span> : null}
                <span>{renderInline(contact, `c${i}`)}</span>
              </Fragment>
            ))}
          </p>
        ) : null}
      </header>

      <div className="mt-8 space-y-8">
        {resume.sections.map((section) => (
          <Section key={section.title} section={section} />
        ))}
      </div>
    </article>
  );
}
