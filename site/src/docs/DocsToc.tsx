import type { CSSProperties, HTMLAttributes } from "react";
import { Badge, Code, useActiveHeading } from "@openwdl/ui";
import type { DocHeading } from "../../scripts/docs/types";
import styles from "./DocsToc.module.css";

interface DocsTocProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  headings: readonly DocHeading[];
  open?: boolean;
}

/** Page outline that preserves code literals and badges from Markdown headings. */
export function DocsToc({ headings, open, className, ...props }: DocsTocProps) {
  const visible = headings.filter(({ depth }) => depth >= 2 && depth <= 3);
  const activeId = useActiveHeading(visible.map(({ id }) => id));

  return (
    <nav
      aria-label="On this page"
      className={[styles.toc, className].filter(Boolean).join(" ")}
      data-open={open !== undefined ? String(open) : undefined}
      {...props}
    >
      {visible.length > 0 && (
        <>
          <div className={styles.label}>On this page</div>
          <ul className={styles.list}>
            {visible.map((heading) => (
              <li
                key={heading.id}
                className={styles.item}
                style={{ "--toc-depth": heading.depth - 2 } as CSSProperties}
              >
                <a
                  href={`#${heading.id}`}
                  className={styles.link}
                  aria-current={heading.id === activeId ? "location" : undefined}
                >
                  {heading.parts?.map((part, index) => {
                    if (part.type === "code") {
                      return <Code className={styles.codeLiteral} key={index}>{part.value}</Code>;
                    }
                    if (part.type === "badge") {
                      return <Badge variant="accent" className={styles.badge} key={index}>{part.value}</Badge>;
                    }
                    return <span key={index}>{part.value}</span>;
                  }) ?? heading.text}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
