'use client';

import { useRef, useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { uploadTeamPhotoAction } from '@/app/admin/(dashboard)/equipo/fotos/actions';

type Member = {
  id: number;
  name: string;
  role: string;
  photoUrl: string | null;
  initials: string;
  gradientC1: string;
  gradientC2: string;
};

export function UploadForm({ member }: { member: Member }) {
  const [preview, setPreview] = useState<string | null>(member.photoUrl);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke blob URL on change or unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await uploadTeamPhotoAction(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-sp-border p-5 flex flex-col items-center gap-4">
      {/* Avatar */}
      <div
        className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${member.gradientC1}, ${member.gradientC2})` }}
      >
        {preview ? (
          <Image src={preview} alt={member.name} width={80} height={80} className="object-cover w-full h-full" unoptimized={preview.startsWith('blob:')} />
        ) : (
          <span className="font-display text-2xl font-black text-white/80">{member.initials}</span>
        )}
      </div>

      {/* Info */}
      <div className="text-center">
        <p className="font-display font-black uppercase text-sp-dark text-sm">{member.name}</p>
        <p className="text-xs text-sp-muted">{member.role}</p>
      </div>

      {/* Upload form */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
        <input type="hidden" name="id" value={member.id} />
        <input
          ref={inputRef}
          type="file"
          name="photo"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full text-xs font-semibold text-sp-dark border border-sp-border rounded-xl px-3 py-2 hover:border-sp-orange transition-colors"
        >
          Seleccionar foto
        </button>
        {preview && preview !== member.photoUrl && (
          <button
            type="submit"
            disabled={isPending}
            className="w-full text-xs font-bold text-white rounded-xl px-3 py-2 bg-sp-grad disabled:opacity-60"
          >
            {isPending ? 'Subiendo...' : 'Guardar foto'}
          </button>
        )}
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        {success && <p className="text-xs text-green-600 text-center font-semibold">¡Foto actualizada!</p>}
      </form>
    </div>
  );
}
