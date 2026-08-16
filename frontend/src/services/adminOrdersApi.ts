import api from "../api/axios";
import type {
  AdminOrderDetail,
  AdminOrderFilters,
  AdminOrderListResponse,
  AdminPaymentConfigurationStatus,
  AdminPaymentStatusInput,
  AdminPaymentStatusResult,
  UpdateOrderStatusInput,
} from "../types/adminOrders";
export interface AdminApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
export const adminOrdersApi = {
  listAdminOrders: (filters: AdminOrderFilters) =>
    api.get<AdminApiResponse<AdminOrderListResponse>>("/admin/orders", {
      params: {
        ...filters,
        search: filters.search.trim() || undefined,
        orderStatus: filters.orderStatus || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        userId: filters.userId ? Number(filters.userId) : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
    }),
  getAdminOrder: (orderId: number) =>
    api.get<AdminApiResponse<AdminOrderDetail>>(`/admin/orders/${orderId}`),
  updateAdminOrderStatus: (orderId: number, payload: UpdateOrderStatusInput) =>
    api.patch<AdminApiResponse<AdminOrderDetail>>(
      `/admin/orders/${orderId}/status`,
      payload,
    ),
  updateAdminOrderPaymentStatus: (
    orderId: number,
    payload: AdminPaymentStatusInput,
  ) =>
    api.patch<AdminApiResponse<AdminPaymentStatusResult>>(
      `/admin/orders/${orderId}/payment-status`,
      payload,
    ),
  getPaymentConfiguration: () =>
    api.get<AdminApiResponse<AdminPaymentConfigurationStatus>>(
      "/admin/payment-configuration",
    ),
  transitionShopOrder:(shopOrderId:number,payload:{action:"PICKED_UP"|"IN_TRANSIT_TO_HUB"|"RECEIVED_AT_HUB"|"HUB_CHECK_PASSED"|"HUB_CHECK_FAILED";reason?:string})=>
    api.post<AdminApiResponse<AdminOrderDetail>>(`/admin/shop-orders/${shopOrderId}/logistics`,payload),
  transitionParent:(orderId:number,payload:{action:"READY_TO_SHIP"|"SHIPPED"|"DELIVERED";note?:string})=>
    api.post<AdminApiResponse<AdminOrderDetail>>(`/admin/orders/${orderId}/logistics`,payload),
};
