import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useSidebarCollapsed } from "../hooks/useSidebarCollapsed";
import { IconHome, IconKey, IconList, IconLogOut } from "../../../shared-ui/src/NavIcons";

export function AppLayout() {
  const { account, logout, loading, isAuthenticated } = useAuth();
  const nav = useNavigate();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`;

  return (
    <div className="app-shell">
      <aside
        className={`app-sidebar${collapsed ? " app-sidebar--collapsed" : ""}`}
        aria-label="Основная навигация"
      >
        <div className="app-sidebar__head">
          <span className="app-sidebar__brand">AgroDoc</span>
          <button
            type="button"
            className="app-sidebar__toggle"
            onClick={toggleCollapsed}
            title={collapsed ? "Развернуть меню" : "Свернуть меню"}
            aria-expanded={!collapsed}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>
        <nav className="app-sidebar__nav">
          <NavLink to="/" end className={navCls}>
            <span className="app-sidebar__link-inner">
              <span className="app-sidebar__icon">
                <IconHome />
              </span>
              <span className="app-sidebar__label">Главная</span>
            </span>
          </NavLink>
          <NavLink to="/applications" className={navCls}>
            <span className="app-sidebar__link-inner">
              <span className="app-sidebar__icon">
                <IconList />
              </span>
              <span className="app-sidebar__label">Заявки</span>
            </span>
          </NavLink>
          {isAuthenticated ? (
            <NavLink to="/password" className={navCls}>
              <span className="app-sidebar__link-inner">
                <span className="app-sidebar__icon">
                  <IconKey />
                </span>
                <span className="app-sidebar__label">Смена пароля</span>
              </span>
            </NavLink>
          ) : null}
        </nav>
        <div className="app-sidebar__foot">
          {loading ? (
            <span className="muted">…</span>
          ) : isAuthenticated && account ? (
            <div className="app-sidebar__user">
              <div>
                <div className="app-sidebar__name">
                  {account.first_name} {account.last_name}
                </div>
                <div className="muted">({account.role_code})</div>
              </div>
              <div className="app-sidebar__actions">
                <button
                  type="button"
                  className="btn-ghost"
                  title="Выйти"
                  onClick={() => {
                    void (async () => {
                      await logout();
                      nav("/");
                    })();
                  }}
                >
                  <span className="app-sidebar__link-inner">
                    <span className="app-sidebar__icon">
                      <IconLogOut />
                    </span>
                    <span className="app-sidebar__label">Выйти</span>
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <NavLink to="/login" className={navCls}>
              <span className="app-sidebar__link-inner">
                <span className="app-sidebar__icon">
                  <IconKey />
                </span>
                <span className="app-sidebar__label">Войти</span>
              </span>
            </NavLink>
          )}
        </div>
      </aside>
      <div className="app-shell__content">
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
