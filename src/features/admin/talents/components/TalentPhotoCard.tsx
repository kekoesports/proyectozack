'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  uploadTalentPhotoAction,
  clearTalentPhotoAction,
} from '@/app/admin/(dashboard)/talents/fotos/actions';

type Talent = {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly initials: string;
  readonly gradientC1: string;
  readonly gradientC2: string;
  readonly photoUrl: string | null;
  readonly visibility: 'public' | 'internal';
  readonly codeCount: number;
  readonly giveawayCount: number;
};

type Status = 'idle' | 'sending' | 'ok' | 'error';

type Props = {
  readonly talent: Talent;
};

/**
 * Card editora de la foto principal del talent (upload, preview, swap) usada en la galería de fotos del admin.
 *
 * @kind client
 * @feature admin/talents
 * @route /admin/talents/fotos
 * @example
 * ```tsx
 * <TalentPhotoCard talent={talent} />
 * ```
 */
export function TalentPhotoCard({ talent }: Props): React.ReactElement {
  const [serverUrl, setServerUrl] = useState<string | null>(talent.photoUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const inHub = talent.codeCount > 0 || talent.giveawayCount > 0;
  const display = previewUrl ?? serverUrl;

  const onPick = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setPendingFile(file);
    setStatus('idle');
    setError(null);
  };

  const onCancel = (): void => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    setStatus('idle');
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!pendingFile) return;
    const fd = new FormData();
    fd.append('id', String(talent.id));
    fd.append('photo', pendingFile);

    setStatus('sending');
    setError(null);
    startTransition(async () => {
      const result = await uploadTalentPhotoAction(fd);
      if (!result.success) {
        setStatus('error');
        setError(result.error ?? 'Error al subir');
        return;
      }
      // Replace local preview with server URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPendingFile(null);
      setServerUrl(result.photoUrl ?? null);
      setStatus('ok');
      if (inputRef.current) inputRef.current.value = '';
    });
  };

  const onClear = (): void => {
    if (!serverUrl) return;
    if (!confirm(`¿Borrar la foto de ${talent.name}?`)) return;
    const fd = new FormData();
    fd.append('id', String(talent.id));
    setStatus('sending');
    setError(null);
    startTransition(async () => {
      const result = await clearTalentPhotoAction(fd);
      if (!result.success) {
        setStatus('error');
        setError(result.error ?? 'Error al borrar');
        return;
      }
      setServerUrl(null);
      setStatus('ok');
    });
  };

  return (
    <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden flex flex-col">
      {/* Avatar block */}
      <div
        className="relative aspect-square w-full"
        style={{ background: `linear-gradient(135deg, ${talent.gradientC1}, ${talent.gradientC2})` }}
      >
        {display ? (
          <Image
            src={display}
            alt={talent.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
            unoptimized={display.startsWith('blob:')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-5xl font-black text-white/90 select-none">
              {talent.initials}
            </span>
          </div>
        )}

        {/* Visibility badge */}
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border backdrop-blur-sm ${
            talent.visibility === 'public'
              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
              : 'bg-slate-500/30 text-slate-200 border-slate-400/40'
          }`}
        >
          {talent.visibility === 'public' ? 'public' : 'internal'}
        </span>

        {/* In-hub badge */}
        {inHub && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-sp-orange/20 text-orange-100 border border-sp-orange/40 backdrop-blur-sm">
            {talent.codeCount > 0 && `${talent.codeCount} code${talent.codeCount > 1 ? 's' : ''}`}
            {talent.codeCount > 0 && talent.giveawayCount > 0 && ' · '}
            {talent.giveawayCount > 0 && `${talent.giveawayCount} sorteo${talent.giveawayCount > 1 ? 's' : ''}`}
          </span>
        )}

        {/* Missing photo flag for in-hub creators */}
        {inHub && !serverUrl && !previewUrl && (
          <div className="absolute inset-x-0 bottom-0 bg-amber-500/90 text-amber-950 text-center text-[10px] font-bold uppercase tracking-wider py-1">
            Sin foto · se ve solo iniciales
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <div>
          <p className="font-bold text-sp-admin-text truncate text-sm">{talent.name}</p>
          <p className="text-[11px] text-sp-admin-muted truncate">/{talent.slug}</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onPick}
          />

          {!previewUrl && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex-1 text-xs font-semibold text-sp-admin-text border border-sp-admin-border rounded-xl px-3 py-2 hover:border-sp-admin-accent hover:bg-sp-admin-hover transition-colors cursor-pointer"
              >
                {serverUrl ? 'Reemplazar' : 'Subir foto'}
              </button>
              {serverUrl && (
                <button
                  type="button"
                  onClick={onClear}
                  disabled={pending}
                  className="text-xs font-semibold text-red-400 border border-red-500/30 rounded-xl px-3 py-2 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                  title="Borrar foto"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {previewUrl && (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending || status === 'sending'}
                className="flex-1 text-xs font-bold text-white rounded-xl px-3 py-2 bg-sp-grad disabled:opacity-60 cursor-pointer"
              >
                {status === 'sending' ? 'Subiendo…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="text-xs font-semibold text-sp-admin-muted border border-sp-admin-border rounded-xl px-3 py-2 hover:bg-sp-admin-hover cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Status */}
          {status === 'error' && error && (
            <p className="text-[11px] text-red-400 font-semibold">{error}</p>
          )}
          {status === 'ok' && !previewUrl && (
            <p className="text-[11px] text-emerald-400 font-semibold">¡Listo!</p>
          )}
        </form>

        <Link
          href={`/c/${talent.slug}`}
          target="_blank"
          rel="noreferrer"
          className="block text-[10px] text-sp-admin-muted hover:text-sp-admin-text underline-offset-2 hover:underline"
        >
          Ver página pública ↗
        </Link>
      </div>
    </div>
  );
}
