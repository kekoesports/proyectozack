'use client';

import { useState, useTransition } from 'react';
import { createTrackerAction, fetchSheetTitleAction } from '@/app/admin/(dashboard)/entregables/tracker-actions';
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

// Try to extract count + type from a sheet title like "HUASOPEEK x SkinPlace — 15 streams"
function parseTitle(title: string): { count: number | null; type: string | null } {
  const numMatch = /\b(\d{1,4})\b/.exec(title);
  const count = numMatch ? parseInt(numMatch[1]!, 10) : null;

  const lower = title.toLowerCase();
  let type: string | null = null;
  if (/stream/.test(lower))                     type = 'stream_integration';
  else if (/video|youtube|yt/.test(lower))      type = 'video_youtube';
  else if (/short|reel|tiktok|tt/.test(lower))  type = 'short_reel_tiktok';
  else if (/story|stories/.test(lower))         type = 'story_instagram';
  else if (/tweet|twitter|x\.com/.test(lower))  type = 'tweet_x';
  else if (/post|instagram|ig/.test(lower))     type = 'post_instagram';

  return { count, type };
}

type Talent = { id: number; name: string };

type Props = {
  brands: Pick<CrmBrand, 'id' | 'name'>[];
  talents: Talent[];
  onSuccess: (newId: number) => void;
  onCancel: () => void;
};

export function CreateTrackerForm({ brands, talents, onSuccess, onCancel }: Props) {
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Controlled fields (may be auto-filled from sheet)
  const [sheetUrl, setSheetUrl]     = useState('');
  const [brandName, setBrandName]   = useState('');
  const [dealName, setDealName]     = useState('');
  const [targetCount, setTargetCount] = useState('');
  const [delivType, setDelivType]   = useState<string>(DELIVERABLE_TYPES[0]);
  const [talentId, setTalentId]     = useState('');
  const [notes, setNotes]           = useState('');

  const [detecting, setDetecting]   = useState(false);
  const [sheetHint, setSheetHint]   = useState<string | null>(null);

  async function handleUrlBlur() {
    const url = sheetUrl.trim();
    if (!url || !url.includes('docs.google.com/spreadsheets')) return;
    setDetecting(true);
    setSheetHint(null);
    const result = await fetchSheetTitleAction(url);
    setDetecting(false);
    if (!result.ok) {
      setSheetHint(`No se pudo detectar: ${result.error}`);
      return;
    }
    const title = result.title;
    if (!dealName) setDealName(title);
    const { count, type } = parseTitle(title);
    if (count !== null && !targetCount) setTargetCount(String(count));
    if (type !== null && delivType === DELIVERABLE_TYPES[0]) setDelivType(type);
    setSheetHint(`Hoja detectada: "${title}"`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('brandName',       brandName);
    fd.set('dealName',        dealName);
    fd.set('deliverableType', delivType);
    fd.set('targetCount',     targetCount);
    if (talentId) fd.set('talentId', talentId);
    if (notes)    fd.set('notes', notes);
    setError(null);
    startTransition(async () => {
      const result = await createTrackerAction(fd);
      if (!result.ok) { setError(result.error); return; }
      if (!result.id) { setError('Error inesperado: sin ID'); return; }
      onSuccess(result.id);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* URL detection row */}
      <div>
        <label className="block text-xs font-semibold text-sp-muted mb-1">
          URL Google Sheets <span className="font-normal opacity-60">(opcional — detecta el nombre automáticamente)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1 border border-sp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sp-orange/30"
          />
          {detecting && (
            <span className="text-xs text-sp-muted self-center shrink-0">Detectando…</span>
          )}
        </div>
        {sheetHint && (
          <p className={`text-xs mt-1 ${sheetHint.startsWith('No') ? 'text-red-500' : 'text-emerald-600'}`}>
            {sheetHint}
          </p>
        )}
      </div>

      {/* Brand + Deal name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-sp-muted mb-1">Marca *</label>
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            required
            maxLength={200}
            list="brand-suggestions"
            placeholder="Ej. SkinsMonkey"
            className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sp-orange/30"
          />
          <datalist id="brand-suggestions">
            {brands.map((b) => <option key={b.id} value={b.name} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-muted mb-1">Nombre del deal *</label>
          <input
            value={dealName}
            onChange={(e) => setDealName(e.target.value)}
            required
            maxLength={300}
            placeholder="Ej. HUASOPEEK × SkinPlace — 15 streams"
            className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sp-orange/30"
          />
        </div>
      </div>

      {/* Type + Count + Talent */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-sp-muted mb-1">Tipo de contenido *</label>
          <select
            value={delivType}
            onChange={(e) => setDelivType(e.target.value)}
            required
            className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm"
          >
            {DELIVERABLE_TYPES.map((t) => (
              <option key={t} value={t}>{DELIVERABLE_TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-muted mb-1">Objetivo (nº piezas)</label>
          <input
            value={targetCount}
            onChange={(e) => setTargetCount(e.target.value)}
            type="number"
            min={0}
            placeholder="Ej. 15"
            className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sp-orange/30"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-sp-muted mb-1">Talento</label>
          <select
            value={talentId}
            onChange={(e) => setTalentId(e.target.value)}
            className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm"
          >
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={2000}
          className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sp-orange/30"
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
