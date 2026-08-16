export type ReviewType='PRODUCT'|'SHOP';
export type ReviewStatus='PENDING'|'PUBLISHED'|'HIDDEN'|'REJECTED';
export type ReviewAction='hide'|'reject'|'restore';
export interface ReviewCreateInput{rating:number;comment?:string|null}
export interface ReviewListQuery{page:number;limit:number;rating?:number;hasComment?:boolean;sort:'newest'|'oldest'|'highest'|'lowest'}
export interface AdminReviewQuery{page:number;limit:number;type?:ReviewType;status?:ReviewStatus;rating?:number;hasComment?:boolean;shopId?:number;productId?:number;search?:string}
