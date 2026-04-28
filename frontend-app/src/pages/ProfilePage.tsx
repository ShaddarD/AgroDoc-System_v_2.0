import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/api";

type CounterpartyRow = { uuid: string; name_ru: string };
type SessionRow = {
  jti: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};
type AuditRow = {
  uuid: string;
  action: string;
  event_type: string;
  created_at: string;
  entity_uuid: string;
  new_data: unknown;
};
type RoleRow = { role_code: string; description: string };

function getRefreshJti(token: string | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64));
    return typeof json.jti === "string" ? json.jti : null;
  } catch {
    return null;
  }
}

export function ProfilePage() {
  const { account, refresh } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [counterpartyName, setCounterpartyName] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);

  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [nw2, setNw2] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  const [cLogin, setCLogin] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cRole, setCRole] = useState("viewer");
  const [cFirst, setCFirst] = useState("");
  const [cLast, setCLast] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cCounterpartyUuid, setCCounterpartyUuid] = useState("");
  const [counterparties, setCounterparties] = useState<CounterpartyRow[]>([]);
  const [createBusy, setCreateBusy] = useState(false);

  const isAdmin = account?.role_code === "admin";
  const currentRefreshJti = useMemo(() => getRefreshJti(api.getRefreshToken()), []);

  const loadProfileData = useCallback(async () => {
    setErr(null);
    try {
      const reqs: Promise<Response>[] = [
        api.fetch("/lookups/counterparties"),
        api.fetch("/auth/sessions"),
        api.fetch("/audit-logs?limit=50&entity_type=account"),
        api.fetch("/lookups/roles"),
      ];
      if (isAdmin) {
        reqs.push(api.fetch("/lookups/counterparties"));
      }
      const [rCounterparties, rSessions, rAudit, rRoles] = await Promise.all(reqs.slice(0, 4));
      if (!rCounterparties.ok || !rSessions.ok || !rAudit.ok || !rRoles.ok) {
        throw new Error("profile_load_failed");
      }
      const cpRows = (await rCounterparties.json()) as CounterpartyRow[];
      setCounterparties(cpRows);
      setSessions((await rSessions.json()) as SessionRow[]);
      setAuditRows((await rAudit.json()) as AuditRow[]);
      const roleRows = (await rRoles.json()) as RoleRow[];
      setRoles(roleRows);
      setCRole((prev) => (roleRows.some((x) => x.role_code === prev) ? prev : roleRows[0]?.role_code ?? "viewer"));

      if (account?.counterparty_uuid) {
        const found = cpRows.find((x) => x.uuid === account.counterparty_uuid);
        setCounterpartyName(found?.name_ru ?? null);
      } else {
        setCounterpartyName(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "profile_load_failed");
    }
  }, [account?.counterparty_uuid, isAdmin]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    if (nw !== nw2) {
      setErr("Новый пароль и подтверждение не совпадают.");
      return;
    }
    setPwdBusy(true);
    try {
      await api.changePassword(cur, nw);
      await api.logoutRemote();
      api.deleteToken();
      nav("/login", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "password_change_failed");
    } finally {
      setPwdBusy(false);
    }
  }

  async function revokeSession(jti: string) {
    const r = await api.fetch("/auth/sessions/revoke", { method: "POST", body: JSON.stringify({ jti }) });
    if (!r.ok) {
      setErr(await api.readApiError(r));
      return;
    }
    setOk("Сессия отозвана.");
    await loadProfileData();
  }

  async function revokeOtherSessions() {
    if (!currentRefreshJti) {
      setErr("Не удалось определить текущую сессию.");
      return;
    }
    const r = await api.fetch("/auth/sessions/revoke-others", {
      method: "POST",
      body: JSON.stringify({ jti: currentRefreshJti }),
    });
    if (!r.ok) {
      setErr(await api.readApiError(r));
      return;
    }
    setOk("Остальные сессии завершены.");
    await refresh();
    await loadProfileData();
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setErr(null);
    setOk(null);
    setCreateBusy(true);
    const r = await api.fetch("/admin/accounts", {
      method: "POST",
      body: JSON.stringify({
        login: cLogin.trim(),
        password: cPassword,
        role_code: cRole,
        first_name: cFirst.trim(),
        last_name: cLast.trim(),
        email: cEmail.trim() || null,
        counterparty_uuid: cCounterpartyUuid || null,
      }),
    });
    if (!r.ok) {
      setErr(await api.readApiError(r));
    } else {
      setOk("Пользователь создан.");
      setCLogin("");
      setCPassword("");
      setCFirst("");
      setCLast("");
      setCEmail("");
      setCCounterpartyUuid("");
      await loadProfileData();
    }
    setCreateBusy(false);
  }

  if (!account) {
    return (
      <section className="card page">
        <h1>Профиль</h1>
        <p>Загрузка...</p>
      </section>
    );
  }

  return (
    <section className="card page page-wide profile-page">
      <h1>Персональные настройки</h1>
      <p className="muted">Профиль, безопасность, активные сессии и регистрация пользователей.</p>
      {err ? <p className="form-error">{err}</p> : null}
      {ok ? <p className="muted">{ok}</p> : null}

      <div className="profile-grid">
        <section className="profile-panel">
          <h2>Профиль</h2>
          <dl className="def-list">
            <div><dt>ФИО</dt><dd>{account.last_name} {account.first_name} {account.middle_name || ""}</dd></div>
            <div><dt>Логин</dt><dd>{account.login}</dd></div>
            <div><dt>Роль</dt><dd>{account.role_code}</dd></div>
            <div><dt>Email</dt><dd>{account.email || "-"}</dd></div>
            <div><dt>Компания</dt><dd>{counterpartyName || "-"}</dd></div>
          </dl>
        </section>

        <section className="profile-panel">
          <h2>Смена пароля</h2>
          <form className="form" onSubmit={submitPassword}>
            <div className="form-field">
              <label htmlFor="cur">Текущий пароль</label>
              <input id="cur" type="password" className="input" value={cur} onChange={(e) => setCur(e.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="newp">Новый пароль</label>
              <input id="newp" type="password" className="input" value={nw} onChange={(e) => setNw(e.target.value)} required minLength={8} />
            </div>
            <div className="form-field">
              <label htmlFor="newp2">Повтор нового пароля</label>
              <input id="newp2" type="password" className="input" value={nw2} onChange={(e) => setNw2(e.target.value)} required minLength={8} />
            </div>
            <button type="submit" className="btn-primary" disabled={pwdBusy}>{pwdBusy ? "Сохранение..." : "Сменить пароль"}</button>
          </form>
        </section>
      </div>

      <section className="profile-panel" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Активные сессии</h2>
          <button type="button" className="btn-ghost" onClick={() => void revokeOtherSessions()}>Завершить все кроме текущей</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Создана</th>
                <th>Действует до</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const isCurrent = s.jti === currentRefreshJti;
                return (
                  <tr key={s.jti}>
                    <td>{new Date(s.created_at).toLocaleString()}</td>
                    <td>{new Date(s.expires_at).toLocaleString()}</td>
                    <td>{s.revoked_at ? "Отозвана" : isCurrent ? "Текущая" : "Активна"}</td>
                    <td>
                      {!s.revoked_at && !isCurrent ? (
                        <button type="button" className="nav-link" onClick={() => void revokeSession(s.jti)}>Завершить</button>
                      ) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin ? (
        <section className="profile-panel" style={{ marginTop: 16 }}>
          <h2>Регистрация пользователя (accounts)</h2>
          <form className="form" onSubmit={createAccount}>
            <div className="filters">
              <div className="form-field"><label htmlFor="al">Логин</label><input id="al" className="input" value={cLogin} onChange={(e) => setCLogin(e.target.value)} required /></div>
              <div className="form-field"><label htmlFor="ap">Пароль</label><input id="ap" className="input" type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} required minLength={8} /></div>
              <div className="form-field"><label htmlFor="af">Имя</label><input id="af" className="input" value={cFirst} onChange={(e) => setCFirst(e.target.value)} required /></div>
              <div className="form-field"><label htmlFor="aln">Фамилия</label><input id="aln" className="input" value={cLast} onChange={(e) => setCLast(e.target.value)} required /></div>
              <div className="form-field"><label htmlFor="ar">Роль</label><select id="ar" className="input" value={cRole} onChange={(e) => setCRole(e.target.value)}>{roles.map((r) => <option key={r.role_code} value={r.role_code}>{r.role_code}</option>)}</select></div>
              <div className="form-field"><label htmlFor="ae">Email</label><input id="ae" className="input" type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} /></div>
              <div className="form-field"><label htmlFor="acp">Компания</label><select id="acp" className="input" value={cCounterpartyUuid} onChange={(e) => setCCounterpartyUuid(e.target.value)}><option value="">-</option>{counterparties.map((c) => <option key={c.uuid} value={c.uuid}>{c.name_ru}</option>)}</select></div>
              <button type="submit" className="btn-primary" disabled={createBusy}>{createBusy ? "Создание..." : "Создать пользователя"}</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="profile-panel" style={{ marginTop: 16 }}>
        <h2>Логирование создания пользователей</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Когда</th><th>Действие</th><th>Тип</th><th>ID сущности</th></tr></thead>
            <tbody>
              {auditRows
                .filter((x) => x.action === "account_create")
                .map((row) => (
                  <tr key={row.uuid}>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>{row.action}</td>
                    <td>{row.event_type}</td>
                    <td><code>{row.entity_uuid}</code></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
