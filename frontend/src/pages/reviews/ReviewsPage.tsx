import { useEffect,useState } from 'react';
import type { MarketplaceReview,ReviewCollection,ReviewStatus,ReviewType } from '../../types/reviews';
import { reviewsApi } from '../../services/reviewsApi';

const statusText:Record<ReviewStatus,string>={PENDING:'Đang chờ',PUBLISHED:'Công khai',HIDDEN:'Đang ẩn',REJECTED:'Đã gỡ'};
function Card({review,admin,onChanged,onHistory}:{review:MarketplaceReview;admin:boolean;onChanged:()=>Promise<void>;onHistory:(r:MarketplaceReview)=>void}){
  const[action,setAction]=useState<'hide'|'reject'|'restore'|null>(null),[reason,setReason]=useState(''),[error,setError]=useState('');
  const run=async()=>{if(!action||reason.trim().length<3)return;try{await reviewsApi.moderate(review,action,reason);setAction(null);setReason('');await onChanged();}catch(x:any){setError(x.response?.data?.message||'Moderation thất bại.');}};
  return <article className="rounded-xl border border-slate-800 p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{review.type==='PRODUCT'?review.product?.name:review.shop.name}</strong><span>{review.rating}/5 · {statusText[review.status]}</span></div>
    <p className="mt-1 text-sm text-slate-400">{review.buyerName} · {new Date(review.createdAt).toLocaleString('vi-VN')} {review.verifiedPurchase?'· Đã mua hàng':''}</p>
    {review.comment?<p className="mt-3 whitespace-pre-wrap">{review.comment}</p>:<p className="mt-3 text-slate-500">Chỉ có điểm số, không có nhận xét.</p>}
    {review.moderationReason&&review.status!=='PUBLISHED'&&<p className="mt-2 text-amber-300">Lý do moderation: {review.moderationReason}</p>}
    {admin&&<div className="mt-3 flex flex-wrap gap-2">{review.status==='PUBLISHED'&&<><button className="btn-secondary" onClick={()=>setAction('hide')}>Ẩn</button><button className="btn-secondary" onClick={()=>setAction('reject')}>Gỡ</button></>}{review.status==='HIDDEN'&&<><button className="btn-secondary" onClick={()=>setAction('restore')}>Khôi phục</button><button className="btn-secondary" onClick={()=>setAction('reject')}>Gỡ</button></>}{review.status==='REJECTED'&&<button className="btn-secondary" onClick={()=>setAction('restore')}>Khôi phục</button>}<button className="btn-secondary" onClick={()=>onHistory(review)}>Lịch sử</button></div>}
    {action&&<div className="mt-3 rounded border border-orange-500/30 p-3"><textarea autoFocus minLength={3} maxLength={1000} rows={3} className="input-field w-full" placeholder="Lý do bắt buộc" value={reason} onChange={e=>setReason(e.target.value)}/>{error&&<p className="text-red-400">{error}</p>}<div className="mt-2 flex gap-2"><button className="btn-primary" disabled={reason.trim().length<3} onClick={()=>void run()}>Xác nhận</button><button className="btn-secondary" onClick={()=>setAction(null)}>Đóng</button></div></div>}
  </article>;
}

export default function ReviewsPage({role}:{role:'buyer'|'seller'|'admin'}){
  const[reviews,setReviews]=useState<MarketplaceReview[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const[type,setType]=useState<ReviewType|''>(''),[status,setStatus]=useState<ReviewStatus|''>(''),[history,setHistory]=useState<any[]|null>(null);
  const load=async()=>{setLoading(true);try{
    if(role==='admin'){const r=await reviewsApi.admin({page:1,limit:100,...(type?{type}:{}),...(status?{status}:{})});setReviews(r.data.data.items);}
    else{const r=role==='buyer'?await reviewsApi.mine():await reviewsApi.seller();const d=r.data.data as ReviewCollection;setReviews([...d.productReviews,...d.shopReviews].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)));}
    setError('');
  }catch(x:any){setError(x.response?.data?.message||'Không thể tải đánh giá.');}finally{setLoading(false);}};
  useEffect(()=>{void load();},[role,type,status]);
  const showHistory=async(review:MarketplaceReview)=>{try{setHistory((await reviewsApi.history(review)).data.data);}catch(x:any){setError(x.response?.data?.message||'Không thể tải lịch sử.');}};
  return <section className="mx-auto max-w-5xl space-y-5 p-6"><header><h1 className="text-2xl font-bold">{role==='admin'?'Moderation đánh giá':role==='seller'?'Đánh giá Shop':'Đánh giá của tôi'}</h1><p className="text-slate-400">{role==='buyer'?'Đánh giá đã gửi không thể sửa hoặc xóa.':role==='seller'?'Chỉ đọc; Seller không thể trả lời hoặc moderation.':'Ẩn/gỡ là soft moderation và luôn cần lý do.'}</p></header>
    {role==='admin'&&<div className="flex gap-3"><select className="rounded bg-slate-900 p-2" value={type} onChange={e=>setType(e.target.value as any)}><option value="">Mọi loại</option><option value="PRODUCT">Product</option><option value="SHOP">Shop</option></select><select className="rounded bg-slate-900 p-2" value={status} onChange={e=>setStatus(e.target.value as any)}><option value="">Mọi trạng thái</option>{['PUBLISHED','HIDDEN','REJECTED','PENDING'].map(x=><option key={x}>{x}</option>)}</select></div>}
    {error&&<p className="text-red-400">{error}</p>}{loading?<p>Đang tải…</p>:reviews.length?<div className="space-y-3">{reviews.map(r=><Card key={`${r.type}-${r.id}`} review={r} admin={role==='admin'} onChanged={load} onHistory={showHistory}/>)}</div>:<p className="text-slate-500">Chưa có đánh giá.</p>}
    {history&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="max-h-[80vh] w-full max-w-xl overflow-auto rounded-xl bg-slate-950 p-5"><h2 className="text-xl font-bold">Lịch sử moderation</h2><div className="mt-3 space-y-3">{history.map(h=><div key={h.id} className="border-l-2 border-orange-500 pl-3"><strong>{h.eventType}: {h.fromStatus||'Mới'} → {h.toStatus}</strong><p className="text-sm text-slate-400">{h.actorName} · {new Date(h.createdAt).toLocaleString('vi-VN')}</p>{h.reason&&<p>{h.reason}</p>}</div>)}</div><button className="btn-secondary mt-4" onClick={()=>setHistory(null)}>Đóng</button></div></div>}
  </section>;
}
