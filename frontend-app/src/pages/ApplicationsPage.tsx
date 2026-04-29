import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

type AppRow = {
  uuid: string;
  status_code: string;
  application_number: string | null;
  stuffing_act_uuid: string | null;
  exporter_name_ru: string | null;
  importer_name: string | null;
  destination_place_ru: string | null;
  weight_tons: number | null;
  container_count_snapshot: number | null;
  product_uuid: string | null;
  applicant_counterparty_uuid: string | null;
  applicant_account_uuid: string | null;
  created_at: string;
};

type ListBody = { items: AppRow[]; total: number; page: number; page_size: number };
type StatusRow = { status_code: string; description: string };
type CounterpartyRow = { uuid: string; name_ru: string };
type ProductRow = { uuid: string; product_name_ru: string };
type AccountRow = { uuid: string; first_name: string; last_name: string; login: string };
type FilterState = {
  status: string;
  author: string;
  number: string;
  shipper: string;
  consignee: string;
  destination: string;
  weight: string;
  containers: string;
  product: string;
};

const DEFAULT_FILTERS: FilterState = {
  status: "",
  author: "",
  number: "",
  shipper: "",
  consignee: "",
  destination: "",
  weight: "",
  containers: "",
  product: "",
};

export function ApplicationsPage() {
  const nav = useNavigate();
  const { account } = useAuth();
  const [rows, setRows] = useState<AppRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statuses, setStatuses] = useState<StatusRow[]>([]);
  const [counterparties, setCounterparties] = useState<CounterpartyRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [menu, setMenu] = useState<{ x: number; y: number; row: AppRow } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const loadStatuses = useCallback(async () => {
    const [rStatuses, rCounterparties, rProducts, rAccounts] = await Promise.all([
      api.fetch("/lookups/statuses"),
      api.fetch("/lookups/counterparties"),
      api.fetch("/lookups/products"),
      api.fetch("/admin/accounts?limit=500"),
    ]);
    if (rStatuses.ok) {
      setStatuses((await rStatuses.json()) as StatusRow[]);
    }
    if (rCounterparties.ok) {
      setCounterparties((await rCounterparties.json()) as CounterpartyRow[]);
    }
    if (rProducts.ok) {
      setProducts((await rProducts.json()) as ProductRow[]);
    }
    if (rAccounts.ok) {
      setAccounts((await rAccounts.json()) as AccountRow[]);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("page_size", String(200));
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
  }, [page, pageSize]);

  useEffect(() => {
    void loadStatuses();
  }, [loadStatuses]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const statusMap = useMemo(() => new Map(statuses.map((x) => [x.status_code, x.description || x.status_code])), [statuses]);
  const counterpartyMap = useMemo(() => new Map(counterparties.map((x) => [x.uuid, x.name_ru])), [counterparties]);
  const productMap = useMemo(() => new Map(products.map((x) => [x.uuid, x.product_name_ru])), [products]);
  const accountMap = useMemo(() => new Map(accounts.map((x) => [x.uuid, `${x.last_name} ${x.first_name}`.trim() || x.login])), [accounts]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const statusLabel = statusMap.get(row.status_code) || row.status_code;
        const author = (row.applicant_account_uuid && accountMap.get(row.applicant_account_uuid)) || "";
        const shipper = (row.applicant_counterparty_uuid && counterpartyMap.get(row.applicant_counterparty_uuid)) || row.exporter_name_ru || "";
        const product = (row.product_uuid && productMap.get(row.product_uuid)) || "";
        return (
          statusLabel.toLowerCase().includes(filters.status.toLowerCase()) &&
          author.toLowerCase().includes(filters.author.toLowerCase()) &&
          (row.application_number || "").toLowerCase().includes(filters.number.toLowerCase()) &&
          shipper.toLowerCase().includes(filters.shipper.toLowerCase()) &&
          (row.importer_name || "").toLowerCase().includes(filters.consignee.toLowerCase()) &&
          (row.destination_place_ru || "").toLowerCase().includes(filters.destination.toLowerCase()) &&
          String(row.weight_tons ?? "").toLowerCase().includes(filters.weight.toLowerCase()) &&
          String(row.container_count_snapshot ?? "").toLowerCase().includes(filters.containers.toLowerCase()) &&
          product.toLowerCase().includes(filters.product.toLowerCase())
        );
      }),
    [rows, filters, statusMap, accountMap, counterpartyMap, productMap],
  );

  async function submitApplication(row: AppRow) {
    setBusyActionId(row.uuid);
    const r = await api.fetch(`/applications/${row.uuid}/submit`, { method: "POST" });
    if (!r.ok) {
      setError(await api.readApiError(r));
      setBusyActionId(null);
      return;
    }
    await loadList();
    setBusyActionId(null);
  }

  async function copyApplication(row: AppRow) {
    setBusyActionId(row.uuid);
    const revisions = await api.fetch(`/applications/${row.uuid}/revisions?page=1&page_size=1`);
    if (!revisions.ok) {
      setError(await api.readApiError(revisions));
      setBusyActionId(null);
      return;
    }
    const body = (await revisions.json()) as { items: Array<{ data: Record<string, unknown> }> };
    const payload = body.items[0]?.data || {};
    const createResp = await api.fetch("/applications", {
      method: "POST",
      body: JSON.stringify({ source_type: "manual", payload }),
    });
    if (!createResp.ok) {
      setError(await api.readApiError(createResp));
      setBusyActionId(null);
      return;
    }
    await loadList();
    setBusyActionId(null);
  }

  async function deleteAllApplications() {
    if (!window.confirm("Удалить все заявки? Действие необратимо.")) return;
    const r = await api.fetch("/applications", { method: "DELETE" });
    if (!r.ok) {
      setError(await api.readApiError(r));
      return;
    }
    await loadList();
  }

  return (
    <section className="card page page-wide">
      <h1>Заявки</h1>
      <p>
        <button type="button" className="btn-primary" title="Открыть форму новой заявки" onClick={() => nav("/applications/new")}>
          Создать заявку
        </button>
        {account?.role_code === "admin" ? (
          <button type="button" className="btn-ghost" style={{ marginLeft: 8 }} onClick={() => void deleteAllApplications()}>
            Удалить все заявки
          </button>
        ) : null}
      </p>
      <div className="form-field form-field--inline muted">Всего: {total}, найдено: {filteredRows.length}, страница {page}</div>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>Загрузка…</p> : null}
      {!loading && !error && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>СТАТУС</th>
                <th>ДАТА</th>
                <th>АВТОР</th>
                <th>НОМЕР ЗАЯВКИ</th>
                <th>ГРУЗООТПРАВИТЕЛЬ</th>
                <th>ГРУЗОПОЛУЧАТЕЛЬ</th>
                <th>СТРАНА НАЗНАЧЕНИЯ</th>
                <th>ВЕС</th>
                <th>КОЛИЧЕСТВО КОНТЕЙНЕРОВ</th>
                <th>ПРОДУКЦИЯ</th>
                <th />
              </tr>
              <tr>
                <th><input className="input" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} /></th>
                <th />
                <th><input className="input" value={filters.author} onChange={(e) => setFilters((p) => ({ ...p, author: e.target.value }))} /></th>
                <th><input className="input" value={filters.number} onChange={(e) => setFilters((p) => ({ ...p, number: e.target.value }))} /></th>
                <th><input className="input" value={filters.shipper} onChange={(e) => setFilters((p) => ({ ...p, shipper: e.target.value }))} /></th>
                <th><input className="input" value={filters.consignee} onChange={(e) => setFilters((p) => ({ ...p, consignee: e.target.value }))} /></th>
                <th><input className="input" value={filters.destination} onChange={(e) => setFilters((p) => ({ ...p, destination: e.target.value }))} /></th>
                <th><input className="input" value={filters.weight} onChange={(e) => setFilters((p) => ({ ...p, weight: e.target.value }))} /></th>
                <th><input className="input" value={filters.containers} onChange={(e) => setFilters((p) => ({ ...p, containers: e.target.value }))} /></th>
                <th><input className="input" value={filters.product} onChange={(e) => setFilters((p) => ({ ...p, product: e.target.value }))} /></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="muted">
                    Нет записей
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.uuid} onDoubleClick={() => nav(`/applications/${row.uuid}`)} onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, row }); }}>
                    <td><code>{statusMap.get(row.status_code) || row.status_code}</code></td>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>{(row.applicant_account_uuid && accountMap.get(row.applicant_account_uuid)) || "-"}</td>
                    <td>{row.application_number || "-"}</td>
                    <td>{(row.applicant_counterparty_uuid && counterpartyMap.get(row.applicant_counterparty_uuid)) || row.exporter_name_ru || "-"}</td>
                    <td>{row.importer_name || "-"}</td>
                    <td>{row.destination_place_ru || "-"}</td>
                    <td>{row.weight_tons ?? "-"}</td>
                    <td>{row.container_count_snapshot ?? "-"}</td>
                    <td>{(row.product_uuid && productMap.get(row.product_uuid)) || "-"}</td>
                    <td>
                      <Link to={`/applications/${row.uuid}`} className="nav-link" title="Открыть карточку заявки">
                        Открыть
                      </Link>
                      <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => void copyApplication(row)} disabled={busyActionId === row.uuid}>
                        Копировать
                      </button>
                      <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => void submitApplication(row)} disabled={busyActionId === row.uuid}>
                        Подать
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {menu ? (
        <div style={{ position: "fixed", top: menu.y, left: menu.x, zIndex: 1000, background: "var(--bg-elev,#fff)", border: "1px solid var(--line,#ddd)", borderRadius: 8, padding: 8 }} onMouseLeave={() => setMenu(null)}>
          <button type="button" className="nav-link" onClick={() => { void copyApplication(menu.row); setMenu(null); }}>Копировать</button>
          <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => { nav(`/applications/${menu.row.uuid}`); setMenu(null); }}>Открыть</button>
          <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => { void submitApplication(menu.row); setMenu(null); }}>Подать</button>
          <button
            type="button"
            className="nav-link"
            style={{ marginLeft: 8 }}
            onClick={() => {
              const q = menu.row.application_number || menu.row.uuid;
              nav(`/applications/certificates?q=${encodeURIComponent(q)}`);
              setMenu(null);
            }}
          >
            Реестр сертификатов
          </button>
        </div>
      ) : null}
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
