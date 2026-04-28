import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

type Row = {
  uuid: string;
  action: string;
  event_type: string;
  entity_type: string;
  entity_uuid: string;
  created_at: string;
  old_data: unknown;
  new_data: unknown;
};

const ENTITY_OPTIONS = [
  { value: "", label: "Все" },
  { value: "application", label: "application" },
  { value: "account", label: "account" },
  { value: "lookup_role_codes", label: "lookup_role_codes" },
];

export function AuditPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const q = new URLSearchParams();
    q.set("limit", "100");
    if (entityType) {
      q.set("entity_type", entityType);
    }
    const r = await api.fetch(`/audit-logs?${q.toString()}`);
    if (!r.ok) {
      setErr(await api.readApiError(r));
      setRows([]);
    } else {
      setRows((await r.json()) as Row[]);
    }
    setLoading(false);
  }, [entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="card page">
      <h1>Журнал аудита</h1>
      <p className="muted">Записи `audit_logs`, последние 100, убывание по времени.</p>
      <div className="form-field" style={{ marginBottom: 12, maxWidth: 280 }}>
        <label htmlFor="ent">Сущность</label>
        <select
          id="ent"
          className="input"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
          }}
        >
          {ENTITY_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {err ? <p className="form-error">Ошибка: {err}</p> : null}
      {loading ? <p>Загрузка…</p> : null}
      {!loading && !err ? (
        <div className="table-wrap">
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Когда</th>
                <th>Действие</th>
                <th>Тип</th>
                <th>Сущность</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Пусто
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.uuid}>
                    <td>{new Date(a.created_at).toLocaleString()}</td>
                    <td>{a.action}</td>
                    <td>{a.event_type}</td>
                    <td>{a.entity_type}</td>
                    <td>
                      <code style={{ fontSize: 11 }}>{a.entity_uuid}</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
