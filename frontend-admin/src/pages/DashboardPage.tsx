import { useAuth } from "../auth/AuthContext";

export function DashboardPage() {
  const { account } = useAuth();
  return (
    <section className="card page">
      <h1>Панель администратора</h1>
      <p>
        Вы вошли как <strong>{account?.login}</strong>, роль <code>{account?.role_code}</code>.
      </p>
      <p className="muted">Список заявок и тяжёлые отчёты — в отдельных итерациях.</p>
    </section>
  );
}