'use client';

import { useActionState, useState } from 'react';
import { createGiveawayAction, type GiveawayActionState } from './actions';

type Talent = { readonly id: number; readonly slug: string; readonly name: string };

export function CreateGiveawayForm({ talents }: { talents: readonly Talent[] }): React.ReactElement {
  const [state, formAction] = useActionState<GiveawayActionState | null, FormData>(
    async (_prev, fd) => createGiveawayAction(fd),
    null,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const [talentId, setTalentId] = useState<string>('');
  const slug = talents.find((t) => String(t.id) === talentId)?.slug ?? '';

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input type="hidden" name="talentSlug" value={slug} />
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Creador</label>
        <select
          name="talentId"
          required
          value={talentId}
          onChange={(e) => setTalentId(e.target.value)}
          className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text"
        >
          <option value="">Seleccionar...</option>
          {talents.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {fieldErrors?.talentId && <p className="text-xs text-red-400 mt-1">{fieldErrors.talentId[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Título del premio</label>
        <input name="title" required maxLength={200} className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        {fieldErrors?.title && <p className="text-xs text-red-400 mt-1">{fieldErrors.title[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Marca</label>
        <input name="brandName" required maxLength={150} className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        {fieldErrors?.brandName && <p className="text-xs text-red-400 mt-1">{fieldErrors.brandName[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Valor</label>
        <input name="value" maxLength={50} placeholder="1.250" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">URL del sorteo</label>
        <input name="redirectUrl" type="url" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        {fieldErrors?.redirectUrl && <p className="text-xs text-red-400 mt-1">{fieldErrors.redirectUrl[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Imagen del premio (URL)</label>
        <input name="imageUrl" type="url" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        {fieldErrors?.imageUrl && <p className="text-xs text-red-400 mt-1">{fieldErrors.imageUrl[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Logo de marca (URL)</label>
        <input name="brandLogo" type="url" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Descripción</label>
        <input name="description" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Inicio</label>
        <input name="startsAt" type="datetime-local" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Fin</label>
        <input name="endsAt" type="datetime-local" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        {fieldErrors?.endsAt && <p className="text-xs text-red-400 mt-1">{fieldErrors.endsAt[0]}</p>}
      </div>
      <div className="md:col-span-2">
        <button type="submit" className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 transition-opacity">
          Crear Giveaway
        </button>
      </div>
    </form>
  );
}
