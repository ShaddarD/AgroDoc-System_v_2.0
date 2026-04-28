import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

type RoleRow = { role_code: string; description: string; sort_order: number };
type StatusRow = { status_code: string; description: string };
type CodeRow = { code: string; description: string };
type ShippingLineRow = {
  uuid: string;
  code: string;
  name_ru: string;
  name_en: string;
  is_active: boolean;
};
type ProductRow = {
  uuid: string;
  product_code: string;
  hs_code_tnved: string;
  product_name_ru: string;
  product_name_en: string | null;
  botanical_name_latin: string | null;
  regulatory_documents: string | null;
  is_active: boolean;
};
type TerminalRow = {
  uuid: string;
  terminal_code: string;
  terminal_name: string;
  address_ru: string;
  address_en: string | null;
  is_active: boolean;
};
type PowerOfAttorneyRow = {
  uuid: string;
  poa_number: string;
  issue_date: string;
  validity_years: number;
  principal_counterparty_uuid: string | null;
  attorney_counterparty_uuid: string | null;
  status_code: string;
  is_active: boolean;
};
type CounterpartyRow = {
  uuid: string;
  name_ru: string;
  name_en: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  legal_address_ru: string | null;
  actual_address_ru: string | null;
  legal_address_en: string | null;
  actual_address_en: string | null;
  status_code: string;
  is_active: boolean;
};

type Tab =
  | "roles"
  | "statuses"
  | "source"
  | "files"
  | "counterparties"
  | "shipping-lines"
  | "products"
  | "terminals"
  | "powers-of-attorney";

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
  const [shippingLines, setShippingLines] = useState<ShippingLineRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [terminals, setTerminals] = useState<TerminalRow[]>([]);
  const [poaRows, setPoaRows] = useState<PowerOfAttorneyRow[]>([]);

  const [cName, setCName] = useState("");
  const [cInn, setCInn] = useState("");
  const [cKpp, setCKpp] = useState("");
  const [cOgrn, setCOgrn] = useState("");
  const [cNameEn, setCNameEn] = useState("");
  const [cLegalRu, setCLegalRu] = useState("");
  const [cActualRu, setCActualRu] = useState("");
  const [cLegalEn, setCLegalEn] = useState("");
  const [cActualEn, setCActualEn] = useState("");
  const [cSaving, setCSaving] = useState(false);
  const [cEditId, setCEditId] = useState<string | null>(null);
  const [sEditId, setSEditId] = useState<string | null>(null);
  const [sCode, setSCode] = useState("");
  const [sNameRu, setSNameRu] = useState("");
  const [sNameEn, setSNameEn] = useState("");
  const [sIsActive, setSIsActive] = useState(true);
  const [sSaving, setSSaving] = useState(false);

  const [pEditId, setPEditId] = useState<string | null>(null);
  const [pCode, setPCode] = useState("");
  const [pHsCode, setPHsCode] = useState("");
  const [pNameRu, setPNameRu] = useState("");
  const [pNameEn, setPNameEn] = useState("");
  const [pBotanical, setPBotanical] = useState("");
  const [pRegulatory, setPRegulatory] = useState("");
  const [pIsActive, setPIsActive] = useState(true);
  const [pSaving, setPSaving] = useState(false);

  const [tEditId, setTEditId] = useState<string | null>(null);
  const [tCode, setTCode] = useState("");
  const [tName, setTName] = useState("");
  const [tAddressRu, setTAddressRu] = useState("");
  const [tAddressEn, setTAddressEn] = useState("");
  const [tIsActive, setTIsActive] = useState(true);
  const [tSaving, setTSaving] = useState(false);

  const [poaEditId, setPoaEditId] = useState<string | null>(null);
  const [poaNumber, setPoaNumber] = useState("");
  const [poaIssueDate, setPoaIssueDate] = useState("");
  const [poaValidityYears, setPoaValidityYears] = useState("1");
  const [poaPrincipal, setPoaPrincipal] = useState("");
  const [poaAttorney, setPoaAttorney] = useState("");
  const [poaStatusCode, setPoaStatusCode] = useState("active");
  const [poaIsActive, setPoaIsActive] = useState(true);
  const [poaSaving, setPoaSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [rRoles, rStatuses, rSource, rFiles, rCounterparties, rShippingLines, rProducts, rTerminals, rPoa] = await Promise.all([
        api.fetch("/lookups/roles"),
        api.fetch("/lookups/statuses"),
        api.fetch("/lookups/source-types"),
        api.fetch("/lookups/file-types"),
        api.fetch("/lookups/counterparties"),
        api.fetch("/lookups/shipping-lines"),
        api.fetch("/lookups/products"),
        api.fetch("/lookups/terminals"),
        api.fetch("/lookups/powers-of-attorney"),
      ]);
      if (
        !rRoles.ok ||
        !rStatuses.ok ||
        !rSource.ok ||
        !rFiles.ok ||
        !rCounterparties.ok ||
        !rShippingLines.ok ||
        !rProducts.ok ||
        !rTerminals.ok ||
        !rPoa.ok
      ) {
        throw new Error("load_failed");
      }
      setRoles((await rRoles.json()) as RoleRow[]);
      setStatuses((await rStatuses.json()) as StatusRow[]);
      setSourceTypes((await rSource.json()) as CodeRow[]);
      setFileTypes((await rFiles.json()) as CodeRow[]);
      setCounterparties((await rCounterparties.json()) as CounterpartyRow[]);
      setShippingLines((await rShippingLines.json()) as ShippingLineRow[]);
      setProducts((await rProducts.json()) as ProductRow[]);
      setTerminals((await rTerminals.json()) as TerminalRow[]);
      setPoaRows((await rPoa.json()) as PowerOfAttorneyRow[]);
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
      name_en: cNameEn.trim() || null,
      inn: cInn.trim() || null,
      kpp: cKpp.trim() || null,
      ogrn: cOgrn.trim() || null,
      legal_address_ru: cLegalRu.trim() || null,
      actual_address_ru: cActualRu.trim() || null,
      legal_address_en: cLegalEn.trim() || null,
      actual_address_en: cActualEn.trim() || null,
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
    setCNameEn("");
    setCInn("");
    setCKpp("");
    setCOgrn("");
    setCLegalRu("");
    setCActualRu("");
    setCLegalEn("");
    setCActualEn("");
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

  async function saveShippingLine(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setSSaving(true);
    const payload = { code: sCode.trim(), name_ru: sNameRu.trim(), name_en: sNameEn.trim(), is_active: sIsActive };
    const r = sEditId
      ? await api.fetch(`/lookups/shipping-lines/${sEditId}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await api.fetch("/lookups/shipping-lines", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) {
      setError(await api.readApiError(r));
      setSSaving(false);
      return;
    }
    setSEditId(null);
    setSCode("");
    setSNameRu("");
    setSNameEn("");
    setSIsActive(true);
    await load();
    setSSaving(false);
  }

  async function removeShippingLine(row: ShippingLineRow) {
    const r = await api.fetch(`/lookups/shipping-lines/${row.uuid}`, { method: "DELETE" });
    if (!r.ok) {
      setError(await api.readApiError(r));
      return;
    }
    await load();
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setPSaving(true);
    const payload = {
      product_code: pCode.trim(),
      hs_code_tnved: pHsCode.trim(),
      product_name_ru: pNameRu.trim(),
      product_name_en: pNameEn.trim() || null,
      botanical_name_latin: pBotanical.trim() || null,
      regulatory_documents: pRegulatory.trim() || null,
      is_active: pIsActive,
    };
    const r = pEditId
      ? await api.fetch(`/lookups/products/${pEditId}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await api.fetch("/lookups/products", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) {
      setError(await api.readApiError(r));
      setPSaving(false);
      return;
    }
    setPEditId(null);
    setPCode("");
    setPHsCode("");
    setPNameRu("");
    setPNameEn("");
    setPBotanical("");
    setPRegulatory("");
    setPIsActive(true);
    await load();
    setPSaving(false);
  }

  async function removeProduct(row: ProductRow) {
    const r = await api.fetch(`/lookups/products/${row.uuid}`, { method: "DELETE" });
    if (!r.ok) {
      setError(await api.readApiError(r));
      return;
    }
    await load();
  }

  async function saveTerminal(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setTSaving(true);
    const payload = {
      terminal_code: tCode.trim(),
      terminal_name: tName.trim(),
      address_ru: tAddressRu.trim(),
      address_en: tAddressEn.trim() || null,
      is_active: tIsActive,
    };
    const r = tEditId
      ? await api.fetch(`/lookups/terminals/${tEditId}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await api.fetch("/lookups/terminals", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) {
      setError(await api.readApiError(r));
      setTSaving(false);
      return;
    }
    setTEditId(null);
    setTCode("");
    setTName("");
    setTAddressRu("");
    setTAddressEn("");
    setTIsActive(true);
    await load();
    setTSaving(false);
  }

  async function removeTerminal(row: TerminalRow) {
    const r = await api.fetch(`/lookups/terminals/${row.uuid}`, { method: "DELETE" });
    if (!r.ok) {
      setError(await api.readApiError(r));
      return;
    }
    await load();
  }

  async function savePoa(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setPoaSaving(true);
    const payload = {
      poa_number: poaNumber.trim(),
      issue_date: poaIssueDate,
      validity_years: Number(poaValidityYears) || 1,
      principal_counterparty_uuid: poaPrincipal || null,
      attorney_counterparty_uuid: poaAttorney || null,
      status_code: poaStatusCode.trim() || "active",
      is_active: poaIsActive,
    };
    const r = poaEditId
      ? await api.fetch(`/lookups/powers-of-attorney/${poaEditId}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await api.fetch("/lookups/powers-of-attorney", { method: "POST", body: JSON.stringify(payload) });
    if (!r.ok) {
      setError(await api.readApiError(r));
      setPoaSaving(false);
      return;
    }
    setPoaEditId(null);
    setPoaNumber("");
    setPoaIssueDate("");
    setPoaValidityYears("1");
    setPoaPrincipal("");
    setPoaAttorney("");
    setPoaStatusCode("active");
    setPoaIsActive(true);
    await load();
    setPoaSaving(false);
  }

  async function removePoa(row: PowerOfAttorneyRow) {
    const r = await api.fetch(`/lookups/powers-of-attorney/${row.uuid}`, { method: "DELETE" });
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
        <button type="button" title="Открыть справочник контрагентов" className={`tab ${tab === "counterparties" ? "tab--on" : ""}`} onClick={() => setTab("counterparties")}>
          Контрагенты
        </button>
        <button type="button" title="Открыть справочник ролей" className={`tab ${tab === "roles" ? "tab--on" : ""}`} onClick={() => setTab("roles")}>
          Роли
        </button>
        <button type="button" title="Открыть справочник статусов" className={`tab ${tab === "statuses" ? "tab--on" : ""}`} onClick={() => setTab("statuses")}>
          Статусы
        </button>
        <button type="button" title="Открыть типы источников" className={`tab ${tab === "source" ? "tab--on" : ""}`} onClick={() => setTab("source")}>
          Источники
        </button>
        <button type="button" title="Открыть типы файлов" className={`tab ${tab === "files" ? "tab--on" : ""}`} onClick={() => setTab("files")}>
          Типы файлов
        </button>
        <button type="button" title="Открыть линии перевозки" className={`tab ${tab === "shipping-lines" ? "tab--on" : ""}`} onClick={() => setTab("shipping-lines")}>
          Линии перевозки
        </button>
        <button type="button" title="Открыть справочник продуктов" className={`tab ${tab === "products" ? "tab--on" : ""}`} onClick={() => setTab("products")}>
          Продукты
        </button>
        <button type="button" title="Открыть справочник терминалов" className={`tab ${tab === "terminals" ? "tab--on" : ""}`} onClick={() => setTab("terminals")}>
          Терминалы
        </button>
        <button type="button" title="Открыть справочник доверенностей" className={`tab ${tab === "powers-of-attorney" ? "tab--on" : ""}`} onClick={() => setTab("powers-of-attorney")}>
          Доверенности
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p>Загрузка...</p> : null}

      {!loading && tab === "counterparties" ? (
        <>
          {isAdmin ? (
            <form className="form" style={{ width: "100%" }} onSubmit={saveCounterparty}>
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
                <div className="form-field">
                  <label htmlFor="cp-ogrn">ОГРН</label>
                  <input id="cp-ogrn" className="input" value={cOgrn} onChange={(e) => setCOgrn(e.target.value)} />
                </div>
                <div className="form-field" style={{ flex: "1 1 320px" }}>
                  <label htmlFor="cp-name-en">Название (EN)</label>
                  <input id="cp-name-en" className="input" value={cNameEn} onChange={(e) => setCNameEn(e.target.value)} />
                </div>
                <div className="form-field" style={{ flex: "1 1 420px" }}>
                  <label htmlFor="cp-legal-ru">Юр. адрес (RU)</label>
                  <input id="cp-legal-ru" className="input" value={cLegalRu} onChange={(e) => setCLegalRu(e.target.value)} />
                </div>
                <div className="form-field" style={{ flex: "1 1 420px" }}>
                  <label htmlFor="cp-actual-ru">Факт. адрес (RU)</label>
                  <input id="cp-actual-ru" className="input" value={cActualRu} onChange={(e) => setCActualRu(e.target.value)} />
                </div>
                <div className="form-field" style={{ flex: "1 1 420px" }}>
                  <label htmlFor="cp-legal-en">Legal address (EN)</label>
                  <input id="cp-legal-en" className="input" value={cLegalEn} onChange={(e) => setCLegalEn(e.target.value)} />
                </div>
                <div className="form-field" style={{ flex: "1 1 420px" }}>
                  <label htmlFor="cp-actual-en">Actual address (EN)</label>
                  <input id="cp-actual-en" className="input" value={cActualEn} onChange={(e) => setCActualEn(e.target.value)} />
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
                  <th>ОГРН</th>
                  <th>Юр. адрес</th>
                  <th>Факт. адрес</th>
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
                    <td>{row.ogrn || "-"}</td>
                    <td>{row.legal_address_ru || row.legal_address_en || "-"}</td>
                    <td>{row.actual_address_ru || row.actual_address_en || "-"}</td>
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
                            setCNameEn(row.name_en || "");
                            setCInn(row.inn || "");
                            setCKpp(row.kpp || "");
                            setCOgrn(row.ogrn || "");
                            setCLegalRu(row.legal_address_ru || "");
                            setCActualRu(row.actual_address_ru || "");
                            setCLegalEn(row.legal_address_en || "");
                            setCActualEn(row.actual_address_en || "");
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
      {!loading && tab === "shipping-lines" ? (
        <>
          {isAdmin ? (
            <form className="form" onSubmit={saveShippingLine}>
              <h2>{sEditId ? "Редактирование линии" : "Новая линия"}</h2>
              <div className="filters">
                <div className="form-field"><label>Код</label><input className="input" value={sCode} onChange={(e) => setSCode(e.target.value)} required /></div>
                <div className="form-field"><label>Название RU</label><input className="input" value={sNameRu} onChange={(e) => setSNameRu(e.target.value)} required /></div>
                <div className="form-field"><label>Название EN</label><input className="input" value={sNameEn} onChange={(e) => setSNameEn(e.target.value)} /></div>
                <div className="form-field form-field--inline"><label>Активна</label><input type="checkbox" checked={sIsActive} onChange={(e) => setSIsActive(e.target.checked)} /></div>
                <button type="submit" className="btn-primary" disabled={sSaving}>{sSaving ? "Сохранение..." : "Сохранить"}</button>
              </div>
            </form>
          ) : null}
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Код</th><th>RU</th><th>EN</th><th>Активна</th>{isAdmin ? <th /> : null}</tr></thead><tbody>{shippingLines.map((r) => <tr key={r.uuid}><td>{r.code}</td><td>{r.name_ru}</td><td>{r.name_en}</td><td>{r.is_active ? "да" : "нет"}</td>{isAdmin ? <td><button type="button" className="nav-link" onClick={() => { setSEditId(r.uuid); setSCode(r.code); setSNameRu(r.name_ru); setSNameEn(r.name_en); setSIsActive(r.is_active); }}>Изменить</button><button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => void removeShippingLine(r)}>Деактивировать</button></td> : null}</tr>)}</tbody></table></div>
        </>
      ) : null}
      {!loading && tab === "products" ? (
        <>
          {isAdmin ? (
            <form className="form" onSubmit={saveProduct}>
              <h2>{pEditId ? "Редактирование продукта" : "Новый продукт"}</h2>
              <div className="filters">
                <div className="form-field"><label>Код продукта</label><input className="input" value={pCode} onChange={(e) => setPCode(e.target.value)} required /></div>
                <div className="form-field"><label>HS/TNVED</label><input className="input" value={pHsCode} onChange={(e) => setPHsCode(e.target.value)} required /></div>
                <div className="form-field"><label>Название RU</label><input className="input" value={pNameRu} onChange={(e) => setPNameRu(e.target.value)} required /></div>
                <div className="form-field"><label>Название EN</label><input className="input" value={pNameEn} onChange={(e) => setPNameEn(e.target.value)} /></div>
                <div className="form-field"><label>Botanical latin</label><input className="input" value={pBotanical} onChange={(e) => setPBotanical(e.target.value)} /></div>
                <div className="form-field" style={{ flex: "1 1 320px" }}><label>Regulatory docs</label><input className="input" value={pRegulatory} onChange={(e) => setPRegulatory(e.target.value)} /></div>
                <div className="form-field form-field--inline"><label>Активен</label><input type="checkbox" checked={pIsActive} onChange={(e) => setPIsActive(e.target.checked)} /></div>
                <button type="submit" className="btn-primary" disabled={pSaving}>{pSaving ? "Сохранение..." : "Сохранить"}</button>
              </div>
            </form>
          ) : null}
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Код</th><th>HS</th><th>Название</th><th>Активен</th>{isAdmin ? <th /> : null}</tr></thead><tbody>{products.map((r) => <tr key={r.uuid}><td>{r.product_code}</td><td>{r.hs_code_tnved}</td><td>{r.product_name_ru}</td><td>{r.is_active ? "да" : "нет"}</td>{isAdmin ? <td><button type="button" className="nav-link" onClick={() => { setPEditId(r.uuid); setPCode(r.product_code); setPHsCode(r.hs_code_tnved); setPNameRu(r.product_name_ru); setPNameEn(r.product_name_en || ""); setPBotanical(r.botanical_name_latin || ""); setPRegulatory(r.regulatory_documents || ""); setPIsActive(r.is_active); }}>Изменить</button><button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => void removeProduct(r)}>Деактивировать</button></td> : null}</tr>)}</tbody></table></div>
        </>
      ) : null}
      {!loading && tab === "terminals" ? (
        <>
          {isAdmin ? (
            <form className="form" onSubmit={saveTerminal}>
              <h2>{tEditId ? "Редактирование терминала" : "Новый терминал"}</h2>
              <div className="filters">
                <div className="form-field"><label>Код терминала</label><input className="input" value={tCode} onChange={(e) => setTCode(e.target.value)} required /></div>
                <div className="form-field"><label>Название</label><input className="input" value={tName} onChange={(e) => setTName(e.target.value)} required /></div>
                <div className="form-field" style={{ flex: "1 1 360px" }}><label>Адрес RU</label><input className="input" value={tAddressRu} onChange={(e) => setTAddressRu(e.target.value)} required /></div>
                <div className="form-field" style={{ flex: "1 1 360px" }}><label>Адрес EN</label><input className="input" value={tAddressEn} onChange={(e) => setTAddressEn(e.target.value)} /></div>
                <div className="form-field form-field--inline"><label>Активен</label><input type="checkbox" checked={tIsActive} onChange={(e) => setTIsActive(e.target.checked)} /></div>
                <button type="submit" className="btn-primary" disabled={tSaving}>{tSaving ? "Сохранение..." : "Сохранить"}</button>
              </div>
            </form>
          ) : null}
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Код</th><th>Название</th><th>Адрес RU</th><th>Активен</th>{isAdmin ? <th /> : null}</tr></thead><tbody>{terminals.map((r) => <tr key={r.uuid}><td>{r.terminal_code}</td><td>{r.terminal_name}</td><td>{r.address_ru}</td><td>{r.is_active ? "да" : "нет"}</td>{isAdmin ? <td><button type="button" className="nav-link" onClick={() => { setTEditId(r.uuid); setTCode(r.terminal_code); setTName(r.terminal_name); setTAddressRu(r.address_ru); setTAddressEn(r.address_en || ""); setTIsActive(r.is_active); }}>Изменить</button><button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => void removeTerminal(r)}>Деактивировать</button></td> : null}</tr>)}</tbody></table></div>
        </>
      ) : null}
      {!loading && tab === "powers-of-attorney" ? (
        <>
          {isAdmin ? (
            <form className="form" onSubmit={savePoa}>
              <h2>{poaEditId ? "Редактирование доверенности" : "Новая доверенность"}</h2>
              <div className="filters">
                <div className="form-field"><label>Номер</label><input className="input" value={poaNumber} onChange={(e) => setPoaNumber(e.target.value)} required /></div>
                <div className="form-field"><label>Дата выдачи</label><input className="input" type="date" value={poaIssueDate} onChange={(e) => setPoaIssueDate(e.target.value)} required /></div>
                <div className="form-field"><label>Срок (лет)</label><input className="input" type="number" min={1} max={20} value={poaValidityYears} onChange={(e) => setPoaValidityYears(e.target.value)} required /></div>
                <div className="form-field"><label>Доверитель</label><select className="input" value={poaPrincipal} onChange={(e) => setPoaPrincipal(e.target.value)}><option value="">-</option>{counterparties.map((c) => <option key={c.uuid} value={c.uuid}>{c.name_ru}</option>)}</select></div>
                <div className="form-field"><label>Поверенный</label><select className="input" value={poaAttorney} onChange={(e) => setPoaAttorney(e.target.value)}><option value="">-</option>{counterparties.map((c) => <option key={c.uuid} value={c.uuid}>{c.name_ru}</option>)}</select></div>
                <div className="form-field"><label>Статус</label><input className="input" value={poaStatusCode} onChange={(e) => setPoaStatusCode(e.target.value)} /></div>
                <div className="form-field form-field--inline"><label>Активна</label><input type="checkbox" checked={poaIsActive} onChange={(e) => setPoaIsActive(e.target.checked)} /></div>
                <button type="submit" className="btn-primary" disabled={poaSaving}>{poaSaving ? "Сохранение..." : "Сохранить"}</button>
              </div>
            </form>
          ) : null}
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Номер</th><th>Дата</th><th>Срок</th><th>Статус</th><th>Активна</th>{isAdmin ? <th /> : null}</tr></thead><tbody>{poaRows.map((r) => <tr key={r.uuid}><td>{r.poa_number}</td><td>{r.issue_date}</td><td>{r.validity_years}</td><td>{r.status_code}</td><td>{r.is_active ? "да" : "нет"}</td>{isAdmin ? <td><button type="button" className="nav-link" onClick={() => { setPoaEditId(r.uuid); setPoaNumber(r.poa_number); setPoaIssueDate(r.issue_date); setPoaValidityYears(String(r.validity_years)); setPoaPrincipal(r.principal_counterparty_uuid || ""); setPoaAttorney(r.attorney_counterparty_uuid || ""); setPoaStatusCode(r.status_code); setPoaIsActive(r.is_active); }}>Изменить</button><button type="button" className="nav-link" style={{ marginLeft: 8 }} onClick={() => void removePoa(r)}>Деактивировать</button></td> : null}</tr>)}</tbody></table></div>
        </>
      ) : null}
    </section>
  );
}
