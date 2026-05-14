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

type CodeEntry = {
  code:        string;
  brandName:   string;
  redirectUrl: string;
  brandLogo:   string;
  description: string;
  ctaText:     string;
  badge:       string;
  category:    string;
  isFeatured:  boolean;
};

const EMPTY_CODE = (): CodeEntry => ({
  code: '', brandName: '', redirectUrl: '', brandLogo: '',
  description: '', ctaText: '', badge: '', category: '', isFeatured: false,
});

const MAX_CODES = 3;

export function CreateCodeForm({ talents }: { talents: readonly Talent[] }): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [talentId, setTalentId]     = useState('');
  const [entries, setEntries]       = useState<CodeEntry[]>([EMPTY_CODE()]);
  const [results, setResults]       = useState<(string | null)[]>([]);
  const [globalError, setGlobalError] = useState('');

  const talentSlug = talents.find((t) => String(t.id) === talentId)?.slug ?? '';

  function updateEntry(idx: number, field: keyof CodeEntry, value: string | boolean): void {
    setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    setResults([]);
  }

  function addEntry(): void {
    if (entries.length < MAX_CODES) setEntries((prev) => [...prev, EMPTY_CODE()]);
  }

  function removeEntry(idx: number): void {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
    setResults([]);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setResults([]);
    setGlobalError('');

    if (!talentId) { setGlobalError('Selecciona un creador.'); return; }

    startTransition(async () => {
      const newResults: (string | null)[] = [];
      let allOk = true;

      for (const entry of entries) {
        const fd = new FormData();
        fd.set('talentId',    talentId);
        fd.set('talentSlug',  talentSlug);
        fd.set('code',        entry.code);
        fd.set('brandName',   entry.brandName);
        fd.set('redirectUrl', entry.redirectUrl);
        fd.set('brandLogo',   entry.brandLogo);
        fd.set('description', entry.description);
        fd.set('ctaText',     entry.ctaText);
        fd.set('badge',       entry.badge);
        fd.set('category',    entry.category);
        if (entry.isFeatured) fd.set('isFeatured', 'on');

        const res = await createCodeAction(fd);
        if (res.ok) {
          newResults.push(null);
        } else {
          allOk = false;
          const msgs = Object.values(res.fieldErrors).flat();
          newResults.push(msgs[0] ?? 'Error desconocido');
        }
      }

      setResults(newResults);
      if (allOk) {
        setEntries([EMPTY_CODE()]);
        setTalentId('');
      }
    });
  }

  const allCreated = results.length > 0 && results.every((r) => r === null);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Creador compartido */}
      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Creador</label>
        <select value={talentId} onChange={(e) => setTalentId(e.target.value)} required className={inputCls}>
          <option value="">Seleccionar...</option>
          {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {globalError && <p className="text-xs text-red-400 mt-1">{globalError}</p>}
      </div>

      {/* Entradas de código (máx 3) */}
      {entries.map((entry, idx) => (
        <div key={idx} className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4 space-y-3">
          {/* Cabecera entrada */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sp-admin-muted">
              Código {entries.length > 1 ? `#${idx + 1}` : ''}
            </p>
            {entries.length > 1 && (
              <button
                type="button"
                onClick={() => removeEntry(idx)}
                className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
              >
                ✕ Quitar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Código</label>
              <input
                value={entry.code}
                onChange={(e) => updateEntry(idx, 'code', e.target.value.toUpperCase())}
                required maxLength={100} placeholder="TODOCS2"
                className={`${inputCls} font-mono uppercase`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Marca</label>
              <input
                value={entry.brandName}
                onChange={(e) => updateEntry(idx, 'brandName', e.target.value)}
                required maxLength={150} className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sp-admin-muted mb-1">URL de redirección</label>
              <input
                value={entry.redirectUrl}
                onChange={(e) => updateEntry(idx, 'redirectUrl', e.target.value)}
                type="url" required className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Logo marca (URL)</label>
              <input
                value={entry.brandLogo}
                onChange={(e) => updateEntry(idx, 'brandLogo', e.target.value)}
                type="url" className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Descripción</label>
              <input
                value={entry.description}
                onChange={(e) => updateEntry(idx, 'description', e.target.value)}
                maxLength={300} placeholder="100% extra en tu primer depósito" className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sp-admin-muted mb-1">CTA personalizado</label>
              <input
                value={entry.ctaText}
                onChange={(e) => updateEntry(idx, 'ctaText', e.target.value)}
                maxLength={100} placeholder="Activar bonus" className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Badge</label>
              <select value={entry.badge} onChange={(e) => updateEntry(idx, 'badge', e.target.value)} className={inputCls}>
                {BADGES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Categoría</label>
              <select value={entry.category} onChange={(e) => updateEntry(idx, 'category', e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <input
                type="checkbox" id={`isFeatured-${idx}`}
                checked={entry.isFeatured}
                onChange={(e) => updateEntry(idx, 'isFeatured', e.target.checked)}
                className="rounded cursor-pointer"
              />
              <label htmlFor={`isFeatured-${idx}`} className="text-sm font-semibold text-sp-admin-muted cursor-pointer">
                Destacado (aparece en &ldquo;Mejores recompensas&rdquo;)
              </label>
            </div>
          </div>

          {/* Error individual de esta entrada */}
          {results[idx] && (
            <p className="text-xs text-red-400 font-medium mt-1">✗ {results[idx]}</p>
          )}
          {results[idx] === null && (
            <p className="text-xs text-emerald-500 font-semibold mt-1">✓ Creado</p>
          )}
        </div>
      ))}

      {/* Botón añadir código */}
      {entries.length < MAX_CODES && (
        <button
          type="button"
          onClick={addEntry}
          className="w-full py-2 rounded-lg border border-dashed border-sp-admin-border text-sm font-semibold text-sp-admin-muted hover:border-sp-admin-accent hover:text-sp-admin-accent transition-colors"
        >
          + Añadir otro código ({entries.length}/{MAX_CODES})
        </button>
      )}

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 disabled:opacity-60 cursor-pointer transition-opacity"
        >
          {isPending
            ? 'Creando...'
            : entries.length > 1
            ? `Crear ${entries.length} códigos`
            : 'Crear Código'}
        </button>
        {allCreated && (
          <p className="text-xs text-emerald-500 font-semibold">
            ✓ {results.length} {results.length === 1 ? 'código creado' : 'códigos creados'} correctamente.
          </p>
        )}
      </div>
    </form>
  );
}
