'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { AiThread, AiMessage } from '@/types';
import type { AiContextTypeKey } from '@/lib/schemas/aiAssistant';

type Props = {
  readonly initialThreads: readonly AiThread[];
  readonly contextType?: AiContextTypeKey;
  readonly canDispatch?: boolean;
};

const EXAMPLE_PROMPTS = [
  'Dame el estado operativo de hoy',
  '¿Cómo están Leads CC y prensa?',
  '¿Las copias de seguridad están al día?',
  '¿Qué campañas requieren atención?',
  '¿Qué alertas editoriales tengo pendientes?',
  '¿Qué facturas están vencidas?',
  '¿Qué talentos están creciendo y por qué?',
];

type AgentSlug = 'crm-steward' | 'deal-clerk' | 'growth' | 'seo';

const AGENT_COMMANDS: ReadonlyArray<{
  readonly slug: AgentSlug;
  readonly command: string;
  readonly label: string;
  readonly description: string;
}> = [
  { slug: 'crm-steward', command: '/crm', label: 'CRM', description: 'Bloqueos, tareas y calidad de datos' },
  { slug: 'deal-clerk', command: '/tratos', label: 'Tratos', description: 'Borradores y seguimiento de deals' },
  { slug: 'growth', command: '/growth', label: 'Growth', description: 'Leads y oportunidades comerciales' },
  { slug: 'seo', command: '/seo', label: 'SEO', description: 'Indexación, contenido y rendimiento' },
];

type DispatchDraft = {
  readonly slug: AgentSlug;
  readonly stage: 'draft' | 'review' | 'sending' | 'done';
  readonly objective: string;
  readonly error?: string | undefined;
  readonly runId?: number;
  readonly url?: string;
};

type ChatMessage = {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly id?: number | undefined;
};

export function ChatClient({ initialThreads, contextType = 'general', canDispatch = false }: Props) {
  const [threads, setThreads] = useState<readonly AiThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [dispatchDraft, setDispatchDraft] = useState<DispatchDraft | null>(null);
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

    const agentCommand = canDispatch ? parseAgentCommand(text) : null;
    if (agentCommand) {
      setInput('');
      setCommandCenterOpen(true);
      setDispatchDraft({
        slug: agentCommand.slug,
        objective: agentCommand.objective,
        stage: agentCommand.objective.length >= 8 ? 'review' : 'draft',
      });
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: 'He preparado la orden para el agente. Revisa el objetivo en el Centro de mando y confírmalo antes de ejecutarlo.' },
      ]);
      return;
    }

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

  const prepareDispatch = (slug: AgentSlug): void => {
    setCommandCenterOpen(true);
    setDispatchDraft({ slug, objective: '', stage: 'draft' });
  };

  const updateDispatchObjective = (objective: string): void => {
    setDispatchDraft((current) => current ? { ...current, objective, stage: 'draft', error: undefined } : current);
  };

  const reviewDispatch = (): void => {
    setDispatchDraft((current) => {
      if (!current) return current;
      if (current.objective.trim().length < 8) return { ...current, error: 'Describe la tarea con un poco más de detalle.' };
      return { ...current, objective: current.objective.trim(), stage: 'review', error: undefined };
    });
  };

  const confirmDispatch = async (): Promise<void> => {
    if (!dispatchDraft || dispatchDraft.stage !== 'review') return;
    const draft = dispatchDraft;
    setDispatchDraft({ ...draft, stage: 'sending', error: undefined });
    try {
      const res = await fetch('/api/admin/ai-assistant/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentSlug: draft.slug,
          objective: draft.objective,
          clientRequestId: crypto.randomUUID(),
          threadId: activeThreadId ?? undefined,
        }),
      });
      const payload = await res.json() as { error?: string; runId?: number; url?: string };
      if (!res.ok || !payload.runId || !payload.url) throw new Error(payload.error ?? 'No se pudo encolar la tarea');
      setDispatchDraft({ ...draft, stage: 'done', runId: payload.runId, url: payload.url });
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Tarea confirmada y enviada al agente ${agentLabel(draft.slug)}. Ejecución #${payload.runId}. Las acciones externas seguirán requiriendo aprobación humana.`,
      }]);
    } catch (dispatchError) {
      setDispatchDraft({
        ...draft,
        stage: 'review',
        error: dispatchError instanceof Error ? dispatchError.message : 'No se pudo encolar la tarea',
      });
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
          type="button"
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
                type="button"
                onClick={(e) => { e.stopPropagation(); void deleteThread(t.id); }}
                className="px-1 text-xs text-sp-admin-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                title="Eliminar"
                aria-label={`Eliminar conversación ${t.title}`}
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
            <span className="text-sm font-semibold text-sp-admin-fg">Zack Operaciones</span>
            <span className="text-xs text-sp-admin-muted">Consulta datos · Acciones con confirmación</span>
          </div>
          <button
            type="button"
            onClick={newConversation}
            className="rounded-lg border border-sp-admin-border px-2 py-1 text-xs text-sp-admin-muted transition-colors hover:text-sp-admin-fg md:hidden"
          >
            + Nueva
          </button>
        </div>

        {canDispatch && (
          <div className="border-b border-sp-admin-border bg-sp-admin-bg/35 px-4 py-2.5">
            <button
              type="button"
              aria-expanded={commandCenterOpen}
              onClick={() => setCommandCenterOpen((open) => !open)}
              className="flex w-full items-center gap-2 text-left"
            >
              <Bot size={14} className="text-sp-orange" />
              <span className="text-[11px] font-bold text-sp-admin-fg">Centro de mando</span>
              <span className="text-[10px] text-sp-admin-muted">Ordena tareas a los agentes Zack</span>
              {commandCenterOpen ? <ChevronUp size={13} className="ml-auto text-sp-admin-muted" /> : <ChevronDown size={13} className="ml-auto text-sp-admin-muted" />}
            </button>

            {commandCenterOpen && (
              <div className="mt-3 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {AGENT_COMMANDS.map((agent) => (
                    <button
                      key={agent.slug}
                      type="button"
                      onClick={() => prepareDispatch(agent.slug)}
                      className={`rounded-xl border p-2.5 text-left transition-colors ${dispatchDraft?.slug === agent.slug ? 'border-sp-orange/60 bg-sp-orange/10' : 'border-sp-admin-border bg-sp-admin-card hover:border-sp-orange/35'}`}
                    >
                      <span className="block text-[11px] font-black text-sp-admin-fg">{agent.label} <code className="text-[9px] text-sp-orange">{agent.command}</code></span>
                      <span className="mt-0.5 block text-[9px] leading-relaxed text-sp-admin-muted">{agent.description}</span>
                    </button>
                  ))}
                </div>

                {dispatchDraft && (
                  <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-sp-admin-muted">Orden para {agentLabel(dispatchDraft.slug)}</p>
                        <p className="mt-0.5 text-[9px] text-sp-admin-muted">El agente analizará y preparará resultados. Envíos, publicaciones o cambios sensibles mantienen su aprobación independiente.</p>
                      </div>
                      <button type="button" onClick={() => setDispatchDraft(null)} className="text-[10px] text-sp-admin-muted hover:text-sp-admin-fg">Cerrar</button>
                    </div>

                    {dispatchDraft.stage !== 'done' ? (
                      <>
                        <textarea
                          value={dispatchDraft.objective}
                          onChange={(event) => updateDispatchObjective(event.target.value)}
                          disabled={dispatchDraft.stage === 'sending'}
                          aria-label={`Objetivo para el agente ${agentLabel(dispatchDraft.slug)}`}
                          rows={2}
                          placeholder="Ej.: Revisa qué talentos están creciendo y prepara recomendaciones para esta semana."
                          className="mt-3 w-full resize-none rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[11px] text-sp-admin-fg outline-none focus:border-sp-orange/50 disabled:opacity-60"
                        />
                        {dispatchDraft.error && <p className="mt-2 text-[10px] text-red-400">{dispatchDraft.error}</p>}
                        {dispatchDraft.stage === 'review' && (
                          <div className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[10px] text-amber-300">
                            Confirma que este objetivo es correcto. La orden quedará registrada y vinculada a tu usuario.
                          </div>
                        )}
                        <div className="mt-3 flex justify-end gap-2">
                          {dispatchDraft.stage === 'review' && <button type="button" onClick={() => setDispatchDraft({ ...dispatchDraft, stage: 'draft' })} className="rounded-lg border border-sp-admin-border px-3 py-1.5 text-[10px] font-bold text-sp-admin-muted hover:text-sp-admin-fg">Editar</button>}
                          <button
                            type="button"
                            onClick={dispatchDraft.stage === 'review' ? () => void confirmDispatch() : reviewDispatch}
                            disabled={dispatchDraft.stage === 'sending'}
                            className="rounded-lg bg-sp-orange px-3 py-1.5 text-[10px] font-black text-white hover:bg-sp-pink disabled:opacity-50"
                          >
                            {dispatchDraft.stage === 'sending' ? 'Poniendo en marcha…' : dispatchDraft.stage === 'review' ? 'Confirmar y ejecutar' : 'Revisar orden'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        <div className="flex-1"><p className="text-[11px] font-bold text-emerald-300">Agente en marcha · ejecución #{dispatchDraft.runId}</p><p className="text-[9px] text-sp-admin-muted">Puedes seguir su razonamiento, herramientas y aprobaciones.</p></div>
                        {dispatchDraft.url && <Link href={dispatchDraft.url} className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 hover:underline">Ver ejecución <ExternalLink size={10} /></Link>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mensajes */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="space-y-1">
                <p className="font-semibold text-sp-admin-fg">¿En qué puedo ayudarte?</p>
                <p className="text-sm text-sp-admin-muted">
                  Pregúntame qué requiere atención en tratos, targets, prensa, contenido, finanzas o infraestructura.
                </p>
              </div>
              <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
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
              aria-label="Mensaje para Zack Operaciones"
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
              type="button"
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

function parseAgentCommand(value: string): { readonly slug: AgentSlug; readonly objective: string } | null {
  const match = value.trim().match(/^\/(crm|tratos|growth|seo)(?:\s+([\s\S]*))?$/i);
  if (!match?.[1]) return null;
  const commandToSlug: Readonly<Record<string, AgentSlug>> = {
    crm: 'crm-steward',
    tratos: 'deal-clerk',
    growth: 'growth',
    seo: 'seo',
  };
  const slug = commandToSlug[match[1].toLowerCase()];
  return slug ? { slug, objective: (match[2] ?? '').trim() } : null;
}

function agentLabel(slug: AgentSlug): string {
  return AGENT_COMMANDS.find((agent) => agent.slug === slug)?.label ?? slug;
}
