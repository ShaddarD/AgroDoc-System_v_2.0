import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [loginField, setLoginField] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? "/";

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      nav(from, { replace: true });
    }
  }, [authLoading, isAuthenticated, from, nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await login(loginField, password);
      nav(from, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Неверный логин или пароль, или нет роли на доступ в админку.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return <p>Загрузка…</p>;
  }

  return (
    <div className="auth-shell">
      <section className="card page form-page">
        <h1>Админка — вход</h1>
        <p className="muted">Только для зарегистрированных сотрудников. Роль `admin` нужна для создания записей в справочниках.</p>
        <form className="form" onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="alogin">Логин</label>
            <input
              id="alogin"
              className="input"
              name="username"
              autoComplete="username"
              value={loginField}
              onChange={(e) => setLoginField(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="apass">Пароль</label>
            <input
              id="apass"
              className="input"
              name="current-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err ? <p className="form-error">{err}</p> : null}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Вход…" : "Войти"}
          </button>
        </form>
        <p className="form-footer">
          <span className="link-muted">Нет перенаправления на публичный сайт</span>
        </p>
      </section>
    </div>
  );
}
