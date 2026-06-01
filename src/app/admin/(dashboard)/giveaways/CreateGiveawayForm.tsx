'use client';

import { useState, useTransition } from 'react';
import { createGiveawayAction } from './actions';
import { BrandPicker } from './BrandPicker';
import type { CrmBrandPickerEntry } from '@/lib/queries/crmBrands';

type Talent = { readonly id: number; readonly slug: string; readonly name: string };

const inputCls = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';

export function CreateGiveawayForm({
  talents,
  brands = [],
  defaultTalentId,
}: {
  talents: readonly Talent[];
  brands?: readonly CrmBrandPickerEntry[];
  defaultTalentId?: number;
}): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [globalError,  setGlobalError]  = useState<string | null>(null);
  const [success,      setSuccess]      = useState(false);

  const [talentId,      setTalentId]      = useState(defaultTalentId ? String(defaultTalentId) : '');
  const [title,         setTitle]         = useState('');
  const [brandName,     setBrandName]     = useState('');
  const [brandLogo,     setBrandLogo]     = useState('');
  const [crmBrandId,    setCrmBrandId]    = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<CrmBrandPickerEntry | null>(null);
  const [value,         setValue]         = useState('');
  const [redirectUrl,   setRedirectUrl]   = useState('');
  const [imageUrl,      setImageUrl]      = useState('');
  const [description,   setDescription]   = useState('');
  const [startsAt,      setStartsAt]      = useState('');
  const [endsAt,        setEndsAt]        = useState('');

  const slug = talents.find((t) => String(t.id) === talentId)?.slug ?? '';

  const err = (field: string): string | undefined => fieldErrors[field]?.[0];

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError(null);
    setSuccess(false);

    const fd = new FormData();
    fd.set('talentId',    talentId);
    fd.set('talentSlug',  slug);
    fd.set('title',       title);
    fd.set('brandName',   brandName);
    fd.set('value',       value);
    fd.set('redirectUrl', redirectUrl);
    fd.set('imageUrl',    imageUrl);
    fd.set('brandLogo',   brandLogo);
    fd.set('description', description);
    fd.set('startsAt',    startsAt);
    fd.set('endsAt',      endsAt);
    if (crmBrandId !== null) fd.set('crmBrandId', String(crmBrandId));

    startTransition(async () => {
      const res = await createGiveawayAction(fd);
      if (res.ok) {
        setSuccess(true);
        if (!defaultTalentId) setTalentId('');
        setTitle(''); setBrandName(''); setBrandLogo(''); setCrmBrandId(null); setSelectedBrand(null);
        setValue(''); setRedirectUrl(''); setImageUrl('');
        setDescription(''); setStartsAt(''); setEndsAt('');
      } else {
        setFieldErrors(res.fieldErrors);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {defaultTalentId ? null : (
        <div>
          <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Creador</label>
          <select value={talentId} onChange={(e) => setTalentId(e.target.value)} required className={inputCls}>
            <option value="">Seleccionar...</option>
            {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {err('talentId') && <p className="text-xs text-red-400 mt-1">{err('talentId')}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Título del premio</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} className={inputCls} />
        {err('title') && <p className="text-xs text-red-400 mt-1">{err('title')}</p>}
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Marca</label>
        <BrandPicker
          brands={brands}
          onSelect={(b) => {
            setBrandName(b.name);
            setCrmBrandId(b.id);
            setBrandLogo(b.logoUrl ?? '');
            setSelectedBrand(b);
          }}
          placeholder="Seleccionar marca…"
        />
        {err('brandName') && <p className="text-xs text-red-400 mt-1">{err('brandName')}</p>}
        {selectedBrand && (
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2">
            {selectedBrand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedBrand.logoUrl} alt={selectedBrand.name} className="w-8 h-8 object-contain rounded" />
            ) : (
              <div className="w-8 h-8 rounded bg-sp-admin-border/40 flex items-center justify-center text-[10px] font-bold text-sp-admin-muted">
                {selectedBrand.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sp-admin-text truncate">{selectedBrand.name}</p>
              <p className="text-[10px] text-sp-admin-muted truncate">
                {[selectedBrand.category, selectedBrand.mainUrl].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Valor</label>
        <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={50} placeholder="1.250€" className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">URL del sorteo</label>
        <input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} type="url" required className={inputCls} />
        {err('redirectUrl') && <p className="text-xs text-red-400 mt-1">{err('redirectUrl')}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Imagen del premio (URL)</label>
        <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} type="url" className={inputCls} />
        {err('imageUrl') && <p className="text-xs text-red-400 mt-1">{err('imageUrl')}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Descripción</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Inicio</label>
        <input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} type="datetime-local" required className={inputCls} />
        {err('startsAt') && <p className="text-xs text-red-400 mt-1">{err('startsAt')}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-sp-admin-muted mb-1">
          Fin <span className="font-normal text-sp-admin-muted/60">(opcional)</span>
        </label>
        <input value={endsAt} onChange={(e) => setEndsAt(e.target.value)} type="datetime-local" className={inputCls} />
        {err('endsAt') && <p className="text-xs text-red-400 mt-1">{err('endsAt')}</p>}
      </div>

      <div className="md:col-span-2 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
        >
          {isPending ? 'Creando...' : 'Crear Giveaway'}
        </button>
        {globalError && <p className="text-xs text-red-400">{globalError}</p>}
        {success && <p className="text-xs text-emerald-400">Giveaway creado correctamente.</p>}
      </div>
    </form>
  );
}
