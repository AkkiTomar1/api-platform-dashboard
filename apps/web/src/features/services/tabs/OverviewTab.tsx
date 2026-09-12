import { Badge, Card } from "@ui";
import type { ServiceDetail } from "@/api/services";
import { formatDate } from "@/lib/format";

export function OverviewTab({ service }: { service: ServiceDetail }) {
  return (
    <Card title="Details" subtitle="Service metadata and status">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Name
          </dt>
          <dd className="mt-1 text-sm text-slate-800">{service.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Kong Name
          </dt>
          <dd className="mt-1 font-mono text-sm text-slate-800">{service.kongName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Description
          </dt>
          <dd className="mt-1 text-sm text-slate-800">{service.description || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Status
          </dt>
          <dd className="mt-1">
            <Badge tone={service.isActive ? "green" : "red"}>
              {service.isActive ? "Active" : "Inactive"}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Consumers
          </dt>
          <dd className="mt-1 text-sm text-slate-800">{service.consumerCount}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Created
          </dt>
          <dd className="mt-1 text-sm text-slate-800">{formatDate(service.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Tags
        </dt>
        <dd className="mt-2 flex flex-wrap gap-2">
          {service.tags && service.tags.length > 0 ? (
            service.tags.map((tag) => (
              <Badge key={tag} tone="blue">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-slate-400">No tags</span>
          )}
        </dd>
      </div>
    </Card>
  );
}