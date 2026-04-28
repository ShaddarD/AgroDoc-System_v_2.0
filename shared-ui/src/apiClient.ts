import { readApiError } from "./apiErrors";

export const TOKEN_KEY = "agrodoc_access_token";
export const REFRESH_KEY = "agrodoc_refresh_token";

export type Account = {
  uuid: string;
  login: string;
  role_code: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  counterparty_uuid: string | null;
  phone: string | null;
  email: string | null;
  job_title: string | null;
  department_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LoginResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  account: Account;
};

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  if (path.startsWith("http")) {
    return path;
  }
  return `${b}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createApiClient(getBase: () => string) {
  let refreshPromise: Promise<boolean> | null = null;

  function getToken(): string | null {
    if (typeof sessionStorage === "undefined") {
      return null;
    }
    return sessionStorage.getItem(TOKEN_KEY);
  }

  function getRefreshToken(): string | null {
    if (typeof sessionStorage === "undefined") {
      return null;
    }
    return sessionStorage.getItem(REFRESH_KEY);
  }

  function setToken(t: string | null): void {
    if (typeof sessionStorage === "undefined") {
      return;
    }
    if (t) {
      sessionStorage.setItem(TOKEN_KEY, t);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }

  function setRefreshToken(t: string | null): void {
    if (typeof sessionStorage === "undefined") {
      return;
    }
    if (t) {
      sessionStorage.setItem(REFRESH_KEY, t);
    } else {
      sessionStorage.removeItem(REFRESH_KEY);
    }
  }

  function setTokens(access: string | null, refresh: string | null): void {
    setToken(access);
    setRefreshToken(refresh);
  }

  function deleteToken(): void {
    setTokens(null, null);
  }

  function shouldTryRefreshOn401(path: string): boolean {
    if (!getRefreshToken()) {
      return false;
    }
    if (path.includes("/auth/token")) {
      return false;
    }
    if (path.includes("/auth/refresh")) {
      return false;
    }
    if (path.includes("/auth/logout")) {
      return false;
    }
    if (path.includes("/auth/change-password")) {
      return false;
    }
    return true;
  }

  async function doRefresh(): Promise<boolean> {
    const rt = getRefreshToken();
    if (!rt) {
      return false;
    }
    const base = getBase();
    const url = joinUrl(base, "/auth/refresh");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!r.ok) {
        deleteToken();
        return false;
      }
      const j = (await r.json()) as { access_token: string; refresh_token: string };
      setTokens(j.access_token, j.refresh_token);
      return true;
    } catch {
      deleteToken();
      return false;
    }
  }

  async function tryRefresh(): Promise<boolean> {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  }

  async function fetchApi(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
    const base = getBase();
    const url = joinUrl(base, path);
    const headers = new Headers(init.headers);
    const t = getToken();
    if (t) {
      headers.set("Authorization", `Bearer ${t}`);
    }
    if (init.body !== undefined && typeof init.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const res = await fetch(url, { ...init, headers });
    if (res.status === 401 && !retried && shouldTryRefreshOn401(path)) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return fetchApi(path, init, true);
      }
      deleteToken();
    }
    return res;
  }

  return {
    getBase,
    getToken,
    getRefreshToken,
    setToken,
    setRefreshToken,
    setTokens,
    deleteToken,
    readApiError,
    fetch: fetchApi,
    async login(login: string, password: string): Promise<LoginResult> {
      const r = await fetchApi("/auth/token", { method: "POST", body: JSON.stringify({ login, password }) });
      if (!r.ok) {
        throw new Error(await readApiError(r));
      }
      return (await r.json()) as LoginResult;
    },
    async getMe(): Promise<Account | null> {
      if (!getToken() && !getRefreshToken()) {
        return null;
      }
      const r = await fetchApi("/auth/me", { method: "GET" });
      if (r.status === 401) {
        deleteToken();
        return null;
      }
      if (!r.ok) {
        throw new Error(await readApiError(r));
      }
      return (await r.json()) as Account;
    },
    async logoutRemote(): Promise<void> {
      const rt = getRefreshToken();
      if (!rt) {
        return;
      }
      const base = getBase();
      const url = joinUrl(base, "/auth/logout");
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
      } catch {
        /* ignore */
      }
    },
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
      const r = await fetchApi("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      if (!r.ok) {
        throw new Error(await readApiError(r));
      }
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
