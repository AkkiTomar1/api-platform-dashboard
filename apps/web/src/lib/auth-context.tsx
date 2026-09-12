import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RequestUser } from "@shared";
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      isPlatformAdmin: Boolean(user?.isPlatformAdmin),
      login,
      logout,
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}