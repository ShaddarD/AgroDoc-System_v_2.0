import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type CodeRow = { code: string; description: string };
type CounterpartyRow = {
  uuid: string;
  name_ru: string;
  name_en: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  legal_address_ru: string | null;
  actual_address_ru: string | null;
};
type TerminalRow = { uuid: string; terminal_code: string; terminal_name: string; address_ru: string };
type ProductRow = {
  uuid: string;
  product_code: string;
  hs_code_tnved: string;
  product_name_ru: string;
  product_name_en: string | null;
  botanical_name_latin: string | null;
};
type ShippingLineRow = { uuid: string; code: string; name_ru: string };
type PowerOfAttorneyRow = { uuid: string; poa_number: string; issue_date: string };
type AccountRow = { uuid: string; first_name: string; last_name: string; role_code: string; is_active: boolean };

type CreateFormState = {
  source_type: string;
  application_number: string;
  application_type_code: string;
  applicant_counterparty_uuid: string;
  applicant_custom: string;
  applicant_actual_address: string;
  poruchenie: string;
  contract_number_cok: string;
  contract_date_cok: string;
  exporter_ref: string;
  exporter_rus: string;
  exporter_eng: string;
  exporter_address: string;
  exporter_inn: string;
  exporter_kpp: string;
  exporter_ogrn: string;
  by_instruction: boolean;
  instruction_text: string;
  supply_contract_info: string;
  importer_uuid: string;
  importer_custom: string;
  importer_name_eng: string;
  importer_address_eng: string;
  product_uuid: string;
  product_custom: string;
  product_rus: string;
  product_eng: string;
  botanical_name: string;
  tnved_code: string;
  research_docs: string;
  weight_tons: string;
  places_count: string;
  packing_type: string;
  destination_place: string;
  assigned_to: string;
  terminal_uuid: string;
  inspection_place_custom: string;
  planned_inspection_date: string;
  stuffing_act_uuid: string;
  master_application_uuid: string;
  container_count_snapshot: string;
  places_snapshot: string;
  izveshenie: string;
  fss_plan_issue_date: string;
  notes_in_table: string;
  power_of_attorney_uuid: string;
  shipping_line_uuid: string;
  notes: string;
  cert_safety_quality_checked: boolean;
  cert_safety_quality_copies: string;
  cert_health_checked: boolean;
  cert_health_copies: string;
  cert_intl_quality_checked: boolean;
  cert_intl_quality_copies: string;
  cert_radio_checked: boolean;
  cert_radio_copies: string;
  cert_gmo_checked: boolean;
  cert_gmo_copies: string;
};

const defaultState: CreateFormState = {
  source_type: "manual",
  application_number: "",
  application_type_code: "vnikkr",
  applicant_counterparty_uuid: "",
  applicant_custom: "",
  applicant_actual_address: "",
  poruchenie: "",
  contract_number_cok: "",
  contract_date_cok: "",
  exporter_ref: "",
  exporter_rus: "",
  exporter_eng: "",
  exporter_address: "",
  exporter_inn: "",
  exporter_kpp: "",
  exporter_ogrn: "",
  by_instruction: false,
  instruction_text: "",
  supply_contract_info: "",
  importer_uuid: "",
  importer_custom: "",
  importer_name_eng: "",
  importer_address_eng: "",
  product_uuid: "",
  product_custom: "",
  product_rus: "",
  product_eng: "",
  botanical_name: "",
  tnved_code: "",
  research_docs: "",
  weight_tons: "",
  places_count: "",
  packing_type: "",
  destination_place: "",
  assigned_to: "",
  terminal_uuid: "",
  inspection_place_custom: "",
  planned_inspection_date: "",
  stuffing_act_uuid: "",
  master_application_uuid: "",
  container_count_snapshot: "",
  places_snapshot: "",
  izveshenie: "",
  fss_plan_issue_date: "",
  notes_in_table: "",
  power_of_attorney_uuid: "",
  shipping_line_uuid: "",
  notes: "",
  cert_safety_quality_checked: false,
  cert_safety_quality_copies: "",
  cert_health_checked: false,
  cert_health_copies: "",
  cert_intl_quality_checked: false,
  cert_intl_quality_copies: "",
  cert_radio_checked: false,
  cert_radio_copies: "",
  cert_gmo_checked: false,
  cert_gmo_copies: "",
};

const CERTIFICATE_OPTIONS = [
  { key: "safety_quality", label: "Сертификат безопасности и качества" },
  { key: "health", label: "Сертификат здоровья" },
  { key: "intl_quality", label: "Международный сертификат качества" },
  { key: "radio", label: "Радиологический сертификат" },
  { key: "gmo", label: "Сертификат ГМО" },
] as const;

function mapFormToPayload(form: CreateFormState): Record<string, unknown> {
  return {
    application_number: form.application_number.trim() || null,
    application_type_code: form.application_type_code.trim() || "vnikkr",
    applicant_counterparty_uuid: form.applicant_counterparty_uuid || null,
    assigned_to: form.assigned_to || null,
    terminal_uuid: form.terminal_uuid || null,
    product_uuid: form.product_uuid || null,
    stuffing_act_uuid: form.stuffing_act_uuid.trim() || null,
    master_application_uuid: form.master_application_uuid.trim() || null,
    container_count_snapshot: form.container_count_snapshot ? Number(form.container_count_snapshot) : null,
    places_snapshot: form.places_snapshot ? Number(form.places_snapshot) : null,
    izveshenie: form.izveshenie.trim() || null,
    fss_plan_issue_date: form.fss_plan_issue_date || null,
    notes_in_table: form.notes_in_table.trim() || null,
    power_of_attorney_uuid: form.power_of_attorney_uuid || null,
    shipping_line_uuid: form.shipping_line_uuid || null,
    notes: form.notes.trim() || null,
    applicant_custom: form.applicant_custom.trim() || null,
    applicant_actual_address: form.applicant_actual_address.trim() || null,
    poruchenie: form.poruchenie.trim() || null,
    contract_number_cok: form.contract_number_cok.trim() || null,
    contract_date_cok: form.contract_date_cok || null,
    exporter_ref: form.exporter_ref || null,
    exporter_rus: form.exporter_rus.trim() || null,
    exporter_eng: form.exporter_eng.trim() || null,
    exporter_address: form.exporter_address.trim() || null,
    exporter_inn: form.exporter_inn.trim() || null,
    exporter_kpp: form.exporter_kpp.trim() || null,
    exporter_ogrn: form.exporter_ogrn.trim() || null,
    by_instruction: form.by_instruction,
    instruction_text: form.instruction_text.trim() || null,
    supply_contract_info: form.supply_contract_info.trim() || null,
    importer_uuid: form.importer_uuid || null,
    importer_custom: form.importer_custom.trim() || null,
    importer_name_eng: form.importer_name_eng.trim() || null,
    importer_address_eng: form.importer_address_eng.trim() || null,
    product_custom: form.product_custom.trim() || null,
    product_rus: form.product_rus.trim() || null,
    product_eng: form.product_eng.trim() || null,
    botanical_name: form.botanical_name.trim() || null,
    tnved_code: form.tnved_code.trim() || null,
    research_docs: form.research_docs.trim() || null,
    weight_tons: form.weight_tons ? Number(form.weight_tons) : null,
    places_count: form.places_count.trim() || null,
    packing_type: form.packing_type.trim() || null,
    destination_place: form.destination_place.trim() || null,
    inspection_place_custom: form.inspection_place_custom.trim() || null,
    planned_inspection_date: form.planned_inspection_date || null,
    cert_safety_quality_checked: form.cert_safety_quality_checked,
    cert_safety_quality_copies: form.cert_safety_quality_copies ? Number(form.cert_safety_quality_copies) : null,
    cert_health_checked: form.cert_health_checked,
    cert_health_copies: form.cert_health_copies ? Number(form.cert_health_copies) : null,
    cert_intl_quality_checked: form.cert_intl_quality_checked,
    cert_intl_quality_copies: form.cert_intl_quality_copies ? Number(form.cert_intl_quality_copies) : null,
    cert_radio_checked: form.cert_radio_checked,
    cert_radio_copies: form.cert_radio_copies ? Number(form.cert_radio_copies) : null,
    cert_gmo_checked: form.cert_gmo_checked,
    cert_gmo_copies: form.cert_gmo_copies ? Number(form.cert_gmo_copies) : null,
  };
}

export function ApplicationsCreatePage() {
  const nav = useNavigate();
  const [form, setForm] = useState<CreateFormState>(defaultState);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [sources, setSources] = useState<CodeRow[]>([]);
  const [counterparties, setCounterparties] = useState<CounterpartyRow[]>([]);
  const [terminals, setTerminals] = useState<TerminalRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [shippingLines, setShippingLines] = useState<ShippingLineRow[]>([]);
  const [poaRows, setPoaRows] = useState<PowerOfAttorneyRow[]>([]);
  const [managers, setManagers] = useState<AccountRow[]>([]);

  function fillExporterFields(c: CounterpartyRow) {
    setForm((prev) => ({
      ...prev,
      exporter_rus: c.name_ru || "",
      exporter_eng: c.name_en || "",
      exporter_address: c.legal_address_ru || "",
      exporter_inn: c.inn || "",
      exporter_kpp: c.kpp || "",
      exporter_ogrn: c.ogrn || "",
    }));
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [rSources, rCounterparties, rTerminals, rProducts, rShippingLines, rPoa, rAccounts] = await Promise.all([
        api.fetch("/lookups/source-types"),
        api.fetch("/lookups/counterparties"),
        api.fetch("/lookups/terminals"),
        api.fetch("/lookups/products"),
        api.fetch("/lookups/shipping-lines"),
        api.fetch("/lookups/powers-of-attorney"),
        api.fetch("/admin/accounts?limit=500"),
      ]);
      if (!rSources.ok || !rCounterparties.ok || !rTerminals.ok || !rProducts.ok || !rShippingLines.ok || !rPoa.ok) {
        if (!cancelled) setError("Не удалось загрузить справочники.");
        return;
      }
      if (cancelled) return;
      const src = (await rSources.json()) as CodeRow[];
      setSources(src);
      setCounterparties((await rCounterparties.json()) as CounterpartyRow[]);
      setTerminals((await rTerminals.json()) as TerminalRow[]);
      setProducts((await rProducts.json()) as ProductRow[]);
      setShippingLines((await rShippingLines.json()) as ShippingLineRow[]);
      setPoaRows((await rPoa.json()) as PowerOfAttorneyRow[]);
      if (rAccounts.ok) {
        const rows = (await rAccounts.json()) as AccountRow[];
        setManagers(rows.filter((x) => x.is_active));
      } else {
        setManagers([]);
      }
      setForm((prev) => ({
        ...prev,
        source_type: src.some((x) => x.code === prev.source_type) ? prev.source_type : src[0]?.code ?? "manual",
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const validationError = useMemo(() => {
    if (!form.source_type) return "Выберите тип источника.";
    if (!form.application_type_code.trim()) return "Укажите код типа заявки.";
    if (!form.applicant_counterparty_uuid) return "Выберите заявителя.";
    if (!form.terminal_uuid) return "Выберите терминал.";
    if (!form.product_uuid) return "Выберите продукцию.";
    return null;
  }, [form]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    const r = await api.fetch("/applications", {
      method: "POST",
      body: JSON.stringify({
        source_type: form.source_type,
        payload: mapFormToPayload(form),
      }),
    });
    if (!r.ok) {
      setError(await api.readApiError(r));
      setBusy(false);
      return;
    }
    const created = (await r.json()) as { uuid: string };
    nav(`/applications/${created.uuid}`);
  }

  return (
    <section className="card page page-wide app-create-page">
      <p>
        <Link to="/applications" className="nav-link">
          ← к списку
        </Link>
      </p>
      <h1>Создание заявки</h1>
      <p className="muted">Форма адаптирована под ваш рабочий шаблон, без смены UI-стека.</p>
      <form className="form app-create-form" onSubmit={submit}>
        <section className="app-create-form__section">
          <h2>Номер акта и основные данные</h2>
          <div className="app-create-grid">
            <div className="form-field">
              <label htmlFor="stuffing_act_uuid">Номер акта</label>
              <input id="stuffing_act_uuid" className="input" value={form.stuffing_act_uuid} onChange={(e) => setForm((prev) => ({ ...prev, stuffing_act_uuid: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="source_type">Тип источника</label>
              <select id="source_type" className="input" value={form.source_type} onChange={(e) => setForm((prev) => ({ ...prev, source_type: e.target.value }))}>
                {sources.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="application_number">Номер заявки</label>
              <input id="application_number" className="input" value={form.application_number} onChange={(e) => setForm((prev) => ({ ...prev, application_number: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="application_type_code">Тип заявки</label>
              <input id="application_type_code" className="input" value={form.application_type_code} onChange={(e) => setForm((prev) => ({ ...prev, application_type_code: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label htmlFor="master_application_uuid">№ Мастер-Акта</label>
              <input id="master_application_uuid" className="input" value={form.master_application_uuid} onChange={(e) => setForm((prev) => ({ ...prev, master_application_uuid: e.target.value }))} />
            </div>
          </div>
        </section>

        <section className="app-create-form__section">
          <h2>Заявитель</h2>
          <div className="app-create-grid">
            <div className="form-field">
              <label htmlFor="applicant_counterparty_uuid">Заявитель из справочника</label>
              <select
                id="applicant_counterparty_uuid"
                className="input"
                value={form.applicant_counterparty_uuid}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, applicant_counterparty_uuid: value }));
                  const c = counterparties.find((x) => x.uuid === value);
                  if (c) {
                    setForm((prev) => ({
                      ...prev,
                      applicant_custom: c.legal_address_ru || "",
                      applicant_actual_address: c.actual_address_ru || "",
                    }));
                  }
                }}
              >
                <option value="">—</option>
                {counterparties.map((c) => (
                  <option key={c.uuid} value={c.uuid}>
                    {c.name_ru} ({c.inn || "ИНН —"})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="applicant_custom">Юридический адрес компании Заявитель</label>
              <input id="applicant_custom" className="input" value={form.applicant_custom} onChange={(e) => setForm((prev) => ({ ...prev, applicant_custom: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="applicant_actual_address">Фактический адрес компании Заявитель</label>
              <input id="applicant_actual_address" className="input" value={form.applicant_actual_address} onChange={(e) => setForm((prev) => ({ ...prev, applicant_actual_address: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="poruchenie">Контактная информация</label>
              <input id="poruchenie" className="input" value={form.poruchenie} onChange={(e) => setForm((prev) => ({ ...prev, poruchenie: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="power_of_attorney_uuid">Доверенность №</label>
              <select id="power_of_attorney_uuid" className="input" value={form.power_of_attorney_uuid} onChange={(e) => setForm((prev) => ({ ...prev, power_of_attorney_uuid: e.target.value }))}>
                <option value="">—</option>
                {poaRows.map((p) => (
                  <option key={p.uuid} value={p.uuid}>
                    {p.poa_number}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="contract_number_cok">№ Договора с ЦОК АПК</label>
              <input id="contract_number_cok" className="input" value={form.contract_number_cok} onChange={(e) => setForm((prev) => ({ ...prev, contract_number_cok: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="contract_date_cok">Дата договора</label>
              <input id="contract_date_cok" type="date" className="input" value={form.contract_date_cok} onChange={(e) => setForm((prev) => ({ ...prev, contract_date_cok: e.target.value }))} />
            </div>
          </div>
        </section>

        <section className="app-create-form__section">
          <h2>Экспортёр</h2>
          <div className="app-create-grid">
            <div className="form-field">
              <label htmlFor="exporter_ref">Выбрать из справочника (ИНН / название)</label>
              <select
                id="exporter_ref"
                className="input"
                value={form.exporter_ref}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, exporter_ref: value }));
                  const c = counterparties.find((x) => x.uuid === value);
                  if (c) fillExporterFields(c);
                }}
              >
                <option value="">—</option>
                {counterparties.map((c) => (
                  <option key={c.uuid} value={c.uuid}>
                    {(c.inn || "—")} — {c.name_ru}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field"><label htmlFor="exporter_rus">Наименование (рус)</label><input id="exporter_rus" className="input" value={form.exporter_rus} onChange={(e) => setForm((prev) => ({ ...prev, exporter_rus: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="exporter_eng">Наименование (eng)</label><input id="exporter_eng" className="input" value={form.exporter_eng} onChange={(e) => setForm((prev) => ({ ...prev, exporter_eng: e.target.value }))} /></div>
            <div className="form-field app-create-grid__full"><label htmlFor="exporter_address">Адрес</label><input id="exporter_address" className="input" value={form.exporter_address} onChange={(e) => setForm((prev) => ({ ...prev, exporter_address: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="exporter_inn">ИНН</label><input id="exporter_inn" className="input" value={form.exporter_inn} onChange={(e) => setForm((prev) => ({ ...prev, exporter_inn: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="exporter_kpp">КПП</label><input id="exporter_kpp" className="input" value={form.exporter_kpp} onChange={(e) => setForm((prev) => ({ ...prev, exporter_kpp: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="exporter_ogrn">ОГРН</label><input id="exporter_ogrn" className="input" value={form.exporter_ogrn} onChange={(e) => setForm((prev) => ({ ...prev, exporter_ogrn: e.target.value }))} /></div>
            <div className="form-field form-field--inline">
              <label htmlFor="by_instruction">По поручению</label>
              <input id="by_instruction" type="checkbox" checked={form.by_instruction} onChange={(e) => setForm((prev) => ({ ...prev, by_instruction: e.target.checked }))} />
            </div>
            {form.by_instruction ? (
              <div className="form-field app-create-grid__full"><label htmlFor="instruction_text">Текст поручения</label><textarea id="instruction_text" className="input" value={form.instruction_text} onChange={(e) => setForm((prev) => ({ ...prev, instruction_text: e.target.value }))} /></div>
            ) : null}
            <div className="form-field app-create-grid__full"><label htmlFor="supply_contract_info">Дата и номер контракта/распоряжения на поставку</label><input id="supply_contract_info" className="input" value={form.supply_contract_info} onChange={(e) => setForm((prev) => ({ ...prev, supply_contract_info: e.target.value }))} /></div>
          </div>
        </section>

        <section className="app-create-form__section">
          <h2>Получатель</h2>
          <div className="app-create-grid">
            <div className="form-field">
              <label htmlFor="importer_uuid">Получатель из справочника</label>
              <select id="importer_uuid" className="input" value={form.importer_uuid} onChange={(e) => setForm((prev) => ({ ...prev, importer_uuid: e.target.value }))}>
                <option value="">—</option>
                {counterparties.map((c) => (
                  <option key={c.uuid} value={c.uuid}>
                    {c.name_en || c.name_ru}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field"><label htmlFor="importer_custom">Получатель (вручную)</label><input id="importer_custom" className="input" value={form.importer_custom} onChange={(e) => setForm((prev) => ({ ...prev, importer_custom: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="importer_name_eng">Наименование (eng)</label><input id="importer_name_eng" className="input" value={form.importer_name_eng} onChange={(e) => setForm((prev) => ({ ...prev, importer_name_eng: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="importer_address_eng">Адрес (eng)</label><input id="importer_address_eng" className="input" value={form.importer_address_eng} onChange={(e) => setForm((prev) => ({ ...prev, importer_address_eng: e.target.value }))} /></div>
          </div>
        </section>

        <section className="app-create-form__section">
          <h2>Продукция</h2>
          <div className="app-create-grid">
            <div className="form-field">
              <label htmlFor="product_uuid">Продукция из справочника</label>
              <select
                id="product_uuid"
                className="input"
                value={form.product_uuid}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, product_uuid: value }));
                  const p = products.find((x) => x.uuid === value);
                  if (p) {
                    setForm((prev) => ({
                      ...prev,
                      product_rus: p.product_name_ru || "",
                      product_eng: p.product_name_en || "",
                      botanical_name: p.botanical_name_latin || "",
                      tnved_code: p.hs_code_tnved || "",
                    }));
                  }
                }}
              >
                <option value="">—</option>
                {products.map((p) => (
                  <option key={p.uuid} value={p.uuid}>
                    {p.product_name_ru}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field"><label htmlFor="product_custom">Продукция (вручную)</label><input id="product_custom" className="input" value={form.product_custom} onChange={(e) => setForm((prev) => ({ ...prev, product_custom: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="product_rus">Наименование (рус)</label><input id="product_rus" className="input" value={form.product_rus} onChange={(e) => setForm((prev) => ({ ...prev, product_rus: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="product_eng">Наименование (eng)</label><input id="product_eng" className="input" value={form.product_eng} onChange={(e) => setForm((prev) => ({ ...prev, product_eng: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="botanical_name">Ботаническое название</label><input id="botanical_name" className="input" value={form.botanical_name} onChange={(e) => setForm((prev) => ({ ...prev, botanical_name: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="tnved_code">Код ТНВЭД</label><input id="tnved_code" className="input" value={form.tnved_code} onChange={(e) => setForm((prev) => ({ ...prev, tnved_code: e.target.value }))} /></div>
            <div className="form-field app-create-grid__full"><label htmlFor="research_docs">Исследования будут произведены на соответствие документам</label><textarea id="research_docs" className="input" value={form.research_docs} onChange={(e) => setForm((prev) => ({ ...prev, research_docs: e.target.value }))} /></div>
          </div>
        </section>

        <section className="app-create-form__section">
          <h2>Груз и отгрузка</h2>
          <div className="app-create-grid">
            <div className="form-field"><label htmlFor="weight_tons">Вес (тонн)</label><input id="weight_tons" type="number" className="input" value={form.weight_tons} onChange={(e) => setForm((prev) => ({ ...prev, weight_tons: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="places_count">Количество мест</label><input id="places_count" className="input" value={form.places_count} onChange={(e) => setForm((prev) => ({ ...prev, places_count: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="packing_type">Тип упаковки</label><input id="packing_type" className="input" value={form.packing_type} onChange={(e) => setForm((prev) => ({ ...prev, packing_type: e.target.value }))} /></div>
            <div className="form-field app-create-grid__full"><label htmlFor="destination_place">Пункт назначения</label><input id="destination_place" className="input" value={form.destination_place} onChange={(e) => setForm((prev) => ({ ...prev, destination_place: e.target.value }))} /></div>
          </div>
        </section>

        <section className="app-create-form__section">
          <h2>Место досмотра</h2>
          <div className="app-create-grid">
            <div className="form-field">
              <label htmlFor="terminal_uuid">Терминал</label>
              <select
                id="terminal_uuid"
                className="input"
                value={form.terminal_uuid}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({ ...prev, terminal_uuid: value }));
                  const t = terminals.find((x) => x.uuid === value);
                  if (t) setForm((prev) => ({ ...prev, inspection_place_custom: t.address_ru || "" }));
                }}
              >
                <option value="">—</option>
                {terminals.map((t) => (
                  <option key={t.uuid} value={t.uuid}>
                    {t.terminal_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field"><label htmlFor="inspection_place_custom">Адрес</label><input id="inspection_place_custom" className="input" value={form.inspection_place_custom} onChange={(e) => setForm((prev) => ({ ...prev, inspection_place_custom: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="planned_inspection_date">Предполагаемая дата начала инспекции</label><input id="planned_inspection_date" type="date" className="input" value={form.planned_inspection_date} onChange={(e) => setForm((prev) => ({ ...prev, planned_inspection_date: e.target.value }))} /></div>
            <div className="form-field">
              <label htmlFor="assigned_to">Менеджер</label>
              <select id="assigned_to" className="input" value={form.assigned_to} onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}>
                <option value="">—</option>
                {managers.map((m) => (
                  <option key={m.uuid} value={m.uuid}>
                    {m.last_name} {m.first_name} ({m.role_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="app-create-form__section">
          <h2>Плановые поля таблицы applications</h2>
          <div className="app-create-grid">
            <div className="form-field"><label htmlFor="container_count_snapshot">Кол-во</label><input id="container_count_snapshot" type="number" className="input" value={form.container_count_snapshot} onChange={(e) => setForm((prev) => ({ ...prev, container_count_snapshot: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="places_snapshot">Вес</label><input id="places_snapshot" type="number" className="input" value={form.places_snapshot} onChange={(e) => setForm((prev) => ({ ...prev, places_snapshot: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="izveshenie">Карантинки</label><input id="izveshenie" className="input" value={form.izveshenie} onChange={(e) => setForm((prev) => ({ ...prev, izveshenie: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="fss_plan_issue_date">Дата выдачи ФСС(план)</label><input id="fss_plan_issue_date" type="date" className="input" value={form.fss_plan_issue_date} onChange={(e) => setForm((prev) => ({ ...prev, fss_plan_issue_date: e.target.value }))} /></div>
            <div className="form-field"><label htmlFor="shipping_line_uuid">Линия перевозки</label><select id="shipping_line_uuid" className="input" value={form.shipping_line_uuid} onChange={(e) => setForm((prev) => ({ ...prev, shipping_line_uuid: e.target.value }))}><option value="">—</option>{shippingLines.map((s) => <option key={s.uuid} value={s.uuid}>{s.code} — {s.name_ru}</option>)}</select></div>
            <div className="form-field app-create-grid__full"><label htmlFor="notes_in_table">Комментарии в таблице</label><textarea id="notes_in_table" className="input" style={{ minHeight: 70 }} value={form.notes_in_table} onChange={(e) => setForm((prev) => ({ ...prev, notes_in_table: e.target.value }))} /></div>
            <div className="form-field app-create-grid__full"><label htmlFor="notes">Примечание</label><textarea id="notes" className="input" style={{ minHeight: 80 }} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
          </div>
        </section>

        <section className="app-create-form__section">
          <h2>Международные сертификаты</h2>
          <div className="app-create-grid">
            {CERTIFICATE_OPTIONS.map((cert) => {
              const checkedKey = `cert_${cert.key}_checked` as keyof CreateFormState;
              const copiesKey = `cert_${cert.key}_copies` as keyof CreateFormState;
              return (
                <div key={cert.key} className="form-field app-create-grid__full" style={{ borderBottom: "1px dashed #d8dee6", paddingBottom: 8 }}>
                  <div className="form-field form-field--inline" style={{ justifyContent: "space-between" }}>
                    <label htmlFor={String(checkedKey)}>{cert.label}</label>
                    <input
                      id={String(checkedKey)}
                      type="checkbox"
                      checked={Boolean(form[checkedKey])}
                      onChange={(e) => setForm((prev) => ({ ...prev, [checkedKey]: e.target.checked }))}
                    />
                  </div>
                  <div className="form-field" style={{ maxWidth: 120 }}>
                    <label htmlFor={String(copiesKey)}>Копий</label>
                    <input
                      id={String(copiesKey)}
                      type="number"
                      min={0}
                      className="input"
                      disabled={!Boolean(form[checkedKey])}
                      value={String(form[copiesKey] || "")}
                      onChange={(e) => setForm((prev) => ({ ...prev, [copiesKey]: e.target.value }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Создание..." : "Сохранить заявку"}
        </button>
      </form>
    </section>
  );
}
