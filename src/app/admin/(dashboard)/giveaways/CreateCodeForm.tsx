'use client';

import { useActionState } from 'react';
import { createCodeAction, type CodeActionState } from './codes-actions';

type Talent = { readonly id: number; readonly name: string };

export function CreateCodeForm({ talents }: { talents: readonly Talent[] }): React.ReactElement {
  const [state, formAction] = useActionState<CodeActionState | null, FormData>(
    async (_prev, fd) => createCodeAction(fd),
    null,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Creador</label>
        <select name="talentId" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
          <option value="">Seleccionar...</option>
          {talents.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {fieldErrors?.talentId && <p className="text-xs text-red-400 mt-1">{fieldErrors.talentId[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Código</label>
        <input name="code" required maxLength={100} placeholder="TODOCS2" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40" />
        {fieldErrors?.code && <p className="text-xs text-red-400 mt-1">{fieldErrors.code[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Marca</label>
        <input name="brandName" required maxLength={150} className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        {fieldErrors?.brandName && <p className="text-xs text-red-400 mt-1">{fieldErrors.brandName[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">URL de redirección</label>
        <input name="redirectUrl" type="url" required className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
        {fieldErrors?.redirectUrl && <p className="text-xs text-red-400 mt-1">{fieldErrors.redirectUrl[0]}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Logo marca (URL)</label>
        <input name="brandLogo" type="url" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Descripción (beneficio exacto)</label>
        <input name="description" maxLength={300} placeholder="100% extra en tu primer depósito" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">CTA personalizado</label>
        <input name="ctaText" maxLength={100} placeholder="Activar bonus" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Badge</label>
        <select name="badge" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
          <option value="">Sin badge</option>
          <option value="TOP">🔥 TOP</option>
          <option value="RECOMENDADO">⭐ Recomendado</option>
          <option value="MEJOR_BONUS">💎 Mejor bonus</option>
          <option value="NUEVO">✨ Nuevo</option>
          <option value="MAS_USADO">🚀 Más usado</option>
          <option value="EXCLUSIVO">👑 Exclusivo</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Categoría</label>
        <select name="category" className="w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text">
          <option value="">Sin categoría</option>
          <option value="casino">Casino</option>
          <option value="apuestas">Apuestas</option>
          <option value="skins_cs2">Skins CS2</option>
          <option value="otros">Otros</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" name="isFeatured" id="isFeatured" className="rounded" />
        <label htmlFor="isFeatured" className="text-sm font-semibold text-sp-admin-muted">
          Destacado (aparece en sección &ldquo;Mejores recompensas&rdquo;)
        </label>
      </div>
      <div className="md:col-span-2">
        <button type="submit" className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 transition-opacity">
          Crear Código
        </button>
      </div>
    </form>
  );
}
