import { Badge, Card } from "@ui";
import type { ReactNode } from "react";
import type { ServiceDetail } from "@/api/services";
import { formatDate } from "@/lib/format";

function Dt({ children }: { children: string }) {
  return (
    <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
      {children}
    </dt>
  );
}

function Dd({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return (
    <dd
      className={
        mono
          ? "mt-1 break-all font-mono text-sm text-ink-strong"
          : "mt-1 text-sm text-ink-strong"
      }
    >
      {children}
    </dd>
  );
}

export function OverviewTab({ service }: { service: ServiceDetail }) {
  const target = service.kongTarget;
  const targetUrl = target?.url;
  const targetFallback =
    !targetUrl && target?.host
      ? `${target.protocol ?? "http"}://${target.host}:${target.port ?? 80}${target.path ?? ""}`
      : null;

  return (
    <div className="space-y-4">
      <Card title="Details" subtitle="Service metadata and status">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Dt>Name</Dt>
            <Dd>{service.name}</Dd>
          </div>
          <div>
            <Dt>Kong Name</Dt>
            <Dd mono>{service.kongName}</Dd>
          </div>
          <div>
            <Dt>Description</Dt>
            <Dd>{service.description || "—"}</Dd>
          </div>
          <div>
            <Dt>Status</Dt>
            <dd className="mt-1">
              <Badge tone={service.isActive ? "green" : "red"}>
                {service.isActive ? "Active" : "Inactive"}
              </Badge>
            </dd>
          </div>
          <div>
            <Dt>Consumers</Dt>
            <Dd>{service.consumerCount}</Dd>
          </div>
          <div>
            <Dt>Owner Contact</Dt>
            <Dd>{service.ownerContact || "—"}</Dd>
          </div>
          <div>
            <Dt>Created</Dt>
            <Dd>{formatDate(service.createdAt)}</Dd>
          </div>
          <div>
            <Dt>Last Updated</Dt>
            <Dd>{formatDate(service.updatedAt)}</Dd>
          </div>
        </dl>

        <div className="mt-6">
          <Dt>Tags</Dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {service.tags && service.tags.length > 0 ? (
              service.tags.map((tag) => (
                <Badge key={tag} tone="blue">
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-ink-faint">No tags</span>
            )}
          </dd>
        </div>
      </Card>

      <Card title="Upstream" subtitle="Resolved Kong upstream target">
        {target === null ? (
          <p className="text-sm text-ink-faint">
            Upstream details unavailable (Kong unreachable or no target).
          </p>
        ) : targetUrl ? (
          <div>
            <Dt>URL</Dt>
            <Dd mono>{targetUrl}</Dd>
          </div>
        ) : targetFallback ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Dt>Protocol</Dt>
              <Dd mono>{target.protocol}</Dd>
            </div>
            <div>
              <Dt>Host:Port</Dt>
              <Dd mono>
                {target.host}:{target.port ?? 80}
              </Dd>
            </div>
            <div>
              <Dt>Path</Dt>
              <Dd mono>{target.path || "/"}</Dd>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-faint">No upstream target configured.</p>
        )}
      </Card>
    </div>
  );
}