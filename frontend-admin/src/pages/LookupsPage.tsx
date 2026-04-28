import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

type RoleRow = { role_code: string; description: string; sort_order: number };
type StatusRow = { status_code: string; description: string };

export function LookupsPage() {
  const { account } = useAuth();
  const isAdmin = account?.role_code === "admin";
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOrder, setNewOrder] = useState("100");
  const [posting, setPosting] = useState(false);
  const [postErr, setPostErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, s] = await Promise.all([api.fetch("/lookups/roles"), api.fetch("/lookups/statuses")]);
      if (!r.ok || !s.ok) {
        throw new Error(`HTTP ${r.status} / ${s.status}`);
      }
      setRoles((await r.json()) as RoleRow[]);
      setStatuses((await s.json()) as StatusRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRole(e: React.FormEvent) {
    e.preventDefault();
    setPostErr(null);
    setPosting(true);
    const body = { role_code: newCode, description: newDesc, sort_order: Number(newOrder) || 100 };
    const r = await api.fetch("/lookups/roles", { method: "POST", body: JSON.stringify(body) });
    if (!r.ok) {
      const t = await r.text();
      setPostErr(t || `Ошибка ${r.status}`);
      setPosting(false);
      return;
    }
    setNewCode("");
    setNewDesc("");
    setNewOrder("100");
    await load();
    setPosting(false);
  }

  return (
    <section className="card page">
      <h1>Справочники</h1>
      {error ? <p className="form-error">Ошибка загрузки: {error}</p> : null}
      {isAdmin ? (
        <form className="form" style={{ marginBottom: 24, maxWidth: 480 }} onSubmit={addRole}>
          <h2>Новая роль (только admin)</h2>
          <div className="form-field">
            <label htmlFor="rc">Код</label>
            <input id="rc" className="input" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="rd">Описание</label>
            <input id="rd" className="input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="ro">Порядок</label>
            <input
              id="ro"
              className="input"
              type="number"
              value={newOrder}
              onChange={(e) => setNewOrder(e.target.value)}
            />
          </div>
          {postErr ? <p className="form-error">{postErr}</p> : null}
          <button type="submit" className="btn-primary" disabled={posting}>
            {posting ? "…" : "Создать роль"}
          </button>
        </form>
      ) : (
        <p className="muted">Роли создаёт только администратор. Войдите с ролью admin.</p>
      )}
      <h2>Роли</h2>
      <ul>
        {roles.map((row) => (
          <li key={row.role_code}>
            <strong>{row.role_code}</strong> — {row.description}
          </li>
        ))}
      </ul>
      <h2>Статусы заявок</h2>
      <ul>
        {statuses.map((row) => (
          <li key={row.status_code}>
            <strong>{row.status_code}</strong> — {row.description}
          </li>
        ))}
      </ul>
    </section>
  );
}
