import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { Account } from "../../../shared-ui/src/apiClient";

type AuthState = {
  account: Account | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clearSession = useCallback((nextError: string | null = null) => {
    api.deleteToken();
    setAccount(null);
    setError(nextError);
  }, []);

  const refresh = useCallback(async () => {
    if (!api.getToken() && !api.getRefreshToken()) {
      clearSession(null);
      return;
    }
    try {
      const me = await api.getMe();
      if (!me) {
        clearSession("session_expired");
        return;
      }
      setAccount(me);
      setError(null);
    } catch (e) {
      clearSession(e instanceof Error ? e.message : "auth_refresh_failed");
      throw e;
    }
  }, [clearSession]);

  useEffect(() => {
    let c = false;
    void (async () => {
      setError(null);
      try {
        await refresh();
      } catch (e) {
        if (!c) {
          setError(e instanceof Error ? e.message : "auth_refresh_failed");
        }
      } finally {
        if (!c) {
          setLoading(false);
        }
      }
    })();
    return () => {
      c = true;
    };
  }, [refresh]);

  const login = useCallback(async (l: string, p: string) => {
    setError(null);
    try {
      const data = await api.login(l, p);
      api.setTokens(data.access_token, data.refresh_token);
      setAccount(data.account);
      setError(null);
    } catch (e) {
      clearSession(e instanceof Error ? e.message : "login_failed");
      throw e instanceof Error ? e : new Error("login_failed");
    }
  }, [clearSession]);

  const logout = useCallback(async () => {
    await api.logoutRemote();
    clearSession(null);
  }, [clearSession]);

  const value = useMemo(
    () => ({
      account,
      loading,
      error,
      isAuthenticated: account !== null,
      login,
      logout,
      refresh,
    }),
    [account, loading, error, login, logout, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useAuth must be under AuthProvider");
  }
  return v;
}
