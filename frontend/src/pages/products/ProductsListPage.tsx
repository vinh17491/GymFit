import { FormEvent,useEffect,useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import ProductCard from '../../components/products/ProductCard';
import type { Product,ProductListResponse } from '../../types/product';

type Option={id:number;name:string;slug:string};
type ShopOption=Option&{isVerified:boolean};
type FilterOptions={categories:Option[];brands:Option[];shops:ShopOption[]};
const sorts=[['relevance','Liên quan'],['newest','Mới nhất'],['rating','Đánh giá cao'],['best_selling','Bán chạy'],['price_asc','Giá tăng dần'],['price_desc','Giá giảm dần'],['name_asc','Tên A-Z'],['name_desc','Tên Z-A']];

export default function ProductsListPage(){
  const[query,setQuery]=useSearchParams(),[items,setItems]=useState<Product[]>([]),[filters,setFilters]=useState<FilterOptions>({categories:[],brands:[],shops:[]});
  const[loading,setLoading]=useState(true),[error,setError]=useState(''),[meta,setMeta]=useState({page:1,pages:1,total:0}),[search,setSearch]=useState(query.get('q')??'');
  const key=query.toString();
  useEffect(()=>{const controller=new AbortController();api.get('/products/filters',{signal:controller.signal}).then(r=>setFilters(r.data.data)).catch(()=>undefined);return()=>controller.abort();},[]);
  useEffect(()=>{const controller=new AbortController();setSearch(query.get('q')??'');setLoading(true);api.get<ProductListResponse>('/products',{params:Object.fromEntries(query),signal:controller.signal})
    .then(r=>{setItems(r.data.data);setMeta({page:r.data.pagination.page,pages:r.data.pagination.pages,total:r.data.pagination.total});setError('');})
    .catch((e:any)=>{if(!controller.signal.aborted){setItems([]);setError(e.response?.data?.message||'Không thể tải sản phẩm.');}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[key]);
  const change=(name:string,value:string)=>{const next=new URLSearchParams(query);value?next.set(name,value):next.delete(name);if(name!=='page')next.set('page','1');setQuery(next);};
  const submit=(e:FormEvent)=>{e.preventDefault();change('q',search.trim().replace(/\s+/g,' '));};
  const page=(value:number)=>change('page',String(value));
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-10">
    <header><h1 className="text-3xl font-bold">Sản phẩm Marketplace</h1><p className="text-slate-400">Tìm kiếm sản phẩm từ các Shop đang hoạt động.</p></header>
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-4">
      <input aria-label="Tìm sản phẩm" className="rounded bg-slate-900 p-2 md:col-span-3" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên, thương hiệu, danh mục, Shop hoặc SKU"/>
      <button className="rounded bg-orange-500 px-4 py-2 font-semibold text-white">Tìm kiếm</button>
      <select aria-label="Danh mục" value={query.get('categoryId')??''} onChange={e=>change('categoryId',e.target.value)} className="rounded bg-slate-900 p-2"><option value="">Mọi danh mục</option>{filters.categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <select aria-label="Thương hiệu" value={query.get('brandId')??''} onChange={e=>change('brandId',e.target.value)} className="rounded bg-slate-900 p-2"><option value="">Mọi thương hiệu</option>{filters.brands.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <select aria-label="Shop" value={query.get('shopSlug')??''} onChange={e=>change('shopSlug',e.target.value)} className="rounded bg-slate-900 p-2"><option value="">Mọi Shop</option>{filters.shops.map(x=><option key={x.id} value={x.slug}>{x.name}{x.isVerified?' ✓':''}</option>)}</select>
      <select aria-label="Sắp xếp" value={query.get('sort')??'newest'} onChange={e=>change('sort',e.target.value)} className="rounded bg-slate-900 p-2">{sorts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <input aria-label="Giá tối thiểu" type="number" min="0" value={query.get('minPrice')??''} onChange={e=>change('minPrice',e.target.value)} className="rounded bg-slate-900 p-2" placeholder="Giá tối thiểu"/>
      <input aria-label="Giá tối đa" type="number" min="0" value={query.get('maxPrice')??''} onChange={e=>change('maxPrice',e.target.value)} className="rounded bg-slate-900 p-2" placeholder="Giá tối đa"/>
      <label className="flex items-center gap-2"><input type="checkbox" checked={query.get('inStock')==='true'} onChange={e=>change('inStock',e.target.checked?'true':'')}/> Còn hàng</label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={query.get('verifiedShop')==='true'} onChange={e=>change('verifiedShop',e.target.checked?'true':'')}/> Shop đã xác minh</label>
    </form>
    {loading?<p>Đang tải…</p>:error?<p className="text-red-400">{error}</p>:<>
      <p className="text-sm text-slate-400">{meta.total} sản phẩm</p>
      {items.length?<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{items.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<p>Không có sản phẩm phù hợp.</p>}
      <nav className="flex items-center justify-center gap-4"><button disabled={meta.page<=1} onClick={()=>page(meta.page-1)}>Trước</button><span>Trang {meta.page}/{Math.max(1,meta.pages)}</span><button disabled={meta.page>=meta.pages} onClick={()=>page(meta.page+1)}>Sau</button></nav>
    </>}
  </main>;
}
