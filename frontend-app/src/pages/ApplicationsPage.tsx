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

  const loadStatuses = useCallback(async () => {
    const r = await api.fetch("/lookups/statuses");
    if (r.ok) {
      setStatuses((await r.json()) as StatusRow[]);
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
  }, [loadStatuses]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  return (
    <section className="card page page-wide">
      <h1>Заявки</h1>
      <p>
        <button type="button" className="btn-primary" title="Открыть форму новой заявки" onClick={() => nav("/applications/new")}>
          Создать заявку
        </button>
      </p>
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
                      <Link to={`/applications/${row.uuid}`} className="nav-link" title="Открыть карточку заявки">
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
          <button type="button" className="btn-ghost" title="Предыдущая страница" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </button>
          <span className="muted" style={{ margin: "0 8px" }}>
            {page}
          </span>
          <button
            type="button"
            className="btn-ghost"
            title="Следующая страница"
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
