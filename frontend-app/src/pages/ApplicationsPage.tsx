import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
type TableLayout = { widths: Record<string, number>; order: string[] };
type ColumnKey =
  | "status"
  | "created_at"
  | "author"
  | "application_number"
  | "shipper"
  | "consignee"
  | "destination"
  | "weight"
  | "containers"
  | "product"
  | "actions";
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
const APP_COLUMNS: Array<{ key: ColumnKey; label: string; sortable: boolean }> = [
  { key: "status", label: "СТАТУС", sortable: true },
  { key: "created_at", label: "ДАТА", sortable: true },
  { key: "author", label: "АВТОР", sortable: true },
  { key: "application_number", label: "НОМЕР ЗАЯВКИ", sortable: true },
  { key: "shipper", label: "ГРУЗООТПРАВИТЕЛЬ", sortable: true },
  { key: "consignee", label: "ГРУЗОПОЛУЧАТЕЛЬ", sortable: true },
  { key: "destination", label: "СТРАНА НАЗНАЧЕНИЯ", sortable: true },
  { key: "weight", label: "ВЕС", sortable: true },
  { key: "containers", label: "КОЛИЧЕСТВО КОНТЕЙНЕРОВ", sortable: true },
  { key: "product", label: "ПРОДУКЦИЯ", sortable: true },
  { key: "actions", label: "ДЕЙСТВИЯ", sortable: false },
];

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
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(APP_COLUMNS.map((x) => x.key));
  const [tableEditMode, setTableEditMode] = useState(false);
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [resizing, setResizing] = useState<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);
  const [draggingColumn, setDraggingColumn] = useState<ColumnKey | null>(null);
  const [sortKey, setSortKey] = useState<ColumnKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const firstFilterRef = useRef<HTMLInputElement | null>(null);

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
    q.set("page_size", String(100));
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

  const loadLayout = useCallback(async () => {
    const r = await api.fetch("/applications/table-layout");
    if (!r.ok) return;
    const body = (await r.json()) as TableLayout;
    setColumnWidths(body.widths || {});
    if (Array.isArray(body.order) && body.order.length > 0) {
      const validOrder = body.order.filter((x): x is ColumnKey => APP_COLUMNS.some((c) => c.key === x));
      const missing = APP_COLUMNS.map((x) => x.key).filter((k) => !validOrder.includes(k));
      setColumnOrder([...validOrder, ...missing]);
    }
  }, []);

  useEffect(() => {
    void loadStatuses();
  }, [loadStatuses]);

  useEffect(() => {
    void loadList();
  }, [loadList]);
  useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  const statusMap = useMemo(() => new Map(statuses.map((x) => [x.status_code, x.description || x.status_code])), [statuses]);
  const counterpartyMap = useMemo(() => new Map(counterparties.map((x) => [x.uuid, x.name_ru])), [counterparties]);
  const productMap = useMemo(() => new Map(products.map((x) => [x.uuid, x.product_name_ru])), [products]);
  const accountMap = useMemo(() => new Map(accounts.map((x) => [x.uuid, `${x.last_name} ${x.first_name}`.trim() || x.login])), [accounts]);
  const filteredRows = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return rows.filter((row) => {
        const statusLabel = statusMap.get(row.status_code) || row.status_code;
        const author = (row.applicant_account_uuid && accountMap.get(row.applicant_account_uuid)) || "";
        const shipper = (row.applicant_counterparty_uuid && counterpartyMap.get(row.applicant_counterparty_uuid)) || row.exporter_name_ru || "";
        const product = (row.product_uuid && productMap.get(row.product_uuid)) || "";
        const matchesFilters = (
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
        if (!matchesFilters) return false;
        if (!q) return true;
        const hay = [
          statusLabel,
          new Date(row.created_at).toLocaleString(),
          author,
          row.application_number || "",
          shipper,
          row.importer_name || "",
          row.destination_place_ru || "",
          String(row.weight_tons ?? ""),
          String(row.container_count_snapshot ?? ""),
          product,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [rows, filters, statusMap, accountMap, counterpartyMap, productMap, globalSearch]);
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    if (sortKey === "actions") return list;
    list.sort((a, b) => {
      const getVal = (row: AppRow): string => {
        const statusLabel = statusMap.get(row.status_code) || row.status_code;
        const author = (row.applicant_account_uuid && accountMap.get(row.applicant_account_uuid)) || "";
        const shipper = (row.applicant_counterparty_uuid && counterpartyMap.get(row.applicant_counterparty_uuid)) || row.exporter_name_ru || "";
        const product = (row.product_uuid && productMap.get(row.product_uuid)) || "";
        const map: Record<Exclude<ColumnKey, "actions">, string> = {
          status: statusLabel,
          created_at: row.created_at || "",
          author,
          application_number: row.application_number || "",
          shipper,
          consignee: row.importer_name || "",
          destination: row.destination_place_ru || "",
          weight: String(row.weight_tons ?? ""),
          containers: String(row.container_count_snapshot ?? ""),
          product,
        };
        return map[sortKey as Exclude<ColumnKey, "actions">];
      };
      const cmp = getVal(a).localeCompare(getVal(b), "ru", { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filteredRows, sortDir, sortKey, statusMap, accountMap, counterpartyMap, productMap]);
  const visibleColumns = useMemo(
    () => columnOrder.map((k) => APP_COLUMNS.find((x) => x.key === k)).filter(Boolean) as typeof APP_COLUMNS,
    [columnOrder],
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

  async function saveLayout() {
    const r = await api.fetch("/applications/table-layout", {
      method: "PUT",
      body: JSON.stringify({ widths: columnWidths, order: columnOrder }),
    });
    if (!r.ok) {
      setError(await api.readApiError(r));
      return;
    }
    setLayoutDirty(false);
  }

  useEffect(() => {
    if (!resizing) return;
    const current = resizing;
    function onMove(e: MouseEvent) {
      const next = Math.max(80, Math.min(1200, current.startWidth + (e.clientX - current.startX)));
      setColumnWidths((prev) => ({ ...prev, [current.key]: next }));
    }
    function onUp() {
      setResizing(null);
      setLayoutDirty(true);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  function toggleSort(key: ColumnKey) {
    if (key === "actions") return;
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    setSortDir((p) => (p === "asc" ? "desc" : "asc"));
  }

  function clearSearch() {
    setGlobalSearch("");
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <section className="card page page-wide">
      <h1>Заявки</h1>
      <p>
        <button type="button" className="btn-primary" title="Открыть форму новой заявки" onClick={() => nav("/applications/new")}>
          Создать заявку
        </button>
      </p>
      {account?.role_code === "admin" ? (
        <div className="filters">
          <button type="button" className="btn-ghost" onClick={() => setTableEditMode((prev) => !prev)}>
            {tableEditMode ? "Редактирование таблицы: ON" : "Редактирование таблицы: OFF"}
          </button>
          <button type="button" className="btn-primary" disabled={!layoutDirty} onClick={() => void saveLayout()}>
            Сохранить изменения
          </button>
        </div>
      ) : null}
      <div className="form-field form-field--inline muted">Всего: {total}, найдено: {filteredRows.length}, страница {page}</div>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>Загрузка…</p> : null}
      {!loading && !error && (
        <div className="table-wrap table-wrap--always-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {visibleColumns.map((col) => (
                  <th key={col.key} style={{ width: columnWidths[col.key] ?? 180, minWidth: columnWidths[col.key] ?? 180, position: "relative" }}>
                    <button type="button" className="nav-link" onClick={() => toggleSort(col.key)}>
                      {col.label} {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                    {account?.role_code === "admin" && tableEditMode ? (
                      <>
                        <span
                          className="col-resize-handle"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const w = columnWidths[col.key] ?? 180;
                            setResizing({ key: col.key, startX: e.clientX, startWidth: w });
                          }}
                        />
                        <span
                          className="col-drag-handle"
                          draggable
                          onDragStart={() => setDraggingColumn(col.key)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (!draggingColumn || draggingColumn === col.key) return;
                            setColumnOrder((prev) => {
                              const from = prev.indexOf(draggingColumn);
                              const to = prev.indexOf(col.key);
                              if (from < 0 || to < 0) return prev;
                              const next = [...prev];
                              next.splice(from, 1);
                              next.splice(to, 0, draggingColumn);
                              return next;
                            });
                            setDraggingColumn(null);
                            setLayoutDirty(true);
                          }}
                          onDragEnd={() => setDraggingColumn(null)}
                        >
                          ↔
                        </span>
                      </>
                    ) : null}
                  </th>
                ))}
              </tr>
              <tr>
                {visibleColumns.map((col, idx) => (
                  <th key={`${col.key}-f`}>
                    {col.key === "status" ? <input ref={idx === 0 ? firstFilterRef : null} className="input" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} /> : null}
                    {col.key === "author" ? <input className="input" value={filters.author} onChange={(e) => setFilters((p) => ({ ...p, author: e.target.value }))} /> : null}
                    {col.key === "application_number" ? <input className="input" value={filters.number} onChange={(e) => setFilters((p) => ({ ...p, number: e.target.value }))} /> : null}
                    {col.key === "shipper" ? <input className="input" value={filters.shipper} onChange={(e) => setFilters((p) => ({ ...p, shipper: e.target.value }))} /> : null}
                    {col.key === "consignee" ? <input className="input" value={filters.consignee} onChange={(e) => setFilters((p) => ({ ...p, consignee: e.target.value }))} /> : null}
                    {col.key === "destination" ? <input className="input" value={filters.destination} onChange={(e) => setFilters((p) => ({ ...p, destination: e.target.value }))} /> : null}
                    {col.key === "weight" ? <input className="input" value={filters.weight} onChange={(e) => setFilters((p) => ({ ...p, weight: e.target.value }))} /> : null}
                    {col.key === "containers" ? <input className="input" value={filters.containers} onChange={(e) => setFilters((p) => ({ ...p, containers: e.target.value }))} /> : null}
                    {col.key === "product" ? <input className="input" value={filters.product} onChange={(e) => setFilters((p) => ({ ...p, product: e.target.value }))} /> : null}
                  </th>
                ))}
              </tr>
              <tr>
                <th colSpan={2}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input className="input" style={{ width: "100%" }} placeholder="Поиск по всей таблице" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
                    <button type="button" className="btn-ghost" onClick={clearSearch}>Сброс поиска</button>
                  </div>
                </th>
                {visibleColumns.length > 2 ? <th colSpan={visibleColumns.length - 2} /> : null}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="muted">
                    Нет записей
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.uuid} onDoubleClick={() => nav(`/applications/${row.uuid}`)} onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, row }); }}>
                    {visibleColumns.map((col) => (
                      <td key={`${row.uuid}-${col.key}`} style={{ width: columnWidths[col.key] ?? 180, minWidth: columnWidths[col.key] ?? 180 }}>
                        {col.key === "status" ? <code>{statusMap.get(row.status_code) || row.status_code}</code> : null}
                        {col.key === "created_at" ? new Date(row.created_at).toLocaleString() : null}
                        {col.key === "author" ? ((row.applicant_account_uuid && accountMap.get(row.applicant_account_uuid)) || "-") : null}
                        {col.key === "application_number" ? (row.application_number || "-") : null}
                        {col.key === "shipper" ? ((row.applicant_counterparty_uuid && counterpartyMap.get(row.applicant_counterparty_uuid)) || row.exporter_name_ru || "-") : null}
                        {col.key === "consignee" ? (row.importer_name || "-") : null}
                        {col.key === "destination" ? (row.destination_place_ru || "-") : null}
                        {col.key === "weight" ? (row.weight_tons ?? "-") : null}
                        {col.key === "containers" ? (row.container_count_snapshot ?? "-") : null}
                        {col.key === "product" ? ((row.product_uuid && productMap.get(row.product_uuid)) || "-") : null}
                        {col.key === "actions" ? (
                          <>
                            <Link to={`/applications/${row.uuid}`} className="nav-link" title="Открыть карточку заявки">
                              Открыть
                            </Link>
                            <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => void copyApplication(row)} disabled={busyActionId === row.uuid}>
                              Копировать
                            </button>
                            <button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => void submitApplication(row)} disabled={busyActionId === row.uuid}>
                              Подать
                            </button>
                          </>
                        ) : null}
                      </td>
                    ))}
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
