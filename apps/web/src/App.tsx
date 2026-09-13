import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { PageLoader } from "@ui";
import { Layout } from "@/components/Layout";
import { RouteGuard, RoleGuard } from "@/components/RouteGuard";
import { useAuth } from "@/lib/auth-context";

const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ServicesPage = lazy(() => import("@/features/services/ServicesPage").then((m) => ({ default: m.ServicesPage })));
const ServiceDetailPage = lazy(() => import("@/features/services/ServiceDetailPage").then((m) => ({ default: m.ServiceDetailPage })));
const ConsumersPage = lazy(() => import("@/features/consumers/ConsumersPage").then((m) => ({ default: m.ConsumersPage })));
const PluginsPage = lazy(() => import("@/features/plugins/PluginsPage").then((m) => ({ default: m.PluginsPage })));
const AuditLogsPage = lazy(() => import("@/features/auditLogs/AuditLogsView").then((m) => ({ default: m.AuditLogsView })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const AdminPage = lazy(() => import("@/features/admin/AdminPage").then((m) => ({ default: m.AdminPage })));

function HomeRoute() {
  return <DashboardPage />;
}

function LoginRedirect({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user !== null) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function Loading({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Loading>
      <Routes>
        <Route
          path="/login"
          element={
            <LoginRedirect>
              <LoginPage />
            </LoginRedirect>
          }
        />

<Route element={<RouteGuard><Layout /></RouteGuard>}>
            <Route index element={<HomeRoute />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="services/:id" element={<ServiceDetailPage />} />
            <Route
              path="consumers"
              element={
                <RoleGuard roles={["platform_admin", "platform_dev", "platform_viewer", "consumer_admin"]}>
                  <ConsumersPage />
                </RoleGuard>
              }
            />
          <Route
            path="plugins"
            element={
              <RoleGuard roles={["platform_admin", "platform_dev"]}>
                <PluginsPage />
              </RoleGuard>
            }
          />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="admin"
            element={
              <RoleGuard roles={["platform_admin"]}>
                <AdminPage />
              </RoleGuard>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Loading>
  );
}