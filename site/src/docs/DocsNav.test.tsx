import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CompiledDocPage } from "../../scripts/docs/types";
import { DocsNav } from "./DocsNav";

const pages: CompiledDocPage[] = [
  {
    title: "Overview",
    description: "Learn OpenWDL.",
    slug: "/docs/start/overview/",
    section: "learn",
    group: "Overview",
    order: 1,
    kind: "guide",
    legacy: [],
    sourcePath: "learn/overview.md",
    body: "",
    headings: [],
  },
  {
    title: "Tasks",
    description: "Define tasks.",
    slug: "/docs/start/language/tasks/",
    section: "learn",
    group: "Language guide",
    order: 1,
    kind: "guide",
    legacy: [],
    sourcePath: "write/tasks.md",
    body: "",
    headings: [],
  },
  {
    title: "Linear chaining",
    description: "Chain tasks.",
    slug: "/docs/start/patterns/linear-chaining/",
    section: "learn",
    group: "Design patterns",
    order: 1,
    kind: "pattern",
    legacy: [],
    sourcePath: "write/patterns/linear-chaining.md",
    body: "",
    headings: [],
  },
  {
    title: "Ecosystem",
    description: "Run workflows.",
    slug: "/docs/start/ecosystem/",
    section: "learn",
    group: "Overview",
    order: 1,
    kind: "guide",
    legacy: [],
    sourcePath: "run/ecosystem.md",
    body: "",
    headings: [],
  },
  {
    title: "Getting started",
    description: "Build a production pipeline.",
    slug: "/docs/production/getting-started/",
    section: "production",
    group: "Overview",
    order: 1,
    kind: "tutorial",
    legacy: [],
    sourcePath: "production/1-getting-started.md",
    body: "",
    headings: [],
  },
  {
    title: "Release a pipeline",
    description: "Publish a pipeline release.",
    slug: "/docs/production/release-a-pipeline/",
    section: "production",
    group: "Versioning and release",
    order: 1,
    kind: "tutorial",
    legacy: [],
    sourcePath: "production/12-release-a-pipeline.md",
    body: "",
    headings: [],
  },
];

it("opens all groups by default", () => {
  render(<DocsNav page={pages[1]} pages={pages} />);

  const nav = screen.getByRole("navigation", { name: "Documentation pages" });
  expect(within(nav).getByRole("link", { name: "Tasks" })).toBeInTheDocument();
  expect(within(nav).getByRole("link", { name: "Linear chaining" }))
    .toBeInTheDocument();
  expect(within(nav).getByRole("link", { name: "Overview" })).toBeInTheDocument();
  expect(within(nav).getByRole("link", { name: "Ecosystem" }))
    .toBeInTheDocument();
  expect(
    within(nav).getByRole("button", { name: "Language guide" }),
  ).toHaveAttribute("aria-expanded", "true");
  expect(
    within(nav).getByRole("button", { name: "Design patterns" }),
  ).toHaveAttribute("aria-expanded", "true");
});

it("renders inline code from a page heading in the navigation title", () => {
  const page: CompiledDocPage = {
    ...pages[1],
    title: "Explore ref-summary",
    headings: [{
      depth: 1,
      id: "explore-ref-summary",
      text: "Explore ref-summary",
      parts: [
        { type: "text", value: "Explore " },
        { type: "code", value: "ref-summary" },
      ],
    }],
  };

  render(<DocsNav page={page} pages={[page]} />);

  const link = screen.getByRole("link", { name: "Explore ref-summary" });
  expect(within(link).getByText("ref-summary").tagName).toBe("CODE");
});

it("allows groups to be expanded and collapsed independently", async () => {
  const user = userEvent.setup();
  render(<DocsNav page={pages[1]} pages={pages} />);

  const languageGuide = screen.getByRole("button", { name: "Language guide" });
  const designPatterns = screen.getByRole("button", { name: "Design patterns" });

  await user.click(designPatterns);
  expect(screen.queryByRole("link", { name: "Linear chaining" }))
    .not.toBeInTheDocument();
  expect(languageGuide).toHaveAttribute("aria-expanded", "true");

  await user.click(languageGuide);
  expect(screen.queryByRole("link", { name: "Tasks" })).not.toBeInTheDocument();
  expect(designPatterns).toHaveAttribute("aria-expanded", "false");
});

it("preserves group state when navigating to another documentation page", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<DocsNav page={pages[1]} pages={pages} />);

  await user.click(screen.getByRole("button", { name: "Design patterns" }));
  rerender(<DocsNav page={pages[0]} pages={pages} />);

  expect(
    screen.getByRole("button", { name: "Design patterns" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("link", { name: "Linear chaining" }))
    .not.toBeInTheDocument();
});

it("opens all groups by default when navigating to another section", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<DocsNav page={pages[0]} pages={pages} />);

  await user.click(screen.getByRole("button", { name: "Overview" }));
  expect(screen.getByRole("button", { name: "Overview" }))
    .toHaveAttribute("aria-expanded", "false");

  rerender(<DocsNav page={pages[4]} pages={pages} />);

  expect(screen.getByRole("button", { name: "Overview" }))
    .toHaveAttribute("aria-expanded", "true");
  expect(
    screen.getByRole("button", { name: "Versioning and release" }),
  ).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("link", { name: "Getting started" }))
    .toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Release a pipeline" }))
    .toBeInTheDocument();
});
