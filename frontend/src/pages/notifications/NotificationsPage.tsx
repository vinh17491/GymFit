import NotificationFeed from '../../components/notifications/NotificationFeed';

export default function NotificationsPage() {
  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div><p className="dashboard-eyebrow">ACCOUNT / NOTIFICATIONS</p><h1>Thông báo</h1><p className="dashboard-description">Theo dõi các cập nhật liên quan đến lịch hẹn, chương trình và tài khoản.</p></div>
      </header>
      <div className="dashboard-panel max-w-3xl"><NotificationFeed /></div>
    </section>
  );
}
