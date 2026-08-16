import { BarChart3, Boxes, Calendar, CalendarClock, ChevronDown, ClipboardList, Dumbbell, FileText, Gift, LayoutDashboard, LineChart, LogOut, Package, PanelLeftClose, PanelLeftOpen, Settings, Shield, ShoppingCart, Star, Store, Ticket, UserCheck, UserCircle, Users, Wallet, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { canAccess } from '../../auth/accessPolicy';
import type { Role } from '../../auth/accessPolicy';
import { useAuthStore } from '../../stores/authStore';

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard }
const common: NavItem[] = [
  { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/appointments', label: 'Lịch hẹn của tôi', icon: Calendar },
  { to: '/tickets', label: 'Hỗ trợ', icon: Ticket },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];
const member: NavItem[] = [
  { to: '/workouts', label: 'Workouts', icon: Dumbbell },
  { to: '/progress', label: 'Progress', icon: LineChart },
  { to: '/reviews', label: 'Đánh giá của tôi', icon: Star },
  { to: '/orders', label: 'Đơn hàng của tôi', icon: ShoppingCart },
  { to: '/complaints', label: 'Khiếu nại sản phẩm', icon: Ticket },
  { to: '/seller/apply', label: 'Kênh người bán', icon: Store },
  { to: '/loyalty', label: 'Loyalty', icon: Star },
  { to: '/referral', label: 'Giới thiệu', icon: Gift },
];
const coach: NavItem[] = [
  { to: '/coach', label: 'Tổng quan Coach', icon: LayoutDashboard },
  { to: '/coach/profile', label: 'Hồ sơ Coach', icon: UserCircle },
  { to: '/coach/availability', label: 'Availability', icon: CalendarClock },
  { to: '/coach/appointments', label: 'Lịch hẹn học viên', icon: Calendar },
  { to: '/coach/exercises', label: 'Thư viện bài tập', icon: Dumbbell },
  { to: '/coach/workout-programs', label: 'Chương trình của tôi', icon: ClipboardList },
  { to: '/coach/members', label: 'Học viên của tôi', icon: Users },
  { to: '/coach/assignments', label: 'Phân công chương trình', icon: ClipboardList },
  { to: '/coach/schedules', label: 'Lịch workout', icon: CalendarClock },
  { to: '/coach/sessions', label: 'Lịch sử session', icon: CalendarClock },
  { to: '/coach/progress', label: 'Tiến độ học viên', icon: LineChart },
  { to: '/reviews', label: 'Đánh giá của tôi', icon: Star },
  { to: '/orders', label: 'Đơn hàng của tôi', icon: ShoppingCart },
  { to: '/complaints', label: 'Khiếu nại sản phẩm', icon: Ticket },
  { to: '/tickets', label: 'Hỗ trợ', icon: Ticket },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];
const admin: NavItem[] = [
  { to: '/admin/coaches', label: 'Quản lý Coach', icon: Users },
  { to: '/admin/exercises', label: 'Exercise Library', icon: Dumbbell },
  { to: '/admin/workouts', label: 'Workout Governance', icon: ClipboardList },
  { to: '/admin/reviews', label: 'Review Moderation', icon: Star },
  { to: '/admin', label: 'Tổng quan quản trị', icon: Shield },
  { to: '/admin/shops', label: 'Shops', icon: Store },
  { to: '/admin/brand-requests', label: 'Brand Requests', icon: ClipboardList },
  { to: '/admin/seller-applications', label: 'Seller Applications', icon: UserCheck },
  { to: '/admin/product-moderation', label: 'Duyệt sản phẩm', icon: ClipboardList },
  { to: '/admin/orders', label: 'Đơn hàng', icon: ShoppingCart },
  { to: '/admin/complaints', label: 'Complaint Inbox', icon: Ticket },
  { to: '/admin/refunds', label: 'Hoàn tiền', icon: Wallet },
  { to: '/admin/settlements', label: 'Đối soát Seller', icon: Wallet },
  { to: '/admin/products', label: 'Sản phẩm', icon: Boxes },
  { to: '/admin/inventory', label: 'Tồn kho', icon: Package },
  { to: '/admin/analytics', label: 'Phân tích', icon: BarChart3 },
  { to: '/admin/revenue', label: 'Doanh thu membership', icon: Wallet },
  { to: '/admin/audit', label: 'Audit log', icon: FileText },
];
const seller: NavItem[] = [
  { to: '/seller/reviews', label: 'Đánh giá', icon: Star },
  { to: '/seller', label: 'Seller workspace', icon: Store },
  { to: '/seller/shop', label: 'Hồ sơ Shop', icon: Store },
  { to: '/seller/orders', label: 'Shop orders', icon: ShoppingCart },
  { to: '/seller/complaints', label: 'Khiếu nại', icon: Ticket },
  { to: '/seller/revenue', label: 'Doanh thu', icon: Wallet },
  { to: '/seller/products', label: 'Sản phẩm', icon: Boxes },
  { to: '/seller/brand-requests', label: 'Yêu cầu Brand', icon: ClipboardList },
  { to: '/seller/apply', label: 'Hồ sơ đã duyệt', icon: UserCheck },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [adminOpen, setAdminOpen] = useState(true);
  const role = user?.role as Role | undefined;
  const groups = role === 'admin' ? [{ label: 'Quản trị', items: admin }] : role === 'coach' ? [{ label: 'Không gian Coach', items: coach }] : role === 'seller' ? [{ label: 'Kênh người bán', items: seller }] : [{ label: 'Cá nhân', items: member }, { label: 'Chung', items: common }];
  const signOut = async () => { await logout(); window.location.replace('/login'); };
  const contextLabel = role === 'admin' ? 'ADMIN CONTROL' : role === 'coach' ? 'COACH WORKSPACE' : role === 'seller' ? 'SELLER WORKSPACE' : 'MEMBER SPACE';
  return (
    <aside className="command-sidebar">
      <div className="sidebar-brand">
        <Link to="/" onClick={onClose} className="sidebar-brand-link" aria-label="Về trang chủ GymFit" title="Về trang chủ GymFit">
          <div className="brand-mark">G</div>
          <div className="sidebar-brand-copy"><strong>GYMFIT</strong><small>COMMAND CENTER</small></div>
        </Link>
        <div className="sidebar-actions">
          {onToggleCollapse && <button
            className="icon-button sidebar-collapse-button"
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>}
          {onClose && <button className="icon-button mobile-close" type="button" onClick={onClose} aria-label="Đóng menu"><X size={18} aria-hidden="true" /></button>}
        </div>
      </div>
      <div className="sidebar-context" title={contextLabel}><span className="status-dot" /><span className="sidebar-context-label">{contextLabel}</span></div>
      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        {groups.map(group => <div className="nav-group" key={group.label}>
          <span className="nav-label">{group.label}</span>
          {group.items.filter(item => role && canAccess(role, item.to)).map(item => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return <Link key={item.to} to={item.to} onClick={onClose} className={`nav-item ${active ? 'active' : ''}`} aria-label={item.label} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined}>
              <item.icon size={17} aria-hidden="true" /><span>{item.label}</span>
            </Link>;
          })}
        </div>)}
        {role === 'admin' && <div className="nav-group">
          <button className="nav-label nav-toggle" type="button" onClick={() => setAdminOpen(value => !value)} aria-expanded={adminOpen} title="Hệ thống"><span className="nav-toggle-label">Hệ thống</span><ChevronDown size={14} className={adminOpen ? '' : 'rotate-[-90deg]'} aria-hidden="true" /></button>
          {adminOpen && <Link to="/admin/backup" onClick={onClose} className={`nav-item ${location.pathname === '/admin/backup' ? 'active' : ''}`} aria-label="Backup" title={collapsed ? 'Backup' : undefined} aria-current={location.pathname === '/admin/backup' ? 'page' : undefined}><Shield size={17} aria-hidden="true" /><span>Backup</span></Link>}
        </div>}
      </nav>
      <div className="sidebar-footer">
        <div className="profile-row"><div className="avatar" aria-hidden="true">{user?.name?.slice(0, 1).toUpperCase() || 'G'}</div><div className="profile-copy"><strong>{user?.name || 'GYMFIT user'}</strong><small>{role || 'member'}</small></div></div>
        <button className="logout-button" type="button" onClick={() => void signOut()} aria-label="Đăng xuất" title={collapsed ? 'Đăng xuất' : undefined}><LogOut size={16} aria-hidden="true" /><span>Đăng xuất</span></button>
      </div>
    </aside>
  );
}
