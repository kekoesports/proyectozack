'use client';

import Image from 'next/image';
import { useRef, useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { uploadBrandLogoAction, clearBrandLogoAction } from '@/app/admin/(dashboard)/brands/logo-action';

type Props = {
  readonly brandId: number;
  readonly brandName: string;
  readonly logoUrl: string | null;
};

/**
 * Avatar de logo con upload inline para una marca del CRM.
 * Muestra overlay de cámara en hover; permite subir imagen o quitar logo.
 *
 * @kind client
 * @feature admin/brands
 */
export function BrandLogoUpload({ brandId, brandName, logoUrl }: Props): React.ReactElement {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(logoUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ok' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const display = previewUrl ?? serverUrl;
  const initials = brandName.slice(0, 2).toUpperCase();

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
    fd.append('id', String(brandId));
    fd.append('logo', pendingFile);
    setStatus('uploading');
    setError(null);
    startTransition(async () => {
      const result = await uploadBrandLogoAction(fd);
      if (!result.success) {
        setStatus('error');
        setError(result.error ?? 'Error al subir');
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPendingFile(null);
      setServerUrl(result.logoUrl ?? null);
      setStatus('ok');
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    });
  }

  function onClear(): void {
    if (!serverUrl) return;
    if (!confirm(`¿Quitar el logo de ${brandName}?`)) return;
    const fd = new FormData();
    fd.append('id', String(brandId));
    setStatus('uploading');
    startTransition(async () => {
      const result = await clearBrandLogoAction(fd);
      if (!result.success) {
        setStatus('error');
        setError(result.error ?? 'Error al quitar');
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
          className="w-14 h-14 rounded-xl overflow-hidden ring-1 ring-sp-admin-border cursor-pointer flex items-center justify-center bg-sp-admin-hover"
          onClick={() => !previewUrl && inputRef.current?.click()}
          title={previewUrl ? undefined : 'Clic para subir logo'}
        >
          {display ? (
            <Image
              src={display}
              alt={brandName}
              fill
              className="object-contain p-1"
              sizes="56px"
              unoptimized={display.startsWith('blob:')}
            />
          ) : (
            <span
              className="text-lg font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #f5632a, #8b3aad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {initials}
            </span>
          )}

          {/* Overlay cámara */}
          {!previewUrl && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-xl">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          )}

          {/* Spinner */}
          {status === 'uploading' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
              <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onPick}
      />

      {/* Botones */}
      {previewUrl ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUpload}
            disabled={isPending}
            className="h-6 px-2.5 rounded-lg bg-sp-admin-accent text-white text-[10px] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {status === 'uploading' ? 'Subiendo…' : 'Guardar logo'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-6 px-2.5 rounded-lg border border-sp-admin-border text-[10px] text-sp-admin-muted hover:bg-sp-admin-hover transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-6 px-2.5 rounded-lg border border-sp-admin-border text-[10px] text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors"
          >
            {serverUrl ? 'Cambiar logo' : 'Subir logo'}
          </button>
          {serverUrl && (
            <button
              type="button"
              onClick={onClear}
              disabled={isPending}
              className="h-6 px-2 rounded-lg border border-red-300/60 text-[10px] text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Quitar logo"
            >
              Quitar
            </button>
          )}
        </div>
      )}

      {status === 'error' && error && (
        <p className="text-[10px] text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
