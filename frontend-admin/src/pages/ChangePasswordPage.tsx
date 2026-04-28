import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export function ChangePasswordPage() {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [nw2, setNw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (nw !== nw2) {
      setErr("Новый пароль и подтверждение не совпадают.");
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(cur, nw);
      await api.logoutRemote();
      api.deleteToken();
      nav("/login", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card page">
      <p>
        <Link to="/" className="nav-link">
          ← на панель
        </Link>
      </p>
      <h1>Смена пароля</h1>
      <p className="muted">Сессии на других устройствах будут завершены. Войдите снова с новым паролем.</p>
      <form className="form" onSubmit={submit} style={{ maxWidth: 400 }}>
        <div className="form-field">
          <label htmlFor="oc">Текущий пароль</label>
          <input
            id="oc"
            type="password"
            className="input"
            autoComplete="current-password"
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="on">Новый пароль (≥ 8 символов)</label>
          <input
            id="on"
            type="password"
            className="input"
            autoComplete="new-password"
            value={nw}
            onChange={(e) => setNw(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="form-field">
          <label htmlFor="on2">Повтор нового пароля</label>
          <input
            id="on2"
            type="password"
            className="input"
            autoComplete="new-password"
            value={nw2}
            onChange={(e) => setNw2(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {err ? <p className="form-error">{err}</p> : null}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Сохранение…" : "Сменить пароль"}
        </button>
      </form>
    </section>
  );
}
