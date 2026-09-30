import { Fragment, type ReactNode } from "react";
import { cn } from "./cn";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
  badge?: number;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  const active = items.find((i) => i.key === activeKey);
  return (
    <Fragment>
      <div className="flex gap-1 overflow-x-auto border-b border-hairline">
        {items.map((item) => {
          const selected = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                "relative -mb-px flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "border-b-2 border-brand-500 text-brand-700 dark:text-brand-300"
                  : "border-b-2 border-transparent text-ink-soft hover:text-ink-strong",
              )}
            >
              {item.label}
              {typeof item.badge === "number" && item.badge > 0 ? (
                <span className="rounded-full bg-brand-100 px-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="pt-5">{active?.content}</div>
    </Fragment>
  );
}