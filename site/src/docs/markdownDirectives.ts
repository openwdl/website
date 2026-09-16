const CALLOUT_DIRECTIVES = new Set(["note", "tip", "warning", "danger"]);

interface DirectiveNode {
  type?: string;
  name?: string;
  attributes?: Record<string, string | null | undefined>;
  data?: {
    hName: string;
    hProperties: Record<string, string>;
  };
  children?: unknown[];
}

function walk(
  node: unknown,
  parent: DirectiveNode | undefined,
  visitor: (node: DirectiveNode, parent: DirectiveNode | undefined) => void,
): void {
  if (typeof node !== "object" || node === null) return;
  const candidate = node as DirectiveNode;
  visitor(candidate, parent);
  for (const child of candidate.children ?? []) walk(child, candidate, visitor);
}

/** Transform supported Markdown directives into elements consumed by MarkdownBody. */
export function markdownDirectives(): (tree: unknown) => void {
  return (tree) => {
    walk(tree, undefined, (node, parent) => {
      if (node.type === "containerDirective") {
        const name = node.name ?? "";
        if (CALLOUT_DIRECTIVES.has(name)) {
          node.data = {
            hName: "div",
            hProperties: { "data-directive": "callout", "data-variant": name },
          };
          return;
        }
        if (name === "tabs") {
          const validChildren = (node.children ?? []).every(
            (child) =>
              typeof child === "object" &&
              child !== null &&
              (child as DirectiveNode).type === "containerDirective" &&
              (child as DirectiveNode).name === "tab",
          );
          if (!validChildren) {
            throw new Error("tabs directive may contain only tab directives");
          }
          const sync = node.attributes?.sync;
          node.data = {
            hName: "div",
            hProperties: {
              "data-directive": "docs-tabs",
              ...(sync ? { "data-sync": sync } : {}),
            },
          };
          return;
        }
        if (name === "tab") {
          if (parent?.type !== "containerDirective" || parent.name !== "tabs") {
            throw new Error("tab directive must be nested directly inside tabs");
          }
          const label = node.attributes?.label ?? "";
          if (!label) throw new Error("tab directive requires a non-empty label attribute");
          node.data = {
            hName: "div",
            hProperties: { "data-directive": "docs-tab", "data-label": label },
          };
          return;
        }
        throw new Error(`Unknown directive: "${name}"`);
      }
      if (node.type === "textDirective" && node.name === "kbd") {
        node.data = {
          hName: "kbd",
          hProperties: {},
        };
        return;
      }
      if (node.type === "textDirective" && node.name === "badge") {
        node.data = {
          hName: "span",
          hProperties: { "data-directive": "badge" },
        };
        return;
      }
      if (node.type === "leafDirective" || node.type === "textDirective") {
        throw new Error(`Unknown directive: "${node.name}"`);
      }
    });
  };
}
