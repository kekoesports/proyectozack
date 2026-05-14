'use client';

import { useState, useTransition } from 'react';
import { createCodeAction } from './codes-actions';
import { BrandPicker } from './BrandPicker';
import type { BrandCatalogEntry } from './brand-actions';

type Talent = { readonly id: number; readonly name: string; readonly slug?: string };

const inputCls = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const labelCls = 'block text-sm font-semibold text-sp-admin-muted mb-1';

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

// Un "variant" es un código+descripción dentro de la misma marca
type CodeVariant = { code: string; description: string };
const EMPTY_VARIANT = (): CodeVariant => ({ code: '', description: '' });
const MAX_VARIANTS = 3;

type SubmitResult = { variantIdx: number; ok: boolean; error?: string };

export function CreateCodeForm({ talents, brandCatalog = [] }: { talents: readonly Talent[]; brandCatalog?: readonly BrandCatalogEntry[] }): React.ReactElement {
  const [isPending, startTransition] = useTransition();

  // Datos compartidos de la marca
  const [talentId,    setTalentId]    = useState('');
  const [brandName,   setBrandName]   = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [brandLogo,   setBrandLogo]   = useState('');
  const [ctaText,     setCtaText]     = useState('');
  const [badge,       setBadge]       = useState('');
  const [category,    setCategory]    = useState('');
  const [isFeatured,  setIsFeatured]  = useState(false);

  // Variantes de código (mismo brand, distintos codes+descriptions)
  const [variants, setVariants] = useState<CodeVariant[]>([EMPTY_VARIANT()]);
  const [results,  setResults]  = useState<SubmitResult[]>([]);
  const [globalError, setGlobalError] = useState('');

  const talentSlug = talents.find((t) => String(t.id) === talentId)?.slug ?? '';

  function updateVariant(idx: number, field: keyof CodeVariant, value: string): void {
    setVariants((prev) => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
    setResults([]);
  }

  function addVariant(): void {
    if (variants.length < MAX_VARIANTS) setVariants((prev) => [...prev, EMPTY_VARIANT()]);
  }

  function removeVariant(idx: number): void {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
    setResults([]);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setResults([]);
    setGlobalError('');
    if (!talentId) { setGlobalError('Selecciona un creador.'); return; }
    if (!brandName.trim()) { setGlobalError('El nombre de la marca es obligatorio.'); return; }

    startTransition(async () => {
      const newResults: SubmitResult[] = [];
      let allOk = true;

      for (const [i, variant] of variants.entries()) {
        const fd = new FormData();
        fd.set('talentId',    talentId);
        fd.set('talentSlug',  talentSlug);
        fd.set('code',        variant.code);
        fd.set('brandName',   brandName);
        fd.set('redirectUrl', redirectUrl);
        fd.set('brandLogo',   brandLogo);
        fd.set('description', variant.description);
        fd.set('ctaText',     ctaText);
        fd.set('badge',       badge);
        fd.set('category',    category);
        if (isFeatured) fd.set('isFeatured', 'on');

        const res = await createCodeAction(fd);
        if (res.ok) {
          newResults.push({ variantIdx: i, ok: true });
        } else {
          allOk = false;
          const msg = Object.values(res.fieldErrors).flat()[0] ?? 'Error';
          newResults.push({ variantIdx: i, ok: false, error: msg });
        }
      }

      setResults(newResults);
      if (allOk) {
        // Reset solo códigos; mantener brand por si quieren añadir más
        setVariants([EMPTY_VARIANT()]);
      }
    });
  }

  const allOk = results.length > 0 && results.every((r) => r.ok);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Creador */}
      <div>
        <label className={labelCls}>Creador *</label>
        <select value={talentId} onChange={(e) => setTalentId(e.target.value)} required className={inputCls}>
          <option value="">Seleccionar...</option>
          {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {globalError && <p className="text-xs text-red-400 mt-1">{globalError}</p>}
      </div>

      {/* Datos de la marca (compartidos por todos los códigos) */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-sp-admin-muted">Datos de la marca</p>

        {/* Picker del catálogo */}
        {brandCatalog.length > 0 && (
          <div>
            <label className={labelCls}>Seleccionar del catálogo (opcional)</label>
            <BrandPicker
              brands={brandCatalog}
              onSelect={(b) => {
                setBrandName(b.name);
                if (b.logoUrl) setBrandLogo(b.logoUrl);
                if (b.defaultUrl) setRedirectUrl(b.defaultUrl);
                if (b.category) setCategory(b.category);
              }}
              placeholder="Buscar marca guardada…"
            />
            <p className="text-[10px] text-sp-admin-muted mt-1">Rellena automáticamente nombre, logo y URL.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Marca *</label>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} required maxLength={150} placeholder="SkinClub" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>URL de redirección *</label>
            <input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} type="url" required placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Logo marca (URL)</label>
            <input value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)} type="url" placeholder="https://i.imgur.com/..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>CTA personalizado</label>
            <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} maxLength={100} placeholder="Activar bonus" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Badge</label>
            <select value={badge} onChange={(e) => setBadge(e.target.value)} className={inputCls}>
              {BADGES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <input type="checkbox" id="isFeatured" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded cursor-pointer" />
            <label htmlFor="isFeatured" className="text-sm font-semibold text-sp-admin-muted cursor-pointer">
              Destacado (aparece en &ldquo;Mejores recompensas&rdquo;)
            </label>
          </div>
        </div>
      </div>

      {/* Variantes de código (mismo brand, distintos codes) */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-sp-admin-muted">
          Código{variants.length > 1 ? 's' : ''} para esta marca
          <span className="ml-2 font-normal normal-case text-sp-admin-muted/60">(hasta {MAX_VARIANTS} por marca)</span>
        </p>

        {variants.map((variant, idx) => (
          <div key={idx} className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">
                {variants.length > 1 ? `Código #${idx + 1}` : 'Código'}
              </p>
              {variants.length > 1 && (
                <button type="button" onClick={() => removeVariant(idx)} className="text-[11px] text-red-400 hover:text-red-300 transition-colors">
                  ✕ Quitar
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Código *</label>
                <input
                  value={variant.code}
                  onChange={(e) => updateVariant(idx, 'code', e.target.value.toUpperCase())}
                  required maxLength={100}
                  placeholder="HETTA · HETTA20 · HETTAGOLD"
                  className={`${inputCls} font-mono uppercase`}
                />
              </div>
              <div>
                <label className={labelCls}>Descripción del beneficio</label>
                <input
                  value={variant.description}
                  onChange={(e) => updateVariant(idx, 'description', e.target.value)}
                  maxLength={300}
                  placeholder="7% EXTRA DEPÓSITO · +20% bono · VIP"
                  className={inputCls}
                />
              </div>
            </div>
            {/* Feedback por variante */}
            {results[idx]?.ok === false && (
              <p className="text-xs text-red-400 font-medium">✗ {results[idx].error}</p>
            )}
            {results[idx]?.ok === true && (
              <p className="text-xs text-emerald-500 font-semibold">✓ Creado</p>
            )}
          </div>
        ))}

        {variants.length < MAX_VARIANTS && (
          <button
            type="button"
            onClick={addVariant}
            className="w-full py-2 rounded-lg border border-dashed border-sp-admin-border text-sm font-semibold text-sp-admin-muted hover:border-sp-admin-accent hover:text-sp-admin-accent transition-colors"
          >
            + Añadir otro código para esta marca ({variants.length}/{MAX_VARIANTS})
          </button>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 disabled:opacity-60 cursor-pointer transition-opacity"
        >
          {isPending
            ? 'Creando...'
            : variants.length > 1
            ? `Crear ${variants.length} códigos`
            : 'Crear Código'}
        </button>
        {allOk && (
          <p className="text-xs text-emerald-500 font-semibold">
            ✓ {results.length} {results.length === 1 ? 'código creado' : 'códigos creados'}.
          </p>
        )}
      </div>
    </form>
  );
}
