'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { creatorPlatformSchema, creatorSearchProfileSchema, type CreatorSearchConfig } from '@/lib/schemas/creator-search-profile';
import { PLATFORM_LABELS } from './targets-constants';

const INPUT = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text';
const NUMBERS = [
  { name: 'windowDays', label: 'Ventana de actividad (días)', min: 7, max: 120 },
  { name: 'minRecentVideos', label: 'Mínimo de vídeos recientes', min: 1, max: 30 },
  { name: 'targetMedianViews', label: 'Objetivo de mediana de vistas', min: 0, max: 1_000_000 },
  { name: 'minLiveViewers', label: 'Mínimo de espectadores en directo (Twitch/Kick)', min: 1, max: 1_000_000 },
  { name: 'maxCandidatesPerPlatform', label: 'Máximo de candidatos por red', min: 1, max: 100 },
  { name: 'searchPagesPerDay', label: 'Máximo de páginas de búsqueda al día', min: 1, max: 20 },
] as const;

export function CreatorSearchProfileEditor({ initial, pending, onSave, onCancel }: {
  readonly initial: CreatorSearchConfig;
  readonly pending: boolean;
  readonly onSave: (config: CreatorSearchConfig) => void;
  readonly onCancel: () => void;
}): React.ReactElement {
  const { register, control, handleSubmit, formState: { errors } } = useForm<z.input<typeof creatorSearchProfileSchema>, unknown, CreatorSearchConfig>({
    resolver: zodResolver(creatorSearchProfileSchema), defaultValues: { ...initial, minLiveViewers: initial.minLiveViewers ?? 20 },
  });
  return (
    <form onSubmit={(event) => { void handleSubmit(onSave)(event); }} className="space-y-4 rounded-xl border border-sp-admin-border bg-sp-admin-bg/40 p-4">
      <p className="text-xs text-sp-admin-muted">Guardar configura la búsqueda; no contacta a nadie. Los perfiles nuevos se guardan pausados. Activar requiere superar las comprobaciones del proveedor.</p>
      <label className="block space-y-1 text-xs text-sp-admin-muted">Nombre del perfil
        <input {...register('name')} className={INPUT} maxLength={100} />
      </label>
      <div className="grid gap-3 lg:grid-cols-3">
        {([
          { name: 'keywords', label: 'Palabras clave (una por línea o separadas por comas)' },
          { name: 'markets', label: 'Mercados (WORLDWIDE o códigos de país)' },
          { name: 'languages', label: 'Idiomas (vacío = cualquiera; es, en, pt…)' },
        ] as const).map(({ name, label }) => (
          <label key={name} className="block space-y-1 text-xs text-sp-admin-muted">{label}
            <textarea className={INPUT} rows={3} defaultValue={initial[name].join('\n')} {...register(name, {
              setValueAs: (value: unknown) => typeof value === 'string'
                ? value.split(/[\n,]/).map((part) => part.trim()).filter(Boolean) : value,
            })} />
          </label>
        ))}
      </div>
      <Controller control={control} name="platforms" render={({ field }) => (
        <fieldset className="flex flex-wrap gap-4 text-xs text-sp-admin-text">
          <legend className="mb-2 text-sp-admin-muted">Plataformas</legend>
          {creatorPlatformSchema.options.map((platform) => (
            <label key={platform} className="flex items-center gap-2">
              <input type="checkbox" checked={field.value.includes(platform)} onBlur={field.onBlur}
                onChange={() => field.onChange(field.value.includes(platform) ? field.value.filter((value) => value !== platform) : [...field.value, platform])} />
              {PLATFORM_LABELS[platform]}
            </label>
          ))}
        </fieldset>
      )} />
      <div className="grid gap-3 md:grid-cols-3">
        {NUMBERS.map(({ name, label, min, max }) => (
          <label key={name} className="block space-y-1 text-xs text-sp-admin-muted">{label}
            <input {...register(name, { valueAsNumber: true })} type="number" min={min} max={max} step={1} className={INPUT} />
          </label>
        ))}
        <label className="block space-y-1 text-xs text-sp-admin-muted">Hora diaria
          <input {...register('scheduleTime')} type="time" className={INPUT} />
        </label>
        <label className="block space-y-1 text-xs text-sp-admin-muted">Zona horaria
          <input {...register('timezone')} className={INPUT} placeholder="Europe/Madrid" />
        </label>
      </div>
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-xs text-amber-300">Revisa los campos: {Object.keys(errors).join(', ')}. Debe haber al menos una palabra clave, una plataforma y un mercado.</p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-sp-admin-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{pending ? 'Guardando…' : 'Guardar perfil'}</button>
        <button type="button" onClick={onCancel} disabled={pending} className="rounded-lg border border-sp-admin-border px-4 py-2 text-xs text-sp-admin-muted">Cancelar</button>
      </div>
    </form>
  );
}
