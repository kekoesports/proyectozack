'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { sendLeadReplyAction } from '@/app/admin/(dashboard)/leads/actions';
import { OPERATIONAL_GOOGLE_EMAIL } from '@/lib/constants/operational-email';
import {
  leadReplyComposerSchema,
  type LeadReplyComposerInput,
} from '@/lib/schemas/lead';

type Props = {
  readonly leadId: number;
  readonly leadName: string;
  readonly recipientEmail: string;
};

const INPUT_CLASS =
  'w-full rounded border border-sp-admin-border bg-sp-admin-bg2 px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:border-sp-admin-text/40 disabled:opacity-60';

export function LeadReplyComposer({
  leadId,
  leadName,
  recipientEmail,
}: Props): React.ReactElement {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const retryKey = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadReplyComposerInput>({
    resolver: zodResolver(leadReplyComposerSchema),
    defaultValues: {
      subject: `Re: Contacto con SocialPro — ${leadName}`,
      body: '',
    },
  });

  const send = (values: LeadReplyComposerInput): void => {
    setFeedback(null);
    setActionError(null);
    const idempotencyKey = retryKey.current ?? crypto.randomUUID();
    retryKey.current = idempotencyKey;
    startTransition(async () => {
      const result = await sendLeadReplyAction({
        id: leadId,
        subject: values.subject,
        body: values.body,
        idempotencyKey,
      });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      retryKey.current = null;
      reset({ subject: values.subject, body: '' });
      setFeedback('Email enviado. El lead se ha marcado como contactado y se ha registrado en el historial.');
      router.refresh();
    });
  };

  return (
    <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-sp-admin-text">Responder por email</h2>
        <p className="mt-1 text-xs text-sp-admin-muted">
          Se enviará de <strong className="text-sp-admin-text">{OPERATIONAL_GOOGLE_EMAIL}</strong> a{' '}
          <strong className="text-sp-admin-text">{recipientEmail}</strong>.
        </p>
      </div>

      {actionError ? (
        <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {actionError}
        </div>
      ) : null}
      {feedback ? (
        <div className="mb-3 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {feedback}
        </div>
      ) : null}

      <form
        onSubmit={(event) => { void handleSubmit(send)(event); }}
        className="space-y-3"
      >
        <label className="block">
          <span className="mb-1 block text-xs text-sp-admin-muted">Asunto</span>
          <input
            {...register('subject')}
            disabled={pending}
            className={`${INPUT_CLASS} ${errors.subject ? 'border-red-500/70' : ''}`}
            autoComplete="off"
          />
          {errors.subject?.message ? <p className="mt-1 text-xs text-red-400">{errors.subject.message}</p> : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-sp-admin-muted">Mensaje</span>
          <textarea
            {...register('body')}
            disabled={pending}
            rows={7}
            className={`${INPUT_CLASS} ${errors.body ? 'border-red-500/70' : ''}`}
            placeholder="Escribe aquí la respuesta que recibirá el contacto…"
          />
          {errors.body?.message ? <p className="mt-1 text-xs text-red-400">{errors.body.message}</p> : null}
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-sp-admin-muted">No se envía nada automáticamente: el envío ocurre al pulsar este botón.</p>
          <button
            type="submit"
            disabled={pending}
            className="rounded border border-sp-admin-accent/60 bg-sp-admin-accent/10 px-4 py-2 text-sm font-medium text-sp-admin-text hover:bg-sp-admin-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? 'Enviando…' : 'Enviar respuesta'}
          </button>
        </div>
      </form>
    </section>
  );
}
