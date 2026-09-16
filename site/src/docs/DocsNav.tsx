import { useId, useState } from "react";
import { FiChevronRight } from "react-icons/fi";
import type { CompiledDocPage } from "../../scripts/docs/types";
import { docHref } from "./docHref";
import { docTitle } from "./docTitle";
import styles from "./DocsNav.module.css";

/** Props for {@link DocsNav}. */
export interface DocsNavProps {
  /** The currently active page. */
  page: CompiledDocPage;
  /** All pages (including hidden) to render in the rail. */
  pages: readonly CompiledDocPage[];
  /** Optional element id, used by mobile `aria-controls` references. */
  id?: string;
  /** When provided, sets `data-open` on the nav element for CSS-driven
   *  mobile visibility wired to disclosure state. */
  open?: boolean;
}

/**
 * Left page rail: groups visible pages from the active section and marks the
 * current page with `aria-current="page"`. Groups open by default and preserve
 * reader-closed state independently within each documentation section.
 */
export function DocsNav({ page, pages, id, open }: DocsNavProps) {
  const groupIdPrefix = useId();
  const [closedGroups, setClosedGroups] = useState(() => new Set<string>());

  const visible = pages.filter((p) => !p.hidden && p.section === page.section);
  const groupOrder: string[] = [];
  const groups = new Map<string, CompiledDocPage[]>();
  for (const visiblePage of visible) {
    if (!groups.has(visiblePage.group)) {
      groups.set(visiblePage.group, []);
      groupOrder.push(visiblePage.group);
    }
    groups.get(visiblePage.group)!.push(visiblePage);
  }

  return (
    <nav
      id={id}
      aria-label="Documentation pages"
      className={styles.nav}
      data-open={open !== undefined ? String(open) : undefined}
    >
      {groupOrder.map((group, index) => {
        const stateKey = `${page.section}:${group}`;
        const expanded = !closedGroups.has(stateKey);
        const groupId = `${groupIdPrefix}-group-${index}`;
        return (
          <div key={group} className={styles.group}>
            <button
              type="button"
              className={styles.groupLabel}
              aria-expanded={expanded}
              aria-controls={groupId}
              onClick={() => {
                setClosedGroups((current) => {
                  const next = new Set(current);
                  if (expanded) next.add(stateKey);
                  else next.delete(stateKey);
                  return next;
                });
              }}
            >
              <FiChevronRight
                className={styles.chevron}
                aria-hidden="true"
                focusable="false"
              />
              <span>{group}</span>
            </button>
            {expanded && (
              <ul id={groupId} className={styles.list}>
                {groups.get(group)!.map((visiblePage) => (
                  <li key={visiblePage.slug}>
                    <a
                      href={docHref(visiblePage.slug)}
                      className={styles.link}
                      aria-current={visiblePage.slug === page.slug ? "page" : undefined}
                    >
                      {docTitle(visiblePage)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
