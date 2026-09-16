import { render, screen, within } from "@testing-library/react";
import { act } from "react";
import userEvent from "@testing-library/user-event";
import type { CompiledDocPage } from "../../scripts/docs/types";
import shellStyles from "./DocsShell.module.css";
import { DocsShell } from "./DocsShell";

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
  body: "## Inputs\n\nContent.\n",
  headings: [{ depth: 2, id: "inputs", text: "Inputs" }],
};

const pages: CompiledDocPage[] = [tasksPage];

const sectionPages: CompiledDocPage[] = [
  {
    ...tasksPage,
    title: "Overview",
    slug: "/docs/start/overview/",
    section: "learn",
    group: "Overview",
  },
  tasksPage,
  {
    ...tasksPage,
    title: "Production WDL pipeline",
    slug: "/docs/production/",
    section: "production",
    group: "Overview",
  },
  {
    ...tasksPage,
    title: "Array",
    slug: "/docs/stdlib/array/",
    section: "stdlib",
    group: "Standard library",
  },
  {
    ...tasksPage,
    title: "Ecosystem",
    slug: "/docs/start/ecosystem/",
    section: "learn",
    group: "Overview",
  },
  {
    ...tasksPage,
    title: "Upgrade guide",
    slug: "/docs/reference/upgrade-guide/",
    section: "upgrading",
    group: "Guides",
  },
];

it("renders the Documentation sections navigation", () => {
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );
  expect(
    screen.getByRole("navigation", { name: "Documentation sections" }),
  ).toBeInTheDocument();
});

it("places the documentation site on its own page surface", () => {
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );

  const sections = screen.getByRole("navigation", {
    name: "Documentation sections",
  });
  expect(sections.parentElement?.className).toContain("page");
  expect(within(sections.parentElement as HTMLElement).getByRole("main"))
    .toHaveAttribute("id", "main-content");
});

it("places the search control in the section navigation", () => {
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );

  const sections = screen.getByRole("navigation", {
    name: "Documentation sections",
  });
  expect(
    within(sections).getByRole("button", { name: "Search docs" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("OpenWDL Docs")).not.toBeInTheDocument();
});

it("links all documentation sections in learning order", () => {
  render(
    <DocsShell page={tasksPage} pages={sectionPages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );

  const sections = screen.getByRole("navigation", {
    name: "Documentation sections",
  });
  const links = within(sections).getAllByRole("link");
  expect(links.map((link) => link.textContent)).toEqual([
    "Getting started",
    "Production guide",
    "Standard library",
    "Upgrading",
  ]);
  expect(links[0]).toHaveAttribute("href", "/docs/start/overview/");
  expect(links[1]).toHaveAttribute("href", "/docs/production/");
  expect(links[2]).toHaveAttribute("href", "/docs/stdlib/array/");
  expect(links[3]).toHaveAttribute("href", "/docs/reference/upgrade-guide/");
  expect(within(sections).queryByRole("link", { name: "Reference" })).toBeNull();
  expect(within(sections).queryByRole("link", { name: "Learn WDL" })).toBeNull();
  expect(within(sections).queryByRole("link", { name: "Patterns" })).toBeNull();
  expect(within(sections).queryByRole("link", { name: "Ecosystem" })).toBeNull();
});

it("renders the Documentation pages navigation", () => {
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );
  expect(
    screen.getByRole("navigation", { name: "Documentation pages" }),
  ).toBeInTheDocument();
});

it("renders the On this page navigation", () => {
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );
  expect(
    screen.getByRole("navigation", { name: "On this page" }),
  ).toBeInTheDocument();
});

it("keeps the page outline a direct grid child reachable by its aria-label", () => {
  // Mobile visibility is CSS-driven through `.layout > [aria-label="On this
  // page"]`, and desktop placement through `.layout > .toc`, so the outline
  // has to keep the kit's default label, carry the shell's placement class,
  // and stay a direct child of the grid alongside the rail and the article.
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );
  const toc = screen.getByRole("navigation", { name: "On this page" });
  const rail = screen.getByRole("navigation", { name: "Documentation pages" });

  expect(toc).toHaveAttribute("aria-label", "On this page");
  expect(toc).toHaveAttribute("id", "docs-page-toc");
  expect(toc).toHaveClass(shellStyles.toc);
  expect(toc.parentElement).toBe(rail.parentElement);
  expect(toc.parentElement).toBe(screen.getByRole("main").parentElement);
});

it("offsets the sticky page outline below the section nav", () => {
  // The kit self-defaults `--toc-offset` on the component root, which beats
  // any ancestor declaration; only an inline declaration outranks it.
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );
  const toc = screen.getByRole("navigation", { name: "On this page" });

  expect(toc.style.getPropertyValue("--toc-offset")).toBe(
    "var(--docs-section-nav-h)",
  );
});

it("passes heading code literals straight through to the page outline", () => {
  const page: CompiledDocPage = {
    ...tasksPage,
    headings: [
      {
        depth: 2,
        id: "new-taskmax_retries-variable",
        text: "New task.max_retries variable",
        parts: [
          { type: "text", value: "New " },
          { type: "code", value: "task.max_retries" },
          { type: "text", value: " variable" },
        ],
      },
    ],
  };
  render(
    <DocsShell page={page} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );
  const toc = screen.getByRole("navigation", { name: "On this page" });

  expect(within(toc).getByText("task.max_retries").tagName).toBe("CODE");
  expect(
    within(toc).getByRole("link", { name: "New task.max_retries variable" }),
  ).toHaveAttribute("href", "#new-taskmax_retries-variable");
});

it("renders heading badges in the page outline", () => {
  const page: CompiledDocPage = {
    ...tasksPage,
    headings: [
      {
        depth: 2,
        id: "build-from-source-bonus",
        text: "Build from source Bonus",
        parts: [
          { type: "text", value: "Build from source " },
          { type: "badge", value: "Bonus" },
        ],
      },
    ],
  };
  render(
    <DocsShell page={page} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );

  const toc = screen.getByRole("navigation", { name: "On this page" });
  expect(within(toc).getByText("Bonus").className).toContain("Badge");
});

it("highlights the heading currently passing through the reading position", () => {
  let notify: IntersectionObserverCallback = () => undefined;
  const observe = vi.fn();
  class MockIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      notify = callback;
    }

    observe = observe;
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

  const page: CompiledDocPage = {
    ...tasksPage,
    headings: [
      { depth: 2, id: "inputs", text: "Inputs" },
      { depth: 2, id: "outputs", text: "Outputs" },
    ],
  };
  render(
    <DocsShell page={page} pages={pages}>
      <h1>Tasks</h1>
      <h2 id="inputs">Inputs</h2>
      <h2 id="outputs">Outputs</h2>
    </DocsShell>,
  );
  const toc = screen.getByRole("navigation", { name: "On this page" });
  vi.spyOn(
    screen.getByRole("heading", { name: "Inputs" }),
    "getBoundingClientRect",
  ).mockReturnValue({ top: -200 } as DOMRect);
  vi.spyOn(
    screen.getByRole("heading", { name: "Outputs" }),
    "getBoundingClientRect",
  ).mockReturnValue({ top: -1 } as DOMRect);

  expect(
    within(toc).getByRole("link", { name: "Inputs" }),
  ).toHaveAttribute("aria-current", "location");
  expect(observe).toHaveBeenCalledTimes(2);

  act(() => {
    notify([], {} as IntersectionObserver);
  });

  expect(
    within(toc).getByRole("link", { name: "Outputs" }),
  ).toHaveAttribute("aria-current", "location");
  expect(
    within(toc).getByRole("link", { name: "Inputs" }),
  ).not.toHaveAttribute("aria-current");

  vi.unstubAllGlobals();
});

it("renders a skip link to main content", () => {
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );
  expect(screen.getByRole("link", { name: /skip to main content/i })).toHaveAttribute(
    "href",
    "#main-content",
  );
});

it("renders mobile disclosure buttons for docs menu and on this page", () => {
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );
  expect(
    screen.getByRole("button", { name: /docs menu/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /on this page/i }),
  ).toBeInTheDocument();
});

it("places mobile controls before both collapsible panels and the article", () => {
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );

  const controls = screen.getByRole("button", { name: /docs menu/i })
    .parentElement?.parentElement;
  const nav = screen.getByRole("navigation", { name: "Documentation pages" });
  const toc = screen.getByRole("navigation", { name: "On this page" });
  const main = screen.getByRole("main");

  expect(controls?.compareDocumentPosition(nav)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  expect(nav.compareDocumentPosition(toc)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(toc.compareDocumentPosition(main)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
});

it("clicking Docs menu updates aria-expanded and nav data-open", async () => {
  const user = userEvent.setup();
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );
  const button = screen.getByRole("button", { name: /docs menu/i });
  expect(button).toHaveAttribute("aria-expanded", "false");

  await user.click(button);

  expect(button).toHaveAttribute("aria-expanded", "true");
  expect(
    screen.getByRole("navigation", { name: "Documentation pages" }),
  ).toHaveAttribute("data-open", "true");
});

it("clicking On this page updates aria-expanded and toc data-open", async () => {
  const user = userEvent.setup();
  render(
    <DocsShell page={tasksPage} pages={pages}>
      <h1>Tasks</h1>
    </DocsShell>,
  );
  const button = screen.getByRole("button", { name: /on this page/i });
  expect(button).toHaveAttribute("aria-expanded", "false");

  await user.click(button);

  expect(button).toHaveAttribute("aria-expanded", "true");
  expect(
    screen.getByRole("navigation", { name: "On this page" }),
  ).toHaveAttribute("data-open", "true");
});
