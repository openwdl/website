import type { DocSection } from "../../scripts/docs/types";

/** Ordered section links displayed in the documentation sub-navigation. */
export const DOC_SECTIONS: readonly {
  key: DocSection;
  label: string;
}[] = [
  { key: "learn", label: "Getting started" },
  { key: "production", label: "Production guide" },
  { key: "stdlib", label: "Standard library" },
  { key: "upgrading", label: "Upgrading" },
];

const SECTION_LABELS: Record<DocSection, string> = {
  learn: "Getting started",
  production: "Production guide",
  stdlib: "Standard library",
  upgrading: "Upgrading",
};

/** Returns the reader-facing label for a documentation section key. */
export function docSectionLabel(section: DocSection): string {
  return SECTION_LABELS[section];
}
