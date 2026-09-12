import { useEffect, useState } from "react";
import { PageHeader, Card, Badge, Spinner, KeyRound, Server, UserCircle } from "@ui";
import { useAuth } from "@/lib/auth-context";
import { fetchMe } from "@/api/auth";
import { listRoleAssignments } from "@/api/roleAssignments";
import type { RequestUser } from "@shared";
import { ALL_PERMISSIONS } from "@shared";
import { formatDate } from "@/lib/format";

interface HealthSnapshot {
  database: string;
  redis: string;
  kong: string;
  status: string;
}

export function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<RequestUser | null>(user);
  const [roleCount, setRoleCount] = useState(0);
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const me = await fetchMe();
        setProfile(me);
        const ra = await listRoleAssignments();
        setRoleCount(ra.length);
      } catch {
        // keep whatever we have
      }
      try {
        const res = await fetch("/api/health");
        const body = (await res.json()) as HealthSnapshot;
        setHealth(body);
      } catch {
        setHealth(null);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading || profile === null) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Your profile, role assignments, and platform status" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Profile" subtitle="Account information from your IdP">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <UserCircle className="h-7 w-7" />
            </div>
            <dl className="grid flex-1 grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">Name</dt><dd className="font-medium text-slate-800">{profile.firstName} {profile.lastName}</dd></div>
              <div><dt className="text-xs text-slate-500">Email</dt><dd className="truncate font-medium text-slate-800">{profile.email}</dd></div>
              <div><dt className="text-xs text-slate-500">Username</dt><dd className="text-slate-800">{profile.username || "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">User ID</dt><dd className="truncate font-mono text-xs text-slate-600">{profile.id}</dd></div>
            </dl>
          </div>
        </Card>

        <Card title="Roles" subtitle={`${roleCount} role assignment${roleCount === 1 ? "" : "s"} on this platform`}>
          <div className="flex flex-wrap gap-2">
            {profile.roles.length === 0 ? (
              <span className="text-sm text-slate-400">No roles assigned.</span>
            ) : (
              profile.roles.map((r, i) => (
                <Badge key={`${r.role}-${i}`} tone="violet">
                  {r.role}
                  {r.resourceId ? " · scoped" : ""}
                </Badge>
              ))
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {profile.isPlatformAdmin
              ? "You are a platform administrator with full access."
              : "Scoped roles restrict data access to assigned resources."}
          </p>
        </Card>

        <Card title="Permissions (frontend view)" subtitle={`${profile.permissions.length} of ${ALL_PERMISSIONS.length} permissions granted`}>
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
            {profile.permissions.map((p) => (
              <span key={p} className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                {p}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Platform connectivity" subtitle="API → backend health check">
          <dl className="space-y-2 text-sm">
            {["database", "redis", "kong"].map((key) => (
              <div key={key} className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-slate-600">
                  <Server className="h-4 w-4 text-slate-400" /> {key}
                </dt>
                <dd>
                  <Badge tone={health?.[key as keyof HealthSnapshot] === "ok" ? "green" : "red"}>
                    {health?.[key as keyof HealthSnapshot] ?? "unreachable"}
                  </Badge>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Token last used: {formatDate(new Date().toISOString())}
          </p>
        </Card>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <KeyRound className="h-3.5 w-3.5" />
        Credentials and secrets are never displayed here; they are redacted in audit logs.
      </div>
    </div>
  );
}