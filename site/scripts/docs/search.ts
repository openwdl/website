import { gzipSync } from "node:zlib";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import MiniSearch from "minisearch";
import type { Options } from "minisearch";
import type { CompiledDocPage, DocSection } from "./types";

/** A single record stored in the MiniSearch index for one page or heading. */
export interface SearchRecord {
  id: string;
  title: string;
  description: string;
  text: string;
  section: DocSection;
  url: string;
}

/** Shape of the manifest.json written to the search output directory. */
export interface SearchManifest {
  sections: Record<DocSection, { filename: string; documentCount: number }>;
  gzipBytes: number;
}

const ALL_SECTIONS: readonly DocSection[] = ["learn", "production", "stdlib", "upgrading"];

/** Remove Markdown syntax, leaving plain indexable text. */
function stripMarkdown(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

interface MarkdownHeadingPosition {
  depth: number;
  line: number;
}

function findMarkdownHeadings(body: string): MarkdownHeadingPosition[] {
  const positions: MarkdownHeadingPosition[] = [];
  const lines = body.split("\n");
  let fenceMarker: "`" | "~" | undefined;
  let fenceLength = 0;

  lines.forEach((line, lineNumber) => {
    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      const marker = fence[1][0] as "`" | "~";
      if (fenceMarker === undefined) {
        fenceMarker = marker;
        fenceLength = fence[1].length;
      } else if (marker === fenceMarker && fence[1].length >= fenceLength) {
        fenceMarker = undefined;
        fenceLength = 0;
      }
      return;
    }
    if (fenceMarker !== undefined) return;

    const heading = line.match(/^\s{0,3}(#{1,6})\s+/);
    if (heading) positions.push({ depth: heading[1].length, line: lineNumber });
  });

  return positions;
}

function buildHeadingRecords(page: CompiledDocPage): SearchRecord[] {
  const lines = page.body.split("\n");
  const positions = findMarkdownHeadings(page.body);
  const headingOffset = Math.max(0, page.headings.length - positions.length);
  const records: SearchRecord[] = [];

  positions.forEach((position, index) => {
    const heading = page.headings[headingOffset + index];
    if (!heading) return;

    const next = positions
      .slice(index + 1)
      .find((candidate) => candidate.depth <= position.depth);
    const sectionBody = lines.slice(position.line, next?.line).join("\n");

    records.push({
      id: `${page.slug}#${heading.id}`,
      title: heading.text,
      description: page.description,
      text: stripMarkdown(sectionBody),
      section: page.section,
      url: `${page.slug}#${heading.id}`,
    });
  });

  return records;
}

/**
 * Build a flat array of search records from compiled doc pages.
 *
 * Each page produces one page-level record (canonical URL) plus one record
 * per body heading (fragment URL). Heading records index only their section.
 */
export function buildSearchRecords(pages: readonly CompiledDocPage[]): SearchRecord[] {
  const records: SearchRecord[] = [];
  for (const page of pages) {
    const text = stripMarkdown(page.body);
    const headingRecords = buildHeadingRecords(page);
    records.push({
      id: page.slug,
      title: page.title,
      description: page.description,
      text: headingRecords.length === 0 ? text : "",
      section: page.section,
      url: page.slug,
    });
    records.push(...headingRecords);
  }
  return records;
}

const MINISEARCH_OPTIONS = {
  fields: ["title", "description", "text"],
  storeFields: ["title", "description", "text", "section", "url"],
} satisfies Options<SearchRecord>;

/**
 * Write per-section MiniSearch JSON chunks and a manifest.json to
 * `searchRoot`. Returns the raw JSON string for each section chunk in the
 * canonical section order so callers can compute the total gzip budget.
 */
export async function writeSearchChunks(
  pages: readonly CompiledDocPage[],
  searchRoot: string,
): Promise<string[]> {
  await mkdir(searchRoot, { recursive: true });

  const allRecords = buildSearchRecords(pages);
  const chunks: string[] = [];

  // Pre-initialize with every DocSection key — proves completeness, no cast needed.
  const sections: Record<DocSection, { filename: string; documentCount: number }> = {
    learn: { filename: "section-learn.json", documentCount: 0 },
    production: { filename: "section-production.json", documentCount: 0 },
    stdlib: { filename: "section-stdlib.json", documentCount: 0 },
    upgrading: { filename: "section-upgrading.json", documentCount: 0 },
  };

  for (const section of ALL_SECTIONS) {
    const sectionRecords = allRecords.filter((r) => r.section === section);
    const ms = new MiniSearch<SearchRecord>(MINISEARCH_OPTIONS);
    ms.addAll(sectionRecords);
    const json = JSON.stringify(ms);
    chunks.push(json);
    const filename = `section-${section}.json`;
    await writeFile(join(searchRoot, filename), json, "utf8");
    sections[section] = { filename, documentCount: sectionRecords.length };
  }

  const gzipBytes = chunks.reduce(
    (sum, s) => sum + gzipSync(Buffer.from(s, "utf8")).byteLength,
    0,
  );

  const manifest: SearchManifest = {
    sections,
    gzipBytes,
  };
  await writeFile(join(searchRoot, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  return chunks;
}
