'use client';

import Image from 'next/image';
import { useRef, useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  uploadTalentPhotoAction,
  clearTalentPhotoAction,
} from '@/app/admin/(dashboard)/talents/fotos/actions';

type Props = {
  readonly talentId: number;
  readonly talentName: string;
  readonly initials: string;
  readonly gradientC1: string;
  readonly gradientC2: string;
  readonly photoUrl: string | null;
};

/**
 * Avatar interactivo con upload inline de foto para el perfil de un talent.
 * Muestra overlay de cámara en hover; abre file picker al hacer clic.
 *
 * @kind client
 * @feature admin/talents
 */
export function TalentPhotoUpload({
  talentId,
  talentName,
  initials,
  gradientC1,
  gradientC2,
  photoUrl,
}: Props): React.ReactElement {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(photoUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ok' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const display = previewUrl ?? serverUrl;

  function onPick(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingFile(file);
    setError(null);
    setStatus('idle');
  }

  function onCancel(): void {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    setError(null);
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  }

  function onUpload(): void {
    if (!pendingFile) return;
    const fd = new FormData();
    fd.append('id', String(talentId));
    fd.append('photo', pendingFile);
    setStatus('uploading');
    setError(null);
    startTransition(async () => {
      const result = await uploadTalentPhotoAction(fd);
      if (!result.success) {
        setStatus('error');
        setError(result.error ?? 'Error al subir');
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPendingFile(null);
      setServerUrl(result.photoUrl ?? null);
      setStatus('ok');
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    });
  }

  function onClear(): void {
    if (!serverUrl) return;
    if (!confirm(`¿Borrar la foto de ${talentName}?`)) return;
    const fd = new FormData();
    fd.append('id', String(talentId));
    setStatus('uploading');
    startTransition(async () => {
      const result = await clearTalentPhotoAction(fd);
      if (!result.success) {
        setStatus('error');
        setError(result.error ?? 'Error al borrar');
        return;
      }
      setServerUrl(null);
      setStatus('ok');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Avatar clicable */}
      <div className="relative group">
        <div
          className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-sp-admin-card shadow-lg cursor-pointer"
          style={{ background: `linear-gradient(135deg, ${gradientC1}, ${gradientC2})` }}
          onClick={() => !previewUrl && inputRef.current?.click()}
          title={previewUrl ? undefined : 'Haz clic para cambiar la foto'}
        >
          {display ? (
            <Image
              src={display}
              alt={talentName}
              fill
              className="object-cover object-top"
              sizes="96px"
              unoptimized={display.startsWith('blob:')}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white/90">
              {initials}
            </div>
          )}

          {/* Overlay cámara en hover */}
          {!previewUrl && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          )}

          {/* Spinner durante upload */}
          {status === 'uploading' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Indicador de estado activo */}
        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-sp-admin-card bg-emerald-500" />
      </div>

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onPick}
      />

      {/* Botones de acción */}
      {previewUrl ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUpload}
            disabled={isPending}
            className="h-7 px-3 rounded-lg bg-sp-admin-accent text-white text-[11px] font-bold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors"
          >
            {status === 'uploading' ? 'Subiendo…' : 'Guardar foto'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-7 px-3 rounded-lg border border-sp-admin-border text-[11px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-7 px-3 rounded-lg border border-sp-admin-border text-[11px] text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors flex items-center gap-1.5"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            {serverUrl ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {serverUrl && (
            <button
              type="button"
              onClick={onClear}
              disabled={isPending}
              className="h-7 px-2 rounded-lg border border-red-300/60 text-[11px] text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Quitar foto"
            >
              Quitar
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && error && (
        <p className="text-[11px] text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
