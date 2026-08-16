export type ReviewType='PRODUCT'|'SHOP';
export type ReviewStatus='PENDING'|'PUBLISHED'|'HIDDEN'|'REJECTED';
export interface MarketplaceReview{
  id:number;type:ReviewType;rating:number;comment:string|null;status:ReviewStatus;verifiedPurchase:boolean;
  buyerName:string;variantName?:string|null;createdAt:string;publishedAt:string|null;moderationReason?:string|null;
  product?:{id:number;name:string;slug:string};shop:{id:number;name:string;slug:string};
}
export interface ReviewEligibilityItem{orderItemId?:number;shopOrderId:number;delivered:boolean;reviewId:number|null;rating:number|null;comment:string|null;status:ReviewStatus|null;moderationReason:string|null}
export interface OrderReviewEligibility{items:ReviewEligibilityItem[];shopOrders:ReviewEligibilityItem[]}
export interface ReviewCollection{productReviews:MarketplaceReview[];shopReviews:MarketplaceReview[]}
export interface PaginatedReviews{items:MarketplaceReview[];page:number;limit:number;total:number;totalPages:number}
