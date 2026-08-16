import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ExternalLink, HelpCircle, Loader2, MessageCircle, Search, Send, Trash2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { chatbotDataAdapters } from './chatbotDataAdapters';
import { emptyChatbotContext, matchChatbotIntent, resolveChatbotMessage } from './chatbotEngine';
import { chatbotDelayProvider, polishDelayMs, staticReplyDelayMs, waitForChatbotDelay } from './chatbotDelay';
import { categorySuggestionsForRole, initialSuggestionsForRole } from './chatbotSuggestions';
import { clearChatbotState, loadChatbotState, saveChatbotState } from './chatbotStorage';
import type { ChatbotContext, ChatbotMessage, ChatbotReply, ChatbotRole, ChatbotSuggestion } from './chatbotTypes';

const roleName: Record<ChatbotRole, string> = { guest: 'Khách', member: 'Member', coach: 'Coach', seller: 'Seller', admin: 'Admin' };

function messageId(prefix: string): string {
  try { return `${prefix}-${crypto.randomUUID()}`; } catch { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

function welcomeMessage(role: ChatbotRole): ChatbotMessage {
  const context = emptyChatbotContext();
  const suggestions = initialSuggestionsForRole(role);
  const reply: ChatbotReply = {
    intentId: 'greeting', score: 12, confidence: 1, replyType: 'STATIC',
    message: 'Chào bạn! Bạn có thể nhắn câu hỏi hoặc chọn một gợi ý bên dưới. Mình chỉ hướng dẫn và tra cứu READ-ONLY khi hệ thống có dữ liệu xác minh.',
    suggestions, actions: [], sourceState: 'STATIC', context,
  };
  return { id: messageId('welcome'), role: 'assistant', text: reply.message, createdAt: Date.now(), reply };
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export default function ChatbotWidget() {
  const user = useAuthStore(state => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const role: ChatbotRole = user?.role ?? 'guest';
  const stored = useMemo(() => loadChatbotState(), []);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>(stored.messages.length ? stored.messages : [welcomeMessage(role)]);
  const [context, setContext] = useState<ChatbotContext>(stored.context);
  const [input, setInput] = useState('');
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [indicator, setIndicator] = useState<'static' | 'lookup' | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const previousRoleRef = useRef<ChatbotRole>(role);

  useEffect(() => { saveChatbotState(messages, context); }, [messages, context]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, indicator]);
  useEffect(() => () => { abortRef.current?.abort(); }, []);
  useEffect(() => {
    if (previousRoleRef.current === role) return;
    previousRoleRef.current = role;
    abortRef.current?.abort();
    abortRef.current = null;
    clearChatbotState();
    setOpen(false);
    setBusy(false);
    setIndicator(null);
    setInput('');
    setContext(emptyChatbotContext());
    setMessages([welcomeMessage(role)]);
  }, [role]);

  const cancelWork = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setIndicator(null);
  };

  const navigateAction = (route: string) => {
    navigate(route);
    setOpen(false);
  };

  const sendMessage = async (raw: string) => {
    if (busy) return;
    const text = raw.trim().slice(0, 500);
    if (!text) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setInput('');
    setBusy(true);
    const match = matchChatbotIntent(text, role, context, { routeContext: location.pathname });
    const dynamic = Boolean(match?.intent.dynamic);
    setIndicator(dynamic ? 'lookup' : 'static');
    const userMessage: ChatbotMessage = { id: messageId('user'), role: 'user', text, createdAt: Date.now() };
    setMessages(current => [...current, userMessage].slice(-40));
    const startedAt = performance.now();
    try {
      const reply = await resolveChatbotMessage(text, role, context, {
        adapterRegistry: chatbotDataAdapters,
        routeContext: location.pathname,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (reply.replyType === 'DYNAMIC_LOOKUP') {
        const elapsed = performance.now() - startedAt;
        if (elapsed < 250) await waitForChatbotDelay(Math.min(300, polishDelayMs(chatbotDelayProvider)), controller.signal, chatbotDelayProvider);
      } else {
        await waitForChatbotDelay(staticReplyDelayMs(chatbotDelayProvider), controller.signal, chatbotDelayProvider);
      }
      if (controller.signal.aborted) return;
      const assistantMessage: ChatbotMessage = { id: messageId('assistant'), role: 'assistant', text: reply.message, createdAt: Date.now(), reply };
      setMessages(current => [...current, assistantMessage].slice(-40));
      setContext(reply.context);
    } catch (error) {
      if (!isAbort(error) && !controller.signal.aborted) {
        const fallback: ChatbotReply = {
          intentId: 'fallback', score: 0, confidence: 0, replyType: 'FALLBACK',
          message: 'Hiện chưa xử lý được yêu cầu này. Bạn có thể thử lại hoặc chọn một gợi ý khác.',
          suggestions: initialSuggestionsForRole(role).slice(0, 5), actions: [], sourceState: 'UNAVAILABLE', context,
        };
      const fallbackMessage: ChatbotMessage = { id: messageId('assistant'), role: 'assistant', text: fallback.message, createdAt: Date.now(), reply: fallback };
      setMessages(current => [...current, fallbackMessage].slice(-40));
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
        setIndicator(null);
      }
    }
  };

  const onSubmit = (event: React.FormEvent) => { event.preventDefault(); void sendMessage(input); };
  const categorySuggestions = categorySuggestionsForRole(role);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý GYMFIT"
          className="fixed bottom-20 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500 text-slate-950 shadow-2xl shadow-emerald-950/40 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 sm:bottom-6"
        >
          <MessageCircle size={24} aria-hidden="true" />
        </button>
      )}

      {open && (
        <section className="fixed bottom-4 right-2 z-40 flex h-[min(720px,calc(100dvh-2rem))] w-[min(410px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl shadow-black/50 sm:bottom-6 sm:right-4" role="dialog" aria-label="Trợ lý GYMFIT">
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400 text-slate-950"><Bot size={19} aria-hidden="true" /></span>
              <div className="min-w-0"><strong className="block truncate text-sm">Hỗ trợ GYMFIT</strong><span className="block text-xs text-slate-400">Hướng dẫn & tra cứu · {roleName[role]}</span></div>
            </div>
            <div className="flex items-center gap-1"><button type="button" onClick={() => { clearChatbotState(); cancelWork(); setContext(emptyChatbotContext()); setMessages([welcomeMessage(role)]); }} aria-label="Xóa cuộc trò chuyện" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><Trash2 size={16} aria-hidden="true" /></button><button type="button" onClick={() => { cancelWork(); setOpen(false); }} aria-label="Đóng trợ lý" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={18} aria-hidden="true" /></button></div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-live="polite">
            {messages.map(message => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={message.role === 'user' ? 'max-w-[86%] rounded-2xl rounded-br-sm bg-emerald-500 px-3 py-2 text-sm text-slate-950' : 'max-w-[94%] rounded-2xl rounded-bl-sm border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200'}>
                  <p className="whitespace-pre-wrap break-words leading-6">{message.text}</p>
                  {message.reply?.results?.length ? <ResultCards results={message.reply.results} onNavigate={navigateAction} /> : null}
                  {message.reply?.actions?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.reply.actions.map(action => <button key={action.id} type="button" onClick={() => navigateAction(action.route)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-400/10">{action.label}<ExternalLink size={12} aria-hidden="true" /></button>)}</div> : null}
                  {message.reply?.suggestions?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.reply.suggestions.slice(0, 5).map(suggestion => <SuggestionChip key={suggestion.id} suggestion={suggestion} disabled={busy} onClick={() => void sendMessage(suggestion.prompt)} />)}</div> : null}
                </div>
              </div>
            ))}
            {indicator && <div className="flex justify-start"><div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400"><Loader2 size={14} className="animate-spin" aria-hidden="true" /><span>{indicator === 'lookup' ? 'Đang tìm thông tin...' : 'Đang soạn...'}</span></div></div>}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-800 bg-slate-950 px-3 pb-3 pt-2">
            <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Gợi ý chức năng">
              <HelpCircle size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
              {categorySuggestions.slice(0, 7).map(suggestion => <SuggestionChip key={suggestion.id} suggestion={suggestion} disabled={busy} onClick={() => void sendMessage(suggestion.prompt)} />)}
            </div>
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <label className="sr-only" htmlFor="gymfit-chatbot-input">Câu hỏi cho trợ lý GYMFIT</label>
              <textarea
                id="gymfit-chatbot-input"
                value={input}
                maxLength={500}
                rows={1}
                disabled={busy}
                onChange={event => setInput(event.target.value)}
                onCompositionStart={() => setComposing(true)}
                onCompositionEnd={() => setComposing(false)}
                onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !composing) { event.preventDefault(); void sendMessage(input); } }}
                placeholder="Nhập câu hỏi..."
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400 disabled:opacity-60"
              />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Gửi câu hỏi" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500 text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} aria-hidden="true" /></button>
            </form>
            <p className="mt-2 text-[10px] text-slate-500">Enter để gửi · Shift+Enter xuống dòng · Không gửi mật khẩu/token</p>
          </div>
        </section>
      )}
    </>
  );
}

function SuggestionChip({ suggestion, disabled, onClick }: { suggestion: ChatbotSuggestion; disabled: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:border-emerald-400/60 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">{suggestion.label}</button>;
}

function ResultCards({ results, onNavigate }: { results: NonNullable<ChatbotReply['results']>; onNavigate: (route: string) => void }) {
  return <div className="mt-3 space-y-2">{results.slice(0, 5).map(result => <div key={`${result.entityType}-${result.id}`} className="rounded-xl border border-slate-700 bg-slate-950/70 p-2.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><strong className="block truncate text-xs text-white">{result.title}</strong>{result.subtitle && <span className="mt-1 block text-[11px] text-slate-400">{result.subtitle}</span>}</div>{typeof result.price === 'number' && <span className="shrink-0 text-xs font-semibold text-emerald-300">{result.price.toLocaleString('vi-VN')}đ</span>}</div>{result.status && <span className="mt-1 block text-[11px] text-slate-500">{result.status}</span>}{result.route && <button type="button" onClick={() => onNavigate(result.route!)} className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky-300 hover:text-sky-200">Xem chi tiết <Search size={12} aria-hidden="true" /></button>}</div>)}</div>;
}
