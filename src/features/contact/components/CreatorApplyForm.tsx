'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trpc } from '@/lib/trpc/client';
import { creatorApplySchema, type CreatorApplyInput } from '@/lib/schemas/creatorApply';

const PLATFORMS = ['Twitch', 'YouTube', 'Instagram', 'TikTok', 'Kick', 'Otra'];
const COUNTRIES = [
  'España',
  'México',
  'Argentina',
  'Colombia',
  'Chile',
  'Perú',
  'Uruguay',
  'Venezuela',
  'Ecuador',
  'Bolivia',
  'Paraguay',
  'Guatemala',
  'Costa Rica',
  'República Dominicana',
];

const fieldClass =
  'w-full rounded-xl border border-sp-border bg-white px-4 py-3 text-sm text-sp-dark placeholder:text-sp-muted/50 focus:outline-none focus:ring-2 focus:ring-sp-orange/30 focus:border-sp-orange transition-colors';

const FIRST_STEP_FIELDS: ReadonlyArray<keyof CreatorApplyInput> = [
  'name',
  'email',
  'country',
  'platform',
  'handle',
];

function audienceField(platform: CreatorApplyInput['platform'] | undefined): {
  readonly label: string;
  readonly placeholder: string;
} {
  if (platform === 'youtube') {
    return {
      label: 'Visualizaciones medias en vídeos largos',
      placeholder: 'Ej. 25K en los últimos 10 vídeos (sin Shorts)',
    };
  }
  if (platform === 'twitch' || platform === 'kick') {
    return {
      label: 'Media de espectadores simultáneos (30 días)',
      placeholder: 'Ej. 85 espectadores',
    };
  }
  if (platform === 'instagram' || platform === 'tiktok') {
    return {
      label: 'Visualizaciones medias recientes',
      placeholder: 'Ej. 40K por vídeo o reel',
    };
  }
  return { label: 'Audiencia media', placeholder: 'Ej. 10K visualizaciones' };
}

/**
 * Formulario de candidatura en dos pasos con datos básicos, perfil público y
 * métricas condicionales. Validación Zod + mutación tRPC.
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
  const [step, setStep] = useState<1 | 2>(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const applyMutation = trpc.creatorApply.submit.useMutation();

  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors },
    reset,
  } = useForm<CreatorApplyInput>({ resolver: zodResolver(creatorApplySchema) });

  const platform = useWatch({ control, name: 'platform' });
  const audience = audienceField(platform);

  async function onSubmit(data: CreatorApplyInput) {
    setStatus('loading');
    try {
      await applyMutation.mutateAsync(data);
      setStatus('success');
      setStep(1);
      reset();
    } catch {
      setStatus('error');
    }
  }

  async function continueToProfile(): Promise<void> {
    const valid = await trigger(FIRST_STEP_FIELDS, { shouldFocus: true });
    if (valid) setStep(2);
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
      <div aria-label={`Paso ${step} de 2`} className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-sp-muted">
          <span>{step === 1 ? 'Datos básicos' : 'Tu contenido'}</span>
          <span>Paso {step} de 2</span>
        </div>
        <div className="grid grid-cols-2 gap-2" aria-hidden="true">
          <span className="h-1.5 rounded-full bg-sp-grad" />
          <span className={`h-1.5 rounded-full ${step === 2 ? 'bg-sp-grad' : 'bg-sp-border'}`} />
        </div>
      </div>

      {step === 1 ? (
        <>
          <div>
            <label htmlFor="apply-name" className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
              Nombre
            </label>
            <input {...register('name')} id="apply-name" autoComplete="name" placeholder="Tu nombre" className={fieldClass} aria-invalid={Boolean(errors.name)} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="apply-email" className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
              Email
            </label>
            <input {...register('email')} id="apply-email" type="email" autoComplete="email" inputMode="email" placeholder="tu@email.com" className={fieldClass} aria-invalid={Boolean(errors.email)} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="apply-country" className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
              País
            </label>
            <input {...register('country')} id="apply-country" list="creator-countries" autoComplete="country-name" placeholder="Ej. España" className={fieldClass} aria-invalid={Boolean(errors.country)} />
            <datalist id="creator-countries">
              {COUNTRIES.map((country) => <option key={country} value={country} />)}
            </datalist>
            {errors.country && <p className="text-xs text-red-500 mt-1">{errors.country.message}</p>}
          </div>

          <div>
            <label htmlFor="apply-platform" className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
              Plataforma principal
            </label>
            <select {...register('platform')} id="apply-platform" className={fieldClass} defaultValue="" aria-invalid={Boolean(errors.platform)}>
              <option value="" disabled>Selecciona plataforma</option>
              {PLATFORMS.map((item) => <option key={item} value={item.toLowerCase()}>{item}</option>)}
            </select>
            {errors.platform && <p className="text-xs text-red-500 mt-1">{errors.platform.message}</p>}
          </div>

          <div>
            <label htmlFor="apply-handle" className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
              URL de tu canal principal
            </label>
            <input {...register('handle')} id="apply-handle" type="url" inputMode="url" autoCapitalize="none" placeholder="https://youtube.com/@tucanal" className={fieldClass} aria-invalid={Boolean(errors.handle)} />
            <p className="text-xs text-sp-muted mt-1">Pega el enlace completo para que podamos revisar el perfil correcto.</p>
            {errors.handle && <p className="text-xs text-red-500 mt-1">{errors.handle.message}</p>}
          </div>

          <button type="button" onClick={() => { void continueToProfile(); }} className="w-full min-h-11 py-3.5 rounded-full font-display font-bold uppercase tracking-wider text-sm text-white bg-sp-grad hover:opacity-90 transition-opacity">
            Continuar →
          </button>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="apply-content" className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
              Juego o contenido principal
            </label>
            <input {...register('contentCategory')} id="apply-content" placeholder="Ej. Counter-Strike 2, Minecraft o tecnología" className={fieldClass} aria-invalid={Boolean(errors.contentCategory)} />
            {errors.contentCategory && <p className="text-xs text-red-500 mt-1">{errors.contentCategory.message}</p>}
          </div>

          <div>
            <label htmlFor="apply-followers" className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
              Seguidores aproximados <span className="text-sp-muted/50">(opcional)</span>
            </label>
            <input {...register('followers')} id="apply-followers" inputMode="numeric" placeholder="Ej. 50K" className={fieldClass} />
          </div>

          <div>
            <label htmlFor="apply-average-audience" className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
              {audience.label} <span className="text-sp-muted/50">(opcional)</span>
            </label>
            <input {...register('averageAudience')} id="apply-average-audience" placeholder={audience.placeholder} className={fieldClass} />
          </div>

          <div>
            <label htmlFor="apply-other-links" className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
              Otras redes <span className="text-sp-muted/50">(opcional)</span>
            </label>
            <textarea {...register('otherLinks')} id="apply-other-links" rows={3} placeholder={'Un enlace por línea\nhttps://twitch.tv/tucanal'} className={fieldClass} />
          </div>

          <div>
            <label htmlFor="apply-message" className="block text-xs font-semibold uppercase tracking-widest text-sp-muted mb-1.5">
              Algo que debamos saber <span className="text-sp-muted/50">(opcional)</span>
            </label>
            <textarea {...register('message')} id="apply-message" rows={3} placeholder="Cuéntanos brevemente qué buscas en una agencia" className={fieldClass} />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-500" role="alert">No se ha podido enviar. Tus datos siguen aquí; inténtalo de nuevo.</p>
          )}

          <p className="text-xs text-sp-muted leading-relaxed">
            Al enviar aceptas que revisemos los perfiles públicos facilitados para valorar tu candidatura. Consulta nuestra{' '}
            <Link href="/privacidad" className="font-semibold text-sp-orange hover:underline">política de privacidad</Link>.
          </p>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" onClick={() => setStep(1)} disabled={status === 'loading'} className="min-h-11 px-6 py-3.5 rounded-full border border-sp-border font-display font-bold uppercase tracking-wider text-sm text-sp-dark hover:border-sp-orange transition-colors disabled:opacity-50">
              ← Volver
            </button>
            <button type="submit" disabled={status === 'loading'} className="min-h-11 flex-1 py-3.5 rounded-full font-display font-bold uppercase tracking-wider text-sm text-white bg-sp-grad hover:opacity-90 transition-opacity disabled:opacity-50">
              {status === 'loading' ? 'Enviando...' : 'Enviar mi perfil'}
            </button>
          </div>
        </>
      )}

    </form>
  );
}
