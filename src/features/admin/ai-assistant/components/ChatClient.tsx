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
        // Recargar lista de hilos
        const threadsRes = await fetch('/api/admin/ai-assistant');
        if (threadsRes.ok) {
          const threadsData = await threadsRes.json() as { threads: readonly AiThread[] };
          setThreads(threadsData.threads);
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant' as const, content: data.text ?? '', ...(data.messageId !== undefined ? { id: data.messageId } : {}) }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar mensaje');
      setMessages((prev) => prev.slice(0, -1)); // quitar el mensaje optimista
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
    <div className="flex h-full gap-4">
      {/* Sidebar de hilos */}
      <aside className="w-56 shrink-0 flex flex-col gap-2 hidden md:flex">
        <button
          onClick={newConversation}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sp-orange text-white text-sm font-medium hover:bg-sp-pink transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Nueva conversación
        </button>

        <div className="flex-1 overflow-y-auto space-y-1 mt-1">
          {threads.length === 0 && (
            <p className="text-xs text-sp-muted px-2 py-1">Sin conversaciones</p>
          )}
          {threads.map((t) => (
            <div
              key={t.id}
              className={`group relative flex items-center gap-1 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                activeThreadId === t.id
                  ? 'bg-sp-orange/20 text-white'
                  : 'text-sp-muted hover:bg-white/5 hover:text-white'
              }`}
              onClick={() => void loadThread(t.id)}
            >
              <span className="flex-1 truncate">{t.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); void deleteThread(t.id); }}
                className="opacity-0 group-hover:opacity-100 text-sp-muted hover:text-red-400 transition-opacity text-xs px-1"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Área de chat principal */}
      <div className="flex-1 flex flex-col min-h-0 bg-sp-admin-bg rounded-xl border border-sp-border overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sp-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-sm text-white font-medium">Asistente SocialPro</span>
            <span className="text-xs text-sp-muted">Solo lectura · No ejecuta acciones</span>
          </div>
          <button
            onClick={newConversation}
            className="md:hidden text-xs text-sp-muted hover:text-white px-2 py-1 rounded border border-sp-border"
          >
            + Nueva
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="space-y-2">
                <p className="text-white font-medium">¿En qué puedo ayudarte?</p>
                <p className="text-sm text-sp-muted">Pregúntame sobre facturación, campañas, marcas, talentos o finanzas.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void sendMessage(prompt)}
                    className="text-left text-sm px-3 py-2 rounded-lg border border-sp-border text-sp-muted hover:text-white hover:border-sp-orange/50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id ?? i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-sp-orange text-white rounded-tr-sm'
                    : 'bg-white/5 text-white rounded-tl-sm border border-sp-border'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-sp-border px-4 py-3 rounded-2xl rounded-tl-sm">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-sp-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-sp-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-sp-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-sp-border p-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter para salto de línea)"
              rows={1}
              className="flex-1 resize-none bg-white/5 border border-sp-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-sp-muted focus:outline-none focus:border-sp-orange/60 transition-colors min-h-[44px] max-h-32"
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
              className="shrink-0 px-4 py-3 rounded-xl bg-sp-orange text-white text-sm font-medium hover:bg-sp-pink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
