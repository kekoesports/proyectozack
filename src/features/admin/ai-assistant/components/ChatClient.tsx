'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { AiThread, AiMessage } from '@/types';
import type { AiContextTypeKey } from '@/lib/schemas/aiAssistant';

type Props = {
  readonly initialThreads: readonly AiThread[];
  readonly contextType?: AiContextTypeKey;
};

const EXAMPLE_PROMPTS = [
  '¿Qué facturas están vencidas?',
  'Explícame cómo funciona el módulo de facturación',
  '¿Qué debería revisar esta semana?',
  'Dame un resumen financiero del mes',
  '¿Qué campañas tienen margen bajo?',
  '¿Qué clientes tienen facturas pendientes?',
];

type ChatMessage = {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly id?: number | undefined;
};

export function ChatClient({ initialThreads, contextType = 'general' }: Props) {
  const [threads, setThreads] = useState<readonly AiThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // useEffect: sincronizar scroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadThread = useCallback(async (threadId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-assistant/${threadId}`);
      if (!res.ok) throw new Error('No se pudo cargar el hilo');
      const data = await res.json() as { thread: { messages: readonly AiMessage[] } };
      setActiveThreadId(threadId);
      setMessages(
        data.thread.messages
          .filter((m: AiMessage) => m.role !== 'system')
          .map((m: AiMessage) => ({ role: m.role as 'user' | 'assistant', content: m.content, id: m.id })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  const newConversation = () => {
    setActiveThreadId(null);
    setMessages([]);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const deleteThread = async (threadId: number) => {
    const res = await fetch('/api/admin/ai-assistant', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId }),
    });
    if (res.ok) {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) newConversation();
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, threadId: activeThreadId ?? undefined, contextType }),
      });

      const data = await res.json() as { threadId?: number; text?: string; error?: string; messageId?: number };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? 'Error del servidor');
      }

      if (data.threadId && !activeThreadId) {
        setActiveThreadId(data.threadId);
        const threadsRes = await fetch('/api/admin/ai-assistant');
        if (threadsRes.ok) {
          const threadsData = await threadsRes.json() as { threads: readonly AiThread[] };
          setThreads(threadsData.threads);
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: data.text ?? '',
          ...(data.messageId !== undefined ? { id: data.messageId } : {}),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar mensaje');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="flex h-full gap-3">
      {/* ── Sidebar ── */}
      <aside className="hidden w-52 shrink-0 flex-col gap-2 md:flex">
        <button
          onClick={newConversation}
          className="flex items-center gap-2 rounded-xl border border-sp-admin-border bg-sp-orange px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sp-pink"
        >
          <span className="text-base leading-none">+</span>
          Nueva conversación
        </button>

        <div className="mt-1 flex-1 space-y-0.5 overflow-y-auto">
          {threads.length === 0 && (
            <p className="px-3 py-2 text-xs text-sp-admin-muted">Sin conversaciones</p>
          )}
          {threads.map((t) => (
            <div
              key={t.id}
              className={`group relative flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                activeThreadId === t.id
                  ? 'bg-sp-orange/15 text-sp-admin-fg'
                  : 'text-sp-admin-muted hover:bg-sp-admin-card hover:text-sp-admin-fg'
              }`}
              onClick={() => void loadThread(t.id)}
            >
              <span className="flex-1 truncate">{t.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); void deleteThread(t.id); }}
                className="px-1 text-xs text-sp-admin-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Área de chat ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-sp-admin-border bg-sp-admin-card">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-sp-admin-border px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-semibold text-sp-admin-fg">Asistente SocialPro</span>
            <span className="text-xs text-sp-admin-muted">Solo lectura · No ejecuta acciones</span>
          </div>
          <button
            onClick={newConversation}
            className="rounded-lg border border-sp-admin-border px-2 py-1 text-xs text-sp-admin-muted transition-colors hover:text-sp-admin-fg md:hidden"
          >
            + Nueva
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="space-y-1">
                <p className="font-semibold text-sp-admin-fg">¿En qué puedo ayudarte?</p>
                <p className="text-sm text-sp-admin-muted">
                  Pregúntame sobre facturación, campañas, marcas, talentos o finanzas.
                </p>
              </div>
              <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void sendMessage(prompt)}
                    className="rounded-xl border border-sp-admin-border px-4 py-2.5 text-left text-sm text-sp-admin-muted transition-colors hover:border-sp-orange/40 hover:bg-sp-admin-bg hover:text-sp-admin-fg"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={msg.id ?? i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm bg-sp-orange text-white'
                    : 'rounded-tl-sm border border-sp-admin-border bg-sp-admin-bg text-sp-admin-fg'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm border border-sp-admin-border bg-sp-admin-bg px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sp-orange" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sp-orange" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sp-orange" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-sp-admin-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter para salto de línea)"
              rows={1}
              className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border border-sp-admin-border bg-sp-admin-bg px-4 py-3 text-sm text-sp-admin-fg placeholder:text-sp-admin-muted focus:border-sp-orange/50 focus:outline-none transition-colors"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
              }}
              disabled={loading}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-xl bg-sp-orange px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sp-pink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
