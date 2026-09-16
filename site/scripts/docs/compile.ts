import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import type {
  CompiledDocPage,
  CompiledDocs,
  CompileDocsOptions,
  DocHeading,
  DocHeadingPart,
  DocFrontmatter,
  DocSection,
  StdlibIndexEntry,
} from "./types";
import { frontmatterSchema } from "./schema";
import { writeSearchChunks } from "./search";
import { parseStdlibFunctions } from "./stdlib";

/** ATX heading pattern: 1–3 `#` chars followed by the heading text. */
const HEADING_RE = /^(#{1,3})\s+(.+?)(?:\s+#+)?$/;

/** Opening or closing fenced-code marker. */
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

interface Fence {
  marker: string;
  length: number;
}

function nextFence(line: string, current: Fence | undefined): Fence | undefined {
  const marker = FENCE_RE.exec(line)?.[1];
  if (!marker) return current;
  if (!current) return { marker: marker[0], length: marker.length };
  if (marker[0] === current.marker && marker.length >= current.length) return undefined;
  return current;
}

/**
 * Remove the leading Markdown title rendered by the docs shell and demote
 * later h1 sections, without altering h1-like comments inside fenced code.
 */
function normalizeBodyHeadings(content: string): string {
  const output: string[] = [];
  let fence: Fence | undefined;
  let titleRemoved = false;
  let seenContent = false;

  for (const line of content.split("\n")) {
    const next = nextFence(line, fence);
    if (next !== fence) {
      fence = next;
      output.push(line);
      seenContent = true;
      continue;
    }

    if (!fence && /^#\s+/.test(line)) {
      if (!titleRemoved && !seenContent) {
        output.length = 0;
        titleRemoved = true;
        continue;
      }
      output.push(`#${line}`);
      seenContent = true;
      continue;
    }

    output.push(line);
    if (line.trim()) seenContent = true;
  }

  return output.join("\n");
}

/**
 * Strip inline Markdown syntax to get the same plain text that
 * react-markdown + rehype-slug would extract from a heading.
 *
 * Processing order:
 *   1. Backtick code spans  — `foo_bar` → foo_bar
 *   2. Inline links         — [text](url) → text
 *   3. Bold / italic (*)    — **text** / *text* → text
 *   4. Italic (_…_)         — only when surrounded by non-word chars so that
 *      underscores inside identifiers (e.g. collect_by_key) are preserved.
 *   5. Escaped characters   — \_ \* \[ → the literal char
 */
function stripInlineMarkdownSyntax(raw: string): string {
  return raw
    .replace(/`([^`]+)`/g, "$1")
    .replace(/:badge\[([^\]]+)\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    // Only treat _ as an emphasis delimiter when it is NOT adjacent to a word
    // character on the opening side or the closing side. This preserves
    // underscores in identifiers like collect_by_key, join_paths, etc.
    .replace(/(?<![a-zA-Z0-9_])_([^_]+)_(?![a-zA-Z0-9_])/g, "$1")
    .replace(/\\([_*[\]\\])/g, "$1");
}

function stripInlineMarkdown(raw: string): string {
  return stripInlineMarkdownSyntax(raw).trim();
}

function extractHeadingParts(raw: string): DocHeadingPart[] | undefined {
  const parts: DocHeadingPart[] = [];
  const richPart = /(`+)(.*?)\1|:badge\[([^\]]+)\]/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = richPart.exec(raw))) {
    const text = stripInlineMarkdownSyntax(raw.slice(cursor, match.index));
    if (text) parts.push({ type: "text", value: text });
    parts.push(
      match[3]
        ? { type: "badge", value: match[3] }
        : { type: "code", value: match[2] },
    );
    cursor = match.index + match[0].length;
  }

  if (parts.length === 0) return undefined;
  const trailingText = stripInlineMarkdownSyntax(raw.slice(cursor));
  if (trailingText) parts.push({ type: "text", value: trailingText });
  return parts;
}

/** Extract headings (depth 1–3) from raw markdown with deduplicated slug IDs. */
function extractHeadings(body: string): DocHeading[] {
  const slugger = new GithubSlugger();
  const headings: DocHeading[] = [];
  let fence: Fence | undefined;
  for (const line of body.split("\n")) {
    const next = nextFence(line, fence);
    if (next !== fence) {
      fence = next;
      continue;
    }
    if (fence) continue;

    const match = HEADING_RE.exec(line);
    if (!match) continue;
    const depth = match[1].length as 1 | 2 | 3;
    const text = stripInlineMarkdown(match[2]);
    const id = slugger.slug(text);
    const parts = extractHeadingParts(match[2]);
    headings.push({ depth, id, text, ...(parts ? { parts } : {}) });
  }
  return headings;
}

/** Sort order mirrors the generated navigation order. */
const SECTION_ORDER: Record<string, number> = {
  learn: 0,
  production: 1,
  stdlib: 2,
  upgrading: 3,
};

const GROUP_ORDER: Partial<Record<DocSection, Record<string, number>>> = {
  learn: {
    Overview: 0,
    "Language guide": 1,
    "Design patterns": 2,
  },
  production: {
    Overview: 0,
    "Environment setup": 1,
    "Pipeline development": 2,
    "Versioning and release": 3,
    Deployment: 4,
  },
};

/**
 * Read all `*.md` files from `contentRoot`, validate frontmatter, extract
 * headings, wire up previous/next links, write the generated TypeScript
 * module, and return the compiled result.
 */
export async function compileDocs(options: CompileDocsOptions): Promise<CompiledDocs> {
  const { contentRoot, generatedFile, searchRoot } = options;

  // ── Collect markdown files ─────────────────────────────────────────────
  const entries = await readdir(contentRoot, { recursive: true });
  const mdFiles = (entries as string[]).filter((e) => e.endsWith(".md"));

  // ── Parse and validate each file ──────────────────────────────────────
  const pages: CompiledDocPage[] = [];
  for (const file of mdFiles) {
    const filePath = join(contentRoot, file);
    const raw = await readFile(filePath, "utf8");
    const { data, content } = matter(raw);

    const parseResult = frontmatterSchema.safeParse(data);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      const field = issue.path.join(".");
      // Normalize Zod v4's "Invalid option" to the expected "Invalid enum value" phrasing.
      const message =
        issue.code === "invalid_value"
          ? `Invalid enum value for field "${field}"`
          : issue.message;
      throw new Error(
        `Invalid frontmatter in ${relative(contentRoot, filePath)}: [${field}] ${message}`,
      );
    }

    const fm = parseResult.data as DocFrontmatter;
    const titleHeading = extractHeadings(content).find((heading) => heading.depth === 1);
    const body = normalizeBodyHeadings(content);
    const headings = extractHeadings(body);
    if (titleHeading) headings.unshift(titleHeading);

    // Validate headingAliases: every target must be a real heading ID in this page.
    if (fm.headingAliases) {
      const headingIds = new Set(headings.map((h) => h.id));
      for (const [alias, target] of Object.entries(fm.headingAliases)) {
        if (!headingIds.has(target)) {
          throw new Error(
            `headingAliases target "${target}" (alias "${alias}") does not exist in ${relative(contentRoot, filePath)}`,
          );
        }
      }
    }

    pages.push({
      ...fm,
      sourcePath: relative(contentRoot, filePath),
      body,
      headings,
      ...(fm.section === "stdlib" ? { functions: parseStdlibFunctions(content) } : {}),
    });
  }

  // ── Cross-file validation ──────────────────────────────────────────────
  const slugsSeen = new Map<string, string>();
  for (const page of pages) {
    if (slugsSeen.has(page.slug)) {
      throw new Error(
        `Duplicate slug "${page.slug}" in ${page.sourcePath} and ${slugsSeen.get(page.slug)}`,
      );
    }
    slugsSeen.set(page.slug, page.sourcePath);
  }

  // Duplicate navigation position: same section + group + order
  const navPosSeen = new Map<string, string>();
  for (const page of pages) {
    const key = `${page.section}::${page.group}::${page.order}`;
    if (navPosSeen.has(key)) {
      throw new Error(
        `Duplicate navigation position section="${page.section}" group="${page.group}" order=${page.order} in ${page.sourcePath} and ${navPosSeen.get(key)}`,
      );
    }
    navPosSeen.set(key, page.sourcePath);
  }

  // Duplicate legacy paths across all pages
  const legacySeen = new Map<string, string>();
  for (const page of pages) {
    for (const legacy of page.legacy) {
      if (legacySeen.has(legacy)) {
        throw new Error(
          `Duplicate legacy path "${legacy}" in ${page.sourcePath} and ${legacySeen.get(legacy)}`,
        );
      }
      legacySeen.set(legacy, page.sourcePath);
    }
  }

  // ── Sort pages ────────────────────────────────────────────────────────
  pages.sort((a, b) => {
    const sectionDiff = (SECTION_ORDER[a.section] ?? 99) - (SECTION_ORDER[b.section] ?? 99);
    if (sectionDiff !== 0) return sectionDiff;
    const sectionGroups = GROUP_ORDER[a.section];
    const rankedGroupDiff = sectionGroups
      ? (sectionGroups[a.group] ?? 99) - (sectionGroups[b.group] ?? 99)
      : 0;
    if (rankedGroupDiff !== 0) return rankedGroupDiff;
    const groupDiff = a.group.localeCompare(b.group);
    if (groupDiff !== 0) return groupDiff;
    const orderDiff = a.order - b.order;
    if (orderDiff !== 0) return orderDiff;
    return a.slug.localeCompare(b.slug);
  });

  // ── Wire previous/next links ──────────────────────────────────────────
  const visible = pages.filter((p) => !p.hidden);
  for (let i = 0; i < visible.length; i++) {
    if (i > 0) visible[i].previous = visible[i - 1].slug;
    if (i < visible.length - 1) visible[i].next = visible[i + 1].slug;
  }

  // ── Build legacy route map ────────────────────────────────────────────
  const legacyRoutes: Record<string, string> = {};
  for (const page of pages) {
    for (const legacy of page.legacy) {
      legacyRoutes[legacy] = page.slug;
    }
  }

  const stdlibIndex: StdlibIndexEntry[] = pages.flatMap((page) =>
    (page.functions ?? []).map((fn) => ({
      ...fn,
      pageSlug: page.slug,
      pageTitle: page.title,
      group: page.title.replace(/\s+functions?$/i, ""),
    })),
  );

  const moduleSource = [
    'import type { CompiledDocPage, StdlibIndexEntry } from "../../scripts/docs/types";',
    "",
    `export const DOC_PAGES: readonly CompiledDocPage[] = ${JSON.stringify(pages, null, 2)};`,
    "",
    `export const STDLIB_INDEX: readonly StdlibIndexEntry[] = ${JSON.stringify(stdlibIndex, null, 2)};`,
    "",
  ].join("\n");
  await writeFile(generatedFile, moduleSource);

  // ── Write search index chunks ─────────────────────────────────────────
  await writeSearchChunks(pages, searchRoot);

  return { pages, legacyRoutes };
}
