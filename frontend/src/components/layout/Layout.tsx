import { useEffect, useRef, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '../notifications/NotificationBell';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const title = location.pathname.startsWith('/admin')
    ? 'Quản trị'
    : location.pathname.startsWith('/seller')
      ? 'Kênh người bán'
      : location.pathname.startsWith('/coach')
        ? 'Không gian Coach'
        : 'Không gian cá nhân';

  const closeMobileMenu = () => {
    setMobileOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const selector = 'button:not([disabled]), a[href]';
    requestAnimationFrame(() => drawerRef.current?.querySelector<HTMLElement>(selector)?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileMenu();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(selector))
        .filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className={`app-shell ${desktopCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`desktop-sidebar ${desktopCollapsed ? 'is-collapsed' : ''}`} aria-label="Điều hướng tài khoản">
        <Sidebar
          collapsed={desktopCollapsed}
          onToggleCollapse={() => setDesktopCollapsed(value => !value)}
        />
      </aside>
      {mobileOpen && (
        <div id="authenticated-navigation" className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu tài khoản">
          <div className="drawer-backdrop" aria-hidden="true" onClick={closeMobileMenu} />
          <div ref={drawerRef} className="drawer-content"><Sidebar onClose={closeMobileMenu} /></div>
        </div>
      )}
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-context">
            <button
              ref={menuButtonRef}
              className="menu-button"
              type="button"
              onClick={() => setMobileOpen(value => !value)}
              aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobileOpen}
              aria-controls="authenticated-navigation"
            >
              <Menu size={19} aria-hidden="true" />
            </button>
            <Link to="/" className="topbar-home-link" aria-label="Về trang chủ GymFit">
              <span className="topbar-home-mark">G</span>
              <strong>GYMFIT</strong>
            </Link>
            <div className="topbar-section"><span>GYMFIT / {title}</span><strong>{title}</strong></div>
          </div>
          <div className="topbar-tools">
            <button
              className="icon-button topbar-search-button"
              type="button"
              aria-label="Mở tìm kiếm nhanh"
              onClick={() => window.dispatchEvent(new Event('open-command-menu'))}
            >
              <Search size={18} aria-hidden="true" />
              <span className="topbar-search-hint">Ctrl K</span>
            </button>
            <NotificationBell />
            <span className="topbar-date">{new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </header>
        <main className="app-content"><div className="content-frame" key={location.pathname}><Outlet /></div></main>
      </div>
    </div>
  );
}
