// @vitest-environment node
import { gzipSync } from "node:zlib";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import MiniSearch from "minisearch";
import {
  buildSearchRecords,
  writeSearchChunks,
  type SearchRecord,
} from "./search";
import type { CompiledDocPage } from "./types";

const tasksPage: CompiledDocPage = {
  title: "Tasks",
  description: "Define a portable unit of computation.",
  slug: "/docs/start/language/tasks/",
  section: "learn",
  group: "Language guide",
  order: 40,
  kind: "guide",
  legacy: [],
  sourcePath: "write/tasks.md",
  body: "## Inputs\n\nContent here.\n\n## Outputs\n\nMore content.",
  headings: [
    { depth: 2, id: "inputs", text: "Inputs" },
    { depth: 2, id: "outputs", text: "Outputs" },
  ],
};

const stdlibPage: CompiledDocPage = {
  ...tasksPage,
  title: "Array",
  description: "Standard library array functions.",
  slug: "/docs/stdlib/array/",
  section: "stdlib",
  group: "Standard library",
  sourcePath: "stdlib/array.md",
  body: "## `range`\n\nCreate an integer array.",
  headings: [{ depth: 2, id: "range", text: "range" }],
};

const referencePage: CompiledDocPage = {
  ...tasksPage,
  title: "Upgrade guide",
  description: "Upgrade between WDL versions.",
  slug: "/docs/reference/upgrade-guide/",
  section: "upgrading",
  group: "Upgrading",
  sourcePath: "reference/upgrade-guide.md",
  body: "## Changes\n\nUpgrade details.",
  headings: [{ depth: 2, id: "changes", text: "Changes" }],
};

const productionPage: CompiledDocPage = {
  ...tasksPage,
  title: "Production WDL pipeline",
  description: "Build and release a production pipeline.",
  slug: "/docs/production/",
  section: "production",
  group: "Overview",
  sourcePath: "production/overview.md",
  body: "## Course map\n\nProduction course details.",
  headings: [{ depth: 2, id: "course-map", text: "Course map" }],
};

const pages: CompiledDocPage[] = [tasksPage, productionPage, stdlibPage, referencePage];

const SECTION_KEYS = ["learn", "production", "stdlib", "upgrading"] as const;
let output: string;

beforeEach(async () => {
  output = await mkdtemp(join(tmpdir(), "openwdl-search-"));
});

it("indexes headings with direct fragment URLs", () => {
  const records = buildSearchRecords([tasksPage]);
  expect(records).toContainEqual(
    expect.objectContaining({
      title: "Inputs",
      url: "/docs/start/language/tasks/#inputs",
      section: "learn",
    }),
  );
});

it("indexes the page itself with its canonical URL", () => {
  const records = buildSearchRecords([tasksPage]);
  expect(records).toContainEqual(
    expect.objectContaining({
      title: "Tasks",
      url: "/docs/start/language/tasks/",
      section: "learn",
    }),
  );
});
it("indexes body text in heading records instead of duplicating it on the page record", () => {
  const records = buildSearchRecords([tasksPage]);
  const pageRecord = records.find((r) => r.url === "/docs/start/language/tasks/");
  const inputsRecord = records.find((r) => r.url.endsWith("#inputs"));

  expect(pageRecord?.text).toBe("");
  expect(inputsRecord?.text).not.toMatch(/^#/m);
  expect(inputsRecord?.text).toContain("Content here");
});

it("indexes each heading with only the text in its section", () => {
  const page: CompiledDocPage = {
    ...tasksPage,
    body:
      "## Inputs\n\nInput context.\n\n### Optional inputs\n\nNested context.\n\n## Outputs\n\nOutput context.",
    headings: [
      { depth: 1, id: "tasks", text: "Tasks" },
      { depth: 2, id: "inputs", text: "Inputs" },
      { depth: 3, id: "optional-inputs", text: "Optional inputs" },
      { depth: 2, id: "outputs", text: "Outputs" },
    ],
  };

  const records = buildSearchRecords([page]);
  const inputs = records.find((record) => record.url.endsWith("#inputs"));
  const optionalInputs = records.find((record) =>
    record.url.endsWith("#optional-inputs"),
  );

  expect(inputs?.text).toContain("Input context");
  expect(inputs?.text).toContain("Nested context");
  expect(inputs?.text).not.toContain("Output context");
  expect(optionalInputs?.text).toContain("Nested context");
  expect(optionalInputs?.text).not.toContain("Output context");
});

it("does not duplicate the page title as a heading result", () => {
  const page: CompiledDocPage = {
    ...tasksPage,
    headings: [
      { depth: 1, id: "tasks", text: "Tasks" },
      ...tasksPage.headings,
    ],
  };

  const records = buildSearchRecords([page]);

  expect(records).not.toContainEqual(
    expect.objectContaining({ url: "/docs/start/language/tasks/#tasks" }),
  );
});

it("keeps the compressed complete index at or below 500 KB", async () => {
  const chunks = await writeSearchChunks(pages, output);
  const bytes = chunks.reduce(
    (sum, chunk) => sum + gzipSync(Buffer.from(chunk, "utf8")).byteLength,
    0,
  );
  expect(bytes).toBeLessThanOrEqual(500 * 1024);
});

it("writes manifest.json with metadata for every section", async () => {
  await writeSearchChunks(pages, output);
  const manifest = JSON.parse(await readFile(join(output, "manifest.json"), "utf8"));
  expect(Object.keys(manifest.sections).sort()).toEqual([...SECTION_KEYS].sort());
  for (const section of SECTION_KEYS) {
    expect(manifest.sections[section].documentCount).toBeGreaterThan(0);
    expect(manifest.sections[section].filename).toBe(`section-${section}.json`);
  }
  expect(manifest.gzipBytes).toBeGreaterThan(0);
});

it("writes non-empty per-section chunk files", async () => {
  await writeSearchChunks(pages, output);
  for (const section of SECTION_KEYS) {
    const chunk = await readFile(join(output, `section-${section}.json`), "utf8");
    expect(chunk).not.toBe("");
    expect(JSON.parse(chunk)).toBeDefined();
  }
});

it("includes standard-library records in the stdlib chunk", async () => {
  await writeSearchChunks(pages, output);
  const chunk = await readFile(join(output, "section-stdlib.json"), "utf8");
  const index = MiniSearch.loadJSON<SearchRecord>(chunk, {
    fields: ["title", "description", "text"],
    storeFields: ["title", "description", "text", "section", "url"],
  });
  expect(index.search("range")).toEqual(
    expect.arrayContaining([expect.objectContaining({ section: "stdlib" })]),
  );
});

it("stores searchable body text so result snippets can show matching context", async () => {
  await writeSearchChunks(pages, output);
  const chunk = await readFile(join(output, "section-learn.json"), "utf8");
  const index = MiniSearch.loadJSON<SearchRecord>(chunk, {
    fields: ["title", "description", "text"],
    storeFields: ["title", "description", "text", "section", "url"],
  });

  const [result] = index.search("content");
  expect(result?.text).toContain("Content here");
});
