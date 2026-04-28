import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

type RoleRow = { role_code: string; description: string; sort_order: number };
type StatusRow = { status_code: string; description: string };
type CodeRow = { code: string; description: string };
type CounterpartyRow = {
  uuid: string;
  name_ru: string;
  inn: string | null;
  kpp: string | null;
  status_code: string;
  is_active: boolean;
};

type Tab = "roles" | "statuses" | "source" | "files" | "counterparties";

export function LookupsPage() {
  const { account } = useAuth();
  const isAdmin = account?.role_code === "admin";
  const [tab, setTab] = useState<Tab>("counterparties");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [sourceTypes, setSourceTypes] = useState<CodeRow[]>([]);
  const [fileTypes, setFileTypes] = useState<CodeRow[]>([]);
  const [counterparties, setCounterparties] = useState<CounterpartyRow[]>([]);

  const [cName, setCName] = useState("");
  const [cInn, setCInn] = useState("");
  const [cKpp, setCKpp] = useState("");
  const [cSaving, setCSaving] = useState(false);
  const [cEditId, setCEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [rRoles, rStatuses, rSource, rFiles, rCounterparties] = await Promise.all([
        api.fetch("/lookups/roles"),
        api.fetch("/lookups/statuses"),
        api.fetch("/lookups/source-types"),
        api.fetch("/lookups/file-types"),
        api.fetch("/lookups/counterparties"),
      ]);
      if (!rRoles.ok || !rStatuses.ok || !rSource.ok || !rFiles.ok || !rCounterparties.ok) {
        throw new Error("load_failed");
      }
      setRoles((await rRoles.json()) as RoleRow[]);
      setStatuses((await rStatuses.json()) as StatusRow[]);
      setSourceTypes((await rSource.json()) as CodeRow[]);
      setFileTypes((await rFiles.json()) as CodeRow[]);
      setCounterparties((await rCounterparties.json()) as CounterpartyRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCounterparty(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      return;
    }
    setCSaving(true);
    setError(null);
    const payload = {
      name_ru: cName.trim(),
      inn: cInn.trim() || null,
      kpp: cKpp.trim() || null,
      status_code: "active",
      is_active: true,
    };
    const r = cEditId
      ? await api.fetch(`/lookups/counterparties/${cEditId}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await api.fetch("/lookups/counterparties", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) {
      setError(await api.readApiError(r));
      setCSaving(false);
      return;
    }
    setCName("");
    setCInn("");
    setCKpp("");
    setCEditId(null);
    await load();
    setCSaving(false);
  }

  async function removeCounterparty(row: CounterpartyRow) {
    if (!isAdmin) {
      return;
    }
    const r = await api.fetch(`/lookups/counterparties/${row.uuid}`, { method: "DELETE" });
    if (!r.ok) {
      setError(await api.readApiError(r));
      return;
    }
    await load();
  }

  return (
    <section className="card page page-wide">
      <h1>Справочники</h1>
      <p className="muted">Данные справочников и контрагентов. CRUD доступен только администратору.</p>
      <div className="tabs">
        <button type="button" className={`tab ${tab === "counterparties" ? "tab--on" : ""}`} onClick={() => setTab("counterparties")}>
          Контрагенты
        </button>
        <button type="button" className={`tab ${tab === "roles" ? "tab--on" : ""}`} onClick={() => setTab("roles")}>
          Роли
        </button>
        <button type="button" className={`tab ${tab === "statuses" ? "tab--on" : ""}`} onClick={() => setTab("statuses")}>
          Статусы
        </button>
        <button type="button" className={`tab ${tab === "source" ? "tab--on" : ""}`} onClick={() => setTab("source")}>
          Источники
        </button>
        <button type="button" className={`tab ${tab === "files" ? "tab--on" : ""}`} onClick={() => setTab("files")}>
          Типы файлов
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>Загрузка...</p> : null}

      {!loading && tab === "counterparties" ? (
        <>
          {isAdmin ? (
            <form className="form" style={{ maxWidth: 720 }} onSubmit={saveCounterparty}>
              <h2>{cEditId ? "Редактирование контрагента" : "Новый контрагент"}</h2>
              <div className="filters">
                <div className="form-field">
                  <label htmlFor="cp-name">Название (RU)</label>
                  <input id="cp-name" className="input" value={cName} onChange={(e) => setCName(e.target.value)} required />
                </div>
                <div className="form-field">
                  <label htmlFor="cp-inn">ИНН</label>
                  <input id="cp-inn" className="input" value={cInn} onChange={(e) => setCInn(e.target.value)} />
                </div>
                <div className="form-field">
                  <label htmlFor="cp-kpp">КПП</label>
                  <input id="cp-kpp" className="input" value={cKpp} onChange={(e) => setCKpp(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary" disabled={cSaving}>
                  {cSaving ? "Сохранение..." : cEditId ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          ) : null}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>ИНН</th>
                  <th>КПП</th>
                  <th>Статус</th>
                  <th>Активен</th>
                  {isAdmin ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {counterparties.map((row) => (
                  <tr key={row.uuid}>
                    <td>{row.name_ru}</td>
                    <td>{row.inn || "-"}</td>
                    <td>{row.kpp || "-"}</td>
                    <td>{row.status_code}</td>
                    <td>{row.is_active ? "да" : "нет"}</td>
                    {isAdmin ? (
                      <td>
                        <button
                          type="button"
                          className="nav-link"
                          onClick={() => {
                            setCEditId(row.uuid);
                            setCName(row.name_ru);
                            setCInn(row.inn || "");
                            setCKpp(row.kpp || "");
                          }}
                        >
                          Изменить
                        </button>
                        <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => void removeCounterparty(row)}>
                          Деактивировать
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {!loading && tab === "roles" ? (
        <ul>{roles.map((r) => <li key={r.role_code}>{r.role_code} - {r.description}</li>)}</ul>
      ) : null}
      {!loading && tab === "statuses" ? (
        <ul>{statuses.map((r) => <li key={r.status_code}>{r.status_code} - {r.description}</li>)}</ul>
      ) : null}
      {!loading && tab === "source" ? (
        <ul>{sourceTypes.map((r) => <li key={r.code}>{r.code} - {r.description}</li>)}</ul>
      ) : null}
      {!loading && tab === "files" ? (
        <ul>{fileTypes.map((r) => <li key={r.code}>{r.code} - {r.description}</li>)}</ul>
      ) : null}
    </section>
  );
}
