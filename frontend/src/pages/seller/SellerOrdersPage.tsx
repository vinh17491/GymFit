import { useCallback,useEffect,useState } from "react";
import { AxiosError } from "axios";
import { Link } from "react-router-dom";
import { sellerOrdersApi } from "../../services/sellerOrdersApi";
import type { ShopOrderStatus } from "../../types/orders";
import type { PaginatedSellerShopOrders } from "../../types/sellerOrders";
const statuses:ShopOrderStatus[]=["PENDING_PAYMENT","PENDING_STOCK_CHECK","PREPARING","READY_FOR_PICKUP","UNABLE_TO_FULFILL","CANCELLED"];
const message=(error:unknown)=>error instanceof AxiosError&&typeof error.response?.data?.message==="string"?error.response.data.message:"Không thể tải ShopOrders.";
export default function SellerOrdersPage(){
  const [data,setData]=useState<PaginatedSellerShopOrders|null>(null),[status,setStatus]=useState<ShopOrderStatus|undefined>(),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const load=useCallback(async()=>{setLoading(true);setError("");try{setData((await sellerOrdersApi.list({page:1,limit:20,status,sortOrder:"desc"})).data.data)}catch(caught){setError(message(caught))}finally{setLoading(false)}},[status]);
  useEffect(()=>{void load()},[load]);
  return <main className="space-y-5 p-4 md:p-8"><div><h1 className="text-2xl font-bold">Shop orders</h1><p className="text-slate-400">Read-only fulfillment view for your Shop.</p></div><label>Status <select className="input-field ml-2" value={status??""} onChange={event=>setStatus(event.target.value?event.target.value as ShopOrderStatus:undefined)}><option value="">All</option>{statuses.map(value=><option key={value}>{value}</option>)}</select></label>{loading?<p>Đang tải…</p>:error?<div role="alert" className="rounded border border-red-500/30 p-4 text-red-300">{error} <button className="underline" onClick={()=>void load()}>Thử lại</button></div>:!data?.items.length?<div className="rounded border border-white/10 p-8 text-center">Chưa có ShopOrder.</div>:<div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full min-w-[760px]"><thead><tr><th>ShopOrder</th><th>Parent</th><th>Status</th><th>Items</th><th>Subtotal</th><th>Created</th></tr></thead><tbody>{data.items.map(item=><tr key={item.id} className="border-t border-white/10"><td className="p-3"><Link className="text-emerald-400" to={`/seller/orders/${item.id}`}>#{item.id}</Link></td><td>{item.parentOrderNumber}</td><td>{item.status}</td><td>{item.itemCount}</td><td>{item.subtotal.toLocaleString()} {item.currency}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>}</main>;
}
