'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import type { LeadStatus, LeadWithAssignee } from '@/types';
import {
  addLeadNoteAction,
  assignLeadAction,
  updateLeadStatusAction,
} from '@/app/admin/(dashboard)/leads/actions';

import { STATUS_META, shortDate, typeMeta } from './leadMeta';
import type { StaffOption } from './LeadsTable';
import { LeadReplyComposer } from './LeadReplyComposer';

type Props = {
  readonly lead: LeadWithAssignee;
  readonly staff: readonly StaffOption[];
  readonly canWrite: boolean;
};

/** Una línea del log append-only: `[ISO] Autor: cuerpo`. */
type LogLine = { readonly at: string; readonly author: string; readonly body: string };

function parseLog(notes: string | null): readonly LogLine[] {
  if (!notes) return [];
  return notes
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const m = /^\[([^\]]+)\]\s([^:]+):\s([\s\S]*)$/.exec(line);
      if (!m || !m[1] || !m[2] || !m[3]) return { at: '', author: '', body: line };
      return { at: m[1], author: m[2], body: m[3].replace(/\s*\[email:[^\]]+\]$/, '') };
    });
}

function Field({ label, value }: { label: string; value: string | null }): React.ReactElement | null {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase text-sp-admin-muted">{label}</dt>
      <dd className="text-sm text-sp-admin-text break-words">{value}</dd>
    </div>
  );
}

export function LeadDetail({ lead, staff, canWrite }: Props): React.ReactElement {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tm = typeMeta(lead.type);
  const log = parseLog(lead.notes);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>): void => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? 'Acción fallida');
    });
  };

  const setStatus = (status: LeadStatus): void => {
    run(() => updateLeadStatusAction({ id: lead.id, status }));
  };

  const submitNote = (): void => {
    const body = note.trim();
    if (body.length === 0) return;
    run(async () => {
      const res = await addLeadNoteAction({ id: lead.id, note: body });
      if (res.ok) setNote('');
      return res;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/leads" className="text-xs text-sp-admin-muted hover:text-sp-admin-text hover:underline">
          ← Leads
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-sp-admin-text leading-none">{lead.name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded border ${tm.color}`}>{tm.label}</span>
        <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_META[lead.status].color}`}>
          {STATUS_META[lead.status].label}
        </span>
      </div>

      {error ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {canWrite ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending || lead.status === 'contactado'}
            onClick={() => setStatus('contactado')}
            className="px-3 py-1.5 text-sm rounded border border-amber-500/40 text-amber-400 disabled:opacity-40 hover:bg-amber-500/10"
          >
            Marcar contactado
          </button>
          <button
            type="button"
            disabled={pending || lead.status === 'ganado'}
            onClick={() => setStatus('ganado')}
            className="px-3 py-1.5 text-sm rounded border border-emerald-500/40 text-emerald-400 disabled:opacity-40 hover:bg-emerald-500/10"
          >
            Marcar ganado
          </button>
          <button
            type="button"
            disabled={pending || lead.status === 'descartado'}
            onClick={() => setStatus('descartado')}
            className="px-3 py-1.5 text-sm rounded border border-zinc-500/40 text-zinc-400 disabled:opacity-40 hover:bg-zinc-500/10"
          >
            Descartar
          </button>
          <label className="flex items-center gap-2 text-sm text-sp-admin-muted">
            Asignar a
            <select
              value={lead.assignedToId ?? ''}
              disabled={pending}
              onChange={(e) => run(() => assignLeadAction({ id: lead.id, assignedToId: e.target.value }))}
              className="px-2 py-1 text-sm rounded border border-sp-admin-border bg-transparent text-sp-admin-text"
            >
              <option value="" className="bg-sp-admin-card">Sin asignar</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id} className="bg-sp-admin-card">{s.name}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
          <h2 className="text-sm font-semibold text-sp-admin-text mb-3">Contacto</h2>
          <dl className="space-y-2">
            <Field label="Email" value={lead.email} />
            <Field label="Teléfono" value={lead.phone} />
            <Field label="Empresa" value={lead.company} />
            <Field label="Recibido" value={shortDate(lead.createdAt)} />
            <Field label="Primera respuesta" value={shortDate(lead.respondedAt)} />
            <Field label="Owner" value={lead.assignedToName} />
          </dl>
        </section>

        <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
          <h2 className="text-sm font-semibold text-sp-admin-text mb-3">Detalles</h2>
          <dl className="space-y-2">
            <Field label="Vertical" value={lead.vertical} />
            <Field label="Tipo de campaña" value={lead.campaignType} />
            <Field label="Presupuesto" value={lead.budget} />
            <Field label="Timeline" value={lead.timeline} />
            <Field label="Público objetivo" value={lead.audience} />
            <Field label="Plataforma" value={lead.platform} />
            <Field label="Viewers / Subs" value={lead.viewers} />
            <Field label="Monetización" value={lead.monetization} />
          </dl>
        </section>
      </div>

      <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4">
        <h2 className="text-sm font-semibold text-sp-admin-text mb-3">Mensaje</h2>
        <p className="text-sm text-sp-admin-text whitespace-pre-wrap">{lead.message}</p>
      </section>

      {canWrite ? (
        <LeadReplyComposer
          leadId={lead.id}
          leadName={lead.name}
          recipientEmail={lead.email}
        />
      ) : null}

      <section className="rounded-lg border border-sp-admin-border bg-sp-admin-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-sp-admin-text">Historial y notas internas</h2>

        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Añadir nota interna…"
              className="flex-1 min-w-[240px] px-3 py-1.5 text-sm bg-sp-admin-bg2 border border-sp-admin-border rounded text-sp-admin-text placeholder:text-sp-admin-muted focus:outline-none focus:border-sp-admin-text/40"
            />
            <button
              type="button"
              disabled={pending || note.trim().length === 0}
              onClick={submitNote}
              className="self-start px-3 py-1.5 text-sm rounded border border-sp-admin-border text-sp-admin-text disabled:opacity-40 hover:bg-sp-admin-bg2"
            >
              Añadir nota
            </button>
          </div>
        ) : null}

        {log.length === 0 ? (
          <p className="text-sm text-sp-admin-muted">Sin actividad todavía.</p>
        ) : (
          <ol className="space-y-2">
            {log.map((entry, i) => (
              <li key={`${entry.at}-${i}`} className="text-sm border-l-2 border-sp-admin-border pl-3">
                <div className="text-xs text-sp-admin-muted tabular-nums">
                  {entry.at ? entry.at.slice(0, 16).replace('T', ' ') : '—'}
                  {entry.author ? ` · ${entry.author}` : ''}
                </div>
                <div className="text-sp-admin-text whitespace-pre-wrap">{entry.body}</div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
