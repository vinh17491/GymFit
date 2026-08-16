import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, Inbox, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../api/axios";

type Role = "buyer" | "seller" | "admin";
type Complaint = {
  id: number;
  orderNumber: string;
  shopOrderId: number;
  shopName: string;
  productName: string;
  variantName: string;
  affectedQuantity: number;
  category: string;
  description: string;
  status: string;
  faultParty: string;
  adminDecisionReason?: string | null;
  createdAt: string;
  settlementStatus: string;
  batchId?: number | null;
  replacementId?: number | null;
  replacementStatus?: string | null;
  replacementQuantity?: number | null;
  refundId?: number | null;
  refundStatus?: string | null;
  refundAmount?: number | null;
  events?: Array<{ id: number; eventType: string; newStatus?: string; reason: string; createdAt: string }>;
  replacementHistory?: Array<{ id: number; newStatus: string; reason: string; createdAt: string }>;
};

const endpoint = {
  buyer: "/complaints",
  seller: "/seller/complaints",
  admin: "/admin/complaints",
} as const;
const errorText = (error: any) =>
  error?.response?.data?.message || "Không thể hoàn tất thao tác.";

export default function ComplaintsPage({ role }: { role: Role }) {
  const [params] = useSearchParams();
  const [rows, setRows] = useState<Complaint[]>([]);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [status, setStatus] = useState("");
  const [faultParty, setFaultParty] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [form, setForm] = useState({
    orderItemId: params.get("orderItemId") || "",
    category: "DAMAGED",
    affectedQuantity: "1",
    description: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query =
        role === "admin"
          ? { status: status || undefined, faultParty: faultParty || undefined, search: search || undefined, from: from || undefined, to: to || undefined }
          : undefined;
      const response = await api.get<{ data: Complaint[] }>(endpoint[role], { params: query });
      setRows(response.data.data);
      if (selected) {
        const detail = await api.get<{ data: Complaint }>(`${endpoint[role]}/${selected.id}`);
        setSelected(detail.data.data);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [role, status, faultParty, search, from, to, selected?.id]);
  useEffect(() => { void load(); }, [role, status, faultParty, from, to]);

  const open = async (id: number) => {
    setError("");
    try {
      setSelected((await api.get<{ data: Complaint }>(`${endpoint[role]}/${id}`)).data.data);
    } catch (e) { setError(errorText(e)); }
  };
  const action = async (path: string, body: object = {}) => {
    setError(""); setSuccess("");
    try {
      await api.post(path, body);
      setSuccess("Đã cập nhật thành công.");
      await load();
    } catch (e) { setError(errorText(e)); }
  };
  const create = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setSuccess("");
    try {
      const result = await api.post<{ data: Complaint }>("/complaints", {
        orderItemId: Number(form.orderItemId),
        category: form.category,
        affectedQuantity: Number(form.affectedQuantity),
        description: form.description,
      });
      setSelected(result.data.data);
      setSuccess("GymFit đã tiếp nhận khiếu nại. Settlement chưa bị giữ khi chưa có kết luận lỗi Seller.");
      setForm(value => ({ ...value, description: "" }));
      await load();
    } catch (e) { setError(errorText(e)); }
  };
  const reason = (label: string) => window.prompt(label)?.trim() || "";
  const adminDecision = async (kind: "seller-fault" | "buyer-fault" | "gymfit-carrier") => {
    if (!selected) return;
    const why = reason("Lý do quyết định (bắt buộc)");
    if (!why) return;
    if (kind === "seller-fault") {
      const quantity = Number(window.prompt("Số lượng thay thế", String(selected.affectedQuantity)));
      if (!Number.isInteger(quantity) || quantity < 1) return;
      await action(`/admin/complaints/${selected.id}/decisions/seller-fault`, { reason: why, replacementQuantity: quantity });
    } else {
      await action(`/admin/complaints/${selected.id}/decisions/${kind}`, { reason: why });
    }
  };
  const replacementAction = async (next: string) => {
    if (!selected?.replacementId) return;
    const needsReason = next === "HUB_CHECK_FAILED" || next === "FAILED";
    const why = needsReason ? reason("Lý do (bắt buộc)") : reason("Ghi chú (không bắt buộc)");
    if (needsReason && !why) return;
    await action(`/admin/complaints/replacements/${selected.replacementId}/actions`, { action: next, ...(why ? { reason: why } : {}) });
  };

  return <main className="complaint-page mx-auto max-w-7xl space-y-6">
    <header className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-300">Hỗ trợ đơn hàng</p>
      <div>
        <h1 className="page-title">{role === "admin" ? "Admin Complaint Inbox" : role === "seller" ? "Khiếu nại của Shop" : "Khiếu nại sản phẩm"}</h1>
        <p className="page-subtitle max-w-3xl">Replacement là phương án ưu tiên; refund chỉ là fallback sau khi replacement thất bại.</p>
      </div>
    </header>

    {role === "buyer" && <form onSubmit={create} className="surface-panel grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <label className="label" htmlFor="complaint-order-item">OrderItem ID<input id="complaint-order-item" className="input-field mt-2" required type="number" min="1" value={form.orderItemId} onChange={e => setForm({ ...form, orderItemId: e.target.value })}/></label>
      <label className="label" htmlFor="complaint-category">Loại khiếu nại<select id="complaint-category" className="input-field mt-2" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option>DAMAGED</option><option>WRONG_ITEM</option><option>MISSING_QUANTITY</option><option>QUALITY_ISSUE</option><option>OTHER</option></select></label>
      <label className="label" htmlFor="complaint-quantity">Số lượng ảnh hưởng<input id="complaint-quantity" className="input-field mt-2" required type="number" min="1" value={form.affectedQuantity} onChange={e => setForm({ ...form, affectedQuantity: e.target.value })}/></label>
      <label className="label md:col-span-2 lg:col-span-3" htmlFor="complaint-description">Mô tả<textarea id="complaint-description" className="input-field mt-2" required minLength={10} maxLength={2000} rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/><span className="form-hint mt-2 block">Mô tả tình trạng sản phẩm trong 10–2.000 ký tự.</span></label>
      <div className="warning-panel flex gap-3 p-4 text-sm leading-6 md:col-span-2 lg:col-span-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={18}/><p>Chỉ áp dụng trong 7 ngày từ khi giao và trước khi settlement PAID. Ngoài phạm vi này, vui lòng dùng <Link className="font-semibold text-amber-200 underline underline-offset-4 hover:text-white" to="/tickets">hỗ trợ thủ công</Link>; GymFit không hứa tự động hold hoặc refund.</p></div>
      <button className="btn-primary w-full sm:w-fit" type="submit">Gửi khiếu nại</button>
    </form>}

    {role === "admin" && <section aria-label="Bộ lọc khiếu nại" className="surface-panel grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr_1fr_1fr_auto]">
      <label className="label" htmlFor="complaint-status">Trạng thái<select id="complaint-status" className="input-field mt-2" value={status} onChange={e => setStatus(e.target.value)}><option value="">Mọi status</option><option>OPEN</option><option>UNDER_REVIEW</option><option>REPLACEMENT_REQUIRED</option><option>RESOLVED</option><option>REJECTED</option></select></label>
      <label className="label" htmlFor="complaint-fault">Phân loại lỗi<select id="complaint-fault" className="input-field mt-2" value={faultParty} onChange={e => setFaultParty(e.target.value)}><option value="">Mọi fault</option><option>UNDETERMINED</option><option>SELLER_FAULT</option><option>BUYER_FAULT</option><option>GYMFIT_OR_CARRIER</option></select></label>
      <label className="label" htmlFor="complaint-search">Tìm kiếm<input id="complaint-search" className="input-field mt-2" placeholder="Shop / Order / ID" value={search} onChange={e => setSearch(e.target.value)}/></label>
      <label className="label" htmlFor="complaint-from">Từ ngày<input id="complaint-from" className="input-field mt-2" type="date" value={from} onChange={e => setFrom(e.target.value)}/></label>
      <label className="label" htmlFor="complaint-to">Đến ngày<input id="complaint-to" className="input-field mt-2" type="date" value={to} onChange={e => setTo(e.target.value)}/></label>
      <button type="button" className="btn-secondary self-end" onClick={() => void load()}>Tìm</button>
    </section>}

    {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
    {success && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{success}</p>}

    <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
      <section aria-label="Danh sách khiếu nại" className="surface-panel overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4 text-sm font-semibold text-slate-200"><Inbox size={17} className="text-lime-300"/> Danh sách khiếu nại</div>
        {loading ? <p className="p-8 text-center text-slate-400">Đang tải…</p> : rows.length === 0 ? <div className="grid min-h-44 place-items-center p-8 text-center text-slate-400"><div><ClipboardList className="mx-auto mb-3 text-slate-600" size={28}/><p>Chưa có khiếu nại.</p></div></div> : rows.map(row => <button type="button" key={row.id} className={`block w-full border-b border-slate-800 p-4 text-left transition last:border-b-0 hover:bg-slate-900 ${selected?.id === row.id ? "bg-lime-300/10 shadow-[inset_3px_0_0_var(--accent)]" : ""}`} onClick={() => void open(row.id)}>
          <strong className="block text-sm text-slate-100">#{row.id} · {row.productName}</strong><span className="mt-1 block text-xs leading-5 text-slate-400">{row.shopName} · {row.orderNumber}</span><span className="mt-2 inline-flex rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-300">{row.status} / {row.faultParty}</span>
        </button>)}
      </section>

      <section aria-label="Chi tiết khiếu nại" className="surface-panel min-h-[280px]">
        {!selected ? <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-800 text-center text-slate-400"><div><ClipboardList className="mx-auto mb-3 text-slate-600" size={30}/><p>Chọn một khiếu nại để xem chi tiết.</p></div></div> : <div className="space-y-5">
          <div className="border-b border-slate-800 pb-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-lime-300">Complaint #{selected.id}</p><h2 className="mt-2 text-xl font-bold text-white">{selected.productName}</h2></div><span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">{selected.status}</span></div><p className="mt-2 text-sm text-slate-300">{selected.variantName} · SL {selected.affectedQuantity}</p><p className="mt-1 text-sm text-slate-400">{selected.shopName} · {selected.orderNumber} / ShopOrder #{selected.shopOrderId}</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><p className="rounded-lg bg-slate-900/70 p-3 text-sm text-slate-400">Status <strong className="mt-1 block text-slate-100">{selected.status}</strong></p><p className="rounded-lg bg-slate-900/70 p-3 text-sm text-slate-400">Fault <strong className="mt-1 block text-slate-100">{selected.faultParty}</strong></p><p className="rounded-lg bg-slate-900/70 p-3 text-sm text-slate-400">Settlement <strong className="mt-1 block text-slate-100">{selected.settlementStatus}</strong></p><p className="rounded-lg bg-slate-900/70 p-3 text-sm text-slate-400">Batch <strong className="mt-1 block text-slate-100">{selected.batchId || "—"}</strong></p></div>
          {selected.settlementStatus === "PAID" && <p className="warning-panel p-4 text-sm leading-6">Settlement đã PAID: chỉ manual support / carry-forward thủ công; không reopen, clawback hoặc tự áp adjustment.</p>}
          <div className="surface-nested p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mô tả</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{selected.description}</p></div>
          {selected.adminDecisionReason && <p className="info-panel p-4 text-sm text-blue-100">Quyết định Admin: {selected.adminDecisionReason}</p>}
          {selected.replacementId && <p className="text-sm text-slate-300">Replacement #{selected.replacementId}: <strong>{selected.replacementStatus}</strong> · SL {selected.replacementQuantity}</p>}
          {selected.refundId && <p className="text-sm text-slate-300">Refund #{selected.refundId}: <strong>{selected.refundStatus}</strong> · {Number(selected.refundAmount || 0).toLocaleString("vi-VN")} VND</p>}
          {role === "seller" && selected.replacementStatus === "REQUIRED" && <button type="button" className="btn-primary" onClick={() => void action(`/seller/complaints/replacements/${selected.replacementId}/ready-for-pickup`)}>Đã chuẩn bị hàng thay thế</button>}
          {role === "admin" && <div className="surface-nested flex flex-wrap gap-2 p-4">
            <span className="mb-1 flex w-full items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><ShieldCheck size={15}/> Admin actions</span>
            {selected.status === "OPEN" && <button type="button" className="btn-primary" onClick={() => { const why=reason("Lý do bắt đầu review"); if(why) void action(`/admin/complaints/${selected.id}/start-review`, { reason: why }); }}>Start review</button>}
            {selected.status === "UNDER_REVIEW" && selected.faultParty === "UNDETERMINED" && <><button type="button" className="btn-secondary" onClick={() => void adminDecision("seller-fault")}>Seller fault + replacement</button><button type="button" className="btn-danger" onClick={() => void adminDecision("buyer-fault")}>Buyer fault / reject</button><button type="button" className="btn-secondary" onClick={() => void adminDecision("gymfit-carrier")}>GymFit/carrier fault</button></>}
            {selected.replacementId && ["READY_FOR_PICKUP","PICKED_UP","IN_TRANSIT_TO_HUB","RECEIVED_AT_HUB","HUB_CHECK_FAILED","HUB_CHECK_PASSED","SHIPPED"].includes(selected.replacementStatus || "") && ["PICKED_UP","IN_TRANSIT_TO_HUB","RECEIVED_AT_HUB","HUB_CHECK_PASSED","HUB_CHECK_FAILED","SHIPPED","DELIVERED","FAILED"].map(next => <button type="button" className="btn-secondary" key={next} onClick={() => void replacementAction(next)}>{next}</button>)}
            {selected.replacementStatus === "FAILED" && !selected.refundId && <button type="button" className="btn-secondary" onClick={() => { const why=reason("Lý do refund fallback"); if(why) void action(`/admin/complaints/${selected.id}/refund-fallback`, { reason: why }); }}>Create refund fallback</button>}
            {selected.faultParty === "GYMFIT_OR_CARRIER" && selected.status === "UNDER_REVIEW" && <button type="button" className="btn-secondary" onClick={() => { const why=reason("Resolution thủ công"); if(why) void action(`/admin/complaints/${selected.id}/resolve`, { resolutionType:"MANUAL_SUPPORT", reason:why }); }}>Resolve manual support</button>}
            {selected.refundStatus === "COMPLETED" && selected.status !== "RESOLVED" && <button type="button" className="btn-primary" onClick={() => { const why=reason("Lý do đóng complaint"); if(why) void action(`/admin/complaints/${selected.id}/resolve`, { resolutionType:"REFUND", reason:why }); }}>Resolve after refund</button>}
          </div>}
          <div><h3 className="text-sm font-semibold text-white">Timeline</h3><ol className="mt-3 space-y-3">{selected.events?.map(event => <li key={event.id} className="border-l-2 border-slate-700 pl-4 text-sm text-slate-300"><strong>{event.eventType}</strong> · {new Date(event.createdAt).toLocaleString("vi-VN")}<span className="mt-1 block text-slate-400">{event.reason}</span></li>)}</ol></div>
          {!!selected.replacementHistory?.length && <div><h3 className="text-sm font-semibold text-white">Replacement timeline</h3><ol className="mt-3 space-y-2">{selected.replacementHistory.map(event => <li className="text-sm text-slate-300" key={event.id}>{event.newStatus} · {new Date(event.createdAt).toLocaleString("vi-VN")}</li>)}</ol></div>}
        </div>}
      </section>
    </div>
  </main>;
}
