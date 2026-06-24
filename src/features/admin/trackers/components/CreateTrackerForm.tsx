'use client';

import { useRef, useState, useTransition } from 'react';
import { createTrackerAction } from '@/app/admin/(dashboard)/entregables/tracker-actions';
import { DELIVERABLE_TYPES } from '@/lib/schemas/deal-tracker';
import type { CrmBrand } from '@/types/crmBrand';

const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  stream_integration:  'Stream integration',
  video_youtube:       'Video YouTube',
  short_reel_tiktok:  'Short / Reel / TikTok',
  story_instagram:     'Story Instagram',
  tweet_x:             'Tweet / X',
  post_instagram:      'Post Instagram',
  otro:                'Otro',
};

type Talent = { id: number; name: string };

type Props = {
  brands: Pick<CrmBrand, 'id' | 'name'>[];
  talents: Talent[];
  onSuccess: (newId: number) => void;
  onCancel: () => void;
};

export function CreateTrackerForm({ brands, talents, onSuccess, onCancel }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setError(null);
    startTransition(async () => {
      const result = await createTrackerAction(fd);
      if (!result.ok) { setError(result.error); return; }
      if (!result.id) { setError('Error inesperado: sin ID'); return; }
      onSuccess(result.id);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-sp-muted mb-1">Marca *</label>
          <input
            name="brandName"
            required
            maxLength={200}
            list="brand-suggestions"
            placeholder="Ej. SkinPlace"
            className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm"
          />
          <datalist id="brand-suggestions">
            {brands.map((b) => <option key={b.id} value={b.name} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-muted mb-1">Nombre del deal *</label>
          <input
            name="dealName"
            required
            maxLength={300}
            placeholder="Ej. HUASOPEEK × SkinPlace — 15 streams"
            className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-sp-muted mb-1">Tipo de contenido *</label>
          <select name="deliverableType" required className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm">
            {DELIVERABLE_TYPES.map((t) => (
              <option key={t} value={t}>{DELIVERABLE_TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-muted mb-1">Objetivo (nº piezas) *</label>
          <input
            name="targetCount"
            type="number"
            min={1}
            required
            placeholder="15"
            className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-muted mb-1">Talento</label>
          <select name="talentId" className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm">
            <option value="">— Sin asignar —</option>
            {talents.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-sp-muted mb-1">Notas</label>
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-sp-border hover:bg-sp-off transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Creando…' : 'Crear tracker'}
        </button>
      </div>
    </form>
  );
}
