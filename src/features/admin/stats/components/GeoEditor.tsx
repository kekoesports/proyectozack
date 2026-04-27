'use client';

import { useState, useTransition, type ReactElement } from 'react';
import { updateTalentGeoData } from '@/app/admin/(dashboard)/stats/stats-actions';
import type { StatsGeoEntry } from '@/lib/queries/stats';

type Props = {
  readonly talentId: number;
  readonly talentName: string;
  readonly topGeos: StatsGeoEntry[] | null;
  readonly audienceLanguage: string | null;
};

const EMPTY_GEO: StatsGeoEntry = { country: '', pct: 0 };

/**
 * Editor modal de top GEOs (jsonb) y audience language para un talent.
 * Persiste vía `updateTalentGeoData`.
 *
 * @kind client
 * @feature admin/stats
 * @route /admin/talents/[id]/stats
 */
export function GeoEditor({ talentId, talentName, topGeos, audienceLanguage }: Props): ReactElement {
  const [open, setOpen] = useState(false);
  const [geos, setGeos] = useState<StatsGeoEntry[]>(topGeos ?? []);
  const [lang, setLang] = useState(audienceLanguage ?? '');
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setGeos(topGeos ?? []);
    setLang(audienceLanguage ?? '');
    setOpen(true);
  }

  function handleSave() {
    const validGeos = geos.filter((g) => g.country.trim() && g.pct > 0);
    const fd = new FormData();
    fd.set('talentId', String(talentId));
    fd.set('topGeos', validGeos.length > 0 ? JSON.stringify(validGeos) : 'null');
    fd.set('audienceLanguage', lang.trim() || '');
    startTransition(async () => {
      await updateTalentGeoData(fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-[11px] text-sp-admin-muted hover:text-sp-admin-accent transition-colors underline underline-offset-2"
      >
        Editar geo
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-sp-admin-card border border-sp-admin-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sp-admin-text text-sm">{talentName} — Geo</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-sp-admin-muted hover:text-sp-admin-text text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted mb-1">
                Idioma de audiencia
              </label>
              <input
                type="text"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                placeholder="es"
                maxLength={20}
                className="w-full rounded-lg bg-sp-admin-bg border border-sp-admin-border px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40 focus:outline-none focus:border-sp-admin-accent"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted mb-1">
                Top GEOs (máx 3)
              </label>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => {
                  const geo = geos[i] ?? EMPTY_GEO;
                  return (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={geo.country}
                        onChange={(e) => {
                          const updated = [...geos];
                          if (!updated[i]) updated[i] = { ...EMPTY_GEO };
                          updated[i] = { ...updated[i]!, country: e.target.value };
                          setGeos(updated);
                        }}
                        placeholder="País"
                        maxLength={60}
                        className="flex-1 rounded-lg bg-sp-admin-bg border border-sp-admin-border px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40 focus:outline-none focus:border-sp-admin-accent"
                      />
                      <input
                        type="number"
                        value={geo.pct || ''}
                        onChange={(e) => {
                          const updated = [...geos];
                          if (!updated[i]) updated[i] = { ...EMPTY_GEO };
                          updated[i] = { ...updated[i]!, pct: Number(e.target.value) };
                          setGeos(updated);
                        }}
                        placeholder="%"
                        min={0}
                        max={100}
                        step={0.1}
                        className="w-20 rounded-lg bg-sp-admin-bg border border-sp-admin-border px-3 py-2 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40 focus:outline-none focus:border-sp-admin-accent"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 rounded-lg bg-sp-admin-accent text-white text-sm font-semibold py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 rounded-lg bg-sp-admin-border text-sp-admin-text text-sm font-semibold py-2 hover:bg-sp-admin-hover transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
