import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { downloadFileByUuid } from "../lib/download";
import { diffJsonObject } from "../lib/revisionDiff";

const LIST_PAGE_SIZE = 15;

type AppView = {
  uuid: string;
  status_code: string;
  source_type: string;
  current_revision_uuid: string | null;
  created_at: string;
  updated_at: string;
};

type RevRow = {
  uuid: string;
  version: number;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

type AuditRow = {
  uuid: string;
  action: string;
  event_type: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

type FileRow = {
  uuid: string;
  file_name: string;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type StatusRow = { status_code: string; description: string };
type FileTypeRow = { code: string; description: string };

type Tab = "revisions" | "audit" | "files";

type Paged<T> = { items: T[]; total: number; page: number; page_size: number };

export function ApplicationDetailPage() {
  const { id = "" } = useParams();
  const [app, setApp] = useState<AppView | null>(null);
  const [revs, setRevs] = useState<RevRow[]>([]);
  const [revTotal, setRevTotal] = useState(0);
  const [revPage, setRevPage] = useState(1);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [fileTypes, setFileTypes] = useState<FileTypeRow[]>([]);
  const [tab, setTab] = useState<Tab>("revisions");
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [comment, setComment] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [upFile, setUpFile] = useState<File | null>(null);
  const [upType, setUpType] = useState("");
  const [upMsg, setUpMsg] = useState<string | null>(null);
  const [upBusy, setUpBusy] = useState(false);
  const [openDiff, setOpenDiff] = useState<Record<number, boolean>>({});
  const [diffPairs, setDiffPairs] = useState<
    Record<number, { previous: RevRow | null; current: RevRow } | undefined>
  >({});
  const [allowedTargets, setAllowedTargets] = useState<string[]>([]);

  const loadRevisions = useCallback(async () => {
    if (!id) {
      return;
    }
    const q = new URLSearchParams({
      page: String(revPage),
      page_size: String(LIST_PAGE_SIZE),
    });
    const rv = await api.fetch(`/applications/${id}/revisions?${q.toString()}`);
    if (rv.ok) {
      const body = (await rv.json()) as Paged<RevRow>;
      setRevs(body.items);
      setRevTotal(body.total);
    }
  }, [id, revPage]);

  const loadAudits = useCallback(async () => {
    if (!id) {
      return;
    }
    const q = new URLSearchParams({
      page: String(auditPage),
      page_size: String(LIST_PAGE_SIZE),
    });
    const ad = await api.fetch(`/applications/${id}/audit-logs?${q.toString()}`);
    if (ad.ok) {
      const body = (await ad.json()) as Paged<AuditRow>;
      setAudits(body.items);
      setAuditTotal(body.total);
    }
  }, [id, auditPage]);

  const loadCore = useCallback(async () => {
    if (!id) {
      return;
    }
    setError(null);
    const [ar, st, ft, fl, al] = await Promise.all([
      api.fetch(`/applications/${id}`),
      api.fetch("/lookups/statuses"),
      api.fetch("/lookups/file-types"),
      api.fetch(`/files?entity_type=application&entity_uuid=${id}`),
      api.fetch(`/applications/${id}/allowed-status-targets`),
    ]);
    if (!ar.ok) {
      throw new Error(String(ar.status));
    }
    setApp((await ar.json()) as AppView);
    if (st.ok) {
      setStatuses((await st.json()) as StatusRow[]);
    }
    if (ft.ok) {
      setFileTypes((await ft.json()) as FileTypeRow[]);
    }
    if (fl.ok) {
      setFiles((await fl.json()) as FileRow[]);
    }
    if (al.ok) {
      const targets = (await al.json()) as string[];
      setAllowedTargets(targets);
      setNewStatus((prev) => (prev && targets.includes(prev) ? prev : ""));
    } else {
      setAllowedTargets([]);
      setNewStatus("");
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    setRevPage(1);
    setAuditPage(1);
    setOpenDiff({});
    setDiffPairs({});
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    let c = false;
    void (async () => {
      try {
        await loadCore();
      } catch {
        if (!c) {
          setError("Не удалось загрузить заявку");
        }
      }
    })();
    return () => {
      c = true;
    };
  }, [id, loadCore]);

  useEffect(() => {
    if (!id || !app) {
      return;
    }
    void loadRevisions();
  }, [id, app, loadRevisions]);

  useEffect(() => {
    if (!id || !app) {
      return;
    }
    void loadAudits();
  }, [id, app, loadAudits]);

  const reload = useCallback(async () => {
    if (!id) {
      return;
    }
    try {
      const fl = await api.fetch(`/files?entity_type=application&entity_uuid=${id}`);
      if (fl.ok) {
        setFiles((await fl.json()) as FileRow[]);
      }
    } catch {
      /* empty */
    }
  }, [id]);

  const statusLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of statuses) {
      m.set(s.status_code, s.description || s.status_code);
    }
    return m;
  }, [statuses]);

  async function submitStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newStatus) {
      return;
    }
    setStatusMsg(null);
    setSaving(true);
    const r = await api.fetch(`/applications/${id}/change-status`, {
      method: "POST",
      body: JSON.stringify({ new_status: newStatus, comment: comment || null }),
    });
    if (!r.ok) {
      setStatusMsg(await api.readApiError(r));
    } else {
      setStatusMsg("Статус обновлён");
      setComment("");
      void loadCore();
      void loadRevisions();
      void loadAudits();
    }
    setSaving(false);
  }

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !upFile || !upType) {
      setUpMsg("Выберите тип и файл");
      return;
    }
    setUpMsg(null);
    setUpBusy(true);
    const fd = new FormData();
    fd.set("entity_type", "application");
    fd.set("entity_uuid", id);
    fd.set("file_type", upType);
    fd.set("file", upFile, upFile.name);
    const r = await api.fetch("/files", { method: "POST", body: fd });
    if (!r.ok) {
      setUpMsg(await api.readApiError(r));
    } else {
      setUpFile(null);
      setUpType("");
      void reload();
    }
    setUpBusy(false);
  }

  async function toggleDiffRow(r: RevRow) {
    const open = openDiff[r.version] === true;
    if (open) {
      setOpenDiff((o) => ({ ...o, [r.version]: false }));
      return;
    }
    const res = await api.fetch(`/applications/${id}/revisions/adjacent/${r.version}`);
    if (!res.ok) {
      return;
    }
    const j = (await res.json()) as { current: RevRow; previous: RevRow | null };
    setDiffPairs((p) => ({ ...p, [r.version]: { current: j.current, previous: j.previous } }));
    setOpenDiff((o) => ({ ...o, [r.version]: true }));
  }

  if (error) {
    return (
      <section className="card page page-wide">
        <p className="form-error">{error}</p>
        <Link to="/applications" className="nav-link" title="Вернуться к списку заявок">
          К списку
        </Link>
      </section>
    );
  }
  if (!app) {
    return (
      <section className="card page">
        <p>Загрузка…</p>
      </section>
    );
  }

  const revPages = Math.max(1, Math.ceil(revTotal / LIST_PAGE_SIZE));
  const auditPages = Math.max(1, Math.ceil(auditTotal / LIST_PAGE_SIZE));

  return (
    <section className="card page page-wide">
      <p>
        <Link to="/applications" className="nav-link" title="Вернуться к списку заявок">
          ← к списку
        </Link>
      </p>
      <h1>Заявка</h1>
      <dl className="def-list">
        <div>
          <dt>ID</dt>
          <dd>
            <code>{app.uuid}</code>
          </dd>
        </div>
        <div>
          <dt>Статус</dt>
          <dd>{app.status_code}</dd>
        </div>
        <div>
          <dt>Источник</dt>
          <dd>{app.source_type}</dd>
        </div>
        <div>
          <dt>Обновлена</dt>
          <dd>{new Date(app.updated_at).toLocaleString()}</dd>
        </div>
      </dl>

      <section className="card" style={{ marginTop: 16, padding: 16 }}>
        <h2 style={{ fontSize: "1.1rem", margin: "0 0 8px" }}>Смена статуса</h2>
        <p className="muted">
          В списке только переходы, разрешённые для вашей роли и текущего статуса (итог всё равно проверяется на
          сервере).
        </p>
        {allowedTargets.length === 0 ? (
          <p className="muted" style={{ marginBottom: 8 }}>
            Нет доступных смен статуса с текущего состояния для вашей роли.
          </p>
        ) : null}
        <form className="form" onSubmit={submitStatus} style={{ flexFlow: "row wrap", alignItems: "flex-end" }}>
          <div className="form-field" style={{ flex: "1 1 240px", minWidth: 0 }}>
            <label htmlFor="ns">Новый статус</label>
            <select
              id="ns"
              className="input"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              disabled={allowedTargets.length === 0}
            >
              <option value="">— выберите —</option>
              {allowedTargets.map((code) => (
                <option key={code} value={code}>
                  {code}
                  {statusLabel.get(code) && statusLabel.get(code) !== code ? ` — ${statusLabel.get(code)}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ flex: "2 1 320px", minWidth: 0 }}>
            <label htmlFor="cm">Комментарий</label>
            <input id="cm" className="input" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" title="Применить выбранный статус" disabled={saving || !newStatus}>
            {saving ? "…" : "Применить"}
          </button>
        </form>
        {statusMsg ? <p className="muted" style={{ marginTop: 8 }}>{statusMsg}</p> : null}
      </section>

      <div className="tabs" style={{ marginTop: 20 }}>
        <button type="button" title="Открыть список ревизий" className={tab === "revisions" ? "tab tab--on" : "tab"} onClick={() => setTab("revisions")}>
          Ревизии
        </button>
        <button type="button" title="Открыть аудит заявки" className={tab === "audit" ? "tab tab--on" : "tab"} onClick={() => setTab("audit")}>
          Аудит
        </button>
        <button type="button" title="Открыть вложенные файлы" className={tab === "files" ? "tab tab--on" : "tab"} onClick={() => setTab("files")}>
          Файлы
        </button>
      </div>

      {tab === "revisions" ? (
        <div className="table-wrap">
          {revTotal === 0 ? (
            <p className="empty-hint">Ревизий пока нет.</p>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Когда</th>
                    <th>Данные (фрагмент)</th>
                    <th>С предыд.</th>
                  </tr>
                </thead>
                <tbody>
                  {revs.map((r) => {
                    const pair = diffPairs[r.version];
                    const open = openDiff[r.version] === true;
                    return (
                      <Fragment key={r.uuid}>
                        <tr>
                          <td>{r.version}</td>
                          <td>{new Date(r.created_at).toLocaleString()}</td>
                          <td>
                            <code className="data-snippet">{JSON.stringify(r.data).slice(0, 200)}</code>
                          </td>
                          <td>
                            {r.version > 1 ? (
                              <button type="button" title="Показать сравнение с предыдущей ревизией" className="btn-ghost" onClick={() => void toggleDiffRow(r)}>
                                {open ? "Скрыть" : "Показать"}
                              </button>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                        {open ? (
                          <tr>
                            <td colSpan={4}>
                              {pair?.previous ? (
                                <pre className="diff-block">
                                  {diffJsonObject(
                                    pair.previous.data as Record<string, unknown>,
                                    pair.current.data as Record<string, unknown>,
                                  )}
                                </pre>
                              ) : (
                                <p className="empty-hint">Нет предыдущей ревизии для сравнения.</p>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              <div className="pager">
                <button type="button" className="btn-ghost" title="Предыдущая страница ревизий" disabled={revPage <= 1} onClick={() => setRevPage((p) => p - 1)}>
                  Назад
                </button>
                <span className="muted">
                  Стр. {revPage} из {revPages} · всего {revTotal}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  title="Следующая страница ревизий"
                  disabled={revPage >= revPages}
                  onClick={() => setRevPage((p) => p + 1)}
                >
                  Вперёд
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="table-wrap">
          {auditTotal === 0 ? (
            <p className="empty-hint">Записей аудита по этой заявке нет.</p>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Действие</th>
                    <th>Тип</th>
                    <th>Когда</th>
                    <th>Подробнее</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.uuid}>
                      <td>{a.action}</td>
                      <td>{a.event_type}</td>
                      <td>{new Date(a.created_at).toLocaleString()}</td>
                      <td>
                        <code className="data-snippet">
                          {a.old_data || a.new_data
                            ? JSON.stringify({ from: a.old_data, to: a.new_data }).slice(0, 160)
                            : "—"}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pager">
                <button
                  type="button"
                  className="btn-ghost"
                  title="Предыдущая страница аудита"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => p - 1)}
                >
                  Назад
                </button>
                <span className="muted">
                  Стр. {auditPage} из {auditPages} · всего {auditTotal}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  title="Следующая страница аудита"
                  disabled={auditPage >= auditPages}
                  onClick={() => setAuditPage((p) => p + 1)}
                >
                  Вперёд
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === "files" ? (
        <div>
          <form className="form" style={{ marginBottom: 16, flexFlow: "row wrap", alignItems: "flex-end" }} onSubmit={submitUpload}>
            <div className="form-field" style={{ flex: "1 1 220px", minWidth: 0 }}>
              <label htmlFor="ft">Тип файла</label>
              <select id="ft" className="input" value={upType} onChange={(e) => setUpType(e.target.value)}>
                <option value="">—</option>
                {fileTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="ff">Файл</label>
              <input id="ff" type="file" onChange={(e) => setUpFile(e.target.files?.[0] ?? null)} />
            </div>
            <button type="submit" title="Загрузить выбранный файл" className="btn-primary" disabled={upBusy || !upFile || !upType}>
              {upBusy ? "…" : "Загрузить"}
            </button>
          </form>
          {upMsg ? <p className="form-error">{upMsg}</p> : null}
          {files.length === 0 ? (
            <p className="empty-hint">Файлов нет. Загрузите вложение формой выше.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Тип</th>
                    <th>Размер</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.uuid}>
                      <td>{f.file_name}</td>
                      <td>{f.file_type}</td>
                      <td>{f.size_bytes} B</td>
                      <td>
                        <button
                          type="button"
                          className="nav-link"
                          title="Скачать файл"
                          onClick={async () => {
                            try {
                              await downloadFileByUuid(f.uuid, f.file_name);
                            } catch {
                              setUpMsg("Скачивание не удалось (проверьте сессию).");
                            }
                          }}
                        >
                          Скачать
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
