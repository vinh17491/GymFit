import { normalizeChatbotText, stripVietnameseAccents } from './chatbotNormalizer';
import type { ChatbotContext, ChatbotParseResult } from './chatbotTypes';

const priceTokenPattern = '(\\d+(?:[.,]\\d+)*\\s*(?:k|nghin|ngan|tr|trieu|vnd|d)?)';
const stopWords = new Set([
  'cho', 'toi', 'minh', 'giup', 'tim', 'xem', 'muon', 'can', 'co', 'the', 'nao', 'mot', 'vai', 'san', 'pham',
  'gia', 'loai', 'hang', 'nho', 'voi', 'va', 'o', 'tai', 'cua', 'la', 'khong', 'duoc', 'xin', 'hay', 'nhe',
  'ah', 'di', 'phu', 'hop', 'ngay', 'lich', 'coach', 'huan', 'luyen', 'vien', 'goi', 'hoi', 'toi', 'cho',
  'toi', 'giup', 'web', 'gymfit', 'gymer', 'shop', 'cua', 'hang', 'san', 'pham', 'product', 'plan',
]);

export function parsePriceToken(raw: string): number | undefined {
  const cleaned = stripVietnameseAccents(raw.toLocaleLowerCase('vi-VN')).replace(/\s+/g, '');
  const suffix = cleaned.match(/(k|nghin|ngan|tr|trieu|vnd|d)$/)?.[1];
  const numberPart = suffix ? cleaned.slice(0, -suffix.length) : cleaned;
  if (!/^\d+(?:[.,]\d+)*$/.test(numberPart)) return undefined;

  const groups = numberPart.split(/[.,]/);
  const isThousands = groups.length > 1 && groups.slice(1).every(part => part.length === 3);
  const normalizedNumber = isThousands
    ? numberPart.replace(/[.,]/g, '')
    : numberPart.replace(',', '.');
  const value = Number(normalizedNumber);
  if (!Number.isFinite(value) || value < 0) return undefined;
  const multiplier = suffix === 'k' || suffix === 'nghin' || suffix === 'ngan'
    ? 1_000
    : suffix === 'tr' || suffix === 'trieu' ? 1_000_000 : 1;
  const result = value * multiplier;
  return Number.isFinite(result) && result <= 999_999_999_999.99 ? result : undefined;
}

function detectPrices(text: string): { minPrice?: number; maxPrice?: number; ambiguousPrice?: string } {
  const ambiguousBare = (raw: string): boolean => {
    const value = raw.replace(/\s+/g, '');
    return /^\d{1,4}$/.test(value);
  };
  const range = text.match(new RegExp(`(?:tu\\s*)?${priceTokenPattern}\\s*(?:den|toi|-|~)\\s*${priceTokenPattern}`));
  if (range) {
    if (ambiguousBare(range[1]) || ambiguousBare(range[2])) return { ambiguousPrice: `${range[1]}-${range[2]}` };
    const left = parsePriceToken(range[1]);
    const right = parsePriceToken(range[2]);
    if (left !== undefined && right !== undefined) {
      return left <= right ? { minPrice: left, maxPrice: right } : { minPrice: right, maxPrice: left };
    }
  }

  const under = text.match(new RegExp(`(?:duoi|khong qua|toi da|<=)\\s*${priceTokenPattern}`));
  if (under) {
    if (ambiguousBare(under[1])) return { ambiguousPrice: under[1] };
    const maxPrice = parsePriceToken(under[1]);
    if (maxPrice !== undefined) return { maxPrice };
  }
  const over = text.match(new RegExp(`(?:tren|tu|>=|it nhat)\\s*${priceTokenPattern}`));
  if (over) {
    if (ambiguousBare(over[1])) return { ambiguousPrice: over[1] };
    const minPrice = parsePriceToken(over[1]);
    if (minPrice !== undefined) return { minPrice };
  }
  const explicit = text.match(new RegExp(`(?:gia|tam gia|khoang)\\s*${priceTokenPattern}`));
  if (explicit) {
    if (ambiguousBare(explicit[1])) return { ambiguousPrice: explicit[1] };
    const exact = parsePriceToken(explicit[1]);
    if (exact !== undefined) return { minPrice: exact, maxPrice: exact };
  }
  const suffixed = text.match(/\b\d+(?:[.,]\d+)*\s*(?:k|nghin|ngan|tr|trieu|vnd|d)\b/);
  if (suffixed) {
    const exact = parsePriceToken(suffixed[0]);
    if (exact !== undefined) return { minPrice: exact, maxPrice: exact };
  }
  const bare = text.match(/(?:gia|duoi|tren)\s+(\d{2,}(?:[.,]\d+)?)/);
  if (bare && !/[.,]\d{3}\b/.test(bare[1])) return { ambiguousPrice: bare[1] };
  return {};
}

function dateToIso(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

function parseDate(text: string, now: Date): string | undefined {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/\b(hom nay|today)\b/.test(text)) return dateToIso(base);
  if (/\b(ngay mai|tomorrow)\b/.test(text)) return dateToIso(new Date(base.getTime() + 86_400_000));
  if (/\b(ngay kia|day after tomorrow)\b/.test(text)) return dateToIso(new Date(base.getTime() + 2 * 86_400_000));

  const iso = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  const common = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
  const match = iso ? [iso[0], iso[3], iso[2], iso[1]] : common;
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = match[3] ? Number(match[3]) : base.getFullYear();
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return undefined;
  return dateToIso(parsed);
}

function parseMode(text: string): 'ONLINE' | 'IN_PERSON' | undefined {
  if (/\b(online|truc tuyen|tu xa|video call|zoom)\b/.test(text)) return 'ONLINE';
  if (/\b(in person|tai phong|tai phong tap|phong tap|truc tiep|offline)\b/.test(text)) return 'IN_PERSON';
  return undefined;
}

function parseSort(text: string): NonNullable<ChatbotParseResult['entities']['sort']> | undefined {
  if (/\b(re nhat|gia thap nhat|thap nhat|cheap|cheapest|re nhat)\b/.test(text)) return 'price_asc';
  if (/\b(dat nhat|gia cao nhat|cao nhat|expensive|most expensive)\b/.test(text)) return 'price_desc';
  if (/\b(moi nhat|newest)\b/.test(text)) return 'newest';
  if (/\b(danh gia cao|rating cao|tot nhat)\b/.test(text)) return 'rating';
  if (/\b(ban chay|pho bien|best seller)\b/.test(text)) return 'best_selling';
  return undefined;
}

function parseCategory(text: string): string | undefined {
  const categories: Array<[RegExp, string]> = [
    [/\b(whey|protein|mass|sua tang co)\b/, 'protein'],
    [/\b(ao|quan|short|legging|do tap|thoi trang)\b/, 'thời trang thể thao'],
    [/\b(giay|sneaker|giay tap)\b/, 'giày thể thao'],
    [/\b(gang tay|day khang luc|tham tap|dung cu|phu kien)\b/, 'dụng cụ thể thao'],
  ];
  return categories.find(([pattern]) => pattern.test(text))?.[1];
}

function cleanQuery(normalized: string): string | undefined {
  let query = stripVietnameseAccents(normalized);
  query = query
    .replace(/(?:tu|toi|duoi|tren|khong qua|toi da|it nhat|gia|tam gia|khoang)\s+\d+(?:[.,]\d+)*\s*(?:k|nghin|ngan|tr|trieu|vnd|d)?/g, ' ')
    .replace(/\b\d+(?:[.,]\d+)*\s*(?:k|nghin|ngan|tr|trieu|vnd|d)\b/g, ' ')
    .replace(/\b(?:hom nay|ngay mai|ngay kia|online|truc tuyen|tai phong tap|phong tap|in person|re nhat|gia thap nhat|dat nhat|gia cao nhat|moi nhat|danh gia cao|ban chay|pho bien)\b/g, ' ')
    .replace(/\b(?:cho toi|giup toi|tim cho minh|tim|xem|muon|can|san pham|product|coach|huan luyen vien|goi|plan|shop|cua hang|gia|loai|nhe|voi|nao|co the|duoc khong|con lich)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const useful = query.split(/\s+/).filter(token => !stopWords.has(token) && !/^\d+$/.test(token));
  const result = useful.join(' ').trim();
  return result.length >= 2 ? result.slice(0, 120) : undefined;
}

function resolveFollowUp(text: string, context?: ChatbotContext): { followUp: boolean; referencedResultId?: string; resultIndex?: number; entity?: string; query?: string } {
  const hasResults = Boolean(context?.previousResults.length);
  const followUp = hasResults && /\b(cai do|cai dau tien|cai thu nhat|coach do|goi do|san pham do|shop do|shop nay|cua hang do|con lich|lich ngay mai|no|day|re nhat)\b/.test(text);
  if (!followUp || !context?.previousResults.length) return { followUp: false };
  const first = context.previousResults[0];
  if (/\b(cai dau tien|cai thu nhat)\b/.test(text)) {
    return { followUp: true, referencedResultId: first.id, resultIndex: 0, entity: first.title, query: context.previousSearchQuery };
  }
  return { followUp: true, referencedResultId: first.id, entity: first.title, query: context.previousSearchQuery };
}

export function parseChatbotMessage(input: string, routeContext = '', context?: ChatbotContext, now = new Date()): ChatbotParseResult {
  const normalized = normalizeChatbotText(input);
  const accent = normalized.accentInsensitive;
  const prices = detectPrices(accent);
  const followUp = resolveFollowUp(accent, context);
  const entities: ChatbotParseResult['entities'] = {
    ...prices,
    date: parseDate(accent, now),
    mode: parseMode(accent),
    sort: parseSort(accent),
    category: parseCategory(accent),
    routeContext,
    referencedResultId: followUp.referencedResultId,
    resultIndex: followUp.resultIndex,
    entity: followUp.entity,
    query: followUp.query,
  };

  if (!entities.query) entities.query = cleanQuery(normalized.normalized);
  if (!entities.query && followUp.query) entities.query = followUp.query;
  if (entities.ambiguousPrice) entities.query = cleanQuery(normalized.normalized);
  const routeSlug = routeContext.match(/^\/shops\/([^/]+)/)?.[1];
  const textSlug = accent.match(/(?:slug(?: shop)?|shop|cua hang)\s+([a-z0-9]+(?:-[a-z0-9]+)*)/)?.[1];
  if (routeSlug) entities.shopSlug = routeSlug;
  else if (textSlug && !stopWords.has(textSlug)) entities.shopSlug = textSlug;
  else if (followUp.followUp) {
    const previousShop = context?.previousResults.find(item => item.entityType === 'shop' && item.id === followUp.referencedResultId);
    const previousSlug = previousShop?.route?.match(/^\/shops\/([^/]+)$/)?.[1];
    if (previousSlug) entities.shopSlug = previousSlug;
  }

  return {
    original: normalized.original,
    normalized: normalized.normalized,
    accentInsensitive: normalized.accentInsensitive,
    entities,
    followUp: followUp.followUp,
  };
}
