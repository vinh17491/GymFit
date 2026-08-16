export type BrandRequestStatus='PENDING'|'APPROVED'|'REJECTED';
export interface BrandRequestInput{requestedName:string;websiteUrl?:string|null;description?:string|null}
export interface BrandRequestFilters{page:number;limit:number;status?:BrandRequestStatus;search?:string;sortOrder:'asc'|'desc'}
