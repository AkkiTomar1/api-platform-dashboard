import { useEffect, useState, type ReactNode } from "react";
import {
  NavLink,
  useNavigate,
  Outlet,
  useLocation,
  Link,
} from "react-router-dom";
import { toast, Button, cn } from "@ui";
import { PERMISSIONS } from "@shared";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { getHealth } from "@/api/dashboard";
import { hasPermission } from "@/api/roleAssignments";
import { prettifyRole } from "@/lib/roles";
import { BreadcrumbProvider, useBreadcrumbContext } from "./Breadcrumbs";
import {
  LayoutDashboard,
  Boxes,
  Users,
  ScrollText,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Network,
  Home,
  ChevronRight,
} from "lucide-react";

const navItems: Array<{
  to: string;
  label: string;
  icon: ReactNode;
  perm?: string;
}> = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  {
    to: "/admin",
    label: "User Management",
    icon: <ShieldCheck className="h-4 w-4" />,
    perm: PERMISSIONS.ROLE_ASSIGN,
  },
  {
    to: "/services",
    label: "Services",
    icon: <Boxes className="h-4 w-4" />,
    perm: PERMISSIONS.SERVICES_READ,
  },
  {
    to: "/consumers",
    label: "Consumers",
    icon: <Users className="h-4 w-4" />,
    perm: PERMISSIONS.CONSUMERS_READ,
  },
  {
    to: "/audit-logs",
    label: "Audit Logs",
    icon: <ScrollText className="h-4 w-4" />,
    perm: PERMISSIONS.AUDIT_READ,
  },
];

type HealthState = "ok" | "warn" | "down" | "unknown";

const healthMeta: Record<HealthState, { label: string; dot: string }> = {
  ok: { label: "Kong connected", dot: "bg-emerald-500" },
  warn: { label: "Kong degraded", dot: "bg-amber-500" },
  down: { label: "Kong unavailable", dot: "bg-red-500" },
  unknown: { label: "Checking Kong…", dot: "bg-ink-faint" },
};

function sectionFromPath(path: string): { label: string; to: string } | null {
  if (path === "/dashboard") return { label: "Dashboard", to: "/dashboard" };
  if (path.startsWith("/services")) return { label: "Services", to: "/services" };
  if (path.startsWith("/consumers")) return { label: "Consumers", to: "/consumers" };
  if (path.startsWith("/audit-logs")) return { label: "Audit Logs", to: "/audit-logs" };
  if (path.startsWith("/admin")) return { label: "User Management", to: "/admin" };
  return null;
}

export function Layout() {
  const { user, platformRole, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<HealthState>("unknown");
  const { crumb } = useBreadcrumbContext();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const h = await getHealth();
        if (!alive) return;
        setHealth(h.kong === "up" ? "ok" : h.degraded ? "warn" : "warn");
      } catch {
        if (alive) setHealth("down");
      }
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!user) {
    return null;
  }

  const visibleNav = navItems.filter((item) => !item.perm || hasPermission(user, item.perm));

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/login");
  };

  const h = healthMeta[health];
  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.username;
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const section = sectionFromPath(location.pathname);

  return (
    <BreadcrumbProvider>
      <div className="flex min-h-screen bg-surface">
        {open ? (
          <div
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-hairline transition-transform duration-200 lg:translate-x-0",
            "bg-gradient-to-b from-surface-card to-surface-inset",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-violet-600/25">
              <Network className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-strong">
                Gateway <span className="text-gradient">Platform</span>
              </p>
              <p className="text-xs text-ink-soft">API Management</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-ink-soft hover:bg-surface-muted lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="px-5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
            Workspace
          </p>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            {visibleNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 rounded-lg py-2 pl-4 pr-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-ink-soft hover:bg-surface-muted hover:text-ink-strong",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600 transition-opacity dark:bg-brand-400",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-hairline p-4">
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-surface-inset px-3 py-2.5">
              <span className="relative flex h-2.5 w-2.5">
                {health !== "down" ? (
                  <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", h.dot)} />
                ) : null}
                <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", h.dot)} />
              </span>
              <p className="truncate text-xs font-medium text-ink">{h.label}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-strong">{displayName}</p>
                <p className="truncate text-xs text-ink-soft">
                  {prettifyRole(platformRole ?? user.roles[0]?.role ?? "member")}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={toggle}
                  className="rounded-md p-2 text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink-strong"
                  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                  title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-start text-ink-soft hover:bg-surface-muted hover:text-red-600"
              leftIcon={<LogOut className="h-4 w-4" />}
              onClick={handleLogout}
            >
              Log out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:ml-[280px]">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-hairline bg-surface-card/80 px-4 backdrop-blur sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-ink-soft hover:bg-surface-muted lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient lg:hidden">
              <Network className="h-4 w-4 text-white" />
            </div>

            <nav className="flex min-w-0 items-center gap-1.5 text-sm">
              <Link
                to="/dashboard"
                className="shrink-0 rounded-md p-1 text-ink-soft transition-colors hover:text-ink-strong"
                aria-label="Home"
              >
                <Home className="h-4 w-4" />
              </Link>
              {section ? (
                <>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
                  <Link
                    to={section.to}
                    className="shrink-0 text-ink-soft transition-colors hover:text-ink-strong"
                  >
                    {section.label}
                  </Link>
                </>
              ) : null}
              {crumb ? (
                <>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
                  <span className="truncate font-medium text-ink-strong">{crumb}</span>
                </>
              ) : null}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", h.dot)} title={h.label} />
              <button
                type="button"
                onClick={toggle}
                className="rounded-md p-2 text-ink-soft hover:bg-surface-muted"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}