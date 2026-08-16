import api from '../api/axios';
import type { MarketplaceReview,OrderReviewEligibility,PaginatedReviews,ReviewCollection } from '../types/reviews';
type Response<T>={success:boolean;data:T};
export const reviewsApi={
  eligibility:(orderId:number)=>api.get<Response<OrderReviewEligibility>>(`/reviews/orders/${orderId}/eligibility`),
  createProduct:(orderItemId:number,rating:number,comment:string)=>api.post<Response<MarketplaceReview>>(`/reviews/products/order-items/${orderItemId}`,{rating,...(comment.trim()?{comment:comment.trim()}:{})}),
  createShop:(shopOrderId:number,rating:number,comment:string)=>api.post<Response<MarketplaceReview>>(`/reviews/shops/shop-orders/${shopOrderId}`,{rating,...(comment.trim()?{comment:comment.trim()}:{})}),
  mine:()=>api.get<Response<ReviewCollection>>('/reviews/mine'),
  seller:()=>api.get<Response<ReviewCollection>>('/seller/reviews'),
  productPublic:(identifier:string,page=1)=>api.get<Response<PaginatedReviews>>(`/products/${encodeURIComponent(identifier)}/reviews`,{params:{page,limit:20,sort:'newest'}}),
  shopPublic:(slug:string,page=1)=>api.get<Response<PaginatedReviews>>(`/shops/${encodeURIComponent(slug)}/reviews`,{params:{page,limit:20,sort:'newest'}}),
  admin:(params:Record<string,unknown>)=>api.get<Response<PaginatedReviews>>('/admin/reviews',{params}),
  moderate:(review:MarketplaceReview,action:'hide'|'reject'|'restore',reason:string)=>api.post<Response<MarketplaceReview>>(`/admin/reviews/${review.type.toLowerCase()}/${review.id}/${action}`,{reason}),
  history:(review:MarketplaceReview)=>api.get<Response<Array<{id:number;eventType:string;fromStatus:string|null;toStatus:string;reason:string|null;createdAt:string;actorName:string}>>>(`/admin/reviews/${review.type.toLowerCase()}/${review.id}/history`)
};
