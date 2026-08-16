import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SellerProductSummary, sellerProductsApi } from '../../services/sellerProductsApi';

export default function SellerProductsPage() {
  const [items, setItems] = useState<SellerProductSummary[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (targetPage = page) => {
    setLoading(true); setError('');
    try {
      const response = await sellerProductsApi.list({
        page: targetPage, limit: 20, search: search || undefined,
        status: status || undefined, sort: 'created_desc',
      });
      setItems(response.data.data);
      setPage(response.data.pagination.page);
      setPages(Math.max(1, response.data.pagination.pages));
    } catch (cause: any) {
      setError(cause.response?.data?.message || 'Không thể tải sản phẩm');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(1); }, []);
  const submit = (event: FormEvent) => { event.preventDefault(); void load(1); };

  return <section className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">Quản lý sản phẩm</p>
        <h1 className="text-3xl font-bold">Sản phẩm của cửa hàng</h1>
        <p className="text-slate-400">Tạo sản phẩm, quản lý biến thể, hình ảnh, tồn kho và gửi xét duyệt.</p>
      </div>
      <Link className="btn-primary w-full text-center sm:w-auto" to="/seller/products/new">+ Thêm sản phẩm</Link>
    </div>
    <form className="flex flex-wrap gap-3" onSubmit={submit}>
      <input className="min-w-64 rounded border border-slate-700 bg-slate-950 p-2" placeholder="Tên hoặc SKU" value={search} onChange={event => setSearch(event.target.value)} />
      <select className="rounded border border-slate-700 bg-slate-950 p-2" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Tạm ẩn</option>
      </select>
      <button className="btn-primary" type="submit">Lọc</button>
    </form>
    {error && <p className="text-red-400">{error}</p>}
    {loading ? <p>Đang tải…</p> : <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-left"><thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">Sản phẩm</th><th>Brand / Category</th><th>Biến thể</th><th>Tồn khả dụng</th><th>Moderation</th><th>Cập nhật</th></tr></thead>
        <tbody>{items.map(product => <tr className="border-t border-slate-800" key={product.id}>
          <td className="p-3"><div className="flex items-center gap-3">{product.primaryImage ? <img className="h-12 w-12 rounded object-cover" src={product.primaryImage} alt={`Ảnh sản phẩm ${product.name}`} /> : <div className="h-12 w-12 rounded bg-slate-800" aria-hidden="true" />}<div><Link className="font-semibold text-emerald-400" to={`/seller/products/${product.id}`}>{product.name}</Link><small className="block text-slate-500">#{product.id}</small></div></div></td>
          <td>{product.brand || product.brandRequestName || '—'} / {product.category || '—'}</td><td>{product.variantCount}</td><td>{product.availableInventory ?? 0}</td><td>{product.moderationStatus}<small className="block text-slate-500">{product.isActive ? 'Active' : 'Not public'}</small></td><td className="pr-3 text-sm text-slate-400">{new Date(product.updatedAt).toLocaleDateString('vi-VN')}<small className="block">Tạo {new Date(product.createdAt).toLocaleDateString('vi-VN')}</small></td>
        </tr>)}</tbody>
      </table>
      {!items.length && <p className="p-6 text-center text-slate-400">Không có sản phẩm phù hợp.</p>}
    </div>}
    <div className="flex items-center justify-end gap-3"><button disabled={loading || page <= 1} onClick={() => void load(page - 1)}>Trang trước</button><span>{page} / {pages}</span><button disabled={loading || page >= pages} onClick={() => void load(page + 1)}>Trang sau</button></div>
  </section>;
}
