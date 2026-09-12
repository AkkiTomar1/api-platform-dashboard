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
      <div className="flex gap-1 border-b border-slate-200">
        {items.map((item) => {
          const selected = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                "relative -mb-px flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                selected
                  ? "border-b-2 border-violet-600 text-violet-700"
                  : "border-b-2 border-transparent text-slate-500 hover:text-slate-700",
              )}
            >
              {item.label}
              {typeof item.badge === "number" && item.badge > 0 ? (
                <span className="rounded-full bg-violet-100 px-1.5 text-xs font-semibold text-violet-700">
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
