import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

type Row = {
  uuid: string;
  login: string;
  role_code: string;
  first_name: string;
  last_name: string;
  counterparty_uuid: string | null;
  counterparty_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
};

type RoleRow = { role_code: string; description: string };
type CounterpartyRow = { uuid: string; name_ru: string };
type ModuleAccessRow = { module_code: string; module_description: string; can_read: boolean; can_write: boolean };

export function UsersPage() {
  const { account } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [counterparties, setCounterparties] = useState<CounterpartyRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterCounterparty, setFilterCounterparty] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [cLogin, setCLogin] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRole, setCRole] = useState("viewer");
  const [cLast, setCLast] = useState("");
  const [cFirst, setCFirst] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cCounterparty, setCCounterparty] = useState("");
  const [creating, setCreating] = useState(false);

  const [pwdTarget, setPwdTarget] = useState<string | null>(null);
  const [pwdNew, setPwdNew] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [accessTarget, setAccessTarget] = useState<string | null>(null);
  const [accessRows, setAccessRows] = useState<ModuleAccessRow[]>([]);
  const [accessBusy, setAccessBusy] = useState(false);
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editLogin, setEditLogin] = useState("");
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editMiddle, setEditMiddle] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCounterparty, setEditCounterparty] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    setOkMsg(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (filterRole) params.set("role_code", filterRole);
    if (filterCounterparty) params.set("counterparty_uuid", filterCounterparty);
    if (filterActive) params.set("is_active", filterActive);
    params.set("sort_by", sortBy);
    params.set("sort_dir", sortDir);
    params.set("limit", "500");
    const [r, rr, rc] = await Promise.all([
      api.fetch(`/admin/accounts?${params.toString()}`),
      api.fetch("/lookups/roles"),
      api.fetch("/lookups/counterparties"),
    ]);
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
    if (rc.ok) {
      setCounterparties((await rc.json()) as CounterpartyRow[]);
    } else {
      setCounterparties([]);
    }
    setLoading(false);
  }, [q, filterRole, filterCounterparty, filterActive, sortBy, sortDir]);

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
        counterparty_uuid: cCounterparty || null,
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
      setCCounterparty("");
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

  function openEditUser(u: Row) {
    setEditTarget(u);
    setEditLogin(u.login);
    setEditFirst(u.first_name);
    setEditLast(u.last_name);
    setEditMiddle("");
    setEditRole(u.role_code);
    setEditEmail(u.email || "");
    setEditCounterparty(u.counterparty_uuid || "");
  }

  async function saveUserEdit() {
    if (!editTarget) return;
    setEditBusy(true);
    const r = await api.fetch(`/admin/accounts/${editTarget.uuid}`, {
      method: "PATCH",
      body: JSON.stringify({
        login: editLogin.trim(),
        first_name: editFirst.trim(),
        last_name: editLast.trim(),
        middle_name: editMiddle.trim() || null,
        role_code: editRole,
        email: editEmail.trim() || null,
        counterparty_uuid: editCounterparty || null,
      }),
    });
    if (!r.ok) {
      setErr(await api.readApiError(r));
      setEditBusy(false);
      return;
    }
    setEditTarget(null);
    setEditBusy(false);
    await load();
  }

  async function openAccess(u: Row) {
    setAccessTarget(u.uuid);
    setAccessBusy(true);
    setErr(null);
    const r = await api.fetch(`/admin/accounts/${u.uuid}/module-access`);
    if (!r.ok) {
      setErr(await api.readApiError(r));
      setAccessRows([]);
    } else {
      setAccessRows((await r.json()) as ModuleAccessRow[]);
    }
    setAccessBusy(false);
  }

  async function saveAccess() {
    if (!accessTarget) return;
    setAccessBusy(true);
    setErr(null);
    setOkMsg(null);
    const r = await api.fetch(`/admin/accounts/${accessTarget}/module-access`, {
      method: "PUT",
      body: JSON.stringify({
        items: accessRows.map((x) => ({
          module_code: x.module_code,
          can_read: x.can_read,
          can_write: x.can_write,
        })),
      }),
    });
    if (!r.ok) {
      setErr(await api.readApiError(r));
    } else {
      setOkMsg("Доступы сохранены.");
      setAccessTarget(null);
      setAccessRows([]);
    }
    setAccessBusy(false);
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
          <div className="form-field" style={{ flex: "1 1 220px", minWidth: 0 }}>
            <label htmlFor="ce">Email</label>
            <input id="ce" type="email" className="input" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="cc">Компания</label>
            <select id="cc" className="input" value={cCounterparty} onChange={(e) => setCCounterparty(e.target.value)}>
              <option value="">—</option>
              {counterparties.map((c) => (
                <option key={c.uuid} value={c.uuid}>
                  {c.name_ru}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? "…" : "Создать"}
          </button>
        </form>
      </section>

      <section className="card" style={{ marginTop: 16, padding: 16 }}>
        <h2 style={{ fontSize: "1.1rem", margin: "0 0 12px" }}>Фильтр и сортировка</h2>
        <form className="form" onSubmit={(e) => e.preventDefault()} style={{ flexFlow: "row wrap", gap: 12, alignItems: "flex-end" }}>
          <div className="form-field"><label htmlFor="fq">Поиск</label><input id="fq" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Логин, имя, email, компания" /></div>
          <div className="form-field"><label htmlFor="fr">Роль</label><select id="fr" className="input" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}><option value="">—</option>{roles.map((r) => <option key={r.role_code} value={r.role_code}>{r.role_code}</option>)}</select></div>
          <div className="form-field"><label htmlFor="fc">Компания</label><select id="fc" className="input" value={filterCounterparty} onChange={(e) => setFilterCounterparty(e.target.value)}><option value="">—</option>{counterparties.map((c) => <option key={c.uuid} value={c.uuid}>{c.name_ru}</option>)}</select></div>
          <div className="form-field"><label htmlFor="fa">Активность</label><select id="fa" className="input" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}><option value="">—</option><option value="true">Активные</option><option value="false">Неактивные</option></select></div>
          <div className="form-field"><label htmlFor="fs">Сортировка</label><select id="fs" className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="created_at">Дата создания</option><option value="login">Логин</option><option value="role">Роль</option><option value="email">Email</option><option value="company">Компания</option></select></div>
          <div className="form-field"><label htmlFor="fd">Порядок</label><select id="fd" className="input" value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}><option value="desc">По убыванию</option><option value="asc">По возрастанию</option></select></div>
          <button type="button" className="btn-ghost" onClick={() => void load()}>Применить</button>
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
                <th>Компания</th>
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
                      style={{ width: "100%", minWidth: 0 }}
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
                  <td>{u.counterparty_name || "—"}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.is_active ? "да" : "нет"}</td>
                  <td>
                    <button type="button" className="nav-link" onClick={() => void toggleActive(u)} disabled={u.uuid === account.uuid}>
                      {u.is_active ? "Деактивировать" : "Активировать"}
                    </button>
                    <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => setPwdTarget(u.uuid)}>
                      Пароль
                    </button>
                    <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => openEditUser(u)}>
                      Редактировать
                    </button>
                    <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => void openAccess(u)}>
                      Доступы
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {editTarget ? (
        <section className="card" style={{ marginTop: 16, padding: 16 }}>
          <h2 style={{ fontSize: "1.1rem", margin: "0 0 8px" }}>Редактирование записи</h2>
          <div className="form" style={{ flexFlow: "row wrap", gap: 12, alignItems: "flex-end" }}>
            <div className="form-field"><label>Логин</label><input className="input" value={editLogin} onChange={(e) => setEditLogin(e.target.value)} /></div>
            <div className="form-field"><label>Имя</label><input className="input" value={editFirst} onChange={(e) => setEditFirst(e.target.value)} /></div>
            <div className="form-field"><label>Фамилия</label><input className="input" value={editLast} onChange={(e) => setEditLast(e.target.value)} /></div>
            <div className="form-field"><label>Отчество</label><input className="input" value={editMiddle} onChange={(e) => setEditMiddle(e.target.value)} /></div>
            <div className="form-field"><label>Email</label><input className="input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></div>
            <div className="form-field"><label>Роль</label><select className="input" value={editRole} onChange={(e) => setEditRole(e.target.value)}>{roles.map((r) => <option key={r.role_code} value={r.role_code}>{r.role_code}</option>)}</select></div>
            <div className="form-field"><label>Компания</label><select className="input" value={editCounterparty} onChange={(e) => setEditCounterparty(e.target.value)}><option value="">—</option>{counterparties.map((c) => <option key={c.uuid} value={c.uuid}>{c.name_ru}</option>)}</select></div>
            <button type="button" className="btn-primary" onClick={() => void saveUserEdit()} disabled={editBusy}>{editBusy ? "…" : "Сохранить"}</button>
            <button type="button" className="btn-ghost" onClick={() => setEditTarget(null)}>Отмена</button>
          </div>
        </section>
      ) : null}
      {accessTarget ? (
        <section className="card" style={{ marginTop: 16, padding: 16 }}>
          <h2 style={{ fontSize: "1.1rem", margin: "0 0 8px" }}>Доступ к блокам (Read/Write) — {rows.find((x) => x.uuid === accessTarget)?.login || accessTarget}</h2>
          {accessBusy ? <p>Загрузка...</p> : null}
          {!accessBusy ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Блок</th>
                    <th>Read</th>
                    <th>Write</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRows.map((r) => (
                    <tr key={r.module_code}>
                      <td>{r.module_description}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={r.can_read}
                          onChange={(e) =>
                            setAccessRows((prev) =>
                              prev.map((x) => (x.module_code === r.module_code ? { ...x, can_read: e.target.checked } : x)),
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={r.can_write}
                          onChange={(e) =>
                            setAccessRows((prev) =>
                              prev.map((x) => (x.module_code === r.module_code ? { ...x, can_write: e.target.checked } : x)),
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p style={{ marginTop: 12 }}>
            <button type="button" className="btn-primary" onClick={() => void saveAccess()} disabled={accessBusy}>Сохранить доступы</button>
            <button type="button" className="btn-ghost" style={{ marginLeft: 8 }} onClick={() => setAccessTarget(null)}>Закрыть</button>
          </p>
        </section>
      ) : null}
    </section>
  );
}
