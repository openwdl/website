import React, { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import rehypeSlug from "rehype-slug";
import type { Element } from "hast";
import {
  Callout,
  type CalloutVariant,
  Badge,
  Code,
  CodeBlock,
  Prose,
  TableScroll,
} from "@openwdl/ui";
import { DocsTabs } from "./DocsTabs";
import { docHref } from "./docHref";
import { markdownDirectives } from "./markdownDirectives";
import styles from "./MarkdownBody.module.css";

const CALLOUT_VARIANTS = new Set<string>(["note", "tip", "warning", "danger"]);

function isCalloutVariant(v: string): v is CalloutVariant {
  return CALLOUT_VARIANTS.has(v);
}

/** Props for {@link MarkdownBody}. */
export interface MarkdownBodyProps {
  /** Raw markdown source. */
  source: string;
  /** Legacy heading aliases from page frontmatter: alias → canonical id. */
  headingAliases?: Record<string, string>;
}

/**
 * Renders a markdown `source` string into accessible HTML using a fixed
 * plugin stack: remark-gfm, remark-directive, markdownDirectives,
 * rehype-slug. Maps fenced code to {@link CodeBlock}, inline code to
 * {@link Code}, callout/tab directives to their design-system equivalents.
 *
 * Typography comes from {@link Prose} and tabular styling from
 * {@link TableScroll}, which also supplies the keyboard-scrollable region
 * around every table. Only the site-specific pieces — heading aliases, the
 * WDL `import` keyword, and base-aware local image sources — live here.
 */
export function MarkdownBody({ source, headingAliases = {} }: MarkdownBodyProps) {
  // Build target-id → alias list for inline anchor injection.
  // Memoized so the derived map (and all heading component instances that
  // close over it) are stable across re-renders of the same page.
  const aliasByTarget = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [alias, target] of Object.entries(headingAliases)) {
      const list = map.get(target) ?? [];
      list.push(alias);
      map.set(target, list);
    }
    return map;
  }, [headingAliases]);

  // Stable `components` object: heading component functions are only
  // recreated when `aliasByTarget` changes (i.e., when the alias map for
  // the page changes), preventing React from unmounting/remounting heading
  // DOM nodes on every parent re-render.
  const components = useMemo((): Components => {
    /** Heading alias span + the real heading element. `node` is destructured
     * explicitly so it is never forwarded to the DOM element. */
    const makeHeading = (Tag: "h1" | "h2" | "h3") =>
      function Heading({
        id,
        children,
        node,
        ...rest
      }: React.HTMLAttributes<HTMLHeadingElement> & { node?: Element }) {
        // `node` is consumed here so it is absent from `rest` and cannot be
        // forwarded as a non-standard attribute to the DOM heading element.
        void node;
        const aliases = id ? (aliasByTarget.get(id) ?? []) : [];
        return (
          <>
            {aliases.map((alias) => (
              <span
                key={alias}
                id={alias}
                className={styles.headingAlias}
                aria-hidden="true"
              />
            ))}
            <Tag id={id} {...rest}>{children}</Tag>
          </>
        );
      };

    return {
      code({ className, children, node }) {
        const lang = /language-(\S+)/.exec(className ?? "")?.[1];
        const src = String(children).replace(/\n$/, "");
        if (lang) {
          return <CodeBlock code={src} lang={lang} />;
        }
        const isInline = node?.position?.start.line === node?.position?.end.line;
        if (isInline && src === "import") {
          return (
            <Code className={styles.inlineWdlKeyword} data-language="wdl">
              {children}
            </Code>
          );
        }
        return <Code>{children}</Code>;
      },
      /**
       * Dispatches data-attribute directives emitted by `markdownDirectives`.
       * Using real HTML elements with `data-directive` avoids the need for
       * custom element names absent from `JSX.IntrinsicElements`.
       */
      div({ node, children }) {
        const dir = node?.properties?.["data-directive"];
        if (dir === "callout") {
          const variant = String(node?.properties?.["data-variant"] ?? "note");
          return (
            <Callout variant={isCalloutVariant(variant) ? variant : "note"}>
              {children}
            </Callout>
          );
        }
        if (dir === "docs-tabs") {
          const sync = String(node?.properties?.["data-sync"] ?? "");
          return <DocsTabs sync={sync || undefined}>{children}</DocsTabs>;
        }
        if (dir === "docs-tab") {
          // Preserve data-label so DocsTabs.extractTabs can read the tab label.
          const label = String(node?.properties?.["data-label"] ?? "");
          return (
            <div data-directive="docs-tab" data-label={label}>
              {children}
            </div>
          );
        }
        return <div>{children}</div>;
      },
      span({ node, children }) {
        const dir = node?.properties?.["data-directive"];
        if (dir === "badge") {
          return <Badge variant="accent" className={styles.headingBadge}>{children}</Badge>;
        }
        return <span>{children}</span>;
      },
      table({ node, children, ...props }) {
        void node;
        return (
          <TableScroll>
            <table {...props}>{children}</table>
          </TableScroll>
        );
      },
      img({ node, src, ...props }) {
        void node;
        const isLocalImage =
          typeof src === "string" &&
          src.startsWith("/") &&
          !src.startsWith("//");
        const resolvedSrc = isLocalImage ? docHref(src) : src;
        const className =
          [props.className, isLocalImage ? styles.localImage : undefined]
            .filter(Boolean)
            .join(" ") || undefined;
        return <img {...props} className={className} src={resolvedSrc} />;
      },
      h1: makeHeading("h1") as Components["h1"],
      h2: makeHeading("h2") as Components["h2"],
      h3: makeHeading("h3") as Components["h3"],
    };
  }, [aliasByTarget]);

  return (
    <Prose as="div" className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, markdownDirectives]}
        rehypePlugins={[rehypeSlug]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </Prose>
  );
}
