import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { DashboardPageHeader, DashboardPanel, QuickAction, QuickStartCard } from '../../components/dashboard/DashboardPrimitives';

export default function SellerFoundationPage(){
  const user=useAuthStore(state=>state.user);
  const shortcuts=[
    {to:'/seller/products/new',label:'Thêm sản phẩm',description:'Tạo Product DRAFT mới'},
    {to:'/seller/products',label:'Quản lý sản phẩm',description:'Biến thể, ảnh, tồn kho và xét duyệt'},
    {to:'/seller/orders',label:'Đơn hàng',description:'Theo dõi Shop orders'},
    {to:'/seller/revenue',label:'Doanh thu',description:'Xem dữ liệu đối soát từ backend'},
    {to:'/seller/complaints',label:'Khiếu nại',description:'Theo dõi complaint của Shop'},
  ];
  return <div className="dashboard-page seller-dashboard">
    <DashboardPageHeader eyebrow="KÊNH NGƯỜI BÁN" title={`Chào mừng ${user?.name || 'Seller'}`} description="Quản lý Shop, Product và đơn hàng trong một workspace rõ ràng." action={<Link className="primary-button" to="/seller/products/new">Thêm sản phẩm</Link>} />
    <QuickStartCard title="Bắt đầu bán hàng" description="Hoàn thiện nền tảng rồi theo dõi các luồng vận hành có sẵn." steps={[{ to:'/seller/shop', title:'Hoàn thiện hồ sơ Shop', description:'Cập nhật thông tin và trang Shop công khai.' }, { to:'/seller/products/new', title:'Thêm sản phẩm', description:'Tạo Product DRAFT theo form hiện có.' }, { to:'/seller/orders', title:'Kiểm tra đơn hàng', description:'Theo dõi Shop orders từ backend.' }]} />
    <DashboardPanel title="Lối tắt" description="Các khu vực Seller thường dùng"><div className="quick-grid">{shortcuts.map(shortcut=><QuickAction key={shortcut.to} to={shortcut.to} title={shortcut.label} description={shortcut.description} icon={<span aria-hidden="true">→</span>} />)}</div></DashboardPanel>
    <DashboardPanel title="Quản lý Shop" description="Cập nhật hồ sơ và mở trang Shop công khai."><div className="header-links"><Link className="secondary-button" to="/seller/shop">Hồ sơ Shop</Link><Link className="secondary-button" to="/seller/apply">Hồ sơ đã duyệt</Link></div></DashboardPanel>
  </div>;
}
