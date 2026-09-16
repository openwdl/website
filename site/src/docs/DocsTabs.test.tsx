import { beforeEach } from "vitest";
import { act } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocsTabs } from "./DocsTabs";
import { MarkdownBody } from "./MarkdownBody";
import { markdownDirectives } from "./markdownDirectives";

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    } satisfies Storage,
  });
});

const tabsSource = [
  "::::tabs",
  ':::tab{label="macOS"}',
  "Install with brew.",
  ":::",
  ':::tab{label="Linux"}',
  "Install with apt.",
  ":::",
  "::::",
].join("\n");

// The widget behaviour (roving tabindex, arrow keys, one visible panel) belongs
// to `@openwdl/ui`'s `Tabs` and is covered there. These tests cover the adapter:
// which items the markdown directives produce and in what order.

it("maps each labelled directive child to a tab, in source order", () => {
  render(<MarkdownBody source={tabsSource} />);
  const labels = screen.getAllByRole("tab").map((tab) => tab.textContent);
  expect(labels).toEqual(["macOS", "Linux"]);
});

it("maps each directive child's content into the panel for its label", () => {
  render(<MarkdownBody source={tabsSource} />);
  const panels = screen.getAllByRole("tabpanel", { hidden: true });

  expect(panels).toHaveLength(2);
  expect(panels[0]).toHaveTextContent("Install with brew.");
  expect(panels[1]).toHaveTextContent("Install with apt.");
  // Each panel is labelled by the tab whose label it was extracted from.
  for (const [idx, label] of ["macOS", "Linux"].entries()) {
    const tab = screen.getByRole("tab", { name: label });
    expect(panels[idx].getAttribute("aria-labelledby")).toBe(tab.getAttribute("id"));
  }
});

it("reads labels from the data-label attribute on plain element children", () => {
  render(
    <DocsTabs>
      <div data-label="First">one</div>
      <div data-label="Second">two</div>
    </DocsTabs>,
  );
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
    "First",
    "Second",
  ]);
});

it("reads labels from the legacy node.properties.label hast shape", () => {
  render(
    <DocsTabs>
      <div {...{ node: { properties: { label: "Legacy" } } }}>legacy body</div>
    </DocsTabs>,
  );
  const tab = screen.getByRole("tab", { name: "Legacy" });
  expect(tab).toBeInTheDocument();
  expect(screen.getByRole("tabpanel")).toHaveTextContent("legacy body");
});

it("falls back to a plain wrapper when no child carries a label", () => {
  render(
    <DocsTabs>
      <p>loose content</p>
    </DocsTabs>,
  );
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  expect(screen.getByText("loose content")).toBeInTheDocument();
});

it("falls back to a plain wrapper when there are no children at all", () => {
  const { container } = render(<DocsTabs />);
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  expect(container.firstChild).toBeEmptyDOMElement();
});

it("drops unlabelled children from a group that has labelled ones", () => {
  render(
    <DocsTabs>
      <div data-label="Kept">kept body</div>
      <p>stray prose</p>
    </DocsTabs>,
  );
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  expect(screen.queryByText("stray prose")).not.toBeInTheDocument();
});

const duplicateLabelSource = [
  "::::tabs",
  ':::tab{label="Setup"}',
  "First setup.",
  ":::",
  ':::tab{label="Setup"}',
  "Second setup.",
  ":::",
  "::::",
].join("\n");

it("gives repeated labels within a group distinct tabs and panel ids", () => {
  render(<MarkdownBody source={duplicateLabelSource} />);
  const tabs = screen.getAllByRole("tab", { name: "Setup" });
  const panels = screen.getAllByRole("tabpanel", { hidden: true });

  expect(tabs).toHaveLength(2);
  expect(panels).toHaveLength(2);
  expect(panels[0].getAttribute("id")).not.toBe(panels[1].getAttribute("id"));
  expect(tabs[0].getAttribute("aria-controls")).toBe(panels[0].getAttribute("id"));
  expect(tabs[1].getAttribute("aria-controls")).toBe(panels[1].getAttribute("id"));
});

it("derives panel ids from the label slug", () => {
  render(
    <DocsTabs>
      <div data-label="Command Line!">body</div>
    </DocsTabs>,
  );
  expect(screen.getByRole("tabpanel").getAttribute("id")).toMatch(/-panel-command-line$/);
});

const twoGroupsSource = [
  "::::tabs",
  ':::tab{label="Alpha"}',
  "First group first tab.",
  ":::",
  "::::",
  "",
  "::::tabs",
  ':::tab{label="Alpha"}',
  "Second group first tab.",
  ":::",
  "::::",
].join("\n");

it("keeps ids unique across two co-existing tab groups", () => {
  render(<MarkdownBody source={twoGroupsSource} />);
  const tabs = screen.getAllByRole("tab", { name: "Alpha" });
  const panels = screen.getAllByRole("tabpanel", { hidden: true });

  expect(tabs).toHaveLength(2);
  expect(tabs[0].getAttribute("id")).not.toBe(tabs[1].getAttribute("id"));
  expect(panels[0].getAttribute("id")).not.toBe(panels[1].getAttribute("id"));
  expect(tabs[0].getAttribute("aria-controls")).toBe(panels[0].getAttribute("id"));
  expect(tabs[1].getAttribute("aria-controls")).toBe(panels[1].getAttribute("id"));
});

it("renders nested markdown inside a tab panel", () => {
  render(
    <MarkdownBody
      source={["::::tabs", ':::tab{label="Code"}', "`wdl run`", ":::", "::::"].join("\n")}
    />,
  );
  const panel = screen.getByRole("tabpanel");
  expect(within(panel).getByText("wdl run")).toBeInTheDocument();
});

it("renders an approach selector inside a platform tab", () => {
  const source = [
    '::::::tabs{sync="platform"}',
    ':::::tab{label="macOS"}',
    "::::tabs",
    ':::tab{label="Homebrew"}',
    "Install with brew.",
    ":::",
    ':::tab{label="Manual binary"}',
    "Install a binary.",
    ":::",
    "::::",
    ":::::",
    ':::::tab{label="Linux"}',
    "Linux instructions.",
    ":::::",
    ':::::tab{label="Windows"}',
    "Windows instructions.",
    ":::::",
    "::::::",
  ].join("\n");

  render(<MarkdownBody source={source} />);

  const macPanel = screen.getByRole("tabpanel", { name: "macOS" });
  expect(within(macPanel).getByRole("tab", { name: "Homebrew" })).toBeInTheDocument();
  expect(within(macPanel).getByRole("tab", { name: "Manual binary" })).toBeInTheDocument();
});

const syncedPlatformSource = [
  '::::tabs{sync="platform"}',
  ':::tab{label="macOS"}',
  "macOS command one",
  ":::",
  ':::tab{label="Linux"}',
  "Linux command one",
  ":::",
  ':::tab{label="Windows"}',
  "Windows command one",
  ":::",
  "::::",
  "",
  '::::tabs{sync="platform"}',
  ':::tab{label="macOS"}',
  "macOS command two",
  ":::",
  ':::tab{label="Linux"}',
  "Linux command two",
  ":::",
  ':::tab{label="Windows"}',
  "Windows command two",
  ":::",
  "::::",
].join("\n");

it("synchronizes explicitly marked platform tabs and persists the choice", async () => {
  window.localStorage.clear();
  const user = userEvent.setup();
  render(<MarkdownBody source={syncedPlatformSource} />);

  const linuxTabs = screen.getAllByRole("tab", { name: "Linux" });
  await user.click(linuxTabs[0]);

  expect(linuxTabs.every((tab) => tab.getAttribute("aria-selected") === "true")).toBe(true);
  expect(screen.getByText("Linux command one")).toBeVisible();
  expect(screen.getByText("Linux command two")).toBeVisible();
  expect(window.localStorage.getItem("openwdl.docs.platform")).toBe("linux");
});

it("restores the saved platform when a synchronized group mounts", () => {
  window.localStorage.setItem("openwdl.docs.platform", "windows");
  render(<MarkdownBody source={syncedPlatformSource} />);

  expect(screen.getAllByRole("tab", { name: "Windows" })[0])
    .toHaveAttribute("aria-selected", "true");
  window.localStorage.clear();
});

it("falls back to the first tab for a stale saved platform", () => {
  window.localStorage.setItem("openwdl.docs.platform", "beos");
  render(<MarkdownBody source={syncedPlatformSource} />);

  expect(screen.getAllByRole("tab", { name: "macOS" })[0])
    .toHaveAttribute("aria-selected", "true");
});

it("synchronizes on the current page when storage is unavailable", async () => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get: () => {
      throw new Error("storage blocked");
    },
  });
  const user = userEvent.setup();
  render(<MarkdownBody source={syncedPlatformSource} />);

  const windowsTabs = screen.getAllByRole("tab", { name: "Windows" });
  await user.click(windowsTabs[0]);

  expect(windowsTabs.every((tab) => tab.getAttribute("aria-selected") === "true")).toBe(true);
});

it("does not synchronize ordinary tabs that happen to use platform labels", async () => {
  window.localStorage.clear();
  const user = userEvent.setup();
  render(<MarkdownBody source={`${tabsSource}\n\n${tabsSource}`} />);

  const linuxTabs = screen.getAllByRole("tab", { name: "Linux" });
  await user.click(linuxTabs[0]);

  expect(linuxTabs[0]).toHaveAttribute("aria-selected", "true");
  expect(linuxTabs[1]).toHaveAttribute("aria-selected", "false");
  expect(window.localStorage.getItem("openwdl.docs.platform")).toBeNull();
});
it("responds to platform changes from another browser tab", async () => {
  render(<MarkdownBody source={syncedPlatformSource} />);
  await act(async () => {
    window.localStorage.setItem("openwdl.docs.platform", "linux");
    window.dispatchEvent(new StorageEvent("storage", {
      key: "openwdl.docs.platform",
      newValue: "linux",
    }));
  });

  await waitFor(() => {
    expect(screen.getAllByRole("tab", { name: "Linux" })[0])
      .toHaveAttribute("aria-selected", "true");
  });
});


it("rejects a tab without a tabs container", () => {
  const tree = {
    type: "root",
    children: [{ type: "containerDirective", name: "tab", attributes: { label: "Linux" } }],
  };
  expect(() => markdownDirectives()(tree))
    .toThrow("tab directive must be nested directly inside tabs");
});

it("rejects non-tab content inside a tabs container", () => {
  const tree = {
    type: "root",
    children: [{
      type: "containerDirective",
      name: "tabs",
      children: [
        { type: "containerDirective", name: "tab", attributes: { label: "Linux" } },
        { type: "paragraph", children: [] },
      ],
    }],
  };
  expect(() => markdownDirectives()(tree))
    .toThrow("tabs directive may contain only tab directives");
});
