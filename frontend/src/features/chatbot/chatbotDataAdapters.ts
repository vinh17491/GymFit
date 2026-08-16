import api from '../../api/axios';
import { getCoachAvailability, getPublicCoach, listPublicCoaches, type Coach } from '../../services/coaches';
import { getMyMembership, getPlans, type MembershipState, type Plan } from '../../services/plans';
import { getMyBookings } from '../../services/bookings';
import { getMemberCurrent, getMemberProgress } from '../../services/memberWorkoutApi';
import { getNotifications } from '../../services/notifications';
import { ordersApi } from '../../services/ordersApi';
import { shopsApi } from '../../services/shopsApi';
import { stripVietnameseAccents } from './chatbotNormalizer';
import type { ChatbotAdapterRegistry, ChatbotEntityResult, ChatbotAdapterResult, ChatbotDataAdapter } from './chatbotTypes';

type RecordValue = Record<string, unknown>;
const asRecord = (value: unknown): RecordValue => value && typeof value === 'object' ? value as RecordValue : {};
const asArray = (value: unknown): RecordValue[] => Array.isArray(value) ? value.map(asRecord) : [];
const numberValue = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : Number.isFinite(Number(value)) ? Number(value) : undefined;
const stringValue = (value: unknown): string | undefined => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const booleanValue = (value: unknown): boolean | undefined => typeof value === 'boolean' ? value : undefined;
const routeProduct = (slugOrId: unknown): `/products/${string}` | undefined => { const value = stringValue(slugOrId); return value ? `/products/${encodeURIComponent(value)}` : undefined; };
const routeCoach = (id: unknown): `/coaches/${string}` | undefined => { const value = stringValue(id) ?? numberValue(id)?.toString(); return value ? `/coaches/${encodeURIComponent(value)}` : undefined; };
const routeShop = (slug: string): `/shops/${string}` => `/shops/${encodeURIComponent(slug)}`;

function productResult(product: RecordValue): ChatbotEntityResult | null {
  const id = numberValue(product.id);
  const title = stringValue(product.product_name) ?? stringValue(product.name);
  if (id === undefined || !title) return null;
  const shop = asRecord(product.shop);
  const price = numberValue(product.price) ?? numberValue(product.minPrice);
  const inStock = booleanValue(product.inStock);
  const status = inStock === undefined ? undefined : inStock ? 'Còn hàng' : 'Hết hàng';
  const route = routeProduct(product.slug ?? id);
  return {
    entityType: 'product', id: String(id), title,
    subtitle: [stringValue(product.brand), stringValue(product.category), stringValue(shop.name)].filter(Boolean).join(' · ') || undefined,
    price, status, route,
    publicFields: {
      inStock: inStock ?? null,
      shop: stringValue(shop.name) ?? null,
      brand: stringValue(product.brand) ?? null,
      category: stringValue(product.category) ?? null,
    },
  };
}

function productListFromResponse(payload: unknown): RecordValue[] {
  const response = asRecord(payload);
  return asArray(response.data);
}

const productsAdapter: ChatbotDataAdapter = async ({ parse, context, signal }): Promise<ChatbotAdapterResult> => {
  const entities = parse.entities;
  const previousProducts = context.previousResults.filter(item => item.entityType === 'product');
  if (parse.followUp && previousProducts.length && (entities.referencedResultId || entities.sort === 'price_asc')) {
    let selected = previousProducts;
    if (entities.sort === 'price_asc') {
      const priced = previousProducts.filter(item => typeof item.price === 'number');
      if (priced.length !== previousProducts.length) {
        return { sourceState: 'UNAVAILABLE', message: 'Mình chỉ có thể chọn trong danh sách Product vừa tải khi dữ liệu giá đủ rõ; hiện chưa đủ dữ liệu để khẳng định mục rẻ nhất.', results: [], contextSearchQuery: context.previousSearchQuery, contextEntityType: 'product' };
      }
      selected = [...priced].sort((left, right) => (left.price ?? Number.POSITIVE_INFINITY) - (right.price ?? Number.POSITIVE_INFINITY));
    } else if (entities.referencedResultId) {
      selected = previousProducts.filter(item => item.id === entities.referencedResultId);
    }
    if (entities.resultIndex !== undefined) selected = selected.slice(entities.resultIndex, entities.resultIndex + 1);
    if (selected.length) {
      return { sourceState: 'LIVE_DATA', message: 'Mình chọn trong tối đa 5 Product vừa được tải; đây không phải kết luận rẻ nhất trên toàn hệ thống.', results: selected.slice(0, 1), contextSearchQuery: context.previousSearchQuery, contextEntityType: 'product' };
    }
  }
  const params: Record<string, string | number> = { page: 1, pageSize: 5, sort: entities.sort ?? 'relevance' };
  let categoryNotice = '';
  if (entities.query) params.q = entities.query;
  if (entities.category) {
    const filterResponse = await api.get('/products/filters', { signal });
    const filterData = asRecord(asRecord(filterResponse.data).data);
    const categories = asArray(filterData.categories);
    const requested = stripVietnameseAccents(entities.category).toLocaleLowerCase('vi-VN');
    const category = categories.find(item => {
      const name = stringValue(item.name);
      const slug = stringValue(item.slug);
      return Boolean((name && stripVietnameseAccents(name).toLocaleLowerCase('vi-VN') === requested) || (slug && stripVietnameseAccents(slug).toLocaleLowerCase('vi-VN') === requested));
    });
    const slug = category ? stringValue(category.slug) : undefined;
    if (slug) params.category = slug;
    else categoryNotice = ` Không gửi category vì filters API chưa xác nhận category “${entities.category}”; phần category chưa được áp dụng.`;
  }
  if (entities.minPrice !== undefined) params.minPrice = entities.minPrice;
  if (entities.maxPrice !== undefined) params.maxPrice = entities.maxPrice;
  const response = await api.get('/products', { params, signal });
  const results = productListFromResponse(response.data).map(productResult).filter((item): item is ChatbotEntityResult => Boolean(item)).slice(0, 5);
  if (!results.length) {
    return { sourceState: 'NOT_FOUND', message: `Không tìm thấy sản phẩm${entities.query ? ` phù hợp với “${entities.query}”` : ''}.${categoryNotice} Bạn có thể đổi từ khóa hoặc mở trang Sản phẩm để xem thêm.`, results: [], actions: [{ id: 'products', label: 'Mở trang Sản phẩm', kind: 'NAVIGATE', route: '/products' }], contextSearchQuery: entities.query, contextEntityType: 'product' };
  }
  const filterText = [entities.minPrice !== undefined ? `từ ${entities.minPrice.toLocaleString('vi-VN')}đ` : '', entities.maxPrice !== undefined ? `đến ${entities.maxPrice.toLocaleString('vi-VN')}đ` : '', entities.sort === 'price_asc' ? 'giá thấp trước' : ''].filter(Boolean).join(', ');
  return { sourceState: 'LIVE_DATA', message: `Đã tra cứu Product API${filterText ? ` theo ${filterText}` : ''}.${categoryNotice} Đây là tối đa 5 kết quả đầu tiên từ dữ liệu hiện có.`, results, contextSearchQuery: entities.query, contextEntityType: 'product' };
};

function shopProductResult(product: RecordValue): ChatbotEntityResult | null {
  const result = productResult(product);
  return result ? { ...result, entityType: 'product' } : null;
}

const shopDetailAdapter: ChatbotDataAdapter = async ({ parse, context, signal }): Promise<ChatbotAdapterResult> => {
  const previousShop = context.previousResults.find(item => item.entityType === 'shop' && item.id === parse.entities.referencedResultId);
  const previousRouteSlug = previousShop?.route?.match(/^\/shops\/([^/]+)$/)?.[1];
  const slug = parse.entities.shopSlug ?? previousRouteSlug;
  if (!slug) return { sourceState: 'UNAVAILABLE', message: 'Public Shop hiện chỉ hỗ trợ mở chi tiết theo slug hoặc link cụ thể. Hãy gửi slug Shop nếu bạn có.', results: [] };
  const response = await shopsApi.public(slug, 1, signal);
  const payload = asRecord(response.data);
  const shop = asRecord(payload.data);
  const id = numberValue(shop.id);
  const name = stringValue(shop.name) ?? slug;
  const products = asArray(payload.products).map(shopProductResult).filter((item): item is ChatbotEntityResult => Boolean(item)).slice(0, 4);
  const shopResult: ChatbotEntityResult = {
    entityType: 'shop', id: String(id ?? slug), title: name,
    subtitle: stringValue(shop.description) ?? undefined, route: routeShop(slug),
    publicFields: { slug, isVerified: booleanValue(shop.isVerified) ?? null, productCount: numberValue(shop.productCount) ?? null },
  };
  return { sourceState: 'LIVE_DATA', message: `Đã mở dữ liệu Shop “${name}” theo slug.`, results: [shopResult, ...products].slice(0, 5), actions: [{ id: 'shop-detail', label: 'Xem chi tiết Shop', kind: 'NAVIGATE', route: routeShop(slug) }], contextSearchQuery: slug, contextEntityType: 'shop' };
};

function coachResult(coach: Coach): ChatbotEntityResult {
  return {
    entityType: 'coach', id: String(coach.id), title: coach.name,
    subtitle: [coach.specialty, coach.sessionMode === 'ONLINE' ? 'Online' : coach.sessionMode === 'IN_PERSON' ? 'Tại phòng tập' : coach.sessionMode === 'BOTH' ? 'Online / tại phòng tập' : ''].filter(Boolean).join(' · ') || undefined,
    status: coach.bookingEnabled ? 'Có thể xem lịch' : 'Chưa bật đặt lịch', route: routeCoach(coach.id),
    publicFields: { specialty: coach.specialty, sessionMode: coach.sessionMode, bookingEnabled: coach.bookingEnabled },
  };
}

const coachesAdapter: ChatbotDataAdapter = async ({ parse, context, signal }): Promise<ChatbotAdapterResult> => {
  const previousCoach = context.previousResults.find(item => item.entityType === 'coach' && item.id === parse.entities.referencedResultId);
  if (parse.followUp && previousCoach && /^\d+$/.test(previousCoach.id)) {
    const coach = await getPublicCoach(Number(previousCoach.id), { signal });
    return { sourceState: 'LIVE_DATA', message: `Đã tra cứu lại hồ sơ Coach “${coach.name}” từ endpoint công khai.`, results: [coachResult(coach)], contextSearchQuery: context.previousSearchQuery, contextEntityType: 'coach' };
  }
  const search = parse.entities.query || undefined;
  const listed = await listPublicCoaches({ ...(search ? { search } : {}), page: 1, limit: 5 }, { signal });
  let coaches = (listed.coaches ?? listed.items ?? []).slice(0, 5);
  if (parse.entities.mode) coaches = coaches.filter(coach => coach.sessionMode === parse.entities.mode || coach.sessionMode === 'BOTH');
  const results = coaches.map(coachResult);
  if (!results.length) return { sourceState: 'NOT_FOUND', message: `Không tìm thấy Coach${search ? ` phù hợp với “${search}”` : ''} trong danh sách công khai hiện có.`, results: [], contextSearchQuery: search, contextEntityType: 'coach' };
  return { sourceState: 'LIVE_DATA', message: `Đã tra cứu danh sách Coach công khai${parse.entities.mode ? ` cho mode ${parse.entities.mode === 'ONLINE' ? 'Online' : 'Tại phòng tập'}` : ''}. Kết quả được giới hạn để không tải quá nặng.`, results, contextSearchQuery: search, contextEntityType: 'coach' };
};

const coachAvailabilityAdapter: ChatbotDataAdapter = async ({ parse, context, signal }): Promise<ChatbotAdapterResult> => {
  const date = parse.entities.date;
  if (!date) return { sourceState: 'UNAVAILABLE', message: 'Bạn hãy nêu rõ ngày cần kiểm tra, ví dụ “Coach đó còn lịch ngày mai không?” hoặc “ngày 12/08”.', results: [], contextEntityType: 'coach' };
  const referencedId = parse.entities.referencedResultId ?? context.previousResults.find(item => item.entityType === 'coach')?.id;
  let candidates: Coach[] = [];
  if (referencedId && /^\d+$/.test(referencedId)) {
    candidates = [await getPublicCoach(Number(referencedId), { signal })];
  } else {
    const listed = await listPublicCoaches({ ...(parse.entities.query ? { search: parse.entities.query } : {}), page: 1, limit: 5 }, { signal });
    candidates = (listed.coaches ?? listed.items ?? []).slice(0, 5);
  }
  const availability = await Promise.all(candidates.map(async coach => {
    try {
      const value = await getCoachAvailability(coach.id, date, signal);
      return { coach, value };
    } catch { return null; }
  }));
  const results = availability.filter((item): item is { coach: Coach; value: Awaited<ReturnType<typeof getCoachAvailability>> } => Boolean(item && item.value.slots?.some(slot => !slot.booked && !slot.past))).map(item => ({
    ...coachResult(item.coach), status: `${item.value.slots.filter(slot => !slot.booked && !slot.past).length} slot có thể kiểm tra`, date,
    publicFields: { date, timezone: item.value.timezone, bookingEnabled: item.value.booking_enabled },
  }));
  if (!results.length) return { sourceState: 'NOT_FOUND', message: `Không tìm thấy slot có thể xác minh cho ngày ${date} trong phạm vi Coach đã tra cứu.`, results: [], contextSearchQuery: parse.entities.query, contextEntityType: 'coach' };
  return { sourceState: 'LIVE_DATA', message: `Đã kiểm tra availability authoritative cho ngày ${date}. Đây là những Coach có slot được API trả về; chatbot không tự đặt lịch.`, results, contextSearchQuery: parse.entities.query, contextEntityType: 'coach' };
};

function planResult(plan: Plan): ChatbotEntityResult {
  const bookingEntitlement = plan.entitlements.find(item => item.entitlement_key === 'COACH_BOOKING_ENABLED');
  const quotaEntitlement = plan.entitlements.find(item => item.entitlement_key === 'COACH_BOOKING_MONTHLY_LIMIT');
  const enabledValue = bookingEntitlement?.entitlement_value?.toLowerCase();
  const coachBookingEnabled = enabledValue === 'true' ? true : enabledValue === 'false' ? false : null;
  const quotaValue = quotaEntitlement?.value_type === 'UNLIMITED' || quotaEntitlement?.entitlement_value?.toUpperCase() === 'UNLIMITED'
    ? 'UNLIMITED'
    : Number.isFinite(Number(quotaEntitlement?.entitlement_value)) ? Number(quotaEntitlement?.entitlement_value) : null;
  return { entityType: 'plan', id: String(plan.id), title: plan.name, subtitle: `${plan.durationDays} ngày · ${plan.type}`, price: plan.price, route: '/membership', publicFields: { durationDays: plan.durationDays, type: plan.type, description: plan.description, coachBookingEnabled, coachBookingMonthlyLimit: quotaValue } };
}

const plansAdapter: ChatbotDataAdapter = async ({ signal }): Promise<ChatbotAdapterResult> => {
  const plans = await getPlans(signal);
  const results = plans.map(planResult).slice(0, 5);
  if (!results.length) return { sourceState: 'NOT_FOUND', message: 'Hiện chưa có gói hội viên active để hiển thị.', results: [], contextEntityType: 'plan' };
  return { sourceState: 'LIVE_DATA', message: 'Đây là các gói hội viên active từ Plan API hiện có. Giá và thời hạn chỉ hiển thị khi API trả về.', results, contextEntityType: 'plan' };
};

function membershipMessage(state: MembershipState): string {
  if (state.pendingPayment) return `Tài khoản đang có thanh toán chờ xác nhận${state.pendingPayment.plan ? ` cho gói ${state.pendingPayment.plan.name}` : ''}. Chatbot chỉ hiển thị trạng thái READ-ONLY.`;
  if (!state.membership) return 'Hiện chưa đọc được membership active của tài khoản này từ API self-scoped.';
  const plan = state.membership.plan;
  return `Membership hiện tại: ${plan?.name ?? 'chưa có tên gói'} · trạng thái ${state.membership.status} · hết hạn ${state.membership.end_date}.`;
}

const membershipAdapter: ChatbotDataAdapter = async ({ parse, context, signal }): Promise<ChatbotAdapterResult> => {
  const previousPlan = context.previousResults.find(item => item.entityType === 'plan' && item.id === parse.entities.referencedResultId);
  if (parse.followUp && previousPlan) {
    const enabled = previousPlan.publicFields?.coachBookingEnabled;
    const quota = previousPlan.publicFields?.coachBookingMonthlyLimit;
    const message = typeof enabled === 'boolean'
      ? `${previousPlan.title}: ${enabled ? 'có' : 'không có'} quyền đặt Coach theo entitlement của Plan đã tải${enabled && quota !== null && quota !== undefined ? `; giới hạn: ${quota === 'UNLIMITED' ? 'không giới hạn' : String(quota)}/tháng` : ''}.`
      : `Plan “${previousPlan.title}” đã được tải nhưng response không có entitlement đặt Coach đủ rõ; mình không tự suy đoán quyền.`;
    return { sourceState: 'LIVE_DATA', message, results: [previousPlan], contextSearchQuery: previousPlan.title, contextEntityType: 'plan' };
  }
  const state = await getMyMembership(signal);
  const plan = state.membership?.plan;
  const result: ChatbotEntityResult[] = state.membership ? [{ entityType: 'membership', id: String(state.membership.id), title: plan?.name ?? 'Membership hiện tại', subtitle: state.membership.status, date: state.membership.end_date, route: '/membership/account', publicFields: { lifecycle: state.lifecycle, planId: state.membership.plan_id, endDate: state.membership.end_date } }] : [];
  return { sourceState: state.membership || state.pendingPayment ? 'LIVE_DATA' : 'NOT_FOUND', message: membershipMessage(state), results: result, contextEntityType: 'membership' };
};

const bookingsAdapter: ChatbotDataAdapter = async ({ signal }): Promise<ChatbotAdapterResult> => {
  const bookings = await getMyBookings({ page: 1, limit: 5 }, { signal });
  const results = bookings.slice(0, 5).map(booking => ({ entityType: 'booking' as const, id: String(booking.id), title: booking.coach_name ? `Coach ${booking.coach_name}` : `Lịch hẹn #${booking.id}`, subtitle: `${booking.booking_date} · ${booking.start_time.slice(0, 5)}–${booking.end_time.slice(0, 5)}`, status: booking.status, date: booking.booking_date, route: `/appointments/${booking.id}` as `/appointments/${string}`, publicFields: { status: booking.status, mode: booking.session_mode, location: booking.location } }));
  return { sourceState: results.length ? 'LIVE_DATA' : 'NOT_FOUND', message: results.length ? 'Đây là các lịch hẹn của chính tài khoản hiện tại từ API self-scoped.' : 'Không tìm thấy lịch hẹn của tài khoản hiện tại.', results, contextEntityType: 'booking' };
};

const workoutsAdapter: ChatbotDataAdapter = async ({ parse, signal }): Promise<ChatbotAdapterResult> => {
  if (/tien do|progress|thong ke/.test(parse.accentInsensitive)) {
    const progress = await getMemberProgress(signal);
    return { sourceState: 'LIVE_DATA', message: `Tiến độ READ-ONLY: ${progress.completed_sessions} buổi hoàn thành, tỷ lệ hoàn thành ${progress.completion_rate ?? 'chưa có dữ liệu'}.`, results: [], contextEntityType: 'workout' };
  }
  const current = await getMemberCurrent(signal);
  const result: ChatbotEntityResult[] = current.assignment ? [{ entityType: 'workout', id: String(current.assignment.id), title: current.assignment.program_name, subtitle: `Coach ${current.assignment.coach_name} · ${current.assignment.status}`, route: '/workouts', publicFields: { status: current.assignment.status, durationWeeks: current.assignment.duration_weeks } }] : [];
  return { sourceState: current.assignment || current.upcomingSchedules.length ? 'LIVE_DATA' : 'NOT_FOUND', message: current.assignment ? `Chương trình hiện tại: ${current.assignment.program_name}; có ${current.upcomingSchedules.length} lịch sắp tới.` : 'Hiện chưa có assignment hoặc lịch Workout self-scoped.', results: result, contextEntityType: 'workout' };
};

const notificationsAdapter: ChatbotDataAdapter = async ({ signal }): Promise<ChatbotAdapterResult> => {
  const page = await getNotifications({ page: 1, limit: 5 }, { signal });
  const results = page.items.slice(0, 5).map(item => ({ entityType: 'notification' as const, id: String(item.id), title: item.title, subtitle: item.message, date: item.created_at, route: '/notifications' as const, publicFields: { isRead: item.is_read, type: item.type } }));
  return { sourceState: results.length ? 'LIVE_DATA' : 'NOT_FOUND', message: results.length ? 'Đây là thông báo của chính tài khoản hiện tại.' : 'Không có thông báo trong phạm vi đã tải.', results, contextEntityType: 'notification' };
};

const ordersAdapter: ChatbotDataAdapter = async ({ signal }): Promise<ChatbotAdapterResult> => {
  const page = await ordersApi.listOrders({ page: 1, limit: 10, sortOrder: 'desc' }, { signal });
  const results = page.data.data.items.slice(0, 5).map(item => ({ entityType: 'order' as const, id: String(item.id), title: item.orderNumber, subtitle: `${item.itemCount} sản phẩm · ${item.totalAmount.toLocaleString('vi-VN')} ${item.currency}`, status: `${item.orderStatus} · ${item.paymentStatus}`, date: item.createdAt, route: `/orders/${item.id}` as `/orders/${string}`, publicFields: { orderStatus: item.orderStatus, paymentStatus: item.paymentStatus, itemCount: item.itemCount } }));
  return { sourceState: results.length ? 'LIVE_DATA' : 'NOT_FOUND', message: results.length ? 'Đây là các đơn hàng của chính tài khoản hiện tại từ API self-scoped.' : 'Không tìm thấy đơn hàng của tài khoản hiện tại.', results, contextEntityType: 'order' };
};

export const chatbotDataAdapters: ChatbotAdapterRegistry = {
  products: productsAdapter,
  shop_detail: shopDetailAdapter,
  coaches: coachesAdapter,
  coach_availability: coachAvailabilityAdapter,
  plans: plansAdapter,
  membership: membershipAdapter,
  bookings: bookingsAdapter,
  workouts: workoutsAdapter,
  notifications: notificationsAdapter,
  orders: ordersAdapter,
};
