import { useCallback, useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Table,
  Spinner,
  Modal,
  Input,
  Select,
  toast,
  Pencil,
  UserPlus,
} from "@ui";
import type { Column } from "@ui";
import {
  listAdminUsers,
  listAdminRoles,
  createAdminUser,
  updateAdminUser,
  type AdminUser,
  type RoleCount,
} from "@/api/admin";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { isPlatformAdmin } from "@/api/admin";
import { ROLES, tierOf } from "@shared";

interface EditTarget {
  user: AdminUser;
}

const INVITABLE_ROLES = [...ROLES];

const ROLE_TONE: Record<string, "violet" | "blue" | "amber" | "gray"> = {
  platform: "violet",
  service: "blue",
  consumer: "amber",
};

function roleTone(role: string): "violet" | "blue" | "amber" | "gray" {
  const tier = tierOf(role);
  return tier ? ROLE_TONE[tier] : "gray";
}

const emptyCreateForm = {
  email: "",
  username: "",
  firstName: "",
  lastName: "",
  password: "",
  initialRole: "platform_viewer",
};

export function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ username: "", firstName: "", lastName: "", avatarUrl: "" });
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [submitting, setSubmitting] = useState(false);

  const admin = isPlatformAdmin(user);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([listAdminUsers(), listAdminRoles()]);
      setUsers(u);
      setRoles(r);
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) void load();
  }, [admin, load]);

  if (!admin) {
    return (
      <div className="text-sm text-red-600">
        Only platform administrators can access this page.
      </div>
    );
  }

  const openEdit = (target: AdminUser) => {
    setForm({
      username: target.username,
      firstName: target.firstName,
      lastName: target.lastName,
      avatarUrl: target.avatarUrl ?? "",
    });
    setEditing({ user: target });
  };

  const onSave = async () => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await updateAdminUser(editing.user.id, {
        username: form.username || undefined,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        avatarUrl: form.avatarUrl || null,
      });
      toast.success("User updated");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onCreate = async () => {
    setSubmitting(true);
    try {
      await createAdminUser({
        email: createForm.email,
        username: createForm.username || undefined,
        firstName: createForm.firstName || undefined,
        lastName: createForm.lastName || undefined,
        password: createForm.password,
        initialRole: createForm.initialRole,
      });
      toast.success("User created — share their login with them");
      setCreating(false);
      setCreateForm(emptyCreateForm);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<AdminUser>[] = [
    { key: "name", header: "Name", render: (u) => `${u.firstName} ${u.lastName}`.trim() || "—" },
    { key: "email", header: "Email", render: (u) => u.email },
    { key: "username", header: "Username", render: (u) => u.username || "—" },
    {
      key: "roles",
      header: "Roles",
      render: (u) => (
        <div className="flex max-w-72 flex-wrap gap-1">
          {u.roles.length === 0 ? (
            <span className="text-xs text-slate-400">none</span>
          ) : (
            u.roles.map((r) => (
                <Badge key={`${r.id}-${r.role}`} tone={roleTone(r.role)}>
                  {r.role}
                  {r.resourceId ? ":scoped" : ""}
                </Badge>
              ))
          )}
        </div>
      ),
    },
    { key: "createdAt", header: "Created", render: (u) => formatDate(u.createdAt) },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(u)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="User Management"
        description="User accounts and role assignments"
        actions={
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500">
              {users.length} user{users.length === 1 ? "" : "s"}
            </div>
            <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              New user
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {roles.map((r) => (
              <Card key={r.role} className="!p-3">
                <p className="truncate text-sm font-medium text-slate-800">{r.role}</p>
                <p className="text-2xl font-bold text-slate-900">{r.count}</p>
              </Card>
            ))}
          </div>

          <Table columns={columns} rows={users} rowKey={(u) => u.id} />
        </>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Invite a new user"
        description="Creates an account the user can sign in with"
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
          />
          <Input
            label="Username (optional)"
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First name"
              value={createForm.firstName}
              onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
            />
            <Input
              label="Last name"
              value={createForm.lastName}
              onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
            />
          </div>
          <Input
            label="Temporary password"
            type="password"
            required
            autoComplete="new-password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            placeholder="At least 8 characters"
          />
          <Select
            label="Initial role"
            value={createForm.initialRole}
            onChange={(e) => setCreateForm({ ...createForm, initialRole: e.target.value })}
            options={INVITABLE_ROLES.map((r) => ({ value: r, label: r }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={() => void onCreate()}>
              Create user
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit user"
        description={editing?.user.email ?? ""}
      >
        <div className="space-y-4">
          <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <Input label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <Input label="Avatar URL" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
          <div className="flex justify-end">
            <Button loading={submitting} onClick={() => void onSave()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}