'use client';

import { useState, useTransition } from 'react';
import { updateGiveawayAction } from './actions';
import { BrandPicker } from './BrandPicker';
import type { BrandCatalogEntry } from './brand-actions';

type Giveaway = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  brandName: string;
  brandLogo: string | null;
  value: string | null;
  redirectUrl: string;
  startsAt: Date;
  endsAt: Date | null;
  sortOrder: number;
  talent: { id: number; slug: string; name: string };
};

const inputCls = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';

function toLocalDatetime(date: Date | null): string {
  if (!date) return '';
  // Adjust for local timezone offset
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function EditGiveawayModal({ giveaway, brandCatalog = [] }: { giveaway: Giveaway; brandCatalog?: readonly BrandCatalogEntry[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);

  const [title,       setTitle]       = useState(giveaway.title);
  const [brandName,   setBrandName]   = useState(giveaway.brandName);
  const [value,       setValue]       = useState(giveaway.value ?? '');
  const [redirectUrl, setRedirectUrl] = useState(giveaway.redirectUrl);
  const [imageUrl,    setImageUrl]    = useState(giveaway.imageUrl ?? '');
  const [brandLogo,   setBrandLogo]   = useState(giveaway.brandLogo ?? '');
  const [description, setDescription] = useState(giveaway.description ?? '');
  const [startsAt,    setStartsAt]    = useState(toLocalDatetime(giveaway.startsAt));
  const [endsAt,      setEndsAt]      = useState(toLocalDatetime(giveaway.endsAt));
  const [sortOrder,   setSortOrder]   = useState(String(giveaway.sortOrder));

  const err = (field: string) => fieldErrors[field]?.[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccess(false);

    const fd = new FormData();
    fd.set('id',          String(giveaway.id));
    fd.set('talentId',    String(giveaway.talent.id));
    fd.set('talentSlug',  giveaway.talent.slug);
    fd.set('title',       title);
    fd.set('brandName',   brandName);
    fd.set('value',       value);
    fd.set('redirectUrl', redirectUrl);
    fd.set('imageUrl',    imageUrl);
    fd.set('brandLogo',   brandLogo);
    fd.set('description', description);
    fd.set('startsAt',    startsAt);
    fd.set('endsAt',      endsAt);
    fd.set('sortOrder',   sortOrder);

    startTransition(async () => {
      const res = await updateGiveawayAction(fd);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { setOpen(false); setSuccess(false); }, 1200);
      } else {
        setFieldErrors(res.fieldErrors);
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sp-admin-accent hover:opacity-80 text-xs font-bold transition-opacity"
      >
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-sp-admin-card border border-sp-admin-border shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-sp-admin-border bg-sp-admin-card z-10">
              <div>
                <h2 className="font-display text-lg font-bold uppercase text-sp-admin-text">Editar Giveaway</h2>
                <p className="text-xs text-sp-admin-muted mt-0.5">{giveaway.talent.name}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sp-admin-hover text-sp-admin-muted hover:text-sp-admin-text transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Título del premio</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} className={inputCls} />
                {err('title') && <p className="text-xs text-red-400 mt-1">{err('title')}</p>}
              </div>

              {brandCatalog.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Marca del catálogo</label>
                  <BrandPicker
                    brands={brandCatalog}
                    onSelect={(b) => {
                      setBrandName(b.name);
                      if (b.logoUrl) setBrandLogo(b.logoUrl);
                    }}
                    placeholder={brandName || 'Seleccionar marca…'}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Marca</label>
                <input value={brandName} onChange={(e) => setBrandName(e.target.value)} required maxLength={150} className={inputCls} />
                {err('brandName') && <p className="text-xs text-red-400 mt-1">{err('brandName')}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Valor</label>
                <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={50} placeholder="1.250€" className={inputCls} />
              </div>

              <div className="md:col-span-2">
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
                <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Logo de marca (URL)</label>
                <input value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)} type="url" className={inputCls} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Descripción</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className={inputCls} />
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

              <div>
                <label className="block text-sm font-semibold text-sp-admin-muted mb-1">Orden</label>
                <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" min={0} className={inputCls} />
              </div>

              <div className="md:col-span-2 flex items-center gap-4 pt-2 border-t border-sp-admin-border">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2 rounded-lg bg-sp-admin-accent text-sp-admin-bg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {isPending ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg border border-sp-admin-border text-sp-admin-muted text-sm hover:bg-sp-admin-hover transition-colors"
                >
                  Cancelar
                </button>
                {success && <p className="text-xs text-emerald-400">✓ Guardado</p>}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
