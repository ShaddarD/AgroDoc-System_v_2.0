import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

type Row = {
  uuid: string;
  login: string;
  role_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
};

type RoleRow = { role_code: string; description: string };

export function UsersPage() {
  const { account } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [cLogin, setCLogin] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRole, setCRole] = useState("viewer");
  const [cLast, setCLast] = useState("");
  const [cFirst, setCFirst] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const [pwdTarget, setPwdTarget] = useState<string | null>(null);
  const [pwdNew, setPwdNew] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    setOkMsg(null);
    setLoading(true);
    const [r, rr] = await Promise.all([api.fetch("/admin/accounts"), api.fetch("/lookups/roles")]);
    if (!r.ok) {
      setErr(await api.readApiError(r));
      setRows([]);
    } else {
      setRows((await r.json()) as Row[]);
    }
    if (rr.ok) {
      const list = (await rr.json()) as RoleRow[];
      setRoles(list);
      setCRole((prev) => (list.some((x) => x.role_code === prev) ? prev : list[0]?.role_code ?? "viewer"));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!account || account.role_code !== "admin") {
      return;
    }
    void load();
  }, [load, account]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);
    setCreating(true);
    const r = await api.fetch("/admin/accounts", {
      method: "POST",
      body: JSON.stringify({
        login: cLogin.trim(),
        password: cPassword,
        role_code: cRole,
        last_name: cLast.trim(),
        first_name: cFirst.trim(),
        email: cEmail.trim() || null,
      }),
    });
    if (!r.ok) {
      setErr(await api.readApiError(r));
    } else {
      setOkMsg("Учётная запись создана.");
      setCLogin("");
      setCPassword("");
      setCLast("");
      setCFirst("");
      setCEmail("");
      void load();
    }
    setCreating(false);
  }

  async function toggleActive(u: Row) {
    setErr(null);
    setOkMsg(null);
    const r = await api.fetch(`/admin/accounts/${u.uuid}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !u.is_active }),
    });
    if (!r.ok) {
      setErr(await api.readApiError(r));
    } else {
      setOkMsg("Сохранено.");
      void load();
    }
  }

  async function changeRole(u: Row, role_code: string) {
    setErr(null);
    setOkMsg(null);
    const r = await api.fetch(`/admin/accounts/${u.uuid}`, {
      method: "PATCH",
      body: JSON.stringify({ role_code }),
    });
    if (!r.ok) {
      setErr(await api.readApiError(r));
    } else {
      setOkMsg("Роль обновлена.");
      void load();
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwdTarget || pwdNew.length < 8) {
      return;
    }
    setPwdBusy(true);
    setErr(null);
    setOkMsg(null);
    const r = await api.fetch(`/admin/accounts/${pwdTarget}/set-password`, {
      method: "POST",
      body: JSON.stringify({ new_password: pwdNew }),
    });
    if (!r.ok) {
      setErr(await api.readApiError(r));
    } else {
      setOkMsg("Пароль обновлён.");
      setPwdTarget(null);
      setPwdNew("");
    }
    setPwdBusy(false);
  }

  if (!account) {
    return (
      <section className="card page">
        <h1>Пользователи</h1>
        <p>Загрузка…</p>
      </section>
    );
  }

  if (account.role_code !== "admin") {
    return (
      <section className="card page">
        <h1>Пользователи</h1>
        <p className="form-error">Доступно только администратору.</p>
      </section>
    );
  }

  return (
    <section className="card page page-wide">
      <h1>Учётные записи</h1>
      <p className="muted">Создание, смена роли и активности, сброс пароля (только администратор).</p>
      {err ? <p className="form-error">{err}</p> : null}
      {okMsg ? <p className="muted">{okMsg}</p> : null}

      <section className="card" style={{ marginTop: 16, padding: 16 }}>
        <h2 style={{ fontSize: "1.1rem", margin: "0 0 12px" }}>Новая учётная запись</h2>
        <form className="form" onSubmit={onCreate} style={{ flexFlow: "row wrap", gap: "12px", alignItems: "flex-end" }}>
          <div className="form-field">
            <label htmlFor="cl">Логин</label>
            <input id="cl" className="input" value={cLogin} onChange={(e) => setCLogin(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="cp">Пароль (≥ 8 символов)</label>
            <input
              id="cp"
              type="password"
              className="input"
              value={cPassword}
              onChange={(e) => setCPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="form-field">
            <label htmlFor="cr">Роль</label>
            <select id="cr" className="input" value={cRole} onChange={(e) => setCRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r.role_code} value={r.role_code}>
                  {r.role_code}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="cfn">Имя</label>
            <input id="cfn" className="input" value={cFirst} onChange={(e) => setCFirst(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="cln">Фамилия</label>
            <input id="cln" className="input" value={cLast} onChange={(e) => setCLast(e.target.value)} required />
          </div>
          <div className="form-field" style={{ minWidth: 200 }}>
            <label htmlFor="ce">Email</label>
            <input id="ce" type="email" className="input" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? "…" : "Создать"}
          </button>
        </form>
      </section>

      {pwdTarget ? (
        <section className="card" style={{ marginTop: 16, padding: 16 }}>
          <h2 style={{ fontSize: "1.1rem", margin: "0 0 8px" }}>Новый пароль для учётки</h2>
          <form className="form" onSubmit={submitPassword} style={{ flexFlow: "row wrap", alignItems: "flex-end", gap: 12 }}>
            <div className="form-field">
              <label htmlFor="np">Пароль (≥ 8)</label>
              <input
                id="np"
                type="password"
                className="input"
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={pwdBusy}>
              {pwdBusy ? "…" : "Сохранить пароль"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setPwdTarget(null)}>
              Отмена
            </button>
          </form>
        </section>
      ) : null}

      {loading ? <p style={{ marginTop: 16 }}>Загрузка…</p> : null}
      {!loading ? (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Логин</th>
                <th>Роль</th>
                <th>Имя</th>
                <th>Email</th>
                <th>Активна</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.uuid}>
                  <td>{u.login}</td>
                  <td>
                    <select
                      className="input"
                      style={{ minWidth: 140 }}
                      value={u.role_code}
                      onChange={(e) => void changeRole(u, e.target.value)}
                      aria-label={`Роль ${u.login}`}
                    >
                      {roles.map((r) => (
                        <option key={r.role_code} value={r.role_code}>
                          {r.role_code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {u.last_name} {u.first_name}
                  </td>
                  <td>{u.email || "—"}</td>
                  <td>{u.is_active ? "да" : "нет"}</td>
                  <td>
                    <button type="button" className="nav-link" onClick={() => void toggleActive(u)} disabled={u.uuid === account.uuid}>
                      {u.is_active ? "Деактивировать" : "Активировать"}
                    </button>
                    <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => setPwdTarget(u.uuid)}>
                      Пароль
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
