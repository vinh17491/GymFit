import api from '../api/axios';

export type BrandRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ResolvedBrand {
  id: number;
  name: string;
  slug: string;
  isGeneric: boolean;
}

export interface BrandRequest {
  id: number;
  requesterUserId: number;
  shopId: number;
  requestedName: string;
  normalizedName: string;
  websiteUrl: string | null;
  description: string | null;
  status: BrandRequestStatus;
  resolvedBrandId: number | null;
  resolvedBrand: ResolvedBrand | null;
  reviewReason: string | null;
  reviewedByUserId: number | null;
  reviewerName?: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requesterName?: string;
  requesterEmail?: string;
  shopName?: string;
  shopSlug?: string;
}

export interface BrandRequestHistoryEntry {
  id: number;
  fromStatus: BrandRequestStatus | null;
  toStatus: BrandRequestStatus;
  actorUserId: number | null;
  actorName: string | null;
  reason: string | null;
  createdAt: string;
}

export interface BrandRequestDetail extends BrandRequest {
  history: BrandRequestHistoryEntry[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SellerBrandRequestFilters {
  page?: number;
  limit?: number;
  status?: BrandRequestStatus;
}

export interface AdminBrandRequestFilters extends SellerBrandRequestFilters {
  search?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateBrandRequestInput {
  requestedName: string;
  websiteUrl?: string | null;
  description?: string | null;
}

export const brandRequestsApi = {
  sellerList: (params: SellerBrandRequestFilters = {}, signal?: AbortSignal) =>
    api.get<PaginatedApiResponse<BrandRequest>>('/seller/brand-requests', { params, signal }),
  sellerDetail: (id: number, signal?: AbortSignal) =>
    api.get<ApiResponse<BrandRequestDetail>>(`/seller/brand-requests/${id}`, { signal }),
  create: (body: CreateBrandRequestInput, signal?: AbortSignal) =>
    api.post<ApiResponse<BrandRequestDetail>>('/seller/brand-requests', body, { signal }),
  adminList: (params: AdminBrandRequestFilters = {}, signal?: AbortSignal) =>
    api.get<PaginatedApiResponse<BrandRequest>>('/admin/brand-requests', { params, signal }),
  adminDetail: (id: number, signal?: AbortSignal) =>
    api.get<ApiResponse<BrandRequestDetail>>(`/admin/brand-requests/${id}`, { signal }),
  approve: (id: number, signal?: AbortSignal) =>
    api.post<ApiResponse<BrandRequestDetail>>(`/admin/brand-requests/${id}/approve`, undefined, { signal }),
  reject: (id: number, reason: string, signal?: AbortSignal) =>
    api.post<ApiResponse<BrandRequestDetail>>(`/admin/brand-requests/${id}/reject`, { reason }, { signal }),
};
