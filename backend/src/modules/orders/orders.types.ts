export type PaymentStatus = 'UNPAID'|'PENDING'|'PAID'|'FAILED'|'PARTIALLY_REFUNDED'|'REFUNDED';
export type PaymentActorType = 'CUSTOMER'|'ADMIN'|'SYSTEM';
export interface PaymentStatusHistoryItem { id:number; orderId:number; previousStatus:PaymentStatus; newStatus:PaymentStatus; changedBy:number|null; changedByName:string|null; changedByEmail:string|null; actorType:PaymentActorType; note:string|null; paymentReference:string|null; createdAt:Date }
export interface PaymentNotificationInput { paymentReference?:string }
export type PaymentNotificationReason='PAYMENT_UPDATED'|'ALREADY_PENDING'|'MAIL_NOT_CONFIGURED'|'MAIL_DELIVERY_FAILED';
export interface PaymentNotificationResult { orderId:number; orderNumber:string; paymentStatus:'PENDING'; paymentProvider:'BANK_TRANSFER'; paymentUpdated:boolean; notificationSkipped:boolean; reason:PaymentNotificationReason; emailConfigured:boolean; emailAttempted:boolean; emailSent:boolean }
export interface AdminPaymentStatusInput { status:'PAID'|'FAILED'|'UNPAID'|'REFUNDED'; note?:string }
export interface AdminPaymentStatusResult { orderId:number; orderNumber:string; previousPaymentStatus:PaymentStatus; paymentStatus:'PAID'|'FAILED'|'UNPAID'|'REFUNDED'; emailSent:boolean }
export type BankTransferConfigurationField='BANK_NAME'|'BANK_ACCOUNT_NAME'|'BANK_ACCOUNT_NUMBER'|'BANK_QR_IMAGE_URL';
export interface BankTransferPublicConfig { ready:boolean; missingFields:BankTransferConfigurationField[]; bankName:string|null; accountName:string|null; accountNumber:string|null; qrImageUrl:string|null; transferContent:string }
export interface CustomerOrderItem { id:number; productId:number; variantId:number; productName:string; variantName:string; sku:string; quantity:number; unitPrice:number; lineTotal:number }
export type ShopOrderStatus='PENDING_PAYMENT'|'PENDING_STOCK_CHECK'|'PREPARING'|'READY_FOR_PICKUP'|'PICKED_UP'|'IN_TRANSIT_TO_HUB'|'RECEIVED_AT_HUB'|'HUB_CHECK_PASSED'|'HUB_CHECK_FAILED'|'UNABLE_TO_FULFILL'|'CANCELLED';
export type ParentLogisticsStatus='WAITING_FOR_SHOPS'|'READY_TO_SHIP'|'SHIPPED'|'DELIVERED';
export interface OrderShopSummary { id:number; name:string; slug:string }
export interface CustomerShopOrder { id:number; shop:OrderShopSummary; status:ShopOrderStatus; subtotal:number; readyForPickupAt?:Date|null;pickedUpAt?:Date|null;inTransitToHubAt?:Date|null;receivedAtHubAt?:Date|null;hubCheckedAt?:Date|null;deliveredAt?:Date|null;hubCheckFailed:boolean;createdAt:Date; updatedAt:Date; refund?:{id:number;merchandiseAmount:number;shippingAmount:number;totalAmount:number;status:string;reason:string}|null; compensationVoucher?:{id:number;code:string;amount:number;minimumOrderAmount:number;expiresAt:Date;status:string}|null; items:CustomerOrderItem[] }
export type OrderReservationStatus='ACTIVE'|'RELEASED'|'EXPIRED';
export type CancellationReason='AUTO_EXPIRED'|'CUSTOMER_CANCELLED'|'ADMIN_CANCELLED'|null;
export interface CustomerOrderDetail { id:number; orderNumber:string; userId:number; orderStatus:string; logisticsStatus:ParentLogisticsStatus|null;readyToShipAt:Date|null;shippedAt:Date|null;deliveredAt:Date|null;paymentStatus:string; paymentProvider:string|null; paymentReference:string|null; reservationExpiresAt?:Date|null; cancellationReason?:CancellationReason; subtotal:number; discountAmount:number; shippingAmount:number; taxAmount:number; totalAmount:number; currency:string; createdAt:Date; updatedAt:Date; customerName:string; customerEmail:string; customerPhone:string|null; addressLine1:string|null; addressLine2:string|null; city:string|null; state:string|null; postalCode:string|null; country:string|null; items:CustomerOrderItem[]; shopOrders:CustomerShopOrder[]; bankTransfer?:BankTransferPublicConfig }
export interface CreateOrderItemInput { cartItemId:number; variantId:number; quantity:number }
export interface CreateOrderInput { customerName:string; customerPhone:string; shippingAddressLine1:string; shippingAddressLine2?:string; shippingCity:string; shippingState?:string; shippingPostalCode?:string; shippingCountry:string; cartVersion:number; voucherCode?:string }
export interface OrderPricing { subtotal:number; discountAmount:number; shippingAmount:number; taxAmount:number; totalAmount:number; currency:string }
export interface CreateOrderShopResult { id:number; shop:OrderShopSummary; status:'PENDING_PAYMENT'; subtotal:number }
export interface CreateOrderResult { id:number; orderNumber:string; orderStatus:'PENDING'; paymentStatus:'UNPAID'; paymentProvider:'BANK_TRANSFER'; subtotal:number; totalAmount:number; currency:string; itemCount:number; createdAt:Date; reservationExpiresAt?:Date; shopOrders:CreateOrderShopResult[]; cartVersion:number }
export interface OrderCreationRow { variantId:number; productId:number; shopId:number; shopName:string; shopSlug:string; productName:string; variantName:string; sku:string; price:number; salePrice:number|null; onHand:number; reserved:number }
export interface CustomerCancelOrderInput { note?:string }
export interface CustomerCancelOrderResult { orderId:number; orderNumber:string; orderStatus:'CANCELLED'; releasedItems:number }
export interface ExpiredOrderResult { orderId:number; expired:boolean; error?:string }
export interface ExpirationBatchResult { selected:number; expired:number; failed:number; results:ExpiredOrderResult[] }
export type OrderStatus='PENDING'|'CONFIRMED'|'PROCESSING'|'SHIPPED'|'DELIVERED'|'CANCELLED';
export interface CustomerOrderListFilters { page:number;limit:10|20|50;orderStatus?:OrderStatus;paymentStatus?:PaymentStatus;sortOrder:'asc'|'desc' }
export interface CustomerOrderSummary { id:number;orderNumber:string;orderStatus:OrderStatus;paymentStatus:PaymentStatus;paymentProvider:string|null;itemCount:number;subtotal:number;totalAmount:number;currency:string;reservationExpiresAt:Date|null;createdAt:Date;updatedAt:Date }
export interface PaginatedCustomerOrders { items:CustomerOrderSummary[];page:number;limit:number;total:number;totalPages:number }
