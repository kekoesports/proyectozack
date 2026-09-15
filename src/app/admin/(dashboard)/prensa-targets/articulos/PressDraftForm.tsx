'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PressDraftUpdateSchema } from '@/lib/schemas/press-drafts';
import { updatePressDraftAction } from './actions';

type Draft = z.output<typeof PressDraftUpdateSchema>;

export function PressDraftForm({ draft }: { readonly draft: Draft }): React.ReactElement {
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof PressDraftUpdateSchema>, unknown, Draft>({
    resolver: zodResolver(PressDraftUpdateSchema), defaultValues: draft,
  });
  const fields = [
    { name: 'title', label: 'Título', multiline: false },
    { name: 'excerpt', label: 'Resumen', multiline: true },
    { name: 'author', label: 'Autor', multiline: false },
    { name: 'bodyMd', label: 'Propuesta para el medio', multiline: true },
  ] as const;
  const inputClass = 'mt-2 w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg p-3 text-sp-admin-text';

  return (
    <form className="space-y-5" onSubmit={(event) => { void handleSubmit((values) => {
      setError('');
      const form = new FormData();
      for (const [key, value] of Object.entries(values)) form.set(key, String(value));
      startTransition(async () => {
        const result = await updatePressDraftAction(form);
        if (!result.ok) setError(result.error);
      });
    })(event); }}>
      <input type="hidden" {...register('id')} />
      {fields.map(({ name, label, multiline }) => (
        <div key={name}>
          <label htmlFor={name} className="text-sm font-semibold text-sp-admin-text">{label}</label>
          {multiline
            ? <textarea id={name} {...register(name)} rows={name === 'bodyMd' ? 20 : 3} className={inputClass} />
            : <input id={name} {...register(name)} className={inputClass} />}
          {errors[name] && <p role="alert" className="text-sm text-red-400">{errors[name].message}</p>}
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="rounded-lg bg-sp-orange px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {pending ? 'Guardando…' : 'Guardar propuesta'}
        </button>
        <Link href="/admin/prensa-targets" className="text-sm text-sp-admin-muted">Volver a Prensa y difusión</Link>
      </div>
    </form>
  );
}
