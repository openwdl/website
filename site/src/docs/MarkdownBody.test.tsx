import type { ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { Prose, TableScroll } from "@openwdl/ui";
import { MarkdownBody } from "./MarkdownBody";
import styles from "./MarkdownBody.module.css";

/**
 * Class the kit puts on `element`'s own root, read from a throwaway render so
 * these tests assert delegation to the kit rather than a literal class name.
 * Unmounts what it rendered, so call it before rendering the subject.
 */
function kitRootClass(element: ReactElement): string {
  const { container } = render(element);
  const className = (container.firstElementChild as HTMLElement).className;
  cleanup();
  return className;
}

const tabsSource = [
  ":::tip",
  "Portable inputs matter.",
  ":::",
  "::::tabs",
  ':::tab{label="macOS"}',
  "`brew install sprocket`",
  ":::",
  "::::",
  "```wdl",
  "version 1.3",
  "```",
].join("\n");

it("maps fenced WDL, callout, and tab directives", () => {
  render(<MarkdownBody source={tabsSource} />);
  expect(screen.getByText("Portable inputs matter.")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "macOS" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
});

it("renders a fenced code block for a named language", () => {
  render(<MarkdownBody source={"```wdl\nversion 1.3\n```"} />);
  expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
});

it("renders inline code without a copy button", () => {
  render(<MarkdownBody source={"Use `task` to wrap a command."} />);
  expect(screen.queryByRole("button", { name: "Copy code" })).toBeNull();
  expect(screen.getByText(/task/i)).toBeInTheDocument();
});

it("renders keyboard-key directives as kbd elements", () => {
  render(<MarkdownBody source={"Press :kbd[Command] + :kbd[Space]."} />);

  expect(screen.getByText("Command").tagName).toBe("KBD");
  expect(screen.getByText("Space").tagName).toBe("KBD");
});

it("renders badge directives with the design-system badge", () => {
  render(<MarkdownBody source={"## Build from source :badge[Bonus]"} />);

  const badge = screen.getByText("Bonus");
  expect(badge.tagName).toBe("SPAN");
  expect(badge.className).toContain("Badge");
});

it("highlights the inline import keyword as WDL", () => {
  render(<MarkdownBody source={"Use an `import` statement with `inputs.json`."} />);

  expect(screen.getByText("import")).toHaveAttribute("data-language", "wdl");
  expect(screen.getByText("import").className).toContain("inlineWdlKeyword");
  expect(screen.getByText("inputs.json")).not.toHaveAttribute("data-language");
});

it("does not highlight import in an unlabeled fenced block as inline WDL", () => {
  const { container } = render(<MarkdownBody source={"```\nimport\n```"} />);
  const fencedCode = container.querySelector("pre code");

  expect(fencedCode).toBeInTheDocument();
  expect(fencedCode).not.toHaveAttribute("data-language");
  expect(fencedCode?.className).not.toContain("inlineWdlKeyword");
});

it("renders a note callout", () => {
  render(<MarkdownBody source={":::note\nThis is a note.\n:::"} />);
  expect(screen.getByText("This is a note.")).toBeInTheDocument();
});

it("styles the rendered markdown with the kit prose container", () => {
  const proseClass = kitRootClass(<Prose as="div" />);
  const { container } = render(<MarkdownBody source={"A paragraph.\n"} />);

  const root = container.firstElementChild;
  expect(root?.tagName).toBe("DIV");
  expect(root).toHaveClass(proseClass);
  // Carries the docs `--prose-scroll-offset` override; see MarkdownBody.module.css.
  expect(root).toHaveClass(styles.markdown);
  expect(root?.querySelector("p")?.textContent).toBe("A paragraph.");
});

it("wraps tables in the kit's keyboard-scrollable region", () => {
  const scrollClass = kitRootClass(<TableScroll />);
  render(<MarkdownBody source={"| Name | Type |\n| --- | --- |\n| Sprocket | Engine |"} />);

  const region = screen.getByRole("region", { name: "Scrollable table" });
  expect(region).toHaveAttribute("tabindex", "0");
  expect(region).toHaveClass(scrollClass);
  expect(region.querySelector("table")).toBeInTheDocument();
});

it("resolves root-relative documentation images under the configured base", () => {
  render(
    <MarkdownBody
      source={"![Linear chaining](/docs/patterns/linear-chaining/header.png)"}
    />,
  );

  const image = screen.getByAltText("Linear chaining");
  expect(image).toHaveAttribute(
    "src",
    `${import.meta.env.BASE_URL}docs/patterns/linear-chaining/header.png`,
  );
  expect(image).toHaveClass(styles.localImage);
});

it("leaves external documentation images unchanged", () => {
  render(
    <MarkdownBody
      source={[
        "![Diagram](https://example.com/diagram.png)",
        "![Protocol relative](//cdn.example.com/diagram.png)",
      ].join("\n")}
    />,
  );

  const externalImage = screen.getByAltText("Diagram");
  expect(externalImage).toHaveAttribute("src", "https://example.com/diagram.png");
  expect(externalImage).not.toHaveClass(styles.localImage);

  const protocolRelativeImage = screen.getByAltText("Protocol relative");
  expect(protocolRelativeImage).toHaveAttribute(
    "src",
    "//cdn.example.com/diagram.png",
  );
  expect(protocolRelativeImage).not.toHaveClass(styles.localImage);
});

it("does not render a node attribute on heading DOM elements", () => {
  render(<MarkdownBody source={"## Section Title\n\nContent.\n"} />);
  const heading = screen.getByRole("heading", { level: 2, name: "Section Title" });
  expect(heading).not.toHaveAttribute("node");
});

it("inserts heading alias spans before headings when provided", () => {
  render(
    <MarkdownBody
      source={"## Inputs\n\nContent.\n"}
      headingAliases={{ "old-inputs": "inputs" }}
    />,
  );
  const alias = document.getElementById("old-inputs");
  expect(alias).toBeInTheDocument();
  expect(alias?.tagName).toBe("SPAN");
  expect(alias?.getAttribute("aria-hidden")).toBe("true");
});
