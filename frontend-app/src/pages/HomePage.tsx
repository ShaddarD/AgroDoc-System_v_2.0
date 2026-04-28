import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const { isAuthenticated } = useAuth();
  return (
    <section className="card page">
      <h1>Пользовательский интерфейс</h1>
      <p>Список заявок, карточка, ревизии и записи аудита — после входа (JWT, bearer).</p>
      {isAuthenticated ? (
        <Link to="/applications" className="btn-primary">
          Перейти к заявкам
        </Link>
      ) : (
        <p>
          <Link to="/login" className="btn-primary">
            Войти
          </Link>
        </p>
      )}
    </section>
  );
}