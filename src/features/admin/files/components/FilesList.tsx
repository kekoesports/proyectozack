'use client';

import { useState } from 'react';
import { Download, Trash2, FileText } from 'lucide-react';
import type { FileRecord } from '@/types';

type Props = {
  readonly files: FileRecord[];
  readonly talentId: number;
  readonly isManager: boolean;
  readonly deleteAction: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
};

/**
 * Listado de archivos polimórficos asociados a un talent. Permite descargar y, si el usuario es manager,
 * eliminar mediante una server action recibida por props.
 *
 * @kind client
 * @feature admin/files
 */
export function FilesList({ files, talentId, isManager, deleteAction }: Props): React.ReactElement {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (file: FileRecord): Promise<void> => {
    setDeletingId(file.id);
    setError(null);
    const fd = new FormData();
    fd.set('fileId', String(file.id));
    fd.set('fileUrl', file.url);
    fd.set('talentId', String(talentId));
    const result = await deleteAction(fd);
    if (!result.success) {
      setError(result.error ?? 'Error al eliminar');
    }
    setDeletingId(null);
  };

  if (files.length === 0) {
    return (
      <p className="text-xs text-sp-admin-muted py-4 text-center">
        No hay archivos subidos todavía.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-3 rounded-xl border border-sp-admin-border bg-sp-admin-card px-4 py-3"
        >
          <FileText size={16} className="shrink-0 text-sp-admin-muted" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sp-admin-text truncate">{file.name}</p>
            <p className="text-[11px] text-sp-admin-muted">
              {file.platform ? `${file.platform} · ` : ''}
              {new Date(file.createdAt).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              {file.sizeBytes ? ` · ${formatBytes(file.sizeBytes)}` : ''}
            </p>
            {file.notes && (
              <p className="text-[11px] text-sp-admin-muted mt-0.5 truncate">{file.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/api/admin/files/${file.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sp-admin-border text-sp-admin-text hover:bg-sp-admin-border/30 transition-colors"
              aria-label={`Descargar ${file.name}`}
            >
              <Download size={12} />
              Descargar
            </a>
            {!isManager && (
              <button
                type="button"
                disabled={deletingId === file.id}
                onClick={() => { void handleDelete(file); }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors cursor-pointer"
                aria-label={`Eliminar ${file.name}`}
              >
                <Trash2 size={12} />
                {deletingId === file.id ? '...' : 'Eliminar'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
