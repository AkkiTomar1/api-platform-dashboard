import { Navigate } from "react-router-dom";
import { PageLoader } from "@ui";
import { useAuth } from "@/lib/auth-context";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function RoleGuard({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return null;

  const allowed =
    user.isPlatformAdmin || user.roles.some((r) => roles.includes(r.role));
  if (!allowed) {
    return <Navigate to="/" replace />;
  }
  return children;
}