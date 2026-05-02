'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  email: z.email('Email inválido'),
  platform: z.string().min(1, 'Plataforma requerida'),
  handle: z.string().min(1, 'Handle requerido'),
  followers: z.string().optional(),
  message: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PLATFORMS = ['Twitch', 'YouTube', 'Instagram', 'TikTok', 'Kick', 'Otra'];

const fieldClass =
  'w-full rounded-xl border border-sp-border bg-white px-4 py-3 text-sm text-sp-dark placeholder:text-sp-muted/50 focus:outline-none focus:ring-2 focus:ring-sp-orange/30 focus:border-sp-orange transition-colors';

/**
 * Formulario de candidatura para creadores: nombre, email, plataforma,
 * handle, followers y mensaje. Validación Zod + POST a `/api/creator-apply`.
 *
 * @kind client
 * @feature contact
 * @route /para-creadores
 * @example
 * ```tsx
 * <CreatorApplyForm />
 * ```
 */
export function CreatorApplyForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const applyMutation = trpc.creatorApply.submit.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setStatus('loading');
    try {
      await applyMutation.mutateAsync(data);
      setStatus('success');
      reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-sp-border bg-sp-off p-8 text-center">
        <div className="text-4xl mb-3">🎮</div>
        <h3 className="font-display text-xl font-bold uppercase text-sp-dark mb-2">
          Aplicación recibida
        </h3>
        <p className="text-sm text-sp-muted">
          Nuestro equipo revisará tu perfil y te contactará en 48 horas.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
          Nombre
        </label>
        <input {...register('name')} placeholder="Tu nombre" className={fieldClass} />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
          Email
        </label>
        <input {...register('email')} type="email" placeholder="tu@email.com" className={fieldClass} />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      {/* Platform */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
          Plataforma principal
        </label>
        <select {...register('platform')} className={fieldClass} defaultValue="">
          <option value="" disabled>Selecciona plataforma</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p.toLowerCase()}>{p}</option>
          ))}
        </select>
        {errors.platform && <p className="text-xs text-red-500 mt-1">{errors.platform.message}</p>}
      </div>

      {/* Handle */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
          Handle / nombre de canal
        </label>
        <input {...register('handle')} placeholder="@tucanal" className={fieldClass} />
        {errors.handle && <p className="text-xs text-red-500 mt-1">{errors.handle.message}</p>}
      </div>

      {/* Followers */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
          Seguidores aproximados <span className="text-sp-muted/50">(opcional)</span>
        </label>
        <input {...register('followers')} placeholder="ej. 50K" className={fieldClass} />
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
          Mensaje <span className="text-sp-muted/50">(opcional)</span>
        </label>
        <textarea {...register('message')} rows={3} placeholder="Cuéntanos sobre ti y tu contenido" className={fieldClass} />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-500">Error al enviar. Inténtalo de nuevo.</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-3.5 rounded-full font-display font-bold uppercase tracking-wider text-sm text-white bg-sp-grad hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {status === 'loading' ? 'Enviando...' : 'Enviar aplicación'}
      </button>
    </form>
  );
}
