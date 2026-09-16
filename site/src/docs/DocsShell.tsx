import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ToastProvider, NavBar, Footer, Disclosure } from "@openwdl/ui";
import type { CompiledDocPage } from "../../scripts/docs/types";
import { docHref } from "./docHref";
import { DocsNav } from "./DocsNav";
import { DocsSearch } from "./DocsSearch";
import { DocsToc } from "./DocsToc";
import { DOC_SECTIONS } from "./docsSections";
import styles from "./DocsShell.module.css";

/** Static IDs for the single nav/toc elements, referenced by mobile buttons. */
const NAV_ID = "docs-page-nav";
const TOC_ID = "docs-page-toc";

/** Props for {@link DocsShell}. */
export interface DocsShellProps {
  /** Active doc page, used to compute current-section and page-nav state. */
  page: CompiledDocPage;
  /** All pages, forwarded to {@link DocsNav}. */
  pages: readonly CompiledDocPage[];
  /** Article body (h1 + MarkdownBody or equivalent). */
  children: ReactNode;
}

/**
 * Full-page shell for the OpenWDL reference documentation. Renders the
 * canonical landmark sequence: skip link → global nav → section nav →
 * [left rail | article | page outline] → footer.
 *
 * Each navigation landmark is rendered **exactly once** in the DOM. Mobile
 * disclosure buttons reference the single nav/toc by id via `aria-controls`;
 * CSS shows/hides each element at the appropriate breakpoint.
 */
export function DocsShell({ page, pages, children }: DocsShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <ToastProvider>
      <div className={styles.page}>
      {/* 1. Skip link */}
      <a href="#main-content" className={styles.skip}>
        Skip to main content
      </a>

      {/* 2. Global navbar with Docs active */}
      <NavBar active="docs" />

      {/* 3. Horizontal section navigation */}
      <nav aria-label="Documentation sections" className={styles.sectionNav}>
        <div className={styles.sectionBar}>
          <ul className={styles.sectionList}>
            {DOC_SECTIONS.map(({ key, label }) => {
              const firstPage = pages.find(
                (candidate) => !candidate.hidden && candidate.section === key,
              );
              if (!firstPage) return null;
              return (
                <li key={key}>
                  <a
                    href={docHref(firstPage.slug)}
                    className={styles.sectionLink}
                    aria-current={page.section === key ? "true" : undefined}
                  >
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
          <div className={styles.sectionSearch}>
            <DocsSearch />
          </div>
        </div>
      </nav>

      {/* Three-column content area */}
      <div className={styles.layout}>
        <div className={styles.mobileControls}>
          <Disclosure
            controlsId={NAV_ID}
            label="Docs menu"
            open={navOpen}
            onToggle={() => setNavOpen((o) => !o)}
          />
          <Disclosure
            controlsId={TOC_ID}
            label="On this page"
            open={tocOpen}
            onToggle={() => setTocOpen((o) => !o)}
          />
        </div>

        {/*
         * 4. Left page rail — rendered once.
         * Desktop: always visible in the left column via CSS grid.
         * Mobile: hidden via data-open CSS selector until the button sets navOpen.
         */}
        <DocsNav id={NAV_ID} page={page} pages={pages} open={navOpen} />

        {/*
         * 6. Sticky page outline — rendered once.
         * Desktop: sticky in the right column. The kit `Toc` styles itself
         * but does not place itself, so `styles.toc` supplies the grid slot
         * and the narrow-screen treatment.
         * Mobile: hidden via data-open until tocOpen=true.
         *
         * `--toc-offset` clears the sticky section nav below the global
         * navbar. The kit self-defaults that property on the component root,
         * which beats any ancestor declaration, so the override has to be
         * inline on the element itself.
         */}
        <DocsToc
          key={page.slug}
          id={TOC_ID}
          headings={page.headings}
          open={tocOpen}
          className={styles.toc}
          style={{ "--toc-offset": "var(--docs-section-nav-h)" } as CSSProperties}
        />

        {/* 5. Main column */}
        <main id="main-content" className={styles.main}>
          <article className={styles.article}>{children}</article>
        </main>
      </div>

      {/* 7. Canonical footer */}
      <Footer />
      </div>
    </ToastProvider>
  );
}
