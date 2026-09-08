'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { getTargetOutreachAction, sendTargetOutreachAction } from '@/app/admin/(dashboard)/targets/actions';

type History = {
  readonly status: string;
  readonly lastReplySummary: string | null;
  readonly suggestedReply: string | null;
  readonly messages: readonly { readonly id: number; readonly direction: string; readonly status: string; readonly subject: string; readonly textBody: string; readonly occurredAt: string }[];
};

export function TargetOutreachComposer({ target, onClose }: {
  readonly target: { readonly id: number; readonly name: string; readonly email: string };
  readonly onClose: () => void;
}): React.ReactElement {
  const [subject, setSubject] = useState(`Colaboración SocialPro x ${target.name}`);
  const [body, setBody] = useState('');
  const [history, setHistory] = useState<History | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const retryKey = useRef<string | null>(null);

  useEffect(() => {
    let current = true;
    startTransition(async () => {
      const result = await readHistory(target.id);
      if (!current) return;
      if (result.ok) {
        setHistory(result.thread);
        if (result.thread?.suggestedReply) setBody((previous) => previous || result.thread?.suggestedReply || '');
      }
    });
    return () => { current = false; };
  }, [target.id]);

  const send = (): void => {
    const idempotencyKey = retryKey.current ?? crypto.randomUUID();
    retryKey.current = idempotencyKey;
    setFeedback(null);
    startTransition(async () => {
      const result = await sendTargetOutreachAction({ sourceId: target.id, subject, body, idempotencyKey });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      retryKey.current = null;
      setBody('');
      setFeedback(result.replyTracking
        ? 'Email enviado y registrado. Las respuestas aparecerán aquí automáticamente.'
        : 'Email enviado y registrado. Hasta configurar el dominio receptor, las respuestas llegarán al buzón operativo.');
      const refreshed = await readHistory(target.id);
      if (refreshed.ok) setHistory(refreshed.thread);
    });
  };

  return (
    <section className="rounded-xl border border-sp-admin-accent/40 bg-sp-admin-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="font-semibold text-sp-admin-text">Contactar a {target.name}</h2><p className="text-xs text-sp-admin-muted">{target.email} · ningún borrador se envía automáticamente</p></div>
        <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text">Cerrar</button>
      </div>
      {history ? <div className="mt-4 rounded border border-sp-admin-border bg-sp-admin-bg p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-sp-admin-muted">Historial · {history.status}</p>
        {history.lastReplySummary ? <p className="mt-2 text-sm text-sp-admin-text">Última respuesta: {history.lastReplySummary}</p> : null}
        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
          {history.messages.map((message) => <article key={message.id} className="rounded bg-sp-admin-card p-2 text-xs">
            <p className="font-semibold text-sp-admin-text">{message.direction === 'inbound' ? 'Recibido' : 'Enviado'} · {new Date(message.occurredAt).toLocaleString('es-ES')}</p>
            <p className="text-sp-admin-muted">{message.subject}</p><p className="mt-1 whitespace-pre-wrap text-sp-admin-text">{message.textBody}</p>
          </article>)}
        </div>
      </div> : null}
      {feedback ? <p role="status" className="mt-3 text-sm text-sp-admin-muted">{feedback}</p> : null}
      <div className="mt-4 space-y-3">
        <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} disabled={pending} aria-label="Asunto" className="w-full rounded border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={10000} rows={6} disabled={pending} aria-label="Mensaje" placeholder="Escribe el mensaje o revisa el borrador sugerido…" className="w-full rounded border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        <div className="flex justify-end"><button type="button" onClick={send} disabled={pending || !subject.trim() || !body.trim()} className="rounded bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending ? 'Procesando…' : 'Enviar y registrar'}</button></div>
      </div>
    </section>
  );
}

function readHistory(targetId: number): ReturnType<typeof getTargetOutreachAction> {
  return getTargetOutreachAction(targetId);
}
