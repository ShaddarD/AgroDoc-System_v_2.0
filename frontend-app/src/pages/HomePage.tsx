import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type HomeVariant = "classic" | "table";
type AppRow = {
  uuid: string;
  status_code: string;
  stuffing_act_uuid: string | null;
  master_application_uuid: string | null;
  applicant_counterparty_uuid: string | null;
  assigned_to: string | null;
  product_uuid: string | null;
  container_count_snapshot: number | null;
  places_snapshot: number | null;
  terminal_uuid: string | null;
  izveshenie: string | null;
  fss_plan_issue_date: string | null;
  fss_number: string | null;
  fss_issue_date: string | null;
  bill_of_lading_number: string | null;
  bill_of_lading_date: string | null;
  notes_in_table: string | null;
};
type CounterpartyRow = { uuid: string; name_ru: string };
type ProductRow = { uuid: string; product_name_ru: string };
type TerminalRow = { uuid: string; terminal_name: string };
type ManagerRow = { uuid: string; first_name: string; last_name: string; role_code: string; is_active: boolean };

const HOME_VARIANT_KEY = "agrodoc_home_variant";

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const [variant, setVariant] = useState<HomeVariant>("classic");
  const [rows, setRows] = useState<AppRow[]>([]);
  const [counterparties, setCounterparties] = useState<CounterpartyRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [terminals, setTerminals] = useState<TerminalRow[]>([]);
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(HOME_VARIANT_KEY) : null;
    if (stored === "classic" || stored === "table") {
      setVariant(stored);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (variant !== "table" || !isAuthenticated) {
      return;
    }
    void (async () => {
      setLoadError(null);
      const [rApps, rCounterparties, rProducts, rTerminals, rManagers] = await Promise.all([
        api.fetch("/applications?page=1&page_size=100"),
        api.fetch("/lookups/counterparties"),
        api.fetch("/lookups/products"),
        api.fetch("/lookups/terminals"),
        api.fetch("/admin/accounts?limit=500"),
      ]);
      if (!rApps.ok || !rCounterparties.ok || !rProducts.ok || !rTerminals.ok) {
        if (!cancelled) setLoadError("Не удалось загрузить табличные данные.");
        return;
      }
      const appData = (await rApps.json()) as { items: AppRow[] };
      if (cancelled) return;
      setRows(appData.items || []);
      setCounterparties((await rCounterparties.json()) as CounterpartyRow[]);
      setProducts((await rProducts.json()) as ProductRow[]);
      setTerminals((await rTerminals.json()) as TerminalRow[]);
      if (rManagers.ok) {
        const all = (await rManagers.json()) as ManagerRow[];
        setManagers(all.filter((x) => x.is_active));
      } else {
        setManagers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variant, isAuthenticated]);

  const cpMap = useMemo(() => new Map(counterparties.map((x) => [x.uuid, x.name_ru])), [counterparties]);
  const productMap = useMemo(() => new Map(products.map((x) => [x.uuid, x.product_name_ru])), [products]);
  const terminalMap = useMemo(() => new Map(terminals.map((x) => [x.uuid, x.terminal_name])), [terminals]);
  function updateVariant(next: HomeVariant) {
    setVariant(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(HOME_VARIANT_KEY, next);
    }
  }

  async function patchRow(rowUuid: string, patch: Partial<AppRow>, cellKey: string) {
    setSaveError(null);
    setSavingCellKey(cellKey);
    const prevRows = rows;
    setRows((current) => current.map((r) => (r.uuid === rowUuid ? { ...r, ...patch } : r)));
    const r = await api.fetch(`/applications/${rowUuid}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      setRows(prevRows);
      setSaveError(await api.readApiError(r));
    }
    setSavingCellKey(null);
  }

  const action = isAuthenticated ? (
    <Link to="/applications" className="btn-primary">
      Перейти к заявкам
    </Link>
  ) : (
    <p>
      <Link to="/login" className="btn-primary">
        Войти
      </Link>
    </p>
  );

  return (
    <section className="card page page-wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Главная</h1>
        <div className="tabs" style={{ margin: 0 }}>
          <button type="button" className={`tab ${variant === "classic" ? "tab--on" : ""}`} onClick={() => updateVariant("classic")}>
            Классическая
          </button>
          <button type="button" className={`tab ${variant === "table" ? "tab--on" : ""}`} onClick={() => updateVariant("table")}>
            Табличная
          </button>
        </div>
      </div>

      {variant === "classic" ? (
        <>
          <p>Список заявок, карточка, ревизии и записи аудита — после входа (JWT, bearer).</p>
          {action}
        </>
      ) : (
        <>
          <p className="muted">Табличный реестр заявок c inline-редактированием.</p>
          {loadError ? <p className="form-error">{loadError}</p> : null}
          {saveError ? <p className="form-error">{saveError}</p> : null}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>№ Акта</th>
                  <th>№ Мастер-Акта</th>
                  <th>Клиент</th>
                  <th>Менеджер</th>
                  <th>Культура</th>
                  <th>Кол-во</th>
                  <th>Вес</th>
                  <th>POD</th>
                  <th>Терминал</th>
                  <th>Карантинки</th>
                  <th>Дата выдачи ФСС(план)</th>
                  <th>Номер ФСС</th>
                  <th>Дата ФСС</th>
                  <th>Номер коносамента</th>
                  <th>Дата коносамента</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.uuid}>
                    <td>{row.stuffing_act_uuid || "-"}</td>
                    <td>{row.master_application_uuid || "-"}</td>
                    <td>{(row.applicant_counterparty_uuid && cpMap.get(row.applicant_counterparty_uuid)) || "-"}</td>
                    <td>
                      <select
                        className="input"
                        title="Выберите менеджера"
                        value={row.assigned_to || ""}
                        onChange={(e) => void patchRow(row.uuid, { assigned_to: e.target.value || null }, `${row.uuid}:assigned_to`)}
                      >
                        <option value="">—</option>
                        {managers.map((m) => (
                          <option key={m.uuid} value={m.uuid}>
                            {m.last_name} {m.first_name} ({m.role_code})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{(row.product_uuid && productMap.get(row.product_uuid)) || "-"}</td>
                    <td>{row.container_count_snapshot ?? "-"}</td>
                    <td>{row.places_snapshot ?? "-"}</td>
                    <td>{row.uuid}</td>
                    <td>{(row.terminal_uuid && terminalMap.get(row.terminal_uuid)) || "-"}</td>
                    <td>
                      <input
                        className="input"
                        title="Карантинки (извещение)"
                        defaultValue={row.izveshenie || ""}
                        onBlur={(e) => {
                          const next = e.target.value.trim() || null;
                          if (next !== (row.izveshenie || null)) {
                            void patchRow(row.uuid, { izveshenie: next }, `${row.uuid}:izveshenie`);
                          }
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        title="Дата выдачи ФСС(план)"
                        type="date"
                        value={row.fss_plan_issue_date || ""}
                        onChange={(e) => {
                          const next = e.target.value || null;
                          void patchRow(row.uuid, { fss_plan_issue_date: next }, `${row.uuid}:fss`);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        title="Номер ФСС"
                        defaultValue={row.fss_number || ""}
                        onBlur={(e) => {
                          const next = e.target.value.trim() || null;
                          if (next !== (row.fss_number || null)) {
                            void patchRow(row.uuid, { fss_number: next }, `${row.uuid}:fss-number`);
                          }
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        title="Дата ФСС"
                        type="date"
                        value={row.fss_issue_date || ""}
                        onChange={(e) => {
                          const next = e.target.value || null;
                          void patchRow(row.uuid, { fss_issue_date: next }, `${row.uuid}:fss-date`);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        title="Номер коносамента"
                        defaultValue={row.bill_of_lading_number || ""}
                        onBlur={(e) => {
                          const next = e.target.value.trim() || null;
                          if (next !== (row.bill_of_lading_number || null)) {
                            void patchRow(row.uuid, { bill_of_lading_number: next }, `${row.uuid}:bill-number`);
                          }
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        title="Дата коносамента"
                        type="date"
                        value={row.bill_of_lading_date || ""}
                        onChange={(e) => {
                          const next = e.target.value || null;
                          void patchRow(row.uuid, { bill_of_lading_date: next }, `${row.uuid}:bill-date`);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        title="Комментарий в таблице"
                        defaultValue={row.notes_in_table || ""}
                        onBlur={(e) => {
                          const next = e.target.value.trim() || null;
                          if (next !== (row.notes_in_table || null)) {
                            void patchRow(row.uuid, { notes_in_table: next }, `${row.uuid}:notes`);
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={16} className="muted">
                      Нет данных.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {savingCellKey ? <p className="muted">Сохранение изменений…</p> : null}
          {action}
        </>
      )}
    </section>
  );
}