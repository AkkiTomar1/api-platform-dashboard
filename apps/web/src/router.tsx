import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { PageLoader, EmptyState } from "@ui";
import { TriangleAlert } from "lucide-react";
import { Layout } from "@/components/Layout";
import { RouteGuard, RoleGuard } from "@/components/RouteGuard";
import { useAuth } from "@/lib/auth-context";

const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ServicesPage = lazy(() => import("@/features/services/ServicesPage").then((m) => ({ default: m.ServicesPage })));
const ServiceDetailPage = lazy(() => import("@/features/services/ServiceDetailPage").then((m) => ({ default: m.ServiceDetailPage })));
const ConsumersPage = lazy(() => import("@/features/consumers/ConsumersPage").then((m) => ({ default: m.ConsumersPage })));
const ConsumerDetailPage = lazy(() => import("@/features/consumers/ConsumerDetailPage").then((m) => ({ default: m.ConsumerDetailPage })));
const AuditLogsPage = lazy(() => import("@/features/auditLogs/AuditLogsView").then((m) => ({ default: m.AuditLogsView })));
const AdminPage = lazy(() => import("@/features/admin/AdminPage").then((m) => ({ default: m.AdminPage })));

function Suspend({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function LoginRedirect({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user !== null) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function RouteErrorScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={<TriangleAlert className="h-6 w-6" />}
        title="Something went wrong"
        description="An unexpected error occurred while loading this page. Please try again."
      />
    </div>
  );
}

const CONSUMER_GUARD_ROLES = [
  "platform_admin",
  "platform_dev",
  "platform_viewer",
  "consumer_admin",
];

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspend>
        <LoginRedirect>
          <LoginPage />
        </LoginRedirect>
      </Suspend>
    ),
  },
  {
    element: (
      <Suspend>
        <RouteGuard>
          <Layout />
        </RouteGuard>
      </Suspend>
    ),
    errorElement: <RouteErrorScreen />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "services", element: <ServicesPage /> },
      { path: "services/:id", element: <ServiceDetailPage /> },
      {
        path: "consumers",
        element: (
          <RoleGuard roles={CONSUMER_GUARD_ROLES}>
            <ConsumersPage />
          </RoleGuard>
        ),
      },
      {
        path: "consumers/:consumerId",
        element: (
          <RoleGuard roles={CONSUMER_GUARD_ROLES}>
            <ConsumerDetailPage />
          </RoleGuard>
        ),
      },
      { path: "audit-logs", element: <AuditLogsPage /> },
      {
        path: "admin",
        element: (
          <RoleGuard roles={["platform_admin"]}>
            <AdminPage />
          </RoleGuard>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);