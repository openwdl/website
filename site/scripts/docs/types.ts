/**
 * Content type definitions for compiled OpenWDL documentation pages.
 */

/** Top-level documentation sections. */
export type DocSection = "learn" | "production" | "stdlib" | "upgrading";

/** Page kind for navigation and display treatment. */
export type DocKind = "tutorial" | "guide" | "pattern" | "reference";

/** Validated frontmatter fields for a documentation page. */
export interface DocFrontmatter {
  title: string;
  description: string;
  slug: "/docs/" | `/docs/${string}/`;
  section: DocSection;
  group: string;
  order: number;
  kind: DocKind;
  minutes?: number;
  legacy: string[];
  headingAliases?: Record<string, string>;
  hidden?: boolean;
}

/** A single heading extracted from a page body. */
export interface DocHeadingPart {
  type: "text" | "code" | "badge";
  value: string;
}

export interface DocHeading {
  depth: 1 | 2 | 3;
  id: string;
  text: string;
  parts?: DocHeadingPart[];
}
/** One parameter or return entry of a standard-library function. */
export interface StdlibParam {
  /** The WDL type as written in the source, when the entry names one. */
  type: string | null;
  /** Prose describing the entry. */
  text: string;
}

/** A single standard-library function parsed from its reference page. */
export interface StdlibFunction {
  /** Function name, e.g. `range`. */
  name: string;
  /** Heading anchor on the page; matches the existing `##` heading id. */
  anchor: string;
  /** Availability marker such as `v1.2`, or null when available since 1.0. */
  version: string | null;
  /** One or more WDL call signatures, in source order. */
  signatures: string[];
  /** Full prose description, whitespace-normalised to a single paragraph. */
  description: string;
  /** First sentence of the description, for dense listings. */
  summary: string;
  /** Parameter entries in declaration order. */
  params: StdlibParam[];
  /** Return entries. */
  returns: StdlibParam[];
  /** WDL example source, or an empty string when the page has none. */
  example: string;
}

/** A standard-library function enriched with its source page metadata. */
export type StdlibIndexEntry = StdlibFunction & {
  pageSlug: string;
  pageTitle: string;
  group: string;
};

/** A fully compiled documentation page with extracted metadata. */
export interface CompiledDocPage extends DocFrontmatter {
  sourcePath: string;
  body: string;
  headings: DocHeading[];
  functions?: readonly StdlibFunction[];
  /** Previous page slug in global navigation order. */
  previous?: string;
  /** Next page slug in global navigation order. */
  next?: string;
}

/** Options passed to compileDocs(). */
export interface CompileDocsOptions {
  contentRoot: string;
  generatedFile: string;
  searchRoot: string;
}

/** Output of compileDocs(). */
export interface CompiledDocs {
  pages: CompiledDocPage[];
  legacyRoutes: Record<string, string>;
}
