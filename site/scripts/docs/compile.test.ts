// @vitest-environment node
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileDocs } from "./compile";

let contentRoot: string;
let generatedFile: string;
let searchRoot: string;

beforeEach(async () => {
  contentRoot = await mkdtemp(join(tmpdir(), "openwdl-docs-"));
  generatedFile = join(contentRoot, "docs.generated.ts");
  searchRoot = join(contentRoot, "search");
});

async function writeFixture(name: string, source: string): Promise<void> {
  await writeFile(join(contentRoot, name), source);
}

async function writeInvalidFixture(name: string): Promise<void> {
  const valid = `---
title: Tasks
description: Define a task.
slug: /docs/start/language/tasks/
section: learn
group: Language guide
order: 10
kind: guide
legacy: []
---
# Tasks
`;
  if (name === "unknown section") {
    await writeFixture("invalid.md", valid.replace("section: learn", "section: unknown"));
    return;
  }
  if (name === "empty description") {
    await writeFixture("invalid.md", valid.replace("description: Define a task.", "description: ''"));
    return;
  }
  await writeFixture("one.md", valid);
  if (name === "duplicate slug") {
    await writeFixture("two.md", valid.replace("title: Tasks", "title: More tasks"));
    return;
  }
  await writeFixture(
    "two.md",
    valid
      .replace("title: Tasks", "title: Workflows")
      .replace("slug: /docs/start/language/tasks/", "slug: /docs/start/language/workflows/"),
  );
}

it("compiles valid frontmatter and stable heading IDs", async () => {
  await writeFixture("tasks.md", `---
title: Tasks
description: Define a portable unit of computation.
slug: /docs/start/language/tasks/
section: learn
group: Language guide
order: 40
kind: guide
legacy:
  - /language-guide/tasks.html
---
# Tasks
## Inputs
## Inputs
`);

  const result = await compileDocs({ contentRoot, generatedFile, searchRoot });

  expect(result.pages[0]).toMatchObject({
    slug: "/docs/start/language/tasks/",
    section: "learn",
    headings: [
      { depth: 1, id: "tasks", text: "Tasks" },
      { depth: 2, id: "inputs", text: "Inputs" },
      { depth: 2, id: "inputs-1", text: "Inputs" },
    ],
  });
});

it("preserves inline code literals in extracted heading parts", async () => {
  await writeFixture("upgrade.md", `---
title: Upgrade guide
description: Upgrade between WDL versions.
slug: /docs/reference/upgrade-guide/
section: upgrading
group: Language reference
order: 10
kind: reference
legacy: []
---
# Upgrade guide
## New \`task.max_retries\` variable
`);

  const result = await compileDocs({ contentRoot, generatedFile, searchRoot });

  expect(result.pages[0].headings[1]).toEqual({
    depth: 2,
    id: "new-taskmax_retries-variable",
    text: "New task.max_retries variable",
    parts: [
      { type: "text", value: "New " },
      { type: "code", value: "task.max_retries" },
      { type: "text", value: " variable" },
    ],
  });
});

it("removes the Markdown title heading rendered by the docs shell", async () => {
  await writeFixture("tasks.md", `---
title: Tasks
description: Define a portable unit of computation.
slug: /docs/start/language/tasks/
section: learn
group: Language guide
order: 40
kind: guide
legacy: []
---

# Tasks

Task introduction.

## Inputs
`);

  const result = await compileDocs({ contentRoot, generatedFile, searchRoot });

  expect(result.pages[0].body).toBe("\nTask introduction.\n\n## Inputs\n");
  expect(result.pages[0].headings).toEqual([
    { depth: 1, id: "tasks", text: "Tasks" },
    { depth: 2, id: "inputs", text: "Inputs" },
  ]);
});

it("demotes later Markdown h1 sections below the shell title", async () => {
  await writeFixture("upgrade.md", `---
title: Upgrade guide
description: Upgrade between WDL versions.
slug: /docs/reference/upgrade-guide/
section: upgrading
group: Language reference
order: 10
kind: reference
legacy: []
---

# Overview

Introduction.

# WDL v1.3

Changes in version 1.3.
`);

  const result = await compileDocs({ contentRoot, generatedFile, searchRoot });

  expect(result.pages[0].body).toContain("## WDL v1.3");
  expect(result.pages[0].body).not.toMatch(/^# /m);
  expect(result.pages[0].headings).toEqual([
    { depth: 1, id: "overview", text: "Overview" },
    { depth: 2, id: "wdl-v13", text: "WDL v1.3" },
  ]);
});

it("does not treat h1-like lines in fenced code as page headings", async () => {
  await writeFixture("tasks.md", `---
title: Tasks
description: Define a portable unit of computation.
slug: /docs/start/language/tasks/
section: learn
group: Language guide
order: 40
kind: guide
legacy: []
---

# Tasks

\`\`\`bash
# Explain the command.
echo "hello"
\`\`\`
`);

  const result = await compileDocs({ contentRoot, generatedFile, searchRoot });

  expect(result.pages[0].body).toContain("# Explain the command.");
  expect(result.pages[0].headings).toEqual([
    { depth: 1, id: "tasks", text: "Tasks" },
  ]);
});

it.each([
  ["duplicate slug", "Duplicate slug"],
  ["unknown section", "Invalid enum value"],
  ["empty description", "description"],
  ["duplicate order in a group", "Duplicate navigation position"],
])("rejects %s", async (_name, expected) => {
  await writeInvalidFixture(_name);
  await expect(compileDocs({ contentRoot, generatedFile, searchRoot }))
    .rejects.toThrow(expected);
});

it("discovers nested .md files recursively", async () => {
  await mkdir(join(contentRoot, "guide"), { recursive: true });
  await writeFile(join(contentRoot, "guide", "intro.md"), `---
title: Introduction
description: Getting started with OpenWDL.
slug: /docs/learn/intro/
section: learn
group: Getting started
order: 1
kind: guide
legacy: []
---
# Introduction
`);
  const result = await compileDocs({ contentRoot, generatedFile, searchRoot });
  expect(result.pages).toHaveLength(1);
  expect(result.pages[0].slug).toBe("/docs/learn/intro/");
});

it("orders Getting Started groups as Overview, Language guide, then Design patterns", async () => {
  await writeFixture("overview.md", `---
title: Overview
description: Start learning WDL.
slug: /docs/start/overview/
section: learn
group: Overview
order: 1
kind: guide
legacy: []
---
# Overview
`);
  await writeFixture("patterns.md", `---
title: Patterns
description: Reusable workflow patterns.
slug: /docs/start/patterns/
section: learn
group: Design patterns
order: 1
kind: pattern
legacy: []
---
# Patterns
`);
  await writeFixture("language.md", `---
title: Language
description: Core language concepts.
slug: /docs/start/language/
section: learn
group: Language guide
order: 1
kind: guide
legacy: []
---
# Language
`);

  const result = await compileDocs({ contentRoot, generatedFile, searchRoot });

  expect(result.pages.map((page) => page.group)).toEqual([
    "Overview",
    "Language guide",
    "Design patterns",
  ]);
});

it("orders Production guide groups by the course lifecycle", async () => {
  for (const [name, group] of [
    ["deployment", "Deployment"],
    ["release", "Versioning and release"],
    ["pipeline", "Pipeline development"],
    ["overview", "Overview"],
    ["environment", "Environment setup"],
  ] as const) {
    await writeFixture(`${name}.md`, `---
title: ${name}
description: Production course page.
slug: /docs/production/${name}/
section: production
group: ${group}
order: 10
kind: tutorial
legacy: []
---
# ${name}
`);
  }

  const result = await compileDocs({ contentRoot, generatedFile, searchRoot });

  expect(result.pages.map((page) => page.group)).toEqual([
    "Overview",
    "Environment setup",
    "Pipeline development",
    "Versioning and release",
    "Deployment",
  ]);
});

it("heading extraction preserves underscores in function names (parity with rehype-slug)", async () => {
  await writeFixture("functions.md", `---
title: Stdlib test
description: Compiler parity test.
slug: /docs/stdlib/test/
section: stdlib
group: Standard library
order: 1
kind: reference
legacy: []
---
# Map Functions
## \`collect_by_key\`
## \`join_paths\`
## \`contains_key\`
## \`read_string\`
## \`as_pairs\`
`);
  const result = await compileDocs({ contentRoot, generatedFile, searchRoot });
  expect(result.pages[0].headings).toMatchObject([
    { depth: 1, id: "map-functions", text: "Map Functions" },
    { depth: 2, id: "collect_by_key", text: "collect_by_key" },
    { depth: 2, id: "join_paths", text: "join_paths" },
    { depth: 2, id: "contains_key", text: "contains_key" },
    { depth: 2, id: "read_string", text: "read_string" },
    { depth: 2, id: "as_pairs", text: "as_pairs" },
  ]);
});

it("heading extraction strips emphasis version annotations without corrupting adjacent underscore identifiers", async () => {
  await writeFixture("functions.md", `---
title: Stdlib test
description: Compiler parity test.
slug: /docs/stdlib/test/
section: stdlib
group: Standard library
order: 1
kind: reference
legacy: []
---
## \`join_paths\` _(Requires WDL v1.2)_
## \`contains_key\` _(Requires WDL v1.2)_
## New \`else if\` and \`else\` conditional clauses
## Enum Functions \`v1.3\`
`);
  const result = await compileDocs({ contentRoot, generatedFile, searchRoot });
  expect(result.pages[0].headings).toMatchObject([
    { depth: 2, id: "join_paths-requires-wdl-v12", text: "join_paths (Requires WDL v1.2)" },
    { depth: 2, id: "contains_key-requires-wdl-v12", text: "contains_key (Requires WDL v1.2)" },
    { depth: 2, id: "new-else-if-and-else-conditional-clauses", text: "New else if and else conditional clauses" },
    { depth: 2, id: "enum-functions-v13", text: "Enum Functions v1.3" },
  ]);
});

it("rejects headingAliases whose target does not exist", async () => {
  await writeFixture("tasks.md", `---
title: Tasks
description: Define a portable unit of computation.
slug: /docs/start/language/tasks/
section: learn
group: Language guide
order: 40
kind: guide
legacy: []
headingAliases:
  old-inputs: nonexistent-heading-id
---
# Tasks
## Inputs
`);
  await expect(compileDocs({ contentRoot, generatedFile, searchRoot }))
    .rejects.toThrow("headingAliases");
});
