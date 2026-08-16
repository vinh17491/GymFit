import type { ChatbotEntityResult, ChatbotIntentId, ChatbotRole, ChatbotSuggestion } from './chatbotTypes';

const makeSuggestion = (id: string, label: string, prompt: string, category: string, roles?: ChatbotRole[]): ChatbotSuggestion => ({ id, label, prompt, category, roles });

export const suggestions = {
  products: makeSuggestion('product-search', 'Sản phẩm', 'Tìm sản phẩm giúp tôi', 'marketplace'),
  cheapProducts: makeSuggestion('product-cheap', 'Giá thấp nhất', 'Tìm sản phẩm rẻ nhất', 'marketplace'),
  productCategory: makeSuggestion('product-category', 'Lọc sản phẩm', 'Tìm sản phẩm whey dưới 500k', 'marketplace'),
  coaches: makeSuggestion('coach-find', 'Coach', 'Tìm Coach phù hợp', 'coach'),
  coachTomorrow: makeSuggestion('coach-tomorrow', 'Lịch Coach', 'Coach đó còn lịch ngày mai không?', 'coach'),
  coachAppointments: makeSuggestion('coach-appointments', 'Lịch học viên', 'Lịch hẹn học viên của tôi', 'coach', ['coach']),
  coachWorkspace: makeSuggestion('coach-workspace', 'Khu Coach', 'Khu Coach của tôi', 'coach', ['coach']),
  coachWorkout: makeSuggestion('coach-workout', 'Workout Coach', 'Lịch workout Coach của tôi', 'workout', ['coach']),
  coachProgress: makeSuggestion('coach-progress', 'Tiến độ học viên', 'Tiến độ học viên của tôi', 'workout', ['coach']),
  plans: makeSuggestion('plans', 'Gói hội viên', 'Cho tôi xem các gói hội viên', 'membership'),
  membership: makeSuggestion('membership', 'Gói của tôi', 'Gói hội viên của tôi đang thế nào?', 'membership', ['member']),
  workouts: makeSuggestion('workouts', 'Workout', 'Xem lịch tập hiện tại của tôi', 'workout', ['member']),
  progress: makeSuggestion('progress', 'Tiến độ', 'Tóm tắt tiến độ tập của tôi', 'workout', ['member']),
  appointments: makeSuggestion('appointments', 'Lịch hẹn', 'Xem lịch hẹn Coach của tôi', 'coach', ['member']),
  orders: makeSuggestion('orders', 'Đơn hàng', 'Xem đơn hàng của tôi', 'marketplace', ['member', 'coach']),
  account: makeSuggestion('account', 'Tài khoản', 'Tôi cần hỗ trợ tài khoản', 'account'),
  sellerApply: makeSuggestion('seller-apply', 'Đăng ký Seller', 'Tôi muốn đăng ký Seller', 'seller'),
  sellerWorkspace: makeSuggestion('seller-workspace', 'Khu Seller', 'Quản lý shop của tôi', 'seller', ['seller']),
  sellerOrders: makeSuggestion('seller-orders', 'Đơn Seller', 'Đơn Seller của tôi', 'seller', ['seller']),
  adminWorkspace: makeSuggestion('admin-workspace', 'Khu Admin', 'Khu Admin của tôi', 'admin', ['admin']),
  services: makeSuggestion('services', 'Dịch vụ', 'GYMFIT có những dịch vụ nào?', 'general'),
  help: makeSuggestion('help', 'Trợ giúp', 'Chatbot có thể hỗ trợ gì?', 'general'),
};

const guestSuggestions = [suggestions.products, suggestions.coaches, suggestions.plans, suggestions.account, suggestions.help];
const memberSuggestions = [suggestions.products, suggestions.coaches, suggestions.appointments, suggestions.workouts, suggestions.plans, suggestions.orders, suggestions.sellerApply, suggestions.account];
const coachSuggestions = [suggestions.products, suggestions.coachAppointments, suggestions.coachWorkspace, suggestions.coachProgress, suggestions.services, suggestions.help];
const sellerSuggestions = [suggestions.products, suggestions.sellerWorkspace, suggestions.sellerOrders, suggestions.sellerApply, suggestions.account, suggestions.help];
const adminSuggestions = [suggestions.adminWorkspace, suggestions.coaches, suggestions.products, suggestions.services, suggestions.help];

export function initialSuggestionsForRole(role: ChatbotRole): ChatbotSuggestion[] {
  if (role === 'member') return memberSuggestions.slice(0, 7);
  if (role === 'coach') return coachSuggestions;
  if (role === 'seller') return sellerSuggestions.slice(0, 6);
  if (role === 'admin') return adminSuggestions;
  return guestSuggestions;
}

export function categorySuggestionsForRole(role: ChatbotRole): ChatbotSuggestion[] {
  return initialSuggestionsForRole(role).slice(0, 7);
}

export function contextualSuggestions(intentId: ChatbotIntentId, role: ChatbotRole, results: ChatbotEntityResult[] = []): ChatbotSuggestion[] {
  const suggestionsByIntent: Partial<Record<ChatbotIntentId, ChatbotSuggestion[]>> = {
    product_search: [suggestions.productCategory, suggestions.cheapProducts, suggestions.coaches, suggestions.plans],
    product_filter: [suggestions.cheapProducts, suggestions.products, suggestions.coaches, suggestions.help],
    product_detail: [suggestions.products, suggestions.coaches, suggestions.orders, suggestions.help],
    shop_detail: [suggestions.products, suggestions.coaches, suggestions.help],
    shop_search_unsupported: [suggestions.products, suggestions.services, suggestions.help],
    coach_find: [suggestions.coachTomorrow, suggestions.coachAppointments, suggestions.plans],
    coach_profile: [suggestions.coachTomorrow, suggestions.coaches, suggestions.help],
    coach_availability: [suggestions.coachAppointments, suggestions.coaches, suggestions.help],
    coach_booking: [suggestions.coaches, suggestions.coachAppointments, suggestions.plans],
    coach_booking_status: [suggestions.appointments, suggestions.coaches, suggestions.help],
    member_appointments: [suggestions.coachTomorrow, suggestions.orders, suggestions.help],
    plans: [suggestions.membership, suggestions.coaches, suggestions.help],
    membership_status: [suggestions.membership, suggestions.plans, suggestions.coaches],
    membership_entitlement: [suggestions.plans, suggestions.coaches, suggestions.help],
    workout_progress: [suggestions.workouts, suggestions.appointments, suggestions.help],
    coach_workspace: [suggestions.coachAppointments, suggestions.coachWorkout, suggestions.coachProgress, suggestions.help],
    order_status: [suggestions.orders, suggestions.help],
    seller_apply: [suggestions.sellerWorkspace, suggestions.products, suggestions.help],
    seller_status: [suggestions.sellerWorkspace, suggestions.account, suggestions.help],
    admin_dashboard: [suggestions.adminWorkspace, suggestions.help],
    services_overview: [suggestions.products, suggestions.coaches, suggestions.plans, suggestions.help],
  };
  const base = suggestionsByIntent[intentId] ?? initialSuggestionsForRole(role);
  const unique = new Map<string, ChatbotSuggestion>();
  for (const suggestion of base) if (suggestion) unique.set(suggestion.id, suggestion);
  if (results.length > 0 && (intentId === 'product_search' || intentId === 'product_filter')) unique.set(suggestions.cheapProducts.id, suggestions.cheapProducts);
  return [...unique.values()].filter(suggestion => !suggestion.roles || suggestion.roles.includes(role)).slice(0, 5);
}
