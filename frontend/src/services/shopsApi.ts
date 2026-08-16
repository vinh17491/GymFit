import api from '../api/axios';
import type { Product } from '../types/product';
export type Shop={id:number;name:string;slug:string;logoUrl:string|null;bannerUrl:string|null;description:string|null;pickupAddress?:string|null;status?:'ACTIVE'|'SUSPENDED';isVerified:boolean;isSystem?:boolean;averageRating:number|null;reviewCount:number;completedOrderCount:number;soldCount:number;ownerName?:string|null;ownerEmail?:string|null;productCount?:number;createdAt:string;updatedAt?:string;};
export type PublicShopResponse={success:boolean;data:Shop;products:Product[];pagination:{page:number;limit:number;pageSize:number;total:number;pages:number;totalPages:number}};
export const shopsApi={
  mine:()=>api.get('/seller/shop'),updateMine:(data:Partial<Shop>)=>api.patch('/seller/shop',data),
  public:(slug:string,page=1,signal?:AbortSignal)=>api.get<PublicShopResponse>(`/shops/${encodeURIComponent(slug)}`,{params:{page,limit:12},signal}),
  adminList:(params:Record<string,unknown>)=>api.get('/admin/shops',{params}),adminDetail:(id:number)=>api.get(`/admin/shops/${id}`),
  status:(id:number,status:'ACTIVE'|'SUSPENDED',reason?:string)=>api.patch(`/admin/shops/${id}/status`,{status,reason}),
  verification:(id:number,isVerified:boolean)=>api.patch(`/admin/shops/${id}/verification`,{isVerified}),
};
