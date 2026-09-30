import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Permission, RequestUser, RoleAssignmentEntry } from "@shared";
import { ROLE_LEVELS, tierOf } from "@shared";
import { fetchMe, login as apiLogin, logout as apiLogout } from "@/api/auth";
import {
  getStoredRefreshToken,
  getStoredToken,
  logoutLocal,
  setStoredTokens,
} from "@/api/client";

interface AuthContextValue {
  user: RequestUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  platformRole: string | null;
  permissions: Permission[];
  hasPermission: (permission: string) => boolean;
  serviceRoleAssignments: RoleAssignmentEntry[];
  consumerRoleAssignments: RoleAssignmentEntry[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RequestUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (!getStoredToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        setUser(me);
      } catch {
        logoutLocal();
      } finally {
        setLoading(false);
      }
    }
    void bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    setStoredTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    const refresh = getStoredRefreshToken();
    if (refresh !== null) {
      try {
        await apiLogout(refresh);
      } catch {
        // best-effort
      }
    }
    setStoredTokens(null, null);
    setUser(null);
    window.location.assign("/login");
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const userName = user
      ? `${user.firstName} ${user.lastName}`.trim() || user.username || null
      : null;
    let platformRole: string | null = null;
    let bestLevel = -1;
    for (const r of user?.roles ?? []) {
      if (tierOf(r.role) !== "platform") continue;
      const level = ROLE_LEVELS[r.role as keyof typeof ROLE_LEVELS] ?? 0;
      if (level > bestLevel) {
        bestLevel = level;
        platformRole = r.role;
      }
    }
    return {
      user,
      loading,
      isAuthenticated: user !== null,
      isPlatformAdmin: Boolean(user?.isPlatformAdmin),
      userId: user?.id ?? null,
      userName,
      userEmail: user?.email ?? null,
      platformRole,
      permissions: user?.permissions ?? [],
      hasPermission: (permission: string) =>
        Boolean(
          user?.isPlatformAdmin ||
            user?.permissions.includes(permission as Permission),
        ),
      serviceRoleAssignments: (user?.roles ?? []).filter(
        (r) => tierOf(r.role) === "service",
      ),
      consumerRoleAssignments: (user?.roles ?? []).filter(
        (r) => tierOf(r.role) === "consumer",
      ),
      login,
      logout,
    };
  }, [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}