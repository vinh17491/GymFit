import type { ChatbotContext, ChatbotEntityResult, ChatbotMessage } from './chatbotTypes';
import { emptyChatbotContext } from './chatbotEngine';

const STORAGE_VERSION = 1;
const STORAGE_KEY = `gymfit:chatbot:v${STORAGE_VERSION}`;
const MAX_MESSAGES = 40;
const PUBLIC_CONTEXT_TYPES = new Set(['product', 'shop', 'coach', 'plan']);
const PRIVATE_INTENTS = new Set(['membership_status', 'membership_pending_payment', 'membership_entitlement', 'membership_quota', 'coach_booking_status', 'member_appointments', 'workout_program', 'workout_assignment', 'workout_schedule', 'workout_progress', 'workout_notifications', 'order_status', 'order_tracking']);
const sensitivePattern = /(password|mật khẩu|mat khau|token|api\s*key|secret|jwt)\s*(?:[:=]\s*|(?:là|la)\s+)[^\s,;]+/gi;

interface StoredChatbotState {
  version: 1;
  messages: ChatbotMessage[];
  context: ChatbotContext;
}

function storage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; }
}

function safeText(value: unknown): string {
  return String(value ?? '').slice(0, 500).replace(sensitivePattern, '$1: [đã ẩn]');
}

function safeResult(result: ChatbotEntityResult): ChatbotEntityResult {
  const publicFields = Object.entries(result.publicFields ?? {}).slice(0, 12).reduce<Record<string, string | number | boolean | null>>((fields, [key, value]) => {
    if (/(password|token|secret|api[_-]?key|user[_-]?id)/i.test(key)) return fields;
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') fields[key.slice(0, 60)] = typeof value === 'string' ? safeText(value).slice(0, 240) : value;
    return fields;
  }, {});
  return {
    entityType: result.entityType,
    id: safeText(result.id).slice(0, 120),
    title: safeText(result.title).slice(0, 180),
    subtitle: result.subtitle ? safeText(result.subtitle).slice(0, 240) : undefined,
    price: typeof result.price === 'number' ? result.price : undefined,
    status: result.status ? safeText(result.status).slice(0, 80) : undefined,
    date: result.date ? safeText(result.date).slice(0, 30) : undefined,
    route: result.route,
    publicFields,
  };
}

function safeContext(context: ChatbotContext): ChatbotContext {
  const publicResults = context.previousResults.filter(result => PUBLIC_CONTEXT_TYPES.has(result.entityType)).slice(0, 5).map(safeResult);
  return {
    version: 1,
    previousIntent: context.previousIntent,
    previousEntityType: publicResults[0]?.entityType,
    previousSearchQuery: publicResults.length && context.previousSearchQuery ? safeText(context.previousSearchQuery).slice(0, 120) : undefined,
    previousResultIds: publicResults.map(result => result.id),
    previousResults: publicResults,
    turnCount: Math.min(2, Math.max(0, Number(context.turnCount) || 0)),
  };
}

function safeMessage(message: ChatbotMessage): ChatbotMessage {
  if (message.reply && PRIVATE_INTENTS.has(message.reply.intentId)) {
    return { id: safeText(message.id).slice(0, 120), role: message.role, text: message.role === 'assistant' ? 'Thông tin riêng của tài khoản không được khôi phục trong session storage.' : safeText(message.text), createdAt: Number.isFinite(message.createdAt) ? message.createdAt : Date.now() };
  }
  return {
    id: safeText(message.id).slice(0, 120),
    role: message.role === 'user' ? 'user' : 'assistant',
    text: safeText(message.text),
    createdAt: Number.isFinite(message.createdAt) ? message.createdAt : Date.now(),
    reply: message.reply ? { ...message.reply, message: safeText(message.reply.message), results: message.reply.results?.filter(result => PUBLIC_CONTEXT_TYPES.has(result.entityType)).slice(0, 5).map(safeResult), context: safeContext(message.reply.context) } : undefined,
  };
}

export function loadChatbotState(): { messages: ChatbotMessage[]; context: ChatbotContext } {
  const target = storage();
  if (!target) return { messages: [], context: emptyChatbotContext() };
  try {
    const parsed = JSON.parse(target.getItem(STORAGE_KEY) ?? '') as Partial<StoredChatbotState>;
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.messages)) throw new Error('invalid chatbot storage');
    const messages = parsed.messages.filter(item => item && (item.role === 'user' || item.role === 'assistant')).slice(-MAX_MESSAGES).map(safeMessage);
    return { messages, context: parsed.context ? safeContext(parsed.context) : emptyChatbotContext() };
  } catch {
    target.removeItem(STORAGE_KEY);
    return { messages: [], context: emptyChatbotContext() };
  }
}

export function saveChatbotState(messages: ChatbotMessage[], context: ChatbotContext): void {
  const target = storage();
  if (!target) return;
  const persistable = messages.filter((message, index) => {
    if (message.reply && PRIVATE_INTENTS.has(message.reply.intentId)) return false;
    const next = messages[index + 1];
    return !(message.role === 'user' && next?.reply && PRIVATE_INTENTS.has(next.reply.intentId));
  });
  const state: StoredChatbotState = { version: STORAGE_VERSION, messages: persistable.slice(-MAX_MESSAGES).map(safeMessage), context: safeContext(context) };
  try { target.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* sessionStorage may be unavailable or full */ }
}

export function clearChatbotState(): void {
  storage()?.removeItem(STORAGE_KEY);
}

export { STORAGE_KEY, MAX_MESSAGES };
