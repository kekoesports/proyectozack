'use client';

import { useState, useTransition } from 'react';
import { uploadNewsImageAction } from './actions';

export function UploadForm(): React.ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [slug, setSlug] = useState('');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; msg: string; url?: string } | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    if (slug.trim()) fd.append('slug', slug.trim());

    startTransition(async () => {
      setFeedback(null);
      const result = await uploadNewsImageAction(fd);
      if (result.ok) {
        setFeedback({ kind: 'success', msg: `✓ Subida: ${result.filename}`, url: result.url });
        setFile(null);
        setSlug('');
        const fileInput = document.getElementById('news-image-file') as HTMLInputElement | null;
        if (fileInput) fileInput.value = '';
      } else {
        setFeedback({ kind: 'error', msg: result.error });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-sp-admin-surface border border-sp-admin-border rounded-lg p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label htmlFor="news-image-file" className="block text-xs font-semibold text-sp-admin-text mb-1.5">
            Imagen a subir
          </label>
          <input
            id="news-image-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-sp-admin-text file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sp-admin-accent/10 file:text-sp-admin-accent hover:file:bg-sp-admin-accent/20 file:cursor-pointer"
          />
          <p className="text-[10px] text-sp-admin-muted mt-1.5">
            PNG / JPG / WebP — max 10MB. Se redimensiona a 1536px width + convierte a WebP q82 automáticamente.
          </p>
        </div>
        <button
          type="submit"
          disabled={!file || isPending}
          className="px-4 py-2 rounded bg-sp-admin-accent text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          {isPending ? 'Subiendo…' : 'Subir imagen'}
        </button>
      </div>

      <div>
        <label htmlFor="news-image-slug" className="block text-xs font-semibold text-sp-admin-text mb-1.5">
          Nombre custom <span className="text-sp-admin-muted font-normal">(opcional, sanitizado a kebab-case)</span>
        </label>
        <input
          id="news-image-slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="ej: gentle-mates-astana-cambio-tono"
          className="w-full px-3 py-1.5 rounded bg-sp-admin-bg border border-sp-admin-border text-xs text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50"
        />
        <p className="text-[10px] text-sp-admin-muted mt-1.5">
          Si dejas vacío, usa el nombre del archivo original. Si el nombre existe, sobrescribe.
        </p>
      </div>

      {feedback && (
        <div
          className={`text-xs px-3 py-2 rounded border ${
            feedback.kind === 'success'
              ? 'bg-emerald-50/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-50/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.msg}
          {feedback.url && (
            <div className="mt-1.5 break-all font-mono text-[10px] opacity-75">{feedback.url}</div>
          )}
        </div>
      )}
    </form>
  );
}
