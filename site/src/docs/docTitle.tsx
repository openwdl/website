import type { ReactNode } from "react";
import { Code } from "@openwdl/ui";
import type { CompiledDocPage } from "../../scripts/docs/types";

/** Render inline code from a page's Markdown h1 while retaining its plain frontmatter title. */
export function docTitle(page: Pick<CompiledDocPage, "headings" | "title">): ReactNode {
  const parts = page.headings.find((heading) => heading.depth === 1)?.parts;
  if (!parts) return page.title;
  return parts.map((part, index) =>
    part.type === "code"
      ? <Code key={`${part.type}-${index}`}>{part.value}</Code>
      : part.value,
  );
}
