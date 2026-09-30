import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { serviceCreateSchema } from "@shared";
import {
  PageHeader,
  Button,
  Select,
  Modal,
  Badge,
  Switch,
  ConfirmDialog,
  SearchInput,
  DataTable,
  Plus,
  Pencil,
  Trash2,
  toast,
} from "@ui";
import type { Column } from "@ui";
import { QueryState } from "@/components/QueryState";
import { useDebouncedValue } from "@/lib/use-debounce";
import { usePageTitle } from "@/lib/use-page-title";
import {
  listServices,
  createService,
  updateService,
  deleteService,
  type GatewayServiceSummary,
} from "@/api/services";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/api/roleAssignments";
import { ServiceFormModal } from "./ServiceForm";

type ServiceFormValues = z.infer<typeof serviceCreateSchema>;

export function ServicesPage() {
  usePageTitle("Services");
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<GatewayServiceSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [query, setQuery] = useState<{
    search: string;
    sort: string;
    sortOrder: "asc" | "desc";
  }>({ search: "", sort: "name", sortOrder: "asc" });
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(query.search, 300);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GatewayServiceSummary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const canCreate = hasPermission(user, "services:create");
  const canUpdate = hasPermission(user, "services:update");
  const canDelete = hasPermission(user, "services:delete");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listServices({
        ...query,
        search: debouncedSearch,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setData(res.data);
      setPagination((p) => ({ ...p, total: res.total }));
    } catch {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  }, [query, debouncedSearch, pagination.page, pagination.pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (values: ServiceFormValues) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateService(editing.id, values);
        toast.success("Service updated");
      } else {
        await createService(values);
        toast.success("Service created");
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSubmitting(true);
    try {
      await deleteService(confirmDelete.id);
      toast.success("Service deleted (soft)");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (row: GatewayServiceSummary) => {
    if (togglingId) return;
    setTogglingId(row.id);
    try {
      await updateService(row.id, { isActive: !row.isActive });
      toast.success(row.isActive ? "Service deactivated" : "Service activated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setTogglingId(null);
    }
  };

  const columns: Column<GatewayServiceSummary>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div>
          <p className="font-medium text-ink-strong">{row.name}</p>
          <p className="text-xs text-ink-soft">{row.kongName}</p>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <span className="text-ink">{row.description || "—"}</span>
      ),
    },
    {
      key: "ownerContact",
      header: "Owner",
      render: (row) => <span className="text-ink">{row.ownerContact || "—"}</span>,
    },
    {
      key: "consumerCount",
      header: "Consumers",
      render: (row) => <Badge tone="violet">{row.consumerCount}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.isActive}
            disabled={!canUpdate || togglingId === row.id}
            onChange={() => void handleToggle(row)}
            onClick={(e) => e.stopPropagation()}
            aria-label={row.isActive ? "Deactivate service" : "Activate service"}
          />
          <span className={row.isActive ? "text-sm text-emerald-500" : "text-sm text-ink-soft"}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {canUpdate ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                setEditing(row);
                setFormOpen(true);
              }}
            >
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete({ id: row.id, name: row.name });
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Services"
        description="Gateway services and their upstreams"
        actions={
          canCreate ? (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New service
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Search services…"
          value={query.search}
          onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
        />
        <Select
          className="w-40"
          value={query.sort}
          options={[
            { value: "name", label: "Sort: Name" },
            { value: "createdAt", label: "Sort: Created" },
            { value: "updatedAt", label: "Sort: Updated" },
          ]}
          onChange={(e) => setQuery((q) => ({ ...q, sort: e.target.value }))}
        />
      </div>

      <QueryState loading={loading} error={null}>
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(r) => r.id}
          onRowClick={(row) => {
            navigate(`/services/${row.id}`);
          }}
          lastHeaderAlign="right"
        />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-ink-soft">
            {pagination.total} service{pagination.total === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() =>
                setPagination((p) => ({ ...p, page: p.page - 1 }))
              }
            >
              Prev
            </Button>
            <span className="flex items-center px-2 text-sm text-ink">
              Page {pagination.page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() =>
                setPagination((p) => ({ ...p, page: p.page + 1 }))
              }
            >
              Next
            </Button>
          </div>
        </div>
      </QueryState>

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        size="lg"
        title={editing ? `Edit ${editing.name}` : "Create service"}
        description="Services map a gateway route to an upstream."
      >
        {formOpen ? (
          <ServiceFormModal
            initial={
              editing
                ? {
                    name: editing.name,
                    description: editing.description,
                    kongName: editing.kongName,
                    ownerContact: editing.ownerContact ?? undefined,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete service"
        description="This soft-deletes the service (isActive=false) and removes its Kong upstream."
        confirmLabel="Delete"
        loading={submitting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(null)}
      >
        {confirmDelete ? (
          <p className="text-sm text-ink">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-ink-strong">{confirmDelete.name}</span>?
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}