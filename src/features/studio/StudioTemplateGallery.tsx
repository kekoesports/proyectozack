'use client';
import Image from 'next/image';
import { useState, useTransition } from 'react';
import { Play, X } from 'lucide-react';
import { STUDIO_MOTION_DESIGNS, type StudioMotion } from '@/lib/studio/motion-catalog';
import type { StudioBoard } from '@/lib/schemas/studio-production';
import { previewStudioTemplate } from '@/app/studio/motion-actions';
import { motionDimensions } from '@/lib/studio/motion-dimensions';

export function StudioTemplateGallery() {
  const [preview, setPreview] = useState<{ id: StudioMotion; html: string; format: StudioBoard['format'] } | null>(null);
  const [format, setFormat] = useState<StudioBoard['format']>('9:16');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const dimensions = preview ? motionDimensions[preview.format] : [720, 1280];
  return <>
    <div className="studio-collection-toolbar"><p>10 diseños · logo incluido · texto editable</p>
      <label>Formato de la previa <select value={format} onChange={(e) => {
        const next = e.target.value; if (next === '9:16' || next === '1:1' || next === '16:9') { setFormat(next); setPreview(null); }
      }}><option>9:16</option><option>1:1</option><option>16:9</option></select></label></div>
    {error && <p role="alert">{error}</p>}
    <div className="studio-motion-gallery">{STUDIO_MOTION_DESIGNS.map((design, index) => <article key={design.id}>
      <Image className="studio-collection-poster" src={`/motion/collection-02/${design.id}.jpg`} width={360} height={640} alt={`Fotograma real: ${design.name}`} />
      <div className="studio-motion-caption"><small>{String(index + 1).padStart(2, '0')} / SOCIALPRO</small><h3>{design.name}</h3><p>{design.description}</p>
        <button type="button" className="studio-btn secondary" disabled={pending} onClick={() => startTransition(async () => {
          setError('');
          try { const result = await previewStudioTemplate({ motion: design.id, format, palette: index % 2 === 0 ? 'dark' : 'light' });
            if (result.ok) setPreview({ id: design.id, html: result.html, format }); else setError(result.error);
          } catch { setError('La animación no se pudo abrir. Vuelve a intentarlo.'); }
        })}><Play size={14} />{pending ? 'Preparando…' : `Ver ${design.name.toLowerCase()}`}</button>
      </div>
      {preview?.id === design.id && <section className="studio-motion-viewer studio-collection-viewer" aria-label={`Animación ${design.name}`}>
        <div className="studio-motion-viewport" style={{ aspectRatio: `${dimensions[0]}/${dimensions[1]}` }}>
          <iframe title={`${design.name} · animación sin audio`} sandbox="allow-scripts" srcDoc={preview.html}
            style={{ width: dimensions[0], height: dimensions[1], transform: `scale(calc(var(--preview-width) / ${dimensions[0]}))` }} />
        </div><p>Animación real · {preview.format} · sin audio ni consumo de IA</p>
        <button className="studio-btn secondary" type="button" onClick={() => setPreview(null)}><X size={14} />Cerrar</button>
      </section>}
    </article>)}</div>
  </>;
}
