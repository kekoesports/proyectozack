'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  uploadCampaignFileAction,
  deleteCampaignFileAction,
} from '@/app/admin/(dashboard)/campanas/[id]/files/actions';

import type { FileRecord } from '@/types';
import type { FileType } from '@/lib/schemas/file';

// ── Helpers ───────────────────────────────────────────────────────────────────

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  invoice: 'Factura',
  statement: 'Extracto',
  contract: 'Contrato',
  briefing: 'Briefing',
  geo_stats: 'GEO Stats',
  screenshot: 'Captura',
  receipt: 'Recibo',
  other: 'Otro',
};

export const CAMPAIGN_FILE_TYPES: FileType[] = ['contract', 'briefing', 'receipt', 'screenshot', 'other'];

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ── Upload form ────────────────────────────────────────────────────────────────

type UploadFormProps = {
  readonly campaignId: number;
  readonly onDone: () => void;
};

export function UploadForm({ campaignId, onDone }: UploadFormProps): React.ReactElement {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setStatus('uploading');
    setErrorMsg('');

    const fd = new FormData(e.currentTarget);
    fd.set('campaignId', String(campaignId));

    const result = await uploadCampaignFileAction(fd);

    if (result.success) {
      setStatus('ok');
      startTransition(() => {
        router.refresh();
      });
      onDone();
    } else {
      setStatus('error');
      setErrorMsg(result.error ?? 'Error al subir archivo');
    }
  }

  const inputCls =
    'rounded-md border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text focus:outline-none focus:ring-1 focus:ring-sp-admin-accent w-full';

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-sp-admin-text">Subir archivo</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
            Archivo *
          </label>
          <input
            type="file"
            name="file"
            required
            className={inputCls}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
            Tipo
          </label>
          <select name="type" defaultValue="contract" className={inputCls}>
            {CAMPAIGN_FILE_TYPES.map((t) => (
              <option key={t} value={t}>
                {FILE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
          Notas
        </label>
        <input
          type="text"
          name="notes"
          placeholder="Notas opcionales…"
          className={inputCls}
        />
      </div>

      <div className="flex items-center gap-3">
        {status === 'error' && (
          <span className="text-xs text-red-500 flex-1 truncate">{errorMsg}</span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onDone}
          disabled={status === 'uploading'}
          className="rounded-md border border-sp-admin-border px-3 py-1.5 text-xs text-sp-admin-muted hover:text-sp-admin-text transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={status === 'uploading'}
          className="rounded-md bg-sp-admin-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {status === 'uploading' ? 'Subiendo…' : 'Subir'}
        </button>
      </div>
    </form>
  );
}

// ── File row ───────────────────────────────────────────────────────────────────

type FileRowProps = {
  readonly file: FileRecord;
  readonly campaignId: number;
  readonly canDelete: boolean;
};

export function FileRow({ file, campaignId, canDelete }: FileRowProps): React.ReactElement {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!confirm('¿Eliminar este archivo?')) return;
    setDeleting(true);

    const fd = new FormData();
    fd.set('fileId', String(file.id));
    fd.set('fileUrl', file.url);
    fd.set('campaignId', String(campaignId));

    const result = await deleteCampaignFileAction(fd);

    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      setDeleting(false);
      alert(result.error ?? 'Error al eliminar');
    }
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-sp-admin-border/50 last:border-0">
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-sp-admin-border/30 flex items-center justify-center shrink-0">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-sp-admin-muted"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-sp-admin-text truncate">{file.name}</p>
        <p className="text-[11px] text-sp-admin-muted">
          {FILE_TYPE_LABELS[file.type as FileType] ?? file.type} · {formatDate(file.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`/api/admin/files/${file.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-sp-admin-border px-2.5 py-1 text-xs text-sp-admin-muted hover:text-sp-admin-text transition-colors"
        >
          Descargar
        </a>
        {canDelete && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="rounded-md border border-sp-admin-border px-2.5 py-1 text-xs text-sp-admin-muted hover:text-red-500 hover:border-red-500 transition-colors disabled:opacity-50"
          >
            {deleting ? '…' : 'Eliminar'}
          </button>
        )}
      </div>
    </div>
  );
}
