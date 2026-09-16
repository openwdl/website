import { Pagination } from "@openwdl/ui";
import type { CompiledDocPage } from "../../scripts/docs/types";
import { DocsShell } from "./DocsShell";
import { MarkdownBody } from "./MarkdownBody";
import { StdlibPage } from "./StdlibPage";
import { docHref } from "./docHref";
import { docTitle } from "./docTitle";
import { docSectionLabel } from "./docsSections";
import styles from "./DocsPage.module.css";

/** Props for {@link DocsPage}. */
export interface DocsPageProps {
  /** The active documentation page. */
  page: CompiledDocPage;
  /** All documentation pages for the navigation rail. */
  pages: readonly CompiledDocPage[];
}

/**
 * Composes {@link DocsShell} with a rendered page body. Renders the page title
 * as the sole `h1`; standard-library pages render as searchable signature
 * cards through {@link StdlibPage}, and every other section renders its
 * markdown through {@link MarkdownBody}.
 */
export function DocsPage({ page, pages }: DocsPageProps) {
  const titleId = page.headings.find((heading) => heading.depth === 1)?.id;
  const titleAliases = Object.entries(page.headingAliases ?? {})
    .filter(([, target]) => target === titleId)
    .map(([alias]) => alias);
  const sameLabel = (left: string, right: string) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }) === 0;
  const sectionPage = pages.find(
    (candidate) => !candidate.hidden && candidate.section === page.section,
  );
  const groupPage = pages.find(
    (candidate) =>
      !candidate.hidden &&
      candidate.section === page.section &&
      candidate.group === page.group,
  );
  const breadcrumbAncestors = [
    { label: docSectionLabel(page.section), page: sectionPage },
    { label: page.group, page: groupPage },
  ].filter(
    (crumb, index, crumbs) =>
      !sameLabel(crumb.label, page.title) &&
      (index === 0 || !sameLabel(crumb.label, crumbs[index - 1].label)),
  );
  const previousPage = pages.find((candidate) => candidate.slug === page.previous);
  const nextPage = pages.find((candidate) => candidate.slug === page.next);

  return (
    <DocsShell page={page} pages={pages}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
        <ol>
          {breadcrumbAncestors.map((crumb) => (
            <li key={crumb.label}>
              {crumb.page ? (
                <a href={docHref(crumb.page.slug)}>{crumb.label}</a>
              ) : (
                crumb.label
              )}
            </li>
          ))}
          <li>
            <span aria-current="page">{docTitle(page)}</span>
          </li>
        </ol>
      </nav>
      {titleAliases.map((alias) => (
        <span
          key={alias}
          id={alias}
          className={styles.headingAlias}
          aria-hidden="true"
        />
      ))}
      <h1 id={titleId}>{docTitle(page)}</h1>
      {page.section === "stdlib" ? (
        <StdlibPage page={page} />
      ) : (
        <MarkdownBody source={page.body} headingAliases={page.headingAliases} />
      )}
      <Pagination
        aria-label="Documentation pagination"
        prev={
          previousPage && {
            href: docHref(previousPage.slug),
            label: "Previous",
            title: previousPage.title,
          }
        }
        next={
          nextPage && {
            href: docHref(nextPage.slug),
            label: "Next",
            title: nextPage.title,
          }
        }
      />
    </DocsShell>
  );
}
