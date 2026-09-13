import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { toast } from "@ui";
import { useAuth } from "@/lib/auth-context";
import { tierOf, TIER_ORDER } from "@shared";
import {
  LayoutDashboard,
  Boxes,
  Users,
  ScrollText,
  Settings,
  ShieldCheck,
  LogOut,
  Puzzle,
} from "lucide-react";
import { cn } from "@ui";
import type { ReactNode } from "react";

const navItems: Array<{
  to: string;
  label: string;
  icon: ReactNode;
  roles: string[];
}> = [
  { to: "/", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, roles: ["platform_admin", "platform_dev", "platform_viewer", "service_admin", "service_dev", "service_viewer", "consumer_admin"] },
  { to: "/services", label: "Services", icon: <Boxes className="h-4 w-4" />, roles: ["platform_admin", "platform_dev", "platform_viewer", "service_admin", "service_dev", "service_viewer", "consumer_admin"] },
  { to: "/consumers", label: "Consumers", icon: <Users className="h-4 w-4" />, roles: ["platform_admin", "platform_dev", "platform_viewer", "consumer_admin"] },
  { to: "/plugins", label: "Plugins", icon: <Puzzle className="h-4 w-4" />, roles: ["platform_admin", "platform_dev", "platform_viewer"] },
  { to: "/audit-logs", label: "Audit Logs", icon: <ScrollText className="h-4 w-4" />, roles: ["platform_admin", "platform_dev", "platform_viewer", "service_admin", "service_dev", "service_viewer", "consumer_admin"] },
  { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" />, roles: ["platform_admin", "platform_dev", "platform_viewer", "service_admin", "service_dev", "service_viewer", "consumer_admin"] },
  { to: "/admin", label: "Admin", icon: <ShieldCheck className="h-4 w-4" />, roles: ["platform_admin"] },
];

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  platform: { label: "Platform", className: "bg-indigo-100 text-indigo-700" },
  service: { label: "Service", className: "bg-emerald-100 text-emerald-700" },
  consumer: { label: "Consumer", className: "bg-amber-100 text-amber-700" },
};

function highestTier(roles: string[]): string | null {
  let best: string | null = null;
  let bestRank = -1;
  for (const role of roles) {
    const tier = tierOf(role);
    if (!tier) continue;
    const rank = TIER_ORDER[tier];
    if (rank > bestRank) {
      bestRank = rank;
      best = tier;
    }
  }
  return best;
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null;
  }

  const canSee = (roles: string[]) =>
    user.isPlatformAdmin || roles.some((r) => user.roles.some((u) => u.role === r));

  const visibleNav = navItems.filter((item) => canSee(item.roles));

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/login");
  };

  const roleTags = user.roles.map((r) => r.role).slice(0, 2);
  const tier = highestTier(user.roles.map((r) => r.role));
  const tierBadge = tier ? TIER_BADGE[tier] : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">API Platform</p>
            <p className="text-xs text-slate-500">Gateway Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
              {(user.firstName?.[0] ?? "").toUpperCase()}
              {(user.lastName?.[0] ?? "").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">
                {user.firstName} {user.lastName}
              </p>
              <div className="flex flex-wrap items-center gap-1">
                {tierBadge && (
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${tierBadge.className}`}
                  >
                    {tierBadge.label}
                  </span>
                )}
                {roleTags.map((role) => (
                  <span
                    key={role}
                    className="inline-block max-w-24 truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex-1 px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}