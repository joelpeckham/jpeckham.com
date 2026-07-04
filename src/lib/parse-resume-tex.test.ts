import { describe, expect, it } from "vitest";
import { parseInline, parseResume } from "./parse-resume-tex";

describe("parseInline", () => {
  it("parses plain text", () => {
    expect(parseInline("Hello world")).toEqual([
      { type: "text", value: "Hello world" },
    ]);
  });

  it("parses bold text", () => {
    const nodes = parseInline("\\textbf{Engineer}");
    expect(nodes).toEqual([
      { type: "bold", children: [{ type: "text", value: "Engineer" }] },
    ]);
  });

  it("parses links", () => {
    const nodes = parseInline("\\href{https://example.com}{Example}");
    expect(nodes).toEqual([
      {
        type: "link",
        href: "https://example.com",
        children: [{ type: "text", value: "Example" }],
      },
    ]);
  });
});

describe("parseResume", () => {
  const sampleTex = String.raw`
\begin{document}
\begin{center}
\textbf{Joel Peckham} \\
Software Developer \\
{\small mail@jpeckham.com $|$ github.com/joelpeckham}
\end{center}

\section{Experience}
\resumeSubheading
{BetterRx}{Laramie, WY}
{Software Engineer}{2023 -- Present}
\resumeItem{Built}{Shipped features for hospice pharmacy workflows}
\end{document}
`;

  it("extracts header fields", () => {
    const resume = parseResume(sampleTex);
    expect(resume.name).toBe("Joel Peckham");
    expect(resume.title).toBe("Software Developer");
    expect(resume.contacts.length).toBeGreaterThan(0);
  });

  it("parses section headings and subheadings", () => {
    const resume = parseResume(sampleTex);
    expect(resume.sections).toHaveLength(1);
    expect(resume.sections[0].title).toBe("Experience");
    expect(resume.sections[0].blocks[0]).toMatchObject({
      type: "subheading",
    });
  });
});
