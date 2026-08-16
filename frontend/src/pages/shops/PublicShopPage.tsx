import { FormEvent,useEffect,useState } from 'react';
import { useParams,useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import api from '../../api/axios';
import ProductCard from '../../components/products/ProductCard';
import type { Product } from '../../types/product';
import type { PublicShopResponse,Shop } from '../../services/shopsApi';
import { reviewsApi } from '../../services/reviewsApi';
import type { MarketplaceReview } from '../../types/reviews';

type Option={id:number;name:string};
const sorts=[['relevance','Liên quan'],['newest','Mới nhất'],['rating','Đánh giá cao'],['best_selling','Bán chạy'],['price_asc','Giá tăng dần'],['price_desc','Giá giảm dần'],['name_asc','Tên A-Z'],['name_desc','Tên Z-A']];
export default function PublicShopPage(){
  const{shopSlug=''}=useParams(),[query,setQuery]=useSearchParams(),[shop,setShop]=useState<Shop|null>(null),[products,setProducts]=useState<Product[]>([]);
  const[reviews,setReviews]=useState<MarketplaceReview[]>([]);
  const[options,setOptions]=useState<{categories:Option[];brands:Option[]}>({categories:[],brands:[]}),[search,setSearch]=useState(query.get('q')??''),[meta,setMeta]=useState({page:1,pages:1,total:0}),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const key=query.toString();
  useEffect(()=>{const controller=new AbortController();api.get('/products/filters',{signal:controller.signal}).then(r=>setOptions(r.data.data)).catch(()=>undefined);return()=>controller.abort();},[]);
  useEffect(()=>{reviewsApi.shopPublic(shopSlug).then(r=>setReviews(r.data.data.items)).catch(()=>setReviews([]));},[shopSlug]);
  useEffect(()=>{const controller=new AbortController();setSearch(query.get('q')??'');setLoading(true);api.get<PublicShopResponse>(`/shops/${encodeURIComponent(shopSlug)}`,{params:Object.fromEntries(query),signal:controller.signal})
    .then(r=>{setShop(r.data.data);setProducts(r.data.products);setMeta({page:r.data.pagination.page,pages:r.data.pagination.pages,total:r.data.pagination.total});setError('');})
    .catch((error:unknown)=>{if(!controller.signal.aborted){const status=error instanceof AxiosError?error.response?.status:undefined;setShop(null);setProducts([]);setError(status===404?'Shop không khả dụng.':'Không thể tải Shop.');}})
    .finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[shopSlug,key]);
  const change=(name:string,value:string)=>{const next=new URLSearchParams(query);value?next.set(name,value):next.delete(name);if(name!=='page')next.set('page','1');setQuery(next);};
  const submit=(e:FormEvent)=>{e.preventDefault();change('q',search.trim().replace(/\s+/g,' '));};
  if(loading)return <p className="p-8">Đang tải…</p>;if(error||!shop)return <p className="p-8 text-red-400">{error}</p>;
  return <main className="mx-auto max-w-7xl space-y-6 p-6">
    {shop.bannerUrl&&<img className="h-52 w-full rounded-xl object-cover" src={shop.bannerUrl} alt=""/>}
    <header className="flex gap-4">{shop.logoUrl&&<img className="h-20 w-20 rounded object-cover" src={shop.logoUrl} alt=""/>}<div><h1 className="text-3xl font-bold">{shop.name}</h1>{shop.isVerified&&<p className="text-emerald-400">Shop đã xác minh</p>}<p className="text-slate-300">{shop.description}</p><small className="text-slate-500">Tham gia {new Date(shop.createdAt).toLocaleDateString('vi-VN')}</small></div></header>
    <p className="text-sm text-amber-300">{shop.averageRating==null?'Chưa có đánh giá':`${shop.averageRating.toFixed(1)}/5`} · {shop.reviewCount} đánh giá · {shop.completedOrderCount} đơn đã giao</p>
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-800 p-4 md:grid-cols-4">
      <input className="rounded bg-slate-900 p-2 md:col-span-3" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm trong Shop"/><button className="rounded bg-orange-500 p-2">Tìm</button>
      <select value={query.get('categoryId')??''} onChange={e=>change('categoryId',e.target.value)} className="rounded bg-slate-900 p-2"><option value="">Mọi danh mục</option>{options.categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <select value={query.get('brandId')??''} onChange={e=>change('brandId',e.target.value)} className="rounded bg-slate-900 p-2"><option value="">Mọi thương hiệu</option>{options.brands.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <input type="number" min="0" value={query.get('minPrice')??''} onChange={e=>change('minPrice',e.target.value)} className="rounded bg-slate-900 p-2" placeholder="Giá tối thiểu"/>
      <input type="number" min="0" value={query.get('maxPrice')??''} onChange={e=>change('maxPrice',e.target.value)} className="rounded bg-slate-900 p-2" placeholder="Giá tối đa"/>
      <select value={query.get('sort')??'newest'} onChange={e=>change('sort',e.target.value)} className="rounded bg-slate-900 p-2">{sorts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <label className="flex items-center gap-2"><input type="checkbox" checked={query.get('inStock')==='true'} onChange={e=>change('inStock',e.target.checked?'true':'')}/> Còn hàng</label>
    </form>
    <p className="text-slate-400">{meta.total} sản phẩm</p>
    {products.length?<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<p>Shop chưa có sản phẩm phù hợp.</p>}
    <nav className="flex justify-center gap-4"><button disabled={meta.page<=1} onClick={()=>change('page',String(meta.page-1))}>Trước</button><span>{meta.page}/{Math.max(1,meta.pages)}</span><button disabled={meta.page>=meta.pages} onClick={()=>change('page',String(meta.page+1))}>Sau</button></nav>
    <section className="space-y-3"><h2 className="text-2xl font-bold">Đánh giá cửa hàng</h2>{reviews.length?reviews.map(review=><article key={review.id} className="rounded-xl border border-slate-800 p-4"><div className="flex justify-between"><strong>{review.buyerName} {review.verifiedPurchase&&<span className="text-xs text-emerald-400">· Đã mua hàng</span>}</strong><span>{review.rating}/5</span></div><p className="text-xs text-slate-500">{new Date(review.publishedAt||review.createdAt).toLocaleDateString('vi-VN')}</p><p className="mt-2">{review.comment||'Người mua chỉ chấm điểm.'}</p></article>):<p className="text-slate-500">Chưa có đánh giá.</p>}</section>
  </main>;
}
