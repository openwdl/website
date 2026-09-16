import React, { type KeyboardEvent, type ReactNode, useEffect, useId, useState } from "react";
import { Tabs, type TabItem } from "@openwdl/ui";
import styles from "./DocsTabs.module.css";

const PLATFORM_STORAGE_KEY = "openwdl.docs.platform";
const PLATFORM_EVENT = "openwdl:docs-platform-change";
const PLATFORM_LABELS = {
  macos: "macOS",
  linux: "Linux",
  windows: "Windows",
} as const;

type Platform = keyof typeof PLATFORM_LABELS;

/** Hast element properties shape — a subset of the `hast` Element type. */
interface HastProperties {
  label?: string;
  [key: string]: unknown;
}

/** The subset of props we read from react-markdown children. */
interface MarkdownChildProps {
  /** Tab label set by the data-attribute directive mapping. */
  "data-label"?: string;
  node?: { properties?: HastProperties };
  children?: ReactNode;
}

interface ExtractedTab {
  label: string;
  children: ReactNode;
}

/** Extract labelled tab entries from react-markdown children. */
function extractTabs(children: ReactNode): ExtractedTab[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) return [];
    const props = child.props as MarkdownChildProps;
    const label = String(
      props["data-label"] ?? props.node?.properties?.["label"] ?? "",
    );
    if (!label) return [];
    return [{ label, children: props.children }];
  });
}

/** Slugify a label into an id fragment. */
function slugify(label: string, idx: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || String(idx);
}

function platformForLabel(label: string): Platform | undefined {
  return (Object.entries(PLATFORM_LABELS) as Array<[Platform, string]>)
    .find(([, display]) => display === label)?.[0];
}

function canSyncPlatforms(tabs: ExtractedTab[]): boolean {
  return tabs.length >= 2 && tabs.every(({ label }) => platformForLabel(label));
}

function readPlatform(): Platform | undefined {
  try {
    const value = window.localStorage.getItem(PLATFORM_STORAGE_KEY);
    return value && value in PLATFORM_LABELS ? value as Platform : undefined;
  } catch {
    return undefined;
  }
}

function savePlatform(platform: Platform): void {
  try {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, platform);
  } catch {
    // Storage can be disabled. The custom event still synchronizes this page.
  }
  window.dispatchEvent(new CustomEvent(PLATFORM_EVENT, { detail: platform }));
}

function PlatformTabs({ tabs }: { tabs: ExtractedTab[] }) {
  const idPrefix = useId();
  const available = tabs.map(({ label }) => platformForLabel(label) as Platform);
  const [preferred, setPreferred] = useState<Platform | undefined>();
  const selected = preferred && available.includes(preferred) ? preferred : available[0];

  useEffect(() => {
    setPreferred(readPlatform());
    const onPlatformChange = (event: Event) => {
      const next = (event as CustomEvent<Platform>).detail;
      if (next in PLATFORM_LABELS) setPreferred(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PLATFORM_STORAGE_KEY) return;
      setPreferred(readPlatform());
    };
    window.addEventListener(PLATFORM_EVENT, onPlatformChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PLATFORM_EVENT, onPlatformChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const select = (platform: Platform, focus = false) => {
    setPreferred(platform);
    savePlatform(platform);
    if (focus) {
      document.getElementById(`${idPrefix}-tab-${platform}`)?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | undefined;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    select(available[next], true);
  };

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label="Operating system" className={styles.tablist}>
        {tabs.map(({ label }, index) => {
          const platform = available[index];
          const active = platform === selected;
          return (
            <button
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${platform}`}
              aria-selected={active}
              aria-controls={`${idPrefix}-panel-${platform}`}
              tabIndex={active ? 0 : -1}
              className={styles.tab}
              onClick={() => select(platform)}
              onKeyDown={(event) => onKeyDown(event, index)}
              key={platform}
            >
              {label}
            </button>
          );
        })}
      </div>
      {tabs.map(({ children: content }, index) => {
        const platform = available[index];
        const active = platform === selected;
        return (
          <div
            role="tabpanel"
            id={`${idPrefix}-panel-${platform}`}
            aria-labelledby={`${idPrefix}-tab-${platform}`}
            tabIndex={active ? 0 : -1}
            className={styles.panel}
            hidden={!active}
            key={platform}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

/** Adapt Markdown tab directives onto accessible documentation tabs. */
export function DocsTabs({
  children,
  sync,
}: {
  children?: ReactNode;
  sync?: string;
}) {
  const tabs = extractTabs(children);

  if (tabs.length === 0) return <div>{children}</div>;
  if (sync === "platform" && canSyncPlatforms(tabs)) return <PlatformTabs tabs={tabs} />;

  const used = new Set<string>();
  const items: TabItem[] = tabs.map(({ label, children: content }, idx) => {
    const base = slugify(label, idx);
    let id = base;
    for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
    used.add(id);
    return { id, label, content };
  });

  return <Tabs items={items} />;
}
