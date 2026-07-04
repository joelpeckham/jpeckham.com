// Minimal LaTeX parser tuned for the resume in the `resume/` submodule
// (github.com/joelpeckham/Resume). It reads the custom `\resume*` macros and
// turns them into structured data so the about page can render an HTML preview
// from the same source of truth that produces the downloadable PDF.

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "bold"; children: InlineNode[] }
  | { type: "italic"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] };

export type ResumeBlock =
  | { type: "paragraph"; content: InlineNode[] }
  | {
      type: "subheading";
      title: InlineNode[];
      location: InlineNode[];
      subtitle: InlineNode[];
      dates: InlineNode[];
    }
  | { type: "note"; content: InlineNode[] }
  | { type: "item"; label: InlineNode[]; body: InlineNode[] };

export type ResumeSection = {
  title: string;
  blocks: ResumeBlock[];
};

export type ParsedResume = {
  name: string;
  title: string;
  contacts: InlineNode[][];
  sections: ResumeSection[];
};

function skipSpaces(s: string, i: number): number {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

// Reads a balanced `{...}` group. Assumes `s[i] === "{"`.
function readBalanced(s: string, i: number): { content: string; end: number } {
  const start = i;
  let depth = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      i++; // skip escaped char (e.g. \{ \})
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return { content: s.slice(start + 1, i), end: i + 1 };
    }
  }
  return { content: s.slice(start + 1), end: s.length };
}

function normalizeText(s: string): string {
  return s
    .replace(/---/g, "\u2014")
    .replace(/--/g, "\u2013")
    .replace(/\s+/g, " ");
}

function mapMath(m: string): string {
  return m.replace(/\\circ/g, "\u2022").replace(/[\\{}]/g, "").trim();
}

const ESCAPED_CHARS = new Set(["$", "&", "#", "%", "_", "{", "}", " "]);

export function parseInline(input: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buf = "";

  const flush = () => {
    if (!buf) return;
    const text = normalizeText(buf);
    if (text) nodes.push({ type: "text", value: text });
    buf = "";
  };

  let i = 0;
  while (i < input.length) {
    const c = input[i];

    if (c === "\\") {
      const next = input[i + 1];
      if (next && /[a-zA-Z]/.test(next)) {
        let j = i + 1;
        let name = "";
        while (j < input.length && /[a-zA-Z]/.test(input[j])) {
          name += input[j];
          j++;
        }

        if (name === "href") {
          let k = skipSpaces(input, j);
          const g1 = readBalanced(input, k);
          k = skipSpaces(input, g1.end);
          const g2 = readBalanced(input, k);
          flush();
          nodes.push({
            type: "link",
            href: normalizeText(g1.content).trim(),
            children: parseInline(g2.content),
          });
          i = g2.end;
          continue;
        }

        if (name === "textbf") {
          const k = skipSpaces(input, j);
          const g = readBalanced(input, k);
          flush();
          nodes.push({ type: "bold", children: parseInline(g.content) });
          i = g.end;
          continue;
        }

        if (name === "textit" || name === "emph" || name === "textsc") {
          const k = skipSpaces(input, j);
          const g = readBalanced(input, k);
          flush();
          nodes.push({ type: "italic", children: parseInline(g.content) });
          i = g.end;
          continue;
        }

        if (name === "vspace" || name === "hspace") {
          let k = skipSpaces(input, j);
          if (input[k] === "{") k = readBalanced(input, k).end;
          i = k;
          continue;
        }

        // Formatting/no-op control words (\small, \LARGE, \scshape, ...): drop
        // the command and the single space LaTeX would swallow after it.
        i = j;
        if (input[i] === " ") i++;
        continue;
      }

      // Escaped character such as \$ \& \# \% \_ \{ \}
      if (next && ESCAPED_CHARS.has(next)) {
        buf += next === " " ? " " : next;
        i += 2;
        continue;
      }
      i += next ? 2 : 1;
      continue;
    }

    if (c === "{" || c === "}") {
      i++;
      continue;
    }

    if (c === "$") {
      let j = i + 1;
      let m = "";
      while (j < input.length && input[j] !== "$") {
        m += input[j];
        j++;
      }
      buf += mapMath(m);
      i = j + 1;
      continue;
    }

    if (c === "~") {
      buf += " ";
      i++;
      continue;
    }

    buf += c;
    i++;
  }

  flush();
  return nodes;
}

function nodesToText(nodes: InlineNode[]): string {
  return nodes
    .map((n) => (n.type === "text" ? n.value : nodesToText(n.children)))
    .join("")
    .trim();
}

function parseHeader(center: string): {
  name: string;
  title: string;
  contacts: InlineNode[][];
} {
  const parts = center.split(/\\\\/);
  const name = nodesToText(parseInline(parts[0] ?? ""));
  const title = nodesToText(parseInline(parts[1] ?? ""));

  let contacts: InlineNode[][] = [];
  const smallIdx = center.lastIndexOf("{\\small");
  if (smallIdx !== -1) {
    const group = readBalanced(center, smallIdx);
    const raw = group.content.replace(/^\s*\\small/, "");
    contacts = raw
      .split("$|$")
      .map((part) => parseInline(part))
      .filter((n) => nodesToText(n).length > 0);
  }

  return { name, title, contacts };
}

function parseSectionBlocks(title: string, body: string): ResumeBlock[] {
  // The Summary section is plain prose wrapped in `{\small ...}`.
  if (/summary/i.test(title)) {
    const idx = body.indexOf("{\\small");
    if (idx !== -1) {
      const group = readBalanced(body, idx);
      const raw = group.content.replace(/^\s*\\small/, "");
      const content = parseInline(raw);
      if (nodesToText(content)) return [{ type: "paragraph", content }];
    }
  }

  const blocks: ResumeBlock[] = [];
  let i = 0;
  while (i < body.length) {
    if (body[i] !== "\\") {
      i++;
      continue;
    }

    let j = i + 1;
    let name = "";
    while (j < body.length && /[a-zA-Z]/.test(body[j])) {
      name += body[j];
      j++;
    }

    if (name === "resumeSubheading") {
      const groups: string[] = [];
      let k = j;
      for (let g = 0; g < 4; g++) {
        k = skipSpaces(body, k);
        if (body[k] !== "{") break;
        const grp = readBalanced(body, k);
        groups.push(grp.content);
        k = grp.end;
      }
      if (groups.length === 4) {
        blocks.push({
          type: "subheading",
          title: parseInline(groups[0]),
          location: parseInline(groups[1]),
          subtitle: parseInline(groups[2]),
          dates: parseInline(groups[3]),
        });
      }
      i = k;
      continue;
    }

    if (name === "resumeItem" || name === "resumeSubItem") {
      let k = skipSpaces(body, j);
      const g1 = readBalanced(body, k);
      k = skipSpaces(body, g1.end);
      const g2 = readBalanced(body, k);
      blocks.push({
        type: "item",
        label: parseInline(g1.content),
        body: parseInline(g2.content),
      });
      i = g2.end;
      continue;
    }

    if (name === "item") {
      let k = skipSpaces(body, j);
      if (body[k] === "[") {
        const close = body.indexOf("]", k);
        if (close !== -1) k = close + 1;
      }
      k = skipSpaces(body, k);
      if (body[k] === "{") {
        const grp = readBalanced(body, k);
        const content = parseInline(grp.content);
        if (nodesToText(content)) blocks.push({ type: "note", content });
        i = grp.end;
        continue;
      }
      i = k;
      continue;
    }

    i = j;
  }

  return blocks;
}

export function parseResume(tex: string): ParsedResume {
  const docMatch = tex.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/);
  const doc = docMatch ? docMatch[1] : tex;

  const centerMatch = doc.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/);
  const { name, title, contacts } = parseHeader(
    centerMatch ? centerMatch[1] : "",
  );

  const sections: ResumeSection[] = [];
  const sectionRe = /\\section\{([^}]*)\}/g;
  const matches = [...doc.matchAll(sectionRe)];
  for (let idx = 0; idx < matches.length; idx++) {
    const m = matches[idx];
    const sectionTitle = m[1].trim();
    const start = (m.index ?? 0) + m[0].length;
    const end = idx + 1 < matches.length ? matches[idx + 1].index ?? doc.length : doc.length;
    const body = doc.slice(start, end);
    sections.push({
      title: sectionTitle,
      blocks: parseSectionBlocks(sectionTitle, body),
    });
  }

  return { name, title, contacts, sections };
}
