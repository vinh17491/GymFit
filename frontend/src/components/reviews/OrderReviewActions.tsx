import { FormEvent,useEffect,useState } from 'react';
import toast from 'react-hot-toast';
import type { CustomerOrderDetail } from '../../types/orders';
import type { OrderReviewEligibility,ReviewEligibilityItem } from '../../types/reviews';
import { reviewsApi } from '../../services/reviewsApi';

function Editor({label,state,onSaved}:{label:string;state:ReviewEligibilityItem;onSaved:()=>Promise<void>}){
  const[rating,setRating]=useState(5),[comment,setComment]=useState(''),[open,setOpen]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
  if(state.reviewId)return <div className="mt-2 rounded-lg bg-emerald-500/10 p-3 text-sm"><strong>{label}: {state.rating}/5 · {state.status}</strong>{state.comment&&<p className="mt-1 whitespace-pre-wrap">{state.comment}</p>}{state.status==='HIDDEN'&&<p className="text-amber-300">Đánh giá hiện không hiển thị công khai.</p>}{state.status==='REJECTED'&&<p className="text-red-300">Đánh giá đã bị gỡ do moderation.</p>}{state.moderationReason&&<p className="text-slate-300">Lý do: {state.moderationReason}</p>}</div>;
  if(!state.delivered)return null;
  const submit=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setError('');try{
    if(state.orderItemId)await reviewsApi.createProduct(state.orderItemId,rating,comment);else await reviewsApi.createShop(state.shopOrderId,rating,comment);
    toast.success('Đánh giá đã được đăng công khai.');setOpen(false);await onSaved();
  }catch(x:any){setError(x.response?.data?.message||'Không thể gửi đánh giá.');}finally{setSaving(false);}};
  if(!open)return <button className="mt-2 text-sm text-orange-400 underline" onClick={()=>setOpen(true)}>{label}</button>;
  return <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-orange-500/30 p-3"><label className="block text-sm">Số sao
    <select className="ml-2 rounded bg-slate-900 p-1" value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(x=><option key={x} value={x}>{x}</option>)}</select>
  </label><textarea maxLength={2000} rows={3} className="input-field w-full" placeholder="Nhận xét (không bắt buộc)" value={comment} onChange={e=>setComment(e.target.value)}/>
  <p className="text-xs text-slate-400">Đánh giá được đăng ngay và không thể sửa hoặc xóa sau khi gửi.</p>{error&&<p className="text-red-400">{error}</p>}
  <div className="flex gap-2"><button disabled={saving} className="btn-primary">{saving?'Đang gửi…':'Xác nhận gửi'}</button><button type="button" className="btn-secondary" onClick={()=>setOpen(false)}>Đóng</button></div></form>;
}

export default function OrderReviewActions({order}:{order:CustomerOrderDetail}){
  const[data,setData]=useState<OrderReviewEligibility|null>(null),[error,setError]=useState('');
  const load=async()=>{try{setData((await reviewsApi.eligibility(order.id)).data.data);setError('');}catch(x:any){setError(x.response?.data?.message||'Không thể tải trạng thái đánh giá.');}};
  useEffect(()=>{void load();},[order.id]);
  if(!data)return error?<p className="mt-3 text-sm text-red-400">{error}</p>:null;
  const itemState=new Map(data.items.map(x=>[x.orderItemId,x])),shopState=new Map(data.shopOrders.map(x=>[x.shopOrderId,x]));
  return <section className="rounded-xl border border-orange-500/20 bg-slate-950 p-5"><h2 className="text-lg font-semibold">Đánh giá giao dịch</h2>
    <p className="mt-1 text-sm text-slate-400">Chỉ giao dịch đã giao thành công mới có thể đánh giá. Replacement không tạo lượt đánh giá mới.</p>
    <div className="mt-4 space-y-4">{order.shopOrders.map(shopOrder=><article key={shopOrder.id} className="rounded-lg border border-white/10 p-4">
      <strong>{shopOrder.shop.name}</strong>{shopState.get(shopOrder.id)&&<Editor label="Đánh giá cửa hàng" state={shopState.get(shopOrder.id)!} onSaved={load}/>}
      <div className="mt-3 space-y-3">{shopOrder.items.map(item=><div key={item.id} className="border-t border-white/10 pt-3"><span>{item.productName} · {item.variantName}</span>{itemState.get(item.id)&&<Editor label="Đánh giá sản phẩm" state={itemState.get(item.id)!} onSaved={load}/>}</div>)}</div>
    </article>)}</div>
  </section>;
}
