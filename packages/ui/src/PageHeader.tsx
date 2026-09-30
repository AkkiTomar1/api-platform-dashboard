import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; to?: string } | string>;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="mb-1 flex items-center gap-1 text-xs text-ink-soft">
          {breadcrumbs.map((crumb, i) => {
            const item = typeof crumb === "string" ? { label: crumb } : crumb;
            return (
              <span key={`${i}-${item.label}`} className="flex items-center gap-1">
                {i > 0 ? <span className="text-ink-faint">/</span> : null}
                {item.to ? (
                  <a
                    href={item.to}
                    className="text-ink-soft transition-colors hover:text-brand-600"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span>{item.label}</span>
                )}
              </span>
            );
          })}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-strong">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-ink-soft">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}