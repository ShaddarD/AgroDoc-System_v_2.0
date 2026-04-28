import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type AppRow = {
  uuid: string;
  status_code: string;
  source_type: string;
  current_revision_uuid: string | null;
  created_at: string;
  updated_at: string;
};

type ListBody = { items: AppRow[]; total: number; page: number; page_size: number };

type StatusRow = { status_code: string; description: string };
type CodeRow = { code: string; description: string };

export function ApplicationsPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<AppRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusCode, setStatusCode] = useState("");
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<CodeRow[]>([]);
  const [newSource, setNewSource] = useState("manual");
  const [payloadText, setPayloadText] = useState("{}");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadStatuses = useCallback(async () => {
    const r = await api.fetch("/lookups/statuses");
    if (r.ok) {
      setStatuses((await r.json()) as StatusRow[]);
    }
  }, []);

  const loadSources = useCallback(async () => {
    const r = await api.fetch("/lookups/source-types");
    if (r.ok) {
      const j = (await r.json()) as CodeRow[];
      setSources(j);
      if (j.length > 0) {
        setNewSource((prev) => (j.some((x) => x.code === prev) ? prev : j[0].code));
      }
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("page_size", String(pageSize));
    if (statusCode) {
      q.set("status_code", statusCode);
    }
    const r = await api.fetch(`/applications?${q.toString()}`);
    if (!r.ok) {
      setError(await api.readApiError(r));
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const body = (await r.json()) as ListBody;
    setRows(body.items);
    setTotal(body.total);
    setLoading(false);
  }, [page, pageSize, statusCode]);

  useEffect(() => {
    void loadStatuses();
    void loadSources();
  }, [loadStatuses, loadSources]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function createApplication(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    let payload: Record<string, unknown> = {};
    if (payloadText.trim()) {
      try {
        payload = JSON.parse(payloadText) as Record<string, unknown>;
      } catch {
        setCreateErr("Некорректный JSON в поле «данные»");
        return;
      }
    }
    setCreating(true);
    const r = await api.fetch("/applications", {
      method: "POST",
      body: JSON.stringify({ source_type: newSource, payload }),
    });
    if (!r.ok) {
      setCreateErr(await api.readApiError(r));
    } else {
      const b = (await r.json()) as { uuid: string };
      void loadList();
      nav(`/applications/${b.uuid}`);
    }
    setCreating(false);
  }

  return (
    <section className="card page page-wide">
      <h1>Заявки</h1>
      <section className="card" style={{ marginBottom: 20, padding: 16 }}>
        <h2 style={{ fontSize: "1.1rem", margin: "0 0 8px" }}>Новая заявка</h2>
        <form className="form" onSubmit={createApplication} style={{ gap: 12 }}>
          <div className="form-field" style={{ maxWidth: 320 }}>
            <label htmlFor="src">Тип источника</label>
            <select
              id="src"
              className="input"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
            >
              {sources.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.description}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="pj">Данные (JSON)</label>
            <textarea
              id="pj"
              className="input"
              style={{ minHeight: 100, width: "100%" }}
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
            />
          </div>
          {createErr ? <p className="form-error">{createErr}</p> : null}
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? "Создание…" : "Создать"}
          </button>
        </form>
      </section>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <div className="form-field form-field--inline">
          <label htmlFor="f-status">Статус</label>
          <select
            id="f-status"
            className="input"
            value={statusCode}
            onChange={(e) => {
              setStatusCode(e.target.value);
              setPage(1);
            }}
          >
            <option value="">— любой —</option>
            {statuses.map((s) => (
              <option key={s.status_code} value={s.status_code}>
                {s.status_code} ({s.description})
              </option>
            ))}
          </select>
        </div>
        <div className="form-field form-field--inline muted">
          Всего: {total}, страница {page}
        </div>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>Загрузка…</p> : null}
      {!loading && !error && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Статус</th>
                <th>Источник</th>
                <th>Создана</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    Нет записей
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.uuid}>
                    <td>
                      <code>{row.status_code}</code>
                    </td>
                    <td>{row.source_type}</td>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>
                      <Link to={`/applications/${row.uuid}`} className="nav-link">
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {total > pageSize ? (
        <p className="form-footer">
          <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </button>
          <span className="muted" style={{ margin: "0 8px" }}>
            {page}
          </span>
          <button
            type="button"
            className="btn-ghost"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
          </button>
        </p>
      ) : null}
    </section>
  );
}
