import api from '../api/axios';
import type {
  AdminSellerApplicationList,
  SellerApplication,
  SellerApplicationInput,
  SellerApplicationStatus,
} from '../types/sellerApplications';

interface ApiResponse<T> { success: boolean; data: T; message?: string }

export const sellerApplicationsApi = {
  mine: () => api.get<ApiResponse<SellerApplication>>('/seller-applications/me'),
  create: (input: SellerApplicationInput) => api.post<ApiResponse<SellerApplication>>('/seller-applications', input),
  update: (input: SellerApplicationInput) => api.patch<ApiResponse<SellerApplication>>('/seller-applications/me', input),
  submit: () => api.post<ApiResponse<SellerApplication>>('/seller-applications/me/submit'),
  withdraw: () => api.post<ApiResponse<SellerApplication>>('/seller-applications/me/withdraw'),
  adminList: (params: { status: SellerApplicationStatus; search?: string; page: number; limit: number; sortOrder: 'asc' | 'desc' }) =>
    api.get<ApiResponse<AdminSellerApplicationList>>('/admin/seller-applications', { params }),
  adminDetail: (applicationId: number) =>
    api.get<ApiResponse<SellerApplication>>(`/admin/seller-applications/${applicationId}`),
  approve: (applicationId: number) =>
    api.post<ApiResponse<SellerApplication>>(`/admin/seller-applications/${applicationId}/approve`),
  reject: (applicationId: number, reason: string) =>
    api.post<ApiResponse<SellerApplication>>(`/admin/seller-applications/${applicationId}/reject`, { reason }),
};

