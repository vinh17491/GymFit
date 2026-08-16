import api from "../api/axios";
import type { ShopOrderStatus } from "../types/orders";
import type { PaginatedSellerShopOrders,SellerShopOrderDetail } from "../types/sellerOrders";
interface ApiResponse<T>{success:boolean;data:T;message?:string}
export const sellerOrdersApi={
  list:(params:{page:number;limit:10|20|50;status?:ShopOrderStatus;sortOrder:"asc"|"desc"})=>api.get<ApiResponse<PaginatedSellerShopOrders>>("/seller/orders",{params}),
  detail:(shopOrderId:number)=>api.get<ApiResponse<SellerShopOrderDetail>>(`/seller/orders/${shopOrderId}`),
  stockCheck:(shopOrderId:number,payload:{action:"SUFFICIENT"|"UNABLE_TO_FULFILL";reason?:string})=>api.post<ApiResponse<SellerShopOrderDetail>>(`/seller/orders/${shopOrderId}/stock-check`,payload),
  readyForPickup:(shopOrderId:number)=>api.post<ApiResponse<SellerShopOrderDetail>>(`/seller/orders/${shopOrderId}/ready-for-pickup`),
};
