import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  clearSession,
  fetchMe,
  getAccessToken,
  loginRequest,
  logoutRequest,
  onUnauthorized,
  readStoredUser,
  saveSession,
} from "./api";
import { normalizeRole, type AuthUser } from "./types";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let bootstrap: Promise<AuthUser | null> | null = null;

function bootstrapUser() {
  if (bootstrap) return bootstrap;
  bootstrap = (async () => {
    const token = getAccessToken();
    if (!token) return null;
    try {
      const me = await fetchMe();
      const access = getAccessToken();
      const refresh = localStorage.getItem("rhflow.refreshToken");
      if (access && refresh) saveSession(access, refresh, me);
      return me;
    } catch {
      clearSession();
      return null;
    }
  })();
  return bootstrap;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onUnauthorized(() => {
      bootstrap = null;
      setUser(null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAccessToken();
      const cached = readStoredUser<AuthUser>();
      if (!token) {
        bootstrap = null;
        clearSession();
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      if (cached && !cancelled) setUser(cached);
      try {
        const me = await bootstrapUser();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user) && Boolean(getAccessToken()),
      setUser,
      login: async (email, password, rememberMe = false) => {
        const u = await loginRequest(email, password, rememberMe);
        bootstrap = null;
        qc.clear();
        setUser(u);
        return u;
      },
      logout: async () => {
        await logoutRequest();
        bootstrap = null;
        setUser(null);
        qc.clear();
      },
    }),
    [user, loading, qc],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth");
  return ctx;
}

export function homeForUser(user: AuthUser | null) {
  if (!user) return "/login";
  if (normalizeRole(user.role) === "SUPER_ADMIN") return "/platform";
  if (normalizeRole(user.role) === "EMPLOYEE") return "/portal";
  return "/app";
}
