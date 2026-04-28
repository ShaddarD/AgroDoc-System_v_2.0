import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSidebarCollapsed } from "../hooks/useSidebarCollapsed";
import { IconBook, IconHome, IconKey, IconList, IconLogOut, IconUsers } from "../../../shared-ui/src/NavIcons";
import { api } from "../lib/api";

type Counterparty = { uuid: string; name_ru: string };

export function AppLayout() {
  const { account, logout, loading, isAuthenticated } = useAuth();
  const nav = useNavigate();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [menuOpen, setMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string>("-");

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `app-sidebar__link${isActive ? " app-sidebar__link--active" : ""}`;

  const fullName = useMemo(() => {
    if (!account) return "";
    const fi = account.first_name?.trim().charAt(0) || "";
    const mi = account.middle_name?.trim().charAt(0) || "";
    const initials = [fi, mi].filter(Boolean).map((x) => `${x}.`).join("");
    return `${account.last_name}${initials ? ` ${initials}` : ""}`.trim();
  }, [account]);

  useEffect(() => {
    let cancelled = false;
    async function loadCompany() {
      if (!account?.counterparty_uuid) {
        setCompanyName("-");
        return;
      }
      const r = await api.fetch("/lookups/counterparties");
      if (!r.ok) {
        setCompanyName("-");
        return;
      }
      const rows = (await r.json()) as Counterparty[];
      if (!cancelled) {
        setCompanyName(rows.find((x) => x.uuid === account.counterparty_uuid)?.name_ru ?? "-");
      }
    }
    void loadCompany();
    return () => {
      cancelled = true;
    };
  }, [account?.counterparty_uuid]);

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
            <>
              <NavLink to="/lookups" className={navCls}>
                <span className="app-sidebar__link-inner">
                  <span className="app-sidebar__icon">
                    <IconBook />
                  </span>
                  <span className="app-sidebar__label">Справочники</span>
                </span>
              </NavLink>
              <NavLink to="/profile" className={navCls}>
                <span className="app-sidebar__link-inner">
                  <span className="app-sidebar__icon">
                    <IconUsers />
                  </span>
                  <span className="app-sidebar__label">Профиль</span>
                </span>
              </NavLink>
            </>
          ) : null}
          {isAuthenticated ? (
            <NavLink to="/profile" className={navCls}>
              <span className="app-sidebar__link-inner">
                <span className="app-sidebar__icon">
                  <IconKey />
                </span>
                <span className="app-sidebar__label">Безопасность</span>
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
        <header className="app-topbar">
          {isAuthenticated && account ? (
            <div className="profile-menu">
              <button type="button" className="profile-menu__toggle" onClick={() => setMenuOpen((x) => !x)}>
                <span className="profile-menu__name">{fullName}</span>
                <span className="profile-menu__company">{companyName}</span>
              </button>
              {menuOpen ? (
                <div className="profile-menu__dropdown">
                  <NavLink to="/profile" className="profile-menu__item" onClick={() => setMenuOpen(false)}>
                    Профиль
                  </NavLink>
                  <NavLink to="/profile" className="profile-menu__item" onClick={() => setMenuOpen(false)}>
                    Безопасность
                  </NavLink>
                  <button
                    type="button"
                    className="profile-menu__item profile-menu__item--danger"
                    onClick={() => {
                      setMenuOpen(false);
                      void (async () => {
                        await logout();
                        nav("/");
                      })();
                    }}
                  >
                    Выйти
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </header>
        <main className="app-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
