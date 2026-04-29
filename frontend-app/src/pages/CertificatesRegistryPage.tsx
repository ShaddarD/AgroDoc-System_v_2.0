import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useHotkeys } from "../hotkeys/HotkeysContext";

type RegistryRow = {
  uuid: string;
  registry_number: string;
  application_uuid: string | null;
  bl_number: string | null;
  bl_date: string | null;
  weight_tons: number | null;
  fss_number: string | null;
  fss_issue_date: string | null;
  fum: string | null;
  quality_certificate: string | null;
  pi: string | null;
  health: string | null;
  conclusion: string | null;
  radio: string | null;
  non_gmo: string | null;
  soo: string | null;
  wood: string | null;
};

type ListBody = { items: RegistryRow[]; total: number };
type WidthsBody = { widths: Record<string, number> };

type ColumnKey =
  | "registry_number"
  | "bl_number"
  | "bl_date"
  | "weight_tons"
  | "fss_number"
  | "fss_issue_date"
  | "fum"
  | "quality_certificate"
  | "pi"
  | "health"
  | "conclusion"
  | "radio"
  | "non_gmo"
  | "soo"
  | "wood";

type FilterState = Record<ColumnKey, string>;
type SortDir = "asc" | "desc";

const COLUMNS: Array<{ key: ColumnKey; label: string; editable: boolean }> = [
  { key: "registry_number", label: "№", editable: false },
  { key: "bl_number", label: "BL", editable: true },
  { key: "bl_date", label: "BL дата", editable: true },
  { key: "weight_tons", label: "Вес", editable: true },
  { key: "fss_number", label: "ФСС", editable: true },
  { key: "fss_issue_date", label: "дата выдачи ФСС", editable: true },
  { key: "fum", label: "ФУМ", editable: true },
  { key: "quality_certificate", label: "СЕРТ КАЧЕСТВА", editable: true },
  { key: "pi", label: "ПИ", editable: true },
  { key: "health", label: "ЗДОРОВЬЕ", editable: true },
  { key: "conclusion", label: "ЗАКЛЮЧЕНИЕ", editable: true },
  { key: "radio", label: "РАДИО", editable: true },
  { key: "non_gmo", label: "НОН ГМО", editable: true },
  { key: "soo", label: "СОО", editable: true },
  { key: "wood", label: "WOOD", editable: true },
];

const EMPTY_FILTERS: FilterState = COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: "" }), {} as FilterState);

export function CertificatesRegistryPage() {
  const { account, canRead, canWrite } = useAuth();
  const { setActiveTableHotkeys } = useHotkeys();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [globalSearch, setGlobalSearch] = useState("");
  const [sortKey, setSortKey] = useState<ColumnKey>("registry_number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, Partial<RegistryRow>>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{ key: string; startX: number; startWidth: number } | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const firstFilterRef = useRef<HTMLInputElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const canReadRegistry = canRead("registry_certificates");
  const canWriteRegistry = canWrite("registry_certificates");
  const isAdmin = account?.role_code === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = searchParams.get("q") || "";
    const r = await api.fetch(`/certificates-registry${query ? `?q=${encodeURIComponent(query)}` : ""}`);
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
    if (query) {
      setFilters((prev) => ({ ...prev, registry_number: query }));
    }
    const widthsResp = await api.fetch("/certificates-registry/column-widths");
    if (widthsResp.ok) {
      const widthsBody = (await widthsResp.json()) as WidthsBody;
      setColumnWidths(widthsBody.widths || {});
    }
    setLoading(false);
  }, [searchParams]);

  useEffect(() => {
    if (!canReadRegistry) return;
    void load();
  }, [load, canReadRegistry]);

  const filteredRows = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesColumns = COLUMNS.every((col) =>
        String((row as Record<string, unknown>)[col.key] ?? "")
          .toLowerCase()
          .includes(filters[col.key].toLowerCase()),
      );
      if (!matchesColumns) return false;
      if (!q) return true;
      return COLUMNS.some((col) =>
        String((row as Record<string, unknown>)[col.key] ?? "")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [rows, filters, globalSearch]);

  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    arr.sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
      const cmp = av.localeCompare(bv, "ru", { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredRows, sortKey, sortDir]);

  useEffect(() => {
    const target = searchParams.get("q");
    if (!target) return;
    const found = sortedRows.find((x) => x.registry_number === target);
    if (found) {
      rowRefs.current[found.uuid]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [sortedRows, searchParams]);

  async function saveBatch() {
    const entries = Object.entries(dirty);
    if (!entries.length) return;
    setError(null);
    for (const [rowUuid, patch] of entries) {
      const r = await api.fetch(`/certificates-registry/${rowUuid}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!r.ok) {
        setError(await api.readApiError(r));
        return;
      }
    }
    setDirty({});
    setOkMsg("Изменения сохранены.");
    await load();
  }

  function parseClipboardBlock(text: string): string[][] {
    return text
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .map((line) => line.split("\t"));
  }

  function applyCellValue(rowIdx: number, colKey: ColumnKey, value: string) {
    const row = filteredRows[rowIdx];
    if (!row) return;
    if (!COLUMNS.find((x) => x.key === colKey)?.editable) return;
    setRows((prev) => prev.map((r) => (r.uuid === row.uuid ? { ...r, [colKey]: value || null } : r)));
    setDirty((prev) => ({ ...prev, [row.uuid]: { ...(prev[row.uuid] || {}), [colKey]: value || null } }));
  }

  function handlePasteBlock(text: string) {
    const selected = { row: 0, col: "bl_number" as ColumnKey };
    const block = parseClipboardBlock(text);
    for (let r = 0; r < block.length; r += 1) {
      for (let c = 0; c < block[r].length; c += 1) {
        const rowIdx = selected.row + r;
        const colIdx = COLUMNS.findIndex((x) => x.key === selected.col) + c;
        if (colIdx < 0 || colIdx >= COLUMNS.length) continue;
        applyCellValue(rowIdx, COLUMNS[colIdx].key, block[r][c]);
      }
    }
  }

  useEffect(() => {
    setActiveTableHotkeys({
      onSave: () => {
        if (canWriteRegistry) void saveBatch();
      },
      onFocusFilter: () => firstFilterRef.current?.focus(),
      onPasteText: (text) => {
        if (canWriteRegistry) handlePasteBlock(text);
      },
    });
    return () => setActiveTableHotkeys(null);
  }, [setActiveTableHotkeys, canWriteRegistry, dirty]);

  useEffect(() => {
    if (!resizing) return;
    const currentResize = resizing;
    function onMouseMove(e: MouseEvent) {
      const next = Math.max(80, Math.min(1200, currentResize.startWidth + (e.clientX - currentResize.startX)));
      setColumnWidths((prev) => ({ ...prev, [currentResize.key]: next }));
    }
    function onMouseUp() {
      setResizing(null);
      if (isAdmin) {
        void api.fetch("/certificates-registry/column-widths", {
          method: "PUT",
          body: JSON.stringify({ widths: columnWidths }),
        });
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizing, isAdmin, columnWidths]);

  function clearSearch() {
    setGlobalSearch("");
    setFilters(EMPTY_FILTERS);
  }

  function toggleSort(key: ColumnKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  async function patchSingleCell(rowUuid: string, patch: Partial<RegistryRow>) {
    const r = await api.fetch(`/certificates-registry/${rowUuid}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      setError(await api.readApiError(r));
    } else {
      setDirty((prev) => {
        const next = { ...prev };
        delete next[rowUuid];
        return next;
      });
    }
  }

  async function importFile(file: File) {
    setImportBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    const r = await api.fetch("/certificates-registry/import", { method: "POST", body: fd });
    if (!r.ok) {
      setError(await api.readApiError(r));
      setImportBusy(false);
      return;
    }
    const body = (await r.json()) as { processed: number; created: number; updated: number; linked: number; errors: string[] };
    setImportResult(`processed=${body.processed}, created=${body.created}, updated=${body.updated}, linked=${body.linked}, errors=${body.errors.length}`);
    await load();
    setImportBusy(false);
  }

  if (!canReadRegistry) {
    return (
      <section className="card page page-wide">
        <h1>Реестр сертификатов</h1>
        <p className="form-error">Нет доступа к разделу.</p>
      </section>
    );
  }

  return (
    <section className="card page page-wide">
      <h1>Реестр сертификатов</h1>
      {error ? <p className="form-error">{error}</p> : null}
      {okMsg ? <p className="muted">{okMsg}</p> : null}
      {importResult ? <p className="muted">{importResult}</p> : null}

      {canWriteRegistry && total === 0 ? (
        <div className="form-field">
          <label htmlFor="cert-import">Единоразовый импорт CSV/XLSX</label>
          <input id="cert-import" type="file" accept=".csv,.xlsx" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); }} disabled={importBusy} />
        </div>
      ) : null}

      {loading ? <p>Загрузка...</p> : null}
      {!loading ? (
        <div className="table-wrap table-wrap--always-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} style={{ width: columnWidths[col.key] ?? 180, minWidth: columnWidths[col.key] ?? 180, position: "relative" }}>
                    <button type="button" className="nav-link" onClick={() => toggleSort(col.key)}>
                      {col.label} {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                    {isAdmin ? (
                      <span
                        className="col-resize-handle"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const currentWidth = columnWidths[col.key] ?? 180;
                          setResizing({ key: col.key, startX: e.clientX, startWidth: currentWidth });
                        }}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
              <tr>
                {COLUMNS.map((col, idx) => (
                  <th key={`${col.key}-f`}>
                    <input
                      ref={idx === 0 ? firstFilterRef : null}
                      className="input"
                      value={filters[col.key]}
                      onChange={(e) => setFilters((prev) => ({ ...prev, [col.key]: e.target.value }))}
                    />
                  </th>
                ))}
              </tr>
              <tr>
                <th colSpan={COLUMNS.length}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      className="input"
                      placeholder="Поиск по всей таблице"
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      style={{ width: "100%" }}
                    />
                    <button type="button" className="btn-ghost" onClick={clearSearch}>
                      Сброс поиска
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, rowIdx) => (
                <tr key={row.uuid} ref={(el) => { rowRefs.current[row.uuid] = el; }}>
                  {COLUMNS.map((col) => {
                    const value = String((row as Record<string, unknown>)[col.key] ?? "");
                    return (
                      <td key={`${row.uuid}-${col.key}`} style={{ width: columnWidths[col.key] ?? 180, minWidth: columnWidths[col.key] ?? 180 }}>
                        {col.editable && canWriteRegistry ? (
                          <textarea
                            className="input"
                            value={value}
                            onChange={(e) => applyCellValue(rowIdx, col.key, e.target.value)}
                            onInput={(e) => {
                              const el = e.currentTarget;
                              el.style.height = "auto";
                              el.style.height = `${el.scrollHeight}px`;
                            }}
                            onBlur={() => {
                              const patch = dirty[row.uuid];
                              if (patch && Object.keys(patch).length > 0) {
                                void patchSingleCell(row.uuid, patch);
                              }
                            }}
                            rows={1}
                            style={{ width: "100%", minHeight: 34, resize: "vertical", whiteSpace: "pre-wrap", overflow: "hidden" }}
                          />
                        ) : (
                          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{value || "-"}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!sortedRows.length ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="muted">Нет данных</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
