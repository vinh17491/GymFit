export type ChatbotRole = 'guest' | 'member' | 'coach' | 'seller' | 'admin';

export type ChatbotIntentId =
  | 'greeting' | 'help' | 'thanks' | 'goodbye' | 'services_overview'
  | 'login' | 'register' | 'profile' | 'settings' | 'password'
  | 'clarification' | 'fallback'
  | 'plans' | 'membership_status' | 'membership_pending_payment' | 'membership_upgrade'
  | 'membership_downgrade' | 'membership_cancel' | 'membership_entitlement' | 'membership_quota'
  | 'coach_find' | 'coach_profile' | 'coach_availability' | 'coach_booking' | 'coach_booking_status'
  | 'coach_booking_conflict' | 'coach_booking_quota' | 'coach_booking_mode' | 'coach_workspace'
  | 'member_appointments'
  | 'workout_program' | 'workout_assignment' | 'workout_schedule' | 'workout_session'
  | 'workout_progress' | 'workout_notifications'
  | 'product_search' | 'product_filter' | 'product_detail' | 'shop_detail' | 'shop_search_unsupported'
  | 'cart' | 'checkout' | 'order_status' | 'order_tracking' | 'order_cancel' | 'order_complaint'
  | 'order_refund' | 'order_replacement' | 'review' | 'complaint'
  | 'seller_apply' | 'seller_status' | 'seller_shop' | 'seller_products' | 'seller_orders'
  | 'seller_revenue' | 'seller_complaints'
  | 'admin_dashboard' | 'admin_coach' | 'admin_exercises' | 'admin_moderation'
  | 'admin_seller_applications' | 'admin_orders' | 'admin_refunds' | 'admin_settlements'
  | 'safety_secret' | 'safety_idor' | 'safety_medical' | 'mutation_block' | 'unsupported';

export type ChatbotReplyType = 'STATIC' | 'DYNAMIC_LOOKUP' | 'CLARIFICATION' | 'FALLBACK' | 'SAFETY';
export type ChatbotSourceState = 'STATIC' | 'LIVE_DATA' | 'NOT_FOUND' | 'UNAVAILABLE';
export type ChatbotDataAdapterId =
  | 'products' | 'shop_detail' | 'coaches' | 'coach_availability' | 'plans' | 'membership'
  | 'bookings' | 'workouts' | 'notifications' | 'orders';
export type ChatbotEntityType = 'product' | 'shop' | 'coach' | 'plan' | 'membership' | 'booking' | 'order' | 'workout' | 'notification';
export type ChatbotActionKind = 'NAVIGATE';

/** Route paths are allowlisted; chatbot actions never carry callbacks or arbitrary URLs. */
export type ChatbotRoute =
  | '/login' | '/register' | '/profile' | '/settings' | '/membership' | '/membership/account'
  | '/coaches' | '/coach' | '/appointments' | '/workouts' | '/workouts/schedule' | '/progress' | '/notifications'
  | '/products' | '/cart' | '/checkout' | '/orders' | '/complaints' | '/reviews'
  | '/seller/apply' | '/seller' | '/seller/shop' | '/seller/products' | '/seller/orders' | '/seller/revenue'
  | '/seller/complaints' | '/seller/reviews' | '/admin' | '/admin/coaches' | '/admin/exercises'
  | '/admin/workouts' | '/admin/products' | '/admin/product-moderation' | '/admin/seller-applications'
  | '/admin/orders' | '/admin/refunds' | '/admin/settlements' | '/admin/complaints' | '/admin/reviews'
  | '/admin/shops' | '/exercises' | '/workout-programs' | '/videos'
  | `/products/${string}` | `/shops/${string}` | `/coaches/${string}` | `/orders/${string}`
  | `/appointments/${string}`;

export interface ChatbotAction {
  id: string;
  label: string;
  kind: ChatbotActionKind;
  route: ChatbotRoute;
  roles?: ChatbotRole[];
}

export interface ChatbotSuggestion {
  id: string;
  label: string;
  prompt: string;
  category?: string;
  roles?: ChatbotRole[];
}

export interface ChatbotEntityResult {
  entityType: ChatbotEntityType;
  id: string;
  title: string;
  subtitle?: string;
  price?: number;
  status?: string;
  date?: string;
  route?: ChatbotRoute;
  /** Only sanitized public/typed primitive fields may be rendered or persisted. */
  publicFields?: Record<string, string | number | boolean | null>;
}

export interface ChatbotContext {
  version: 1;
  previousIntent?: ChatbotIntentId;
  previousEntityType?: ChatbotEntityType;
  previousSearchQuery?: string;
  previousResultIds: string[];
  previousResults: ChatbotEntityResult[];
  turnCount: number;
}

export interface ChatbotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  reply?: ChatbotReply;
}

export interface ChatbotReply {
  intentId: ChatbotIntentId;
  score: number;
  confidence: number;
  replyType: ChatbotReplyType;
  message: string;
  suggestions: ChatbotSuggestion[];
  actions: ChatbotAction[];
  results?: ChatbotEntityResult[];
  sourceState: ChatbotSourceState;
  context: ChatbotContext;
}

export interface ChatbotParsedEntities {
  query?: string;
  entity?: string;
  referencedResultId?: string;
  resultIndex?: number;
  minPrice?: number;
  maxPrice?: number;
  date?: string;
  mode?: 'ONLINE' | 'IN_PERSON';
  category?: string;
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'rating' | 'best_selling';
  shopSlug?: string;
  routeContext?: string;
  ambiguousPrice?: string;
  unsupportedFilter?: 'price' | 'category' | 'sort';
}

export interface ChatbotParseResult {
  original: string;
  normalized: string;
  accentInsensitive: string;
  entities: ChatbotParsedEntities;
  followUp: boolean;
}

export interface ChatbotIntent {
  id: ChatbotIntentId;
  category: string;
  priority: number;
  roles?: ChatbotRole[];
  exactPhrases?: string[];
  phraseBoosts?: string[];
  keywordsAny?: string[];
  keywordsAll?: string[];
  negativeKeywords?: string[];
  routeBoost?: string[];
  contextBoost?: ChatbotIntentId[];
  adapterId?: ChatbotDataAdapterId;
  dynamic?: boolean;
  safety?: boolean;
  minimumScore?: number;
  staticMessage?: string;
  clarifyMessage?: string;
  suggestions: ChatbotSuggestion[];
  actions?: ChatbotAction[];
}

export interface ChatbotMatch {
  intent: ChatbotIntent;
  score: number;
  confidence: number;
  parse: ChatbotParseResult;
  tie?: boolean;
}

export interface ChatbotAdapterRequest {
  role: ChatbotRole;
  parse: ChatbotParseResult;
  context: ChatbotContext;
  signal: AbortSignal;
}

export interface ChatbotAdapterResult {
  sourceState: ChatbotSourceState;
  message: string;
  results?: ChatbotEntityResult[];
  actions?: ChatbotAction[];
  contextSearchQuery?: string;
  contextEntityType?: ChatbotEntityType;
}

export type ChatbotDataAdapter = (request: ChatbotAdapterRequest) => Promise<ChatbotAdapterResult>;
export type ChatbotAdapterRegistry = Partial<Record<ChatbotDataAdapterId, ChatbotDataAdapter>>;

export interface ChatbotEngineOptions {
  adapterRegistry?: ChatbotAdapterRegistry;
  now?: () => Date;
  timeoutMs?: number;
  routeContext?: string;
}

export interface ChatbotResolveOptions extends ChatbotEngineOptions {
  signal?: AbortSignal;
}
