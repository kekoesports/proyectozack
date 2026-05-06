'use client';

import { useState, useTransition } from 'react';
import { updateCodeAction } from './codes-actions';
import type { CreatorCodeWithTalent } from '@/types';

type Talent = { readonly id: number; readonly name: string };

type Props = {
  readonly code: CreatorCodeWithTalent;
  readonly talents: readonly Talent[];
  readonly onClose: () => void;
};

const BADGES = [
  { value: '',            label: 'Sin badge' },
  { value: 'TOP',         label: '🔥 TOP' },
  { value: 'RECOMENDADO', label: '⭐ Recomendado' },
  { value: 'MEJOR_BONUS', label: '💎 Mejor bonus' },
  { value: 'NUEVO',       label: '✨ Nuevo' },
  { value: 'MAS_USADO',   label: '🚀 Más usado' },
  { value: 'EXCLUSIVO',   label: '👑 Exclusivo' },
] as const;

const CATEGORIES = [
  { value: '',          label: 'Sin categoría' },
  { value: 'casino',    label: 'Casino' },
  { value: 'apuestas',  label: 'Apuestas' },
  { value: 'skins_cs2', label: 'Skins CS2' },
  { value: 'otros',     label: 'Otros' },
] as const;

const inputCls = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';

export function EditCodeModal({ code, talents, onClose }: Props): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [talentId,    setTalentId]    = useState(String(code.talentId));
  const [codeStr,     setCodeStr]     = useState(code.code);
  const [brandName,   setBrandName]   = useState(code.brandName);
  const [brandLogo,   setBrandLogo]   = useState(code.brandLogo ?? '');
  const [redirectUrl, setRedirectUrl] = useState(code.redirectUrl);
  const [description, setDescription] = useState(code.description ?? '');
  const [badge,       setBadge]       = useState(code.badge ?? '');
  const [category,    setCategory]    = useState(code.category ?? '');
  const [ctaText,     setCtaText]     = useState(code.ctaText ?? '');
  const [isFeatured,  setIsFeatured]  = useState(code.isFeatured);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set('id',          String(code.id));
    fd.set('talentId',    talentId);
    fd.set('talentSlug',  code.talent.slug ?? '');
    fd.set('code',        codeStr);
    fd.set('brandName',   brandName);
    fd.set('brandLogo',   brandLogo);
    fd.set('redirectUrl', redirectUrl);
    fd.set('description', description);
    fd.set('badge',       badge);
    fd.set('category',    category);
    fd.set('ctaText',     ctaText);
    if (isFeatured) fd.set('isFeatured', 'on');

    startTransition(async () => {
      const res = await updateCodeAction(fd);
      if (res.ok) onClose();
      else setError(Object.values(res.fieldErrors).flat()[0] ?? 'Error al guardar');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-sp-admin-border bg-sp-admin-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border shrink-0">
          <h2 className="text-base font-bold text-sp-admin-text">Editar código <span className="font-mono text-sp-admin-accent">{code.code}</span></h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl cursor-pointer">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Creador</label>
            <select value={talentId} onChange={(e) => setTalentId(e.target.value)} required className={inputCls}>
              {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Código</label>
            <input value={codeStr} onChange={(e) => setCodeStr(e.target.value)} required maxLength={100} className={`${inputCls} font-mono uppercase`} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Marca</label>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} required maxLength={150} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">URL de redirección</label>
            <input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} type="url" required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Logo marca (URL)</label>
            <input value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)} type="url" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Descripción</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">CTA personalizado</label>
            <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} maxLength={100} placeholder="Activar bonus" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Badge</label>
            <select value={badge} onChange={(e) => setBadge(e.target.value)} className={inputCls}>
              {BADGES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 md:col-span-2">
            <input
              type="checkbox"
              id="edit-isFeatured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded cursor-pointer"
            />
            <label htmlFor="edit-isFeatured" className="text-sm font-semibold text-sp-admin-muted cursor-pointer">
              Destacado (aparece en &ldquo;Mejores recompensas&rdquo;)
            </label>
          </div>

          {error && <p className="md:col-span-2 text-xs text-red-400">{error}</p>}

          <div className="md:col-span-2 flex gap-3 justify-end pt-2 border-t border-sp-admin-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-sp-admin-muted hover:text-sp-admin-text cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 disabled:opacity-60 cursor-pointer transition-opacity"
            >
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
