import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Props = { children: React.ReactNode };

export function RequireAuth({ children }: Props) {
  const { isAuthenticated, loading, error } = useAuth();
  const loc = useLocation();

  if (loading) {
    return <p className="muted">Проверка сессии…</p>;
  }
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${loc.pathname}${loc.search}${loc.hash}`,
          reason: error ?? "auth_required",
        }}
      />
    );
  }
  return <>{children}</>;
}
