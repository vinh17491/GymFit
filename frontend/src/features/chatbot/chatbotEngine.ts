import { chatbotCatalog } from './chatbotCatalog';
import { contextualSuggestions, initialSuggestionsForRole } from './chatbotSuggestions';
import { includesPhrase, normalizeChatbotText, tokenize } from './chatbotNormalizer';
import { parseChatbotMessage } from './chatbotEntityParser';
import type {
  ChatbotAction,
  ChatbotAdapterRegistry,
  ChatbotContext,
  ChatbotEntityResult,
  ChatbotIntent,
  ChatbotMatch,
  ChatbotReply,
  ChatbotResolveOptions,
  ChatbotRole,
} from './chatbotTypes';

const MAX_CONTEXT_RESULTS = 5;
const DEFAULT_TIMEOUT_MS = 12_000;

function abortError(message = 'Chatbot request aborted'): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function timeoutError(): Error {
  const error = new Error('Chatbot adapter timed out');
  error.name = 'TimeoutError';
  return error;
}

export const emptyChatbotContext = (): ChatbotContext => ({
  version: 1,
  previousResultIds: [],
  previousResults: [],
  turnCount: 0,
});

function roleAllowed(intent: ChatbotIntent, role: ChatbotRole): boolean {
  return !intent.roles || intent.roles.includes(role);
}

function wordOrPhraseMatches(text: ReturnType<typeof normalizeChatbotText>, keyword: string): boolean {
  const candidate = normalizeChatbotText(keyword);
  if (candidate.normalized.includes(' ') || candidate.accentInsensitive.includes(' ')) return includesPhrase(text, keyword);
  return tokenize(text).includes(candidate.accentInsensitive);
}

function scoreIntent(intent: ChatbotIntent, parse: ReturnType<typeof parseChatbotMessage>, role: ChatbotRole, context: ChatbotContext, respectRole: boolean): number | null {
  if (respectRole && !roleAllowed(intent, role)) return null;
  const text = normalizeChatbotText(parse.original);
  let score = intent.priority / 10;
  let matched = false;

  for (const phrase of intent.exactPhrases ?? []) {
    if (wordOrPhraseMatches(text, phrase)) { score += 12; matched = true; }
  }
  for (const phrase of intent.phraseBoosts ?? []) {
    if (wordOrPhraseMatches(text, phrase)) { score += 6; matched = true; }
  }
  if (intent.keywordsAll?.length) {
    const allMatched = intent.keywordsAll.every(keyword => wordOrPhraseMatches(text, keyword));
    if (allMatched) { score += 8; matched = true; }
  }
  for (const keyword of intent.keywordsAny ?? []) {
    if (wordOrPhraseMatches(text, keyword)) { score += 3; matched = true; }
  }
  for (const keyword of intent.negativeKeywords ?? []) {
    if (wordOrPhraseMatches(text, keyword)) score -= 8;
  }
  for (const route of intent.routeBoost ?? []) {
    if (parse.entities.routeContext?.startsWith(route)) score += 2;
  }
  if (parse.followUp && context.previousIntent && intent.contextBoost?.includes(context.previousIntent)) score += 2;
  if (parse.followUp && intent.dynamic) score += 2;
  if (parse.entities.ambiguousPrice && intent.id === 'product_filter') score += 2;
  if (intent.id === 'product_filter' && (parse.entities.minPrice !== undefined || parse.entities.maxPrice !== undefined || parse.entities.category || parse.entities.sort)) score += 6;
  if (intent.id === 'product_search' && (parse.entities.minPrice !== undefined || parse.entities.maxPrice !== undefined || parse.entities.category || parse.entities.sort)) score -= 8;
  if (parse.entities.date && intent.id === 'coach_availability') score += 2;
  if (parse.entities.mode && intent.id === 'coach_find') score += 2;

  if (!matched || score < (intent.minimumScore ?? 3)) return null;
  return Math.max(0, score);
}

function confidenceFor(score: number): number {
  return Math.max(0, Math.min(1, Number((score / 22).toFixed(3))));
}

function topMatch(message: string, role: ChatbotRole, context: ChatbotContext, routeContext: string, respectRole: boolean, now: Date): ChatbotMatch | null {
  const parse = parseChatbotMessage(message, routeContext, context, now);
  const scored = chatbotCatalog
    .map(intent => ({ intent, score: scoreIntent(intent, parse, role, context, respectRole) }))
    .filter((item): item is { intent: ChatbotIntent; score: number } => item.score !== null)
    .sort((left, right) => right.score - left.score || right.intent.priority - left.intent.priority || left.intent.id.localeCompare(right.intent.id));
  const first = scored[0];
  if (!first) return null;
  const second = scored[1];
  const tie = Boolean(second && Math.abs(first.score - second.score) <= 1 && first.intent.priority === second.intent.priority);
  return { intent: first.intent, score: first.score, confidence: confidenceFor(first.score), parse, tie };
}

function roleMismatchReply(message: string, role: ChatbotRole, context: ChatbotContext, routeContext: string, now: Date): ChatbotReply | null {
  const allowedMatch = topMatch(message, role, context, routeContext, true, now);
  if (allowedMatch) return null;
  const match = topMatch(message, role, context, routeContext, false, now);
  if (!match || roleAllowed(match.intent, role) || match.score < 3 || match.intent.safety) return null;
  return {
    intentId: 'unsupported', score: match.score, confidence: match.confidence, replyType: 'SAFETY',
    message: 'Chức năng này không mở cho role hiện tại. Quyền thật do backend và route guard quyết định; mình không thể mở rộng quyền.',
    suggestions: initialSuggestionsForRole(role).slice(0, 5), actions: [], sourceState: 'UNAVAILABLE', context,
  };
}

function safeActions(actions: ChatbotAction[] | undefined, role: ChatbotRole): ChatbotAction[] {
  return (actions ?? []).filter(action => !action.roles || action.roles.includes(role)).slice(0, 5);
}

function safeResults(results: ChatbotEntityResult[] | undefined): ChatbotEntityResult[] {
  return (results ?? []).slice(0, MAX_CONTEXT_RESULTS).map(result => ({
    entityType: result.entityType,
    id: String(result.id).slice(0, 120),
    title: String(result.title).slice(0, 180),
    subtitle: result.subtitle ? String(result.subtitle).slice(0, 240) : undefined,
    price: typeof result.price === 'number' && Number.isFinite(result.price) ? result.price : undefined,
    status: result.status ? String(result.status).slice(0, 80) : undefined,
    date: result.date ? String(result.date).slice(0, 30) : undefined,
    route: result.route,
    publicFields: Object.entries(result.publicFields ?? {}).slice(0, 12).reduce<Record<string, string | number | boolean | null>>((fields, [key, value]) => {
      if (/(password|token|secret|api[_-]?key|user[_-]?id)/i.test(key)) return fields;
      if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') fields[key.slice(0, 60)] = typeof value === 'string' ? value.slice(0, 240) : value;
      return fields;
    }, {}),
  }));
}

function nextContext(previous: ChatbotContext, match: ChatbotMatch, results: ChatbotEntityResult[] | undefined, searchQuery?: string): ChatbotContext {
  const bounded = safeResults(results);
  const retained = bounded.length ? bounded : previous.previousResults.slice(0, MAX_CONTEXT_RESULTS);
  return {
    version: 1,
    previousIntent: match.intent.id,
    previousEntityType: bounded[0]?.entityType ?? previous.previousEntityType,
    previousSearchQuery: searchQuery ?? match.parse.entities.query ?? previous.previousSearchQuery,
    previousResultIds: retained.map(result => result.id),
    previousResults: retained,
    turnCount: Math.min(2, previous.turnCount + 1),
  };
}

function combineSuggestions(match: ChatbotMatch, role: ChatbotRole, results?: ChatbotEntityResult[]) {
  const values = [...(match.intent.suggestions ?? []), ...contextualSuggestions(match.intent.id, role, results)]
    .filter(suggestion => !suggestion.roles || suggestion.roles.includes(role));
  const unique = new Map(values.map(item => [item.id, item]));
  return [...unique.values()].slice(0, 5);
}

function fallbackReply(role: ChatbotRole, context: ChatbotContext, message?: string): ChatbotReply {
  return {
    intentId: 'fallback', score: 0, confidence: 0, replyType: 'FALLBACK',
    message: message ?? 'Mình chưa hiểu chính xác câu hỏi này. Bạn có thể thử tên sản phẩm/Coach hoặc chọn một nhóm chức năng bên dưới.',
    suggestions: initialSuggestionsForRole(role).slice(0, 7), actions: [], sourceState: 'STATIC', context,
  };
}

function clarificationReply(match: ChatbotMatch, role: ChatbotRole, context: ChatbotContext): ChatbotReply {
  return {
    intentId: 'clarification', score: match.score, confidence: match.confidence, replyType: 'CLARIFICATION',
    message: match.parse.entities.ambiguousPrice
      ? `Bạn muốn mức giá ${match.parse.entities.ambiguousPrice} là bao nhiêu tiền? Hãy ghi rõ ví dụ 500k hoặc 500.000đ.`
      : match.intent.clarifyMessage ?? 'Mình thấy câu hỏi có thể thuộc vài nhóm. Bạn muốn tra cứu hay mở chức năng nào cụ thể?',
    suggestions: combineSuggestions(match, role), actions: [], sourceState: 'STATIC', context,
  };
}

async function runDynamicAdapter(adapterId: NonNullable<ChatbotIntent['adapterId']>, match: ChatbotMatch, role: ChatbotRole, context: ChatbotContext, registry: ChatbotAdapterRegistry, signal: AbortSignal, timeoutMs: number) {
  const adapter = registry[adapterId];
  if (!adapter) return { sourceState: 'UNAVAILABLE' as const, message: 'Hiện chưa có adapter READ-ONLY phù hợp để xác minh dữ liệu động này.', results: [] };
  const controller = new AbortController();
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  let rejectGuard: ((reason?: unknown) => void) | undefined;
  const guard = new Promise<never>((_, reject) => { rejectGuard = reject; });
  const forwardAbort = () => { controller.abort(); rejectGuard?.(abortError()); };
  if (signal.aborted) forwardAbort();
  signal.addEventListener('abort', forwardAbort, { once: true });
  timer = globalThis.setTimeout(() => { controller.abort(); rejectGuard?.(timeoutError()); }, Math.max(1, timeoutMs));
  try {
    const request = adapter({ role, parse: match.parse, context, signal: controller.signal });
    return await Promise.race([request, guard]);
  } finally {
    if (timer) globalThis.clearTimeout(timer);
    signal.removeEventListener('abort', forwardAbort);
  }
}

export function matchChatbotIntent(message: string, role: ChatbotRole, context = emptyChatbotContext(), options: Pick<ChatbotResolveOptions, 'now' | 'routeContext'> = {}): ChatbotMatch | null {
  return topMatch(message, role, context, options.routeContext ?? '', true, (options.now ?? (() => new Date()))());
}

export async function resolveChatbotMessage(
  message: string,
  role: ChatbotRole,
  context = emptyChatbotContext(),
  options: ChatbotResolveOptions = {},
): Promise<ChatbotReply> {
  const original = String(message ?? '').slice(0, 500).trim();
  const now = (options.now ?? (() => new Date()))();
  const routeContext = options.routeContext ?? '';
  if (!original) return fallbackReply(role, context, 'Bạn hãy nhập câu hỏi hoặc chọn một gợi ý để mình hỗ trợ.');

  const mismatch = roleMismatchReply(original, role, context, routeContext, now);
  if (mismatch) return mismatch;
  const match = topMatch(original, role, context, routeContext, true, now);
  if (!match) return fallbackReply(role, context);
  if (match.tie) return clarificationReply(match, role, context);
  if (match.parse.entities.ambiguousPrice) return clarificationReply(match, role, context);

  if (match.intent.safety) {
    return {
      intentId: match.intent.id, score: match.score, confidence: match.confidence, replyType: 'SAFETY',
      message: match.intent.staticMessage ?? 'Mình không thể hỗ trợ yêu cầu này.',
      suggestions: combineSuggestions(match, role), actions: safeActions(match.intent.actions, role), sourceState: 'STATIC', context: nextContext(context, match, undefined),
    };
  }

  if (match.intent.dynamic && match.intent.adapterId) {
    try {
      const result = await runDynamicAdapter(match.intent.adapterId, match, role, context, options.adapterRegistry ?? {}, options.signal ?? new AbortController().signal, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      if (options.signal?.aborted) throw abortError();
      const results = safeResults(result.results);
      return {
        intentId: match.intent.id,
        score: match.score,
        confidence: match.confidence,
        replyType: 'DYNAMIC_LOOKUP',
        message: result.message,
        suggestions: combineSuggestions(match, role, results),
        actions: safeActions([...(match.intent.actions ?? []), ...(result.actions ?? [])], role),
        results: results.length ? results : undefined,
        sourceState: result.sourceState,
        context: nextContext(context, match, results, result.contextSearchQuery),
      };
    } catch (error) {
      if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
      return {
        intentId: match.intent.id, score: match.score, confidence: match.confidence, replyType: 'DYNAMIC_LOOKUP',
        message: 'Hiện chưa tải được dữ liệu. Bạn có thể mở trang chức năng tương ứng để thử lại.',
        suggestions: combineSuggestions(match, role), actions: safeActions(match.intent.actions, role), sourceState: 'UNAVAILABLE', context: nextContext(context, match, undefined),
      };
    }
  }

  return {
    intentId: match.intent.id, score: match.score, confidence: match.confidence, replyType: 'STATIC',
    message: match.intent.staticMessage ?? 'Mình có thể hướng dẫn chức năng này qua route hiện có.',
    suggestions: combineSuggestions(match, role), actions: safeActions(match.intent.actions, role), sourceState: 'STATIC', context: nextContext(context, match, undefined),
  };
}
