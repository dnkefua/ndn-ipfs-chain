'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    "Hi — I'm the NDN assistant. I can help you set up collections, draft JSON Schemas, write queries in the NDP DSL, or walk you through pinning a file or importing a model. What are you building?",
};

const SUGGESTIONS = [
  'Draft a schema for a blog post collection',
  'How do I query records where body.status is "paid"?',
  'Import a HuggingFace model',
  'What is a content-addressed view?',
];

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text || busy) return;

    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next
            .filter((m) => !m.error)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          data?.message ??
          (data?.error === 'assistant_unconfigured'
            ? 'AI Assistant is not configured. Set ANTHROPIC_API_KEY in the dashboard environment.'
            : `Assistant error: ${data?.error ?? res.status}`);
        setMessages([...next, { role: 'assistant', content: msg, error: true }]);
        return;
      }

      setMessages([...next, { role: 'assistant', content: data.reply ?? '(no reply)' }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setMessages([
        ...next,
        { role: 'assistant', content: `Network error: ${msg}`, error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-lg hover:shadow-xl transition-shadow"
          aria-label="Open NDN AI Assistant"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Assistant</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-2rem)] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-brand-600 to-accent-500 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">NDN Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="opacity-80 hover:opacity-100 transition-opacity"
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap break-words ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : m.error
                      ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-bl-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                </div>
              </div>
            )}

            {messages.length === 1 && !busy && (
              <div className="pt-2 space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask about schemas, queries, pins, models…"
                rows={2}
                disabled={busy}
                className="flex-1 resize-none rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                className="p-2.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-600">
              Enter to send · Shift+Enter for newline
            </div>
          </div>
        </div>
      )}
    </>
  );
}
