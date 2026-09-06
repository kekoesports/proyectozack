'use client';
import { useStudioWorkspace } from './StudioWorkspaceContext';
import Image from 'next/image';
import { useState, useTransition } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Plus, Save, Trash2, Film, Download } from 'lucide-react';
import { StudioBoard } from '@/lib/schemas/studio-production';
import { saveStudioBoard, renderStudioBoard } from '@/app/studio/production-actions';
import type { StudioMediaAsset } from './StudioMedia';
import { STUDIO_MOTION_DESIGNS, studioMotionSequence } from '@/lib/studio/motion-catalog';
import { StudioMotionPreview } from './StudioMotionPreview';

export function StudioTimeline({ projectId, projectRevision, board, assets, renderEnabled }: {
  projectId: string; projectRevision: number; board: { revision: number; document: StudioBoard } | null;
  assets: StudioMediaAsset[]; renderEnabled: boolean;
}) {
  const workspace = useStudioWorkspace();
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();
  const { control, register, handleSubmit, setValue, formState: { errors, isDirty } } = useForm<StudioBoard>({
    resolver: zodResolver(StudioBoard), defaultValues: board?.document ?? { version: 1, format: '9:16', palette: 'light', audioAssetId: null,
      scenes: [{ id: crypto.randomUUID(), kind: 'title', assetId: null, title: 'Una idea que merece contarse.', body: 'Prepara tu primera escena.', duration: 4, start: 0 }] },
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'scenes', keyName: 'fieldKey' });
  const document = useWatch({ control });
  const scene = document.scenes?.[selected];
  const total = document.scenes?.reduce((n, s) => n + (Number(s.duration) || 0), 0) ?? 0;
  const src = scene?.assetId ? `/api/studio/assets/${scene.assetId}` : null;
  const shift = (target: number) => { move(selected, target); setSelected(target); };
  return <form className="studio-timeline-editor" onSubmit={(event) => { void handleSubmit((data) => startTransition(async () => {
    try { const result = await saveStudioBoard({ projectId, revision: board?.revision ?? -1, document: data }, workspace); setNotice(result.ok ? 'Montaje guardado.' : result.error); if (result.ok) router.refresh(); }
    catch { setNotice('No se guardó el montaje. Mantén esta pestaña abierta.'); }
  }))(event); }}>
    <div className="studio-montage-toolbar"><div><span className="studio-eyebrow">MONTAJE / {total.toFixed(1)} s</span><h2>La historia, escena a escena.</h2></div>
      <label>Formato<select aria-label="Formato de exportación" {...register('format')}><option>9:16</option><option>1:1</option><option>16:9</option></select></label>
      <label>Estilo<select {...register('palette')}><option value="light">SocialPro · claro</option><option value="dark">SocialPro · oscuro</option></select></label></div>
    <details className="studio-motion-sequences"><summary>Plantillas SocialPro · añadir una estructura</summary>
      <p>Añade 3 cartelas al final. No sustituye tus escenas, el guion ni el material aprobado. Personaliza el texto e intercala tus clips desde la biblioteca.</p>
      <div>{([{ id: 'founder', name: 'Presentación' }, { id: 'creator', name: 'Historia de un creador' }, { id: 'campaign', name: 'Campaña con sentido' }] as const).map((item) =>
        <button type="button" key={item.id} disabled={fields.length > 5} onClick={() => { append(studioMotionSequence(item.id)); setSelected(fields.length); setNotice('Estructura añadida al final, sin guardar todavía. Adapta los textos al guion.'); }}>{item.name} <Plus size={14} /></button>)}</div>
      {fields.length > 5 && <p>Necesitas espacio para 3 escenas (máximo 8).</p>}
    </details>
    <div className="studio-edit-stage">
      <div className="studio-preview-checker"><div className={`studio-scene-preview ${document.palette}`} style={{ aspectRatio: document.format?.replace(':', '/') }} key={`${scene?.id}:${scene?.kind}:${scene?.assetId}`}>
        {scene?.kind === 'title' ? <div className="studio-title-preview"><small>SOCIALPRO / CREATOR STUDIO</small><i /><h3>{scene.title}</h3><p>{scene.body}</p><footer>GAMING. PERSONAS. IDEAS.</footer></div>
          : src && scene?.kind === 'image' ? <Image src={src} width={720} height={1280} alt={scene.title || 'Imagen de la escena'} unoptimized />
          : src && scene?.kind === 'video' ? <video src={src} controls playsInline preload="metadata" aria-label="Previsualización de escena" onLoadedMetadata={(e) => { e.currentTarget.currentTime = Number(scene.start) || 0; }} />
          : <div className="studio-scene-placeholder"><Film size={36} /><p>Selecciona material<br />de tu biblioteca</p></div>}
      </div><small>{scene?.motion ? 'Esquema del texto · pulsa «Ver animación» para ver el diseño elegido' : 'Previa de escena · comprueba tiempos y transiciones en el MP4 exportado'}</small></div>
      {scene && <fieldset className="studio-scene-settings"><legend>ESCENA {String(selected + 1).padStart(2, '0')}</legend>
        <label>Tipo<select {...register(`scenes.${selected}.kind`)} onChange={(e) => {
          const kind = e.target.value;
          if (kind === 'title' || kind === 'image' || kind === 'video') { setValue(`scenes.${selected}.kind`, kind, { shouldDirty: true }); setValue(`scenes.${selected}.assetId`, null, { shouldDirty: true }); if (kind !== 'title') setValue(`scenes.${selected}.motion`, undefined, { shouldDirty: true }); }
        }}><option value="title">Cartela animada</option><option value="video">Clip de vídeo</option><option value="image">Imagen completa</option></select></label>
        {scene.kind === 'title' && <label>Diseño de cartela<select value={scene.motion ?? ''} onChange={(e) => {
          const motion = e.target.value;
          if (!motion || STUDIO_MOTION_DESIGNS.some((item) => item.id === motion)) {
            const design = STUDIO_MOTION_DESIGNS.find((item) => item.id === motion);
            setValue(`scenes.${selected}.motion`, design?.id, { shouldDirty: true });
          }
        }}><option value="">Clásica · conservar diseño anterior</option>{STUDIO_MOTION_DESIGNS.map((item) => <option value={item.id} key={item.id}>{item.name} · HyperFrames v1</option>)}</select></label>}
        {scene.kind !== 'title' && <label>Material<select value={scene.assetId ?? ''} onChange={(e) => setValue(`scenes.${selected}.assetId`, e.target.value || null, { shouldDirty: true })}>
          <option value="">Selecciona un archivo</option>{assets.filter((a) => a.contentType.startsWith(`${scene.kind}/`)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>}
        <label>{scene.kind === 'title' ? `Titular visible${scene.motion ? ' · máximo 60 caracteres' : ''}` : 'Nombre interno de escena'}<input {...register(`scenes.${selected}.title`)} maxLength={scene.motion ? 60 : 90} /></label>
        {scene.kind === 'title' && <label>{scene.motion === 'steps-v1' ? 'Hasta 3 pasos · 48 caracteres por paso' : 'Texto de apoyo'}<textarea {...register(`scenes.${selected}.body`)} rows={3} maxLength={scene.motion ? 150 : 240} /></label>}
        <div className="studio-field-pair"><label>Duración (s)<input type="number" min="1" max="60" step="0.1" {...register(`scenes.${selected}.duration`, { valueAsNumber: true })} /></label>
          {scene.kind === 'video' && <label>Inicio en clip (s)<input type="number" min="0" max="600" step="0.1" {...register(`scenes.${selected}.start`, { valueAsNumber: true })} /></label>}</div>
        <p>Vídeos e imágenes completos, sin recortar rostros ni miniaturas. No se generan ni se retocan caras.</p>
        <div className="studio-reorder"><button type="button" aria-label="Mover escena antes" disabled={selected === 0} onClick={() => shift(selected - 1)}><ArrowLeft size={16} /></button>
          <button type="button" aria-label="Mover escena después" disabled={selected === fields.length - 1} onClick={() => shift(selected + 1)}><ArrowRight size={16} /></button>
          <button type="button" aria-label="Eliminar escena" disabled={fields.length === 1} onClick={() => { remove(selected); setSelected(Math.max(0, selected - 1)); }}><Trash2 size={16} /></button></div>
      </fieldset>}
    </div>
    {scene?.kind === 'title' && scene.motion && document.format && <StudioMotionPreview key={`${scene.id}:${document.format}`} input={{ projectId, scene, format: document.format, palette: document.palette }} format={document.format} />}
    <div className="studio-filmstrip" aria-label="Escenas del montaje">{fields.map((field, index) => <button type="button" aria-pressed={selected === index} onClick={() => setSelected(index)} key={field.fieldKey}>
      <span>{String(index + 1).padStart(2, '0')} / {document.scenes?.[index]?.duration ?? 0}s</span><strong>{document.scenes?.[index]?.title || 'Escena sin título'}</strong><small>{document.scenes?.[index]?.kind === 'title' ? 'TIPOGRAFÍA' : 'BIBLIOTECA'}</small>
    </button>)}<button type="button" disabled={fields.length >= 8} className="studio-add-scene" onClick={() => { append({ id: crypto.randomUUID(), kind: 'title', title: 'La siguiente idea.', body: '', duration: 4, start: 0, assetId: null }); setSelected(fields.length); }}><Plus size={22} />Añadir escena</button></div>
    <div className="studio-audio-track"><label>Narración del montaje<select value={document.audioAssetId ?? ''} onChange={(e) => setValue('audioAssetId', e.target.value || null, { shouldDirty: true })}>
      <option value="">Conservar audio de los clips</option>{assets.filter((a) => a.contentType.startsWith('audio/')).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select></label><p>Si eliges una narración, sustituye el audio de todos los clips. Debe corresponder a este guion; no sincroniza labios ni crea una voz nueva.</p></div>
    <div className="studio-project-toolbar"><button type="submit" className="studio-btn secondary" disabled={pending}><Save size={16} />Guardar montaje</button>
      <button type="button" className="studio-btn" disabled={pending || isDirty || !board || !renderEnabled} onClick={() => startTransition(async () => {
        if (!board) return;
        try { const result = await renderStudioBoard({ projectId, projectRevision, boardRevision: board.revision }, workspace); setNotice(result.ok ? 'Exportación registrada. Aparecerá en Revisión al terminar.' : result.error); router.refresh(); }
        catch { setNotice('Actualiza para comprobar la cola antes de repetir.'); }
      })}><Download size={16} />Exportar MP4 · 0 créditos Higgsfield</button></div>
    {!!Object.keys(errors).length && <p role="alert">Revisa el material, los tiempos y los textos. Máximo 8 escenas y 120 segundos.</p>}
    <p role="status">{pending ? 'Guardando…' : notice || (isDirty ? 'Hay cambios sin guardar. Guarda antes de exportar.' : !renderEnabled ? 'Exportación pendiente de activar el trabajador en este entorno.' : 'Exportación privada en 720p. Coste de procesamiento del servidor, sin generación de pago.')}</p>
  </form>;
}
