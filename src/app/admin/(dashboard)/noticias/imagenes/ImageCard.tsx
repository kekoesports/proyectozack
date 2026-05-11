'use client';

import { useState, useTransition } from 'react';
import { deleteNewsImageAction } from './actions';
import type { NewsImage } from '@/lib/news/images';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function ImageCard({ image }: { image: NewsImage }): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const copyUrl = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('No se pudo copiar al portapapeles');
    }
  };

  const handleDelete = () => {
    if (!confirm(`¿Eliminar ${image.filename}? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('url', image.url);
      const result = await deleteNewsImageAction(fd);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <article className="group relative bg-sp-admin-surface border border-sp-admin-border rounded-lg overflow-hidden hover:border-sp-admin-accent/30 transition-colors">
      <div className="relative aspect-[3/2] bg-sp-admin-bg overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- Blob external URLs not in next.config images.domains; img tag is acceptable for admin-only media manager */}
        <img
          src={image.url}
          alt={image.filename}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="px-2 py-1 rounded bg-red-500/90 hover:bg-red-500 text-white text-[10px] font-semibold disabled:opacity-50"
            aria-label="Eliminar imagen"
          >
            {isPending ? '…' : '✕ Eliminar'}
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-sp-admin-text truncate" title={image.filename}>
            {image.filename}
          </p>
          <span className="text-[10px] text-sp-admin-muted tabular-nums shrink-0">
            {formatBytes(image.size)}
          </span>
        </div>
        <p className="text-[10px] text-sp-admin-muted/70">{formatDate(image.uploadedAt)}</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => { void copyUrl(image.url); }}
            className="flex-1 px-2 py-1 rounded bg-sp-admin-bg border border-sp-admin-border text-[10px] font-semibold text-sp-admin-text hover:border-sp-admin-accent/40 hover:text-sp-admin-accent transition-colors"
          >
            {copied ? '✓ Copiado' : 'Copiar URL'}
          </button>
          <a
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 rounded bg-sp-admin-bg border border-sp-admin-border text-[10px] font-semibold text-sp-admin-text hover:border-sp-admin-accent/40 transition-colors"
            aria-label="Abrir en nueva pestaña"
          >
            ↗
          </a>
        </div>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
      </div>
    </article>
  );
}
