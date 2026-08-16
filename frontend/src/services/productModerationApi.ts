import api from '../api/axios';
export const productModerationApi={
  list:(params:Record<string,unknown>)=>api.get('/admin/product-moderation',{params}),
  detail:(id:number)=>api.get(`/admin/product-moderation/${id}`),
  approve:(id:number,note?:string)=>api.post(`/admin/product-moderation/${id}/approve`,note?{note}:{}),
  reject:(id:number,reason:string)=>api.post(`/admin/product-moderation/${id}/reject`,{reason}),
  suspend:(id:number,reason:string)=>api.post(`/admin/product-moderation/${id}/suspend`,{reason}),
  republish:(id:number,note?:string)=>api.post(`/admin/product-moderation/${id}/republish`,note?{note}:{})
};
