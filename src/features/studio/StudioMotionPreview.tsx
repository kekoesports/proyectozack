'use client';
import { useState, useTransition } from 'react';
import { Play, X } from 'lucide-react';
import { previewStudioMotion } from '@/app/studio/motion-actions';
import { motionDimensions } from '@/lib/studio/motion-dimensions';
import type { StudioBoard } from '@/lib/schemas/studio-production';

/** Isolated document: scripts can animate, but cannot access parent, cookies or network. */
export function StudioMotionPreview({ input, format }: { input: unknown; format: StudioBoard['format'] }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [width, height] = motionDimensions[format];
  return <div className="studio-motion-preview-control">
    <button type="button" className="studio-btn secondary" disabled={pending} onClick={() => startTransition(async () => {
      setError('');
      try { const result = await previewStudioMotion(input); if (result.ok) setHtml(result.html); else setError(result.error); }
      catch { setError('La previa no está disponible. Tu montaje no ha cambiado.'); }
    })}><Play size={14} />{pending ? 'Preparando…' : 'Ver animación antes de exportar'}</button>
    {html && <section className="studio-motion-viewer" aria-label="Previsualización animada">
      <div className="studio-motion-viewport" style={{ aspectRatio: `${width}/${height}` }}>
        <iframe title="Animación SocialPro sin audio" sandbox="allow-scripts" srcDoc={html} style={{ width, height, transform: `scale(calc(var(--preview-width) / ${width}))` }} />
      </div>
      <p>Diseño y animación reales · sin audio. Si editas el texto, vuelve a generar la previa.</p>
      <button type="button" className="studio-btn secondary" onClick={() => setHtml(null)}><X size={14} />Cerrar previa</button>
    </section>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
