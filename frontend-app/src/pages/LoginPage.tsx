import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [loginField, setLoginField] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [logoVisible, setLogoVisible] = useState(true);
  const nav = useNavigate();
  const loc = useLocation();
  const state = loc.state as { from?: string; reason?: string } | null;
  const from = state?.from && state.from.startsWith("/") ? state.from : "/applications";
  const sessionExpired = state?.reason === "session_expired";

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      nav(from, { replace: true });
    }
  }, [authLoading, isAuthenticated, from, nav]);

  function localizeLoginError(message: string): string {
    if (message === "invalid_login_or_password") {
      return "Неверный логин или пароль.";
    }
    return message;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await login(loginField, password);
      nav(from, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? localizeLoginError(e.message) : "Неверный логин или пароль.");
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
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        {logoVisible ? (
          <img
            src="/branding/logo-primary.png"
            alt="AgroDoc"
            style={{ width: "min(220px, 100%)", height: 48, objectFit: "contain" }}
            onError={() => setLogoVisible(false)}
          />
        ) : null}
      </div>
      <h1>Вход</h1>
      <p className="muted">Используйте учётную запись. Для проверки в dev есть сид (см. README backend).</p>
      {sessionExpired ? <p className="form-error">Сессия истекла, войдите снова.</p> : null}
      <form className="form" onSubmit={onSubmit}>
        <div className="form-field">
          <label htmlFor="login">Логин</label>
          <input
            id="login"
            className="input"
            name="username"
            autoComplete="username"
            value={loginField}
            onChange={(e) => setLoginField(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="pass">Пароль</label>
          <input
            id="pass"
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
        <Link to="/" className="link-muted">
          На главную
        </Link>
      </p>
    </section>
    </div>
  );
}
