import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useEffect, useState } from "react";

type HomeVariant = "classic" | "table";

const HOME_VARIANT_KEY = "agrodoc_home_variant";

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const [variant, setVariant] = useState<HomeVariant>("classic");

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(HOME_VARIANT_KEY) : null;
    if (stored === "classic" || stored === "table") {
      setVariant(stored);
    }
  }, []);

  function updateVariant(next: HomeVariant) {
    setVariant(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(HOME_VARIANT_KEY, next);
    }
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
          <p className="muted">Вариант главной в табличном формате, как в рабочих реестрах.</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Клиент</th>
                  <th>Номер заявки</th>
                  <th>Статус</th>
                  <th>Терминал</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>ООО Пример Экспорт</td>
                  <td>REQ-000231</td>
                  <td>IN_REVIEW</td>
                  <td>Новороссийск</td>
                  <td>28.04.2026</td>
                </tr>
                <tr>
                  <td>АО Агро Трейд</td>
                  <td>REQ-000232</td>
                  <td>APPROVED</td>
                  <td>Туапсе</td>
                  <td>28.04.2026</td>
                </tr>
                <tr>
                  <td colSpan={5} className="muted">
                    Демонстрационный вид реестра. Рабочие данные доступны в разделе «Заявки».
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {action}
        </>
      )}
    </section>
  );
}