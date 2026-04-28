import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useSidebarCollapsed } from "../hooks/useSidebarCollapsed";
import {
  IconBook,
  IconClipboard,
  IconKey,
  IconLayout,
  IconLogOut,
  IconUsers,
} from "../../../shared-ui/src/NavIcons";

export function AdminLayout() {
  const { account, logout } = useAuth();
  const nav = useNavigate();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`;

  return (
    <div className="app-shell">
      <aside
        className={`app-sidebar${collapsed ? " app-sidebar--collapsed" : ""}`}
        aria-label="Админ: навигация"
      >
        <div className="app-sidebar__head">
          <span className="app-sidebar__brand">AgroDoc Admin</span>
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
                <IconLayout />
              </span>
              <span className="app-sidebar__label">Панель</span>
            </span>
          </NavLink>
          <NavLink to="/users" className={navCls}>
            <span className="app-sidebar__link-inner">
              <span className="app-sidebar__icon">
                <IconUsers />
              </span>
              <span className="app-sidebar__label">Пользователи</span>
            </span>
          </NavLink>
          <NavLink to="/lookups" className={navCls}>
            <span className="app-sidebar__link-inner">
              <span className="app-sidebar__icon">
                <IconBook />
              </span>
              <span className="app-sidebar__label">Справочники</span>
            </span>
          </NavLink>
          <NavLink to="/audit" className={navCls}>
            <span className="app-sidebar__link-inner">
              <span className="app-sidebar__icon">
                <IconClipboard />
              </span>
              <span className="app-sidebar__label">Аудит</span>
            </span>
          </NavLink>
          <NavLink to="/password" className={navCls}>
            <span className="app-sidebar__link-inner">
              <span className="app-sidebar__icon">
                <IconKey />
              </span>
              <span className="app-sidebar__label">Смена пароля</span>
            </span>
          </NavLink>
        </nav>
        {account ? (
          <div className="app-sidebar__foot">
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
                      nav("/login");
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
          </div>
        ) : null}
      </aside>
      <div className="app-shell__content">
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
