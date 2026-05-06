'use client';

import { useState, useTransition } from 'react';
import { createCodeAction } from './codes-actions';

type Talent = { readonly id: number; readonly name: string; readonly slug?: string };

const inputCls = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';

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

export function CreateCodeForm({ talents }: { talents: readonly Talent[] }): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);

  const [talentId,    setTalentId]    = useState('');
  const [code,        setCode]        = useState('');
  const [brandName,   setBrandName]   = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [brandLogo,   setBrandLogo]   = useState('');
  const [description, setDescription] = useState('');
  const [ctaText,     setCtaText]     = useState('');
  const [badge,       setBadge]       = useState('');
  const [category,    setCategory]    = useState('');
  const [isFeatured,  setIsFeatured]  = useState(false);

  const err = (field: string): string | undefined => fieldErrors[field]?.[0];

  const talentSlug = talents.find((t) => String(t.id) === talentId)?.slug ?? '';

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setFieldErrors({});
    setSuccess(false);

    const fd = new FormData();
    fd.set('talentId',    talentId);
    fd.set('talentSlug',  talentSlug);
    fd.set('code',        code);
    fd.set('brandName',   brandName);
    fd.set('redirectUrl', redirectUrl);
    fd.set('brandLogo',   brandLogo);
    fd.set('description', description);
    fd.set('ctaText',     ctaText);
    fd.set('badge',       badge);
    fd.set('category',    category);
    if (isFeatured) fd.set('isFeatured', 'on');

    startTransition(async () => {
      const res = await createCodeAction(fd);
      if (res.ok) {
        setSuccess(true);
        setCode(''); setBrandName(''); setRedirectUrl(''); setBrandLogo('');
        setDescription(''); setCtaText(''); setBadge(''); setCategory('');
        setIsFeatured(false);
      } else {
        setFieldErrors(res.fieldErrors);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Creador</label>
        <select value={talentId} onChange={(e) => setTalentId(e.target.value)} required className={inputCls}>
          <option value="">Seleccionar...</option>
          {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {err('talentId') && <p className="text-xs text-red-400 mt-1">{err('talentId')}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Código</label>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={100} placeholder="TODOCS2" className={`${inputCls} font-mono uppercase`} />
        {err('code') && <p className="text-xs text-red-400 mt-1">{err('code')}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Marca</label>
        <input value={brandName} onChange={(e) => setBrandName(e.target.value)} required maxLength={150} className={inputCls} />
        {err('brandName') && <p className="text-xs text-red-400 mt-1">{err('brandName')}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">URL de redirección</label>
        <input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} type="url" required className={inputCls} />
        {err('redirectUrl') && <p className="text-xs text-red-400 mt-1">{err('redirectUrl')}</p>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Logo marca (URL)</label>
        <input value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)} type="url" className={inputCls} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Descripción (beneficio exacto)</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="100% extra en tu primer depósito" className={inputCls} />
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
      <div className="flex items-center gap-3">
        <input type="checkbox" id="isFeatured" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded cursor-pointer" />
        <label htmlFor="isFeatured" className="text-sm font-semibold text-sp-admin-muted cursor-pointer">
          Destacado (aparece en sección &ldquo;Mejores recompensas&rdquo;)
        </label>
      </div>
      <div className="md:col-span-2 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 disabled:opacity-60 cursor-pointer transition-opacity"
        >
          {isPending ? 'Creando...' : 'Crear Código'}
        </button>
        {success && <p className="text-xs text-emerald-500 font-semibold">✓ Código creado correctamente.</p>}
      </div>
    </form>
  );
}
