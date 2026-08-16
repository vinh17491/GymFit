export interface NormalizedChatbotText {
  original: string;
  normalized: string;
  accentInsensitive: string;
}

const punctuationMap: Record<string, string> = {
  '“': '"', '”': '"', '„': '"', '’': "'", '‘': "'", '–': '-', '—': '-', '…': '...',
  '。': '.', '，': ',', '：': ':', '；': ';', '！': '!', '？': '?', '、': ',',
};

function normalizePunctuation(value: string): string {
  return value
    .replace(/[“”„’‘–—…。。，，：；！？、]/g, character => punctuationMap[character] ?? character)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[!?]{2,}/g, match => match[0])
    .replace(/[;,|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripVietnameseAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, character => character === 'Đ' ? 'D' : 'd');
}

export function normalizeChatbotText(input: string): NormalizedChatbotText {
  const original = typeof input === 'string' ? input : String(input ?? '');
  const normalized = normalizePunctuation(original.normalize('NFC')).toLocaleLowerCase('vi-VN');
  return { original, normalized, accentInsensitive: stripVietnameseAccents(normalized) };
}

export function includesPhrase(text: NormalizedChatbotText, phrase: string): boolean {
  const candidate = normalizeChatbotText(phrase);
  return text.normalized.includes(candidate.normalized) || text.accentInsensitive.includes(candidate.accentInsensitive);
}

export function tokenize(text: NormalizedChatbotText): string[] {
  return text.accentInsensitive
    .replace(/[^\p{L}\p{N}.#_/-]+/gu, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
}
