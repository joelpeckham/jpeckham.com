import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

const VERSION = "9.7";
const INFO_URL = `https://downloads.mysql.com/docs/mysql-${VERSION}.info.gz`;
const CANONICAL_BASE = `https://dev.mysql.com/doc/refman/${VERSION}/en`;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "sources", `mysql-refman-${VERSION}`);
const rawDir = join(outDir, "raw");
const nodesDir = join(outDir, "nodes");
const gzPath = join(rawDir, `mysql-${VERSION}.info.gz`);
const infoPath = join(rawDir, `mysql-${VERSION}.info`);

function log(message) {
  console.log(`[refman:fetch] ${message}`);
}

function yamlEscape(value) {
  if (value == null || value === "") return '""';
  const str = String(value);
  if (/[:#"'\n\\{}[\],&*?|<>=!%@`]/.test(str) || str !== str.trim()) {
    return JSON.stringify(str);
  }
  return str;
}

function sanitizeFilename(id) {
  return id.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function parseHeaderLine(line) {
  // File: ...,  Node: name,  Next: x,  Prev: y,  Up: z
  const fields = {};
  for (const part of line.split(/,\s+/)) {
    const match = part.match(/^(File|Node|Next|Prev|Up):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

function extractTitle(bodyLines) {
  for (let i = 0; i < bodyLines.length - 1; i++) {
    const line = bodyLines[i].trim();
    const next = bodyLines[i + 1].trim();
    if (
      line &&
      next &&
      /^[-=.]+$/.test(next) &&
      next.length >= Math.min(3, line.length)
    ) {
      return line;
    }
  }
  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("* Menu:")) return trimmed;
  }
  return "";
}

/** Drop the leading Info menu block; leave the rest of the node unaltered. */
function stripLeadingMenu(bodyLines) {
  const start = bodyLines.findIndex((line) => line.trim() === "* Menu:");
  if (start === -1) return bodyLines;

  let end = start + 1;
  while (end < bodyLines.length) {
    const line = bodyLines[end];
    const trimmed = line.trim();
    if (trimmed === "") {
      // blank line ends the menu when we've seen at least one entry
      if (end > start + 1) {
        end += 1;
        break;
      }
      end += 1;
      continue;
    }
    if (trimmed.startsWith("* ")) {
      end += 1;
      continue;
    }
    break;
  }
  return [...bodyLines.slice(0, start), ...bodyLines.slice(end)];
}

function parseNodes(infoText) {
  const chunks = infoText.split("\u001f");
  const nodes = [];

  for (const chunk of chunks) {
    const text = chunk.replace(/^\u0000?/, "");
    if (!text.trim()) continue;

    const lines = text.replace(/^\r?\n/, "").split(/\r?\n/);
    const headerLine = lines.find((line) => line.startsWith("File:"));
    if (!headerLine) continue;

    const header = parseHeaderLine(headerLine);
    const id = header.Node;
    if (!id || id === "(dir)") continue;
    // Skip Info tag table / end markers
    if (id === "Tag Table" || id === "End Tag Table") continue;

    const headerIndex = lines.indexOf(headerLine);
    let bodyLines = lines.slice(headerIndex + 1);
    // Drop trailing empty lines from split artifacts
    while (bodyLines.length && bodyLines[bodyLines.length - 1] === "") {
      bodyLines.pop();
    }

    const title = extractTitle(bodyLines) || id;
    bodyLines = stripLeadingMenu(bodyLines);

    const next = header.Next && header.Next !== "(dir)" ? header.Next : null;
    const prev = header.Prev && header.Prev !== "(dir)" ? header.Prev : null;
    const up = header.Up && header.Up !== "(dir)" ? header.Up : null;

    nodes.push({
      id,
      title,
      next,
      prev,
      up,
      body: bodyLines.join("\n").replace(/^\n+/, ""),
    });
  }

  return nodes;
}

async function download(url, destination) {
  log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
}

async function gunzipFile(source, destination) {
  log(`Decompressing to ${destination}`);
  await pipeline(
    createReadStream(source),
    createGunzip(),
    createWriteStream(destination),
  );
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(rawDir, { recursive: true });
  await mkdir(nodesDir, { recursive: true });

  await download(INFO_URL, gzPath);
  await gunzipFile(gzPath, infoPath);

  const infoText = await readFile(infoPath, "utf8");
  const nodes = parseNodes(infoText);
  if (nodes.length < 100) {
    throw new Error(`Expected hundreds of nodes, got ${nodes.length}`);
  }

  log(`Writing ${nodes.length} node files`);
  const index = [];

  for (const node of nodes) {
    const filename = `${sanitizeFilename(node.id)}.md`;
    const relPath = `nodes/${filename}`;
    const url = `${CANONICAL_BASE}/${node.id}.html`;
    const frontMatter = [
      "---",
      `id: ${yamlEscape(node.id)}`,
      `title: ${yamlEscape(node.title)}`,
      `url: ${yamlEscape(url)}`,
      `next: ${yamlEscape(node.next ?? "")}`,
      `prev: ${yamlEscape(node.prev ?? "")}`,
      `up: ${yamlEscape(node.up ?? "")}`,
      "---",
      "",
    ].join("\n");

    await writeFile(join(nodesDir, filename), `${frontMatter}${node.body}\n`);
    index.push({
      id: node.id,
      title: node.title,
      path: relPath,
      url,
      next: node.next,
      prev: node.prev,
      up: node.up,
    });
  }

  await writeFile(join(outDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);

  const fetchedAt = new Date().toISOString();
  const notice = `# MySQL ${VERSION} Reference Manual — local copy

Fetched: ${fetchedAt}
Source: ${INFO_URL}
Canonical HTML: ${CANONICAL_BASE}/

This directory contains Oracle documentation for **personal / local use only**.

The MySQL Reference Manual is **not** distributed under the GPL. See:

https://dev.mysql.com/doc/refman/${VERSION}/en/preface.html

Summary of Oracle’s “Use of This Documentation” terms (read the official page for the full text):

- Personal use and conversion to other formats are allowed if the content is not altered.
- You shall not publish or distribute this documentation except as Oracle describes (with the software), or with prior written consent.
- Do **not** commit this tree to git or publish it on GitHub.

This local copy was produced by \`npm run refman:fetch\` for authoring reference only.
`;

  await writeFile(join(outDir, "LICENSE-NOTICE.md"), notice);
  log(`Done. ${nodes.length} nodes → ${outDir}`);
}

main().catch((error) => {
  console.error(`[refman:fetch] ${error.message}`);
  process.exit(1);
});
