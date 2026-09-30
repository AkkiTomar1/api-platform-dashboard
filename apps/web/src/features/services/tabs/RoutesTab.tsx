import { useCallback, useEffect, useState } from "react";
import {
  Button,
  DataTable,
  Badge,
  EmptyState,
  Modal,
  Input,
  ConfirmDialog,
  toast,
  Plus,
  Trash2,
} from "@ui";
import type { Column } from "@ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  listRoutes,
  createRoute,
  deleteRoute,
  type KongRoute,
} from "@/api/routes";
import type { ServiceDetail } from "@/api/services";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { QueryState } from "@/components/QueryState";

const routeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pathsCsv: z.string().min(1, "At least one path is required"),
  methodsCsv: z.string().optional().default(""),
  hostsCsv: z.string().optional().default(""),
  regexPriority: z.string().optional().default(""),
  stripPath: z.boolean().optional().default(true),
  preserveHost: z.boolean().optional().default(false),
});

type RouteFormValues = z.infer<typeof routeFormSchema>;

function splitCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function RoutesTab({ service }: { service: ServiceDetail }) {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<KongRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<KongRoute | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canCreate = hasPermission(user, "routes:create");
  const canDelete = hasPermission(user, "routes:delete");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRoutes(await listRoutes(service.id));
    } catch {
      toast.error("Failed to load routes");
    } finally {
      setLoading(false);
    }
  }, [service.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (values: RouteFormValues) => {
    setSubmitting(true);
    try {
      await createRoute(service.id, {
        name: values.name,
        paths: splitCsv(values.pathsCsv),
        methods: splitCsv(values.methodsCsv),
        hosts: splitCsv(values.hostsCsv),
        stripPath: values.stripPath,
        preserveHost: values.preserveHost,
        ...(values.regexPriority !== ""
          ? { regexPriority: Number(values.regexPriority) }
          : {}),
      });
      toast.success("Route created");
      setOpen(false);
      reset();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteRoute(service.id, confirmDelete.id);
      toast.success("Route deleted");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<KongRoute>[] = [
    { key: "name", header: "Name", render: (r) => r.name ?? r.id },
    {
      key: "paths",
      header: "Paths",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {(r.paths ?? []).map((p) => (
            <code key={p} className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-ink">
              {p}
            </code>
          ))}
        </div>
      ),
    },
    {
      key: "methods",
      header: "Methods",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {(r.methods ?? []).length === 0 ? (
            <span className="text-xs text-ink-faint">all</span>
          ) : (
            (r.methods ?? []).map((m) => <Badge key={m} tone="blue">{m}</Badge>)
          )}
        </div>
      ),
    },
    {
      key: "protocols",
      header: "Protocols",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {(r.protocols ?? []).length === 0 ? (
            <span className="text-xs text-ink-faint">—</span>
          ) : (
            (r.protocols ?? []).map((p) => (
              <code key={p} className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-ink">
                {p}
              </code>
            ))
          )}
        </div>
      ),
    },
    {
      key: "regex_priority",
      header: "Regex Priority",
      render: (r) =>
        r.regex_priority !== undefined && r.regex_priority !== 0 ? (
          <Badge tone="amber">{r.regex_priority}</Badge>
        ) : (
          <span className="text-xs text-ink-faint">—</span>
        ),
    },
    {
      key: "strip_path",
      header: "Strip Path",
      render: (r) => (r.strip_path ? "yes" : "no"),
    },
    {
      key: "actions",
      header: "",
      render: (r) =>
        canDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(r);
            }}
          >
            Delete
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {canCreate ? (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Add route
          </Button>
        ) : null}
      </div>
      <QueryState loading={loading} error={null}>
        <DataTable
          columns={columns}
          rows={routes}
          rowKey={(r) => r.id}
          lastHeaderAlign="right"
          empty={<EmptyState title="No routes" description="This service has no routes yet." />}
        />
      </QueryState>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add route"
        description="Add a route to this service."
      >
        <form onSubmit={handleSubmit((v) => void onSubmit(v))} className="space-y-4">
          <Input label="Name" placeholder="catalog-v1" error={errors.name?.message} {...register("name")} />
          <Input
            label="Paths (comma separated)"
            placeholder="/catalog, /products"
            error={errors.pathsCsv?.message}
            {...register("pathsCsv")}
          />
          <Input
            label="Methods (comma separated, optional)"
            placeholder="GET, POST"
            error={errors.methodsCsv?.message}
            {...register("methodsCsv")}
          />
          <Input
            label="Hosts (comma separated, optional)"
            placeholder="api.example.com"
            error={errors.hostsCsv?.message}
            {...register("hostsCsv")}
          />
          <Input
            label="Regex priority (optional)"
            placeholder="100"
            hint="Higher number wins matching order for regex paths."
            type="number"
            error={errors.regexPriority?.message}
            {...register("regexPriority")}
          />
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register("stripPath")} className="h-4 w-4 rounded border-hairline accent-brand-600" />
            <label className="text-sm text-ink">Strip path</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" {...register("preserveHost")} className="h-4 w-4 rounded border-hairline accent-brand-600" />
            <label className="text-sm text-ink">Preserve host</label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={submitting}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete route"
        description="This removes the route from the Kong gateway."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      >
        {confirmDelete ? (
          <p className="text-sm text-ink">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-ink-strong">
              {confirmDelete.name ?? confirmDelete.id}
            </span>
            ?
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}