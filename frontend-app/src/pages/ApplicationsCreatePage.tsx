import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type CodeRow = { code: string; description: string };
type CounterpartyRow = { uuid: string; name_ru: string };
type TerminalRow = { uuid: string; terminal_code: string; terminal_name: string };
type ProductRow = { uuid: string; product_code: string; product_name_ru: string };
type ShippingLineRow = { uuid: string; code: string; name_ru: string };
type PowerOfAttorneyRow = { uuid: string; poa_number: string; issue_date: string };
type AccountRow = { uuid: string; first_name: string; last_name: string; role_code: string; is_active: boolean };

type CreateFormState = {
  source_type: string;
  application_number: string;
  application_type_code: string;
  applicant_counterparty_uuid: string;
  assigned_to: string;
  terminal_uuid: string;
  product_uuid: string;
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
};

const defaultState: CreateFormState = {
  source_type: "manual",
  application_number: "",
  application_type_code: "vnikkr",
  applicant_counterparty_uuid: "",
  assigned_to: "",
  terminal_uuid: "",
  product_uuid: "",
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
};

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
    if (!form.applicant_counterparty_uuid) return "Выберите контрагента.";
    if (!form.terminal_uuid) return "Выберите терминал.";
    if (!form.product_uuid) return "Выберите продукт.";
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
      <p className="muted">Форма приближена к рабочему шаблону реестра и заполняет поля таблицы applications.</p>
      <form className="form app-create-form" onSubmit={submit}>
        <section className="app-create-form__section">
          <h2>Основные данные</h2>
          <div className="app-create-grid">
            <div className="form-field">
              <label htmlFor="source_type">Тип источника</label>
              <select
                id="source_type"
                className="input"
                value={form.source_type}
                onChange={(e) => setForm((prev) => ({ ...prev, source_type: e.target.value }))}
              >
                {sources.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="application_number">№ заявки</label>
              <input id="application_number" className="input" value={form.application_number} onChange={(e) => setForm((prev) => ({ ...prev, application_number: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="application_type_code">Тип заявки</label>
              <input id="application_type_code" className="input" value={form.application_type_code} onChange={(e) => setForm((prev) => ({ ...prev, application_type_code: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label htmlFor="stuffing_act_uuid">№ Акта</label>
              <input id="stuffing_act_uuid" className="input" value={form.stuffing_act_uuid} onChange={(e) => setForm((prev) => ({ ...prev, stuffing_act_uuid: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="master_application_uuid">№ Мастер-Акта</label>
              <input id="master_application_uuid" className="input" value={form.master_application_uuid} onChange={(e) => setForm((prev) => ({ ...prev, master_application_uuid: e.target.value }))} />
            </div>
          </div>
        </section>

        <section className="app-create-form__section">
          <h2>Участники и справочники</h2>
          <div className="app-create-grid">
            <div className="form-field">
              <label htmlFor="applicant_counterparty_uuid">Клиент</label>
              <select id="applicant_counterparty_uuid" className="input" value={form.applicant_counterparty_uuid} onChange={(e) => setForm((prev) => ({ ...prev, applicant_counterparty_uuid: e.target.value }))}>
                <option value="">—</option>
                {counterparties.map((c) => (
                  <option key={c.uuid} value={c.uuid}>{c.name_ru}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="assigned_to">Менеджер</label>
              <select id="assigned_to" className="input" value={form.assigned_to} onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}>
                <option value="">—</option>
                {managers.map((m) => (
                  <option key={m.uuid} value={m.uuid}>{m.last_name} {m.first_name} ({m.role_code})</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="product_uuid">Культура</label>
              <select id="product_uuid" className="input" value={form.product_uuid} onChange={(e) => setForm((prev) => ({ ...prev, product_uuid: e.target.value }))}>
                <option value="">—</option>
                {products.map((p) => (
                  <option key={p.uuid} value={p.uuid}>{p.product_code} — {p.product_name_ru}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="terminal_uuid">Терминал</label>
              <select id="terminal_uuid" className="input" value={form.terminal_uuid} onChange={(e) => setForm((prev) => ({ ...prev, terminal_uuid: e.target.value }))}>
                <option value="">—</option>
                {terminals.map((t) => (
                  <option key={t.uuid} value={t.uuid}>{t.terminal_code} — {t.terminal_name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="shipping_line_uuid">Линия перевозки</label>
              <select id="shipping_line_uuid" className="input" value={form.shipping_line_uuid} onChange={(e) => setForm((prev) => ({ ...prev, shipping_line_uuid: e.target.value }))}>
                <option value="">—</option>
                {shippingLines.map((s) => (
                  <option key={s.uuid} value={s.uuid}>{s.code} — {s.name_ru}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="power_of_attorney_uuid">Доверенность</label>
              <select id="power_of_attorney_uuid" className="input" value={form.power_of_attorney_uuid} onChange={(e) => setForm((prev) => ({ ...prev, power_of_attorney_uuid: e.target.value }))}>
                <option value="">—</option>
                {poaRows.map((p) => (
                  <option key={p.uuid} value={p.uuid}>{p.poa_number} ({p.issue_date})</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="app-create-form__section">
          <h2>Показатели и плановые поля</h2>
          <div className="app-create-grid">
            <div className="form-field">
              <label htmlFor="container_count_snapshot">Кол-во</label>
              <input id="container_count_snapshot" type="number" className="input" value={form.container_count_snapshot} onChange={(e) => setForm((prev) => ({ ...prev, container_count_snapshot: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="places_snapshot">Вес</label>
              <input id="places_snapshot" type="number" className="input" value={form.places_snapshot} onChange={(e) => setForm((prev) => ({ ...prev, places_snapshot: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="izveshenie">Карантинки</label>
              <input id="izveshenie" className="input" value={form.izveshenie} onChange={(e) => setForm((prev) => ({ ...prev, izveshenie: e.target.value }))} />
            </div>
            <div className="form-field">
              <label htmlFor="fss_plan_issue_date">Дата выдачи ФСС(план)</label>
              <input id="fss_plan_issue_date" type="date" className="input" value={form.fss_plan_issue_date} onChange={(e) => setForm((prev) => ({ ...prev, fss_plan_issue_date: e.target.value }))} />
            </div>
            <div className="form-field app-create-grid__full">
              <label htmlFor="notes_in_table">Комментарии в таблице</label>
              <textarea id="notes_in_table" className="input" style={{ minHeight: 80 }} value={form.notes_in_table} onChange={(e) => setForm((prev) => ({ ...prev, notes_in_table: e.target.value }))} />
            </div>
            <div className="form-field app-create-grid__full">
              <label htmlFor="notes">Примечание</label>
              <textarea id="notes" className="input" style={{ minHeight: 80 }} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
        </section>

        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Создание..." : "Создать заявку"}
        </button>
      </form>
    </section>
  );
}
