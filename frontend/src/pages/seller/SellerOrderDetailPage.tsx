import {useCallback,useEffect,useState} from "react";
import {AxiosError} from "axios";
import {Link,useParams} from "react-router-dom";
import {sellerOrdersApi} from "../../services/sellerOrdersApi";
import type {SellerShopOrderDetail} from "../../types/sellerOrders";
const message=(error:unknown)=>error instanceof AxiosError&&typeof error.response?.data?.message==="string"?error.response.data.message:"Không thể tải ShopOrder.";
export default function SellerOrderDetailPage(){
  const id=Number(useParams().shopOrderId);
  const [order,setOrder]=useState<SellerShopOrderDetail|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[reason,setReason]=useState(""),[saving,setSaving]=useState(false);
  const load=useCallback(async()=>{setLoading(true);setError("");try{setOrder((await sellerOrdersApi.detail(id)).data.data);}catch(caught){setError(message(caught));}finally{setLoading(false);}},[id]);
  useEffect(()=>{void load();},[load]);
  const act=async(action:"SUFFICIENT"|"UNABLE_TO_FULFILL")=>{
    if(saving||!order)return;
    if(action==="UNABLE_TO_FULFILL"&&!reason.trim()){setError("Vui lòng nhập lý do không đủ hàng.");return;}
    if(!window.confirm(action==="SUFFICIENT"?"Xác nhận Shop có đủ hàng?":"Xác nhận hủy ShopOrder do không đủ hàng?"))return;
    setSaving(true);setError("");
    try{setOrder((await sellerOrdersApi.stockCheck(order.id,{action,reason:reason.trim()||undefined})).data.data);}
    catch(caught){setError(message(caught));}
    finally{setSaving(false);}
  };
  const ready=async()=>{
    if(saving||!order||!window.confirm("Xác nhận hàng đã sẵn sàng để GymFit lấy?"))return;
    setSaving(true);setError("");
    try{setOrder((await sellerOrdersApi.readyForPickup(order.id)).data.data);}
    catch(caught){setError(message(caught));}
    finally{setSaving(false);}
  };
  if(loading)return <main className="p-8">Đang tải…</main>;
  if(!order)return <main className="space-y-4 p-8"><Link className="text-emerald-400" to="/seller/orders">Quay lại Shop orders</Link><div role="alert" className="rounded border border-red-500/30 p-4 text-red-300">{error||"ShopOrder not found"} <button className="underline" onClick={()=>void load()}>Thử lại</button></div></main>;
  return <main className="space-y-5 p-4 md:p-8">
    <div><Link className="text-emerald-400" to="/seller/orders">Quay lại Shop orders</Link><h1 className="mt-2 text-2xl font-bold">ShopOrder #{order.id}</h1><p>{order.parentOrderNumber} · {order.status}</p><strong>{order.subtotal.toLocaleString()} {order.currency}</strong></div>
    {error&&<p role="alert" className="rounded bg-red-500/10 p-3 text-red-300">{error}</p>}
    <section className="rounded-xl border border-white/10 p-5"><h2 className="font-semibold">Thông tin giao hàng tối thiểu</h2><p>{order.shipping.name} · {order.shipping.phone||"—"}</p><p>{[order.shipping.addressLine1,order.shipping.addressLine2,order.shipping.city,order.shipping.state,order.shipping.postalCode,order.shipping.country].filter(Boolean).join(", ")||"—"}</p></section>
    <section className="overflow-x-auto rounded-xl border border-white/10"><h2 className="p-5 font-semibold">Items</h2><table className="w-full min-w-[760px]"><thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Quantity</th><th>Line total</th></tr></thead><tbody>{order.items.map(item=><tr key={item.id} className="border-t border-white/10"><td className="p-3">{item.productName}</td><td>{item.variantName}</td><td>{item.sku}</td><td>{item.quantity}</td><td>{item.lineTotal.toLocaleString()} {order.currency}</td></tr>)}</tbody></table></section>
    {order.status==="PENDING_STOCK_CHECK"&&<section className="space-y-3 rounded-xl border border-emerald-400/20 p-5"><h2 className="font-semibold">Kiểm tra tồn kho vật lý</h2><textarea className="input-field w-full" rows={3} maxLength={500} placeholder="Lý do bắt buộc khi không đủ hàng" value={reason} onChange={event=>setReason(event.target.value)}/><div className="flex gap-3"><button className="btn-primary" disabled={saving} onClick={()=>void act("SUFFICIENT")}>Đủ hàng · Chuẩn bị</button><button className="btn-secondary" disabled={saving} onClick={()=>void act("UNABLE_TO_FULFILL")}>Không đủ hàng</button></div></section>}
    {order.status==="PREPARING"&&<section className="space-y-3 rounded-xl border border-emerald-400/20 p-5"><h2 className="font-semibold">Hoàn tất chuẩn bị</h2><p>Chỉ xác nhận khi kiện hàng đã đóng gói và sẵn sàng bàn giao.</p><button className="btn-primary" disabled={saving} onClick={()=>void ready()}>{saving?"Đang cập nhật…":"Sẵn sàng để GymFit lấy hàng"}</button></section>}
    {order.status==="READY_FOR_PICKUP"&&<p className="rounded-xl bg-blue-500/10 p-4 text-blue-200">Đang chờ GymFit lấy hàng. Seller không cần thao tác thêm.</p>}
    {(order.pickedUpAt||order.inTransitToHubAt||order.receivedAtHubAt||order.hubCheckedAt||order.deliveredAt)&&<section className="rounded-xl border border-white/10 p-5"><h2 className="font-semibold">Mốc logistics</h2>{order.pickedUpAt&&<p>Đã lấy: {new Date(order.pickedUpAt).toLocaleString()}</p>}{order.inTransitToHubAt&&<p>Đang về hub: {new Date(order.inTransitToHubAt).toLocaleString()}</p>}{order.receivedAtHubAt&&<p>Hub đã nhận: {new Date(order.receivedAtHubAt).toLocaleString()}</p>}{order.hubCheckedAt&&<p>Kiểm tra hub: {new Date(order.hubCheckedAt).toLocaleString()}</p>}{order.deliveredAt&&<p>Buyer đã nhận: {new Date(order.deliveredAt).toLocaleString()}</p>}</section>}
    {order.refund&&<p className="rounded bg-amber-500/10 p-4 text-amber-200">Refund #{order.refund.id}: {order.refund.totalAmount.toLocaleString()} {order.currency} · {order.refund.status}</p>}
    {order.compensationVoucher&&<p className="rounded bg-emerald-500/10 p-4 text-emerald-200">Voucher đã cấp: {order.compensationVoucher.code} · {order.compensationVoucher.amount.toLocaleString()} {order.currency}</p>}
  </main>;
}
