import { createOrder } from "./checkout.service";
import { notifyPayment, updatePaymentStatus } from "./payment.service";
import { cancelCustomerOrder } from "./cancellation.service";
import {
  getCustomerOrder,
  getReservationMetadata,
  listCustomerOrders,
} from "./query.service";

/** Compatibility facade; each operation is implemented in its phase-owned service boundary. */
export const ordersService = {
  createOrder,
  getCustomerOrder,
  getReservationMetadata,
  listCustomerOrders,
  notifyPayment,
  updatePaymentStatus,
  cancelCustomerOrder,
};
