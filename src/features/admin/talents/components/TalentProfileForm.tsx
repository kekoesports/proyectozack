'use client';

import { useActionState, useState } from 'react';
import { updateTalentProfileAction } from '@/app/admin/(dashboard)/talents/actions';
import { COUNTRIES } from '@/lib/countries';
import { countryFlagEmoji } from '@/lib/flag-images';

const INPUT  = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors';
const SELECT = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors cursor-pointer';
const LABEL  = 'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';

const ROLE_SUGGESTIONS = [
  'PRO PLAYER CS2',
  'PRO PLAYER VALORANT',
  'STREAMER CS2',
  'STREAMER VALORANT',
  'STREAMER GTA',
  'STREAMER LIFESTYLE',
  'STREAMER FIFA',
  'STREAMER CASINO',
  'CONTENT CREATOR',
  'YOUTUBER',
];

function RoleSelect({ id, name, value, required }: { id: string; name: string; value: string | null; required?: boolean }) {
  const current = value ?? '';
  const isCustom = current !== '' && !ROLE_SUGGESTIONS.includes(current);
  return (
    <select id={id} name={name} defaultValue={current} required={required} className={SELECT}>
      <option value="">— Seleccionar etiqueta —</option>
      {ROLE_SUGGESTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
      {isCustom && <option value={current}>{current} (actual)</option>}
    </select>
  );
}

type TalentProfileData = {
  id:             number;
  slug:           string;
  name:           string;
  role:           string;
  role2:          string | null;
  game:           string;
  platform:       string;
  creatorCountry: string | null;
  status:         string;
  isPublished:    boolean;
  showInRoster:   boolean;
  initials:       string;
  gradientC1:     string;
  gradientC2:     string;
  sortOrder:      number;
  bio:            string | null;
  bioLong:        string | null;
};

type Props = {
  readonly talent: TalentProfileData;
};

export function TalentProfileForm({ talent }: Props): React.JSX.Element {
  const [state, formAction, isPending] = useActionState(updateTalentProfileAction, { success: false });
  const [c1, setC1]                     = useState(talent.gradientC1);
  const [c2, setC2]                     = useState(talent.gradientC2);
  const [country, setCountry]           = useState(talent.creatorCountry ?? '');
  const [isPublished, setIsPublished]   = useState(talent.isPublished);
  const [showInRoster, setShowInRoster] = useState(talent.showInRoster);

  const flagPreview = country.length === 2 ? countryFlagEmoji(country) : null;
  const knownCountry = COUNTRIES.find((c) => c.code === country);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={talent.id} />

      {state.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Datos básicos */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-4">Datos del perfil</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pf-name" className={LABEL}>Nombre visible *</label>
            <input id="pf-name" name="name" defaultValue={talent.name}
              required maxLength={120} className={INPUT} />
          </div>
          <div>
            <label htmlFor="pf-initials" className={LABEL}>Iniciales (máx. 4)</label>
            <input id="pf-initials" name="initials" defaultValue={talent.initials}
              required maxLength={4} className={INPUT} />
          </div>
          <div>
            <label htmlFor="pf-role" className={LABEL}>Etiqueta 1 *</label>
            <RoleSelect id="pf-role" name="role" value={talent.role} required />
          </div>
          <div>
            <label htmlFor="pf-role2" className={LABEL}>Etiqueta 2 <span className="font-normal normal-case">(opcional)</span></label>
            <RoleSelect id="pf-role2" name="role2" value={talent.role2 ?? ''} />
          </div>
          <div>
            <label htmlFor="pf-game" className={LABEL}>Juego / Categoría</label>
            <input id="pf-game" name="game" defaultValue={talent.game}
              maxLength={100} className={INPUT} placeholder="CS2, VALORANT, GTA…" />
          </div>
        </div>
      </section>

      {/* Plataforma, País, Orden */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-4">Plataforma y ubicación</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pf-platform" className={LABEL}>Plataforma principal</label>
            <select id="pf-platform" name="platform" defaultValue={talent.platform} className={SELECT}>
              <option value="twitch">Twitch</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>
          <div>
            <label htmlFor="pf-country" className={LABEL}>
              País
              {flagPreview && (
                <span className="ml-1.5">
                  {knownCountry ? knownCountry.flag : flagPreview}
                  <span className="ml-1 normal-case font-normal text-sp-admin-text/70">
                    {knownCountry?.label ?? country}
                  </span>
                </span>
              )}
            </label>
            <select
              id="pf-country"
              name="creatorCountry"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={SELECT}
            >
              <option value="">— Sin país —</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.label} ({c.code})
                </option>
              ))}
              {/* Mostrar valor actual si no está en la lista */}
              {country && !COUNTRIES.find((c) => c.code === country) && (
                <option value={country}>{country} (valor actual)</option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="pf-sortOrder" className={LABEL}>Orden en grid</label>
            <input id="pf-sortOrder" name="sortOrder" type="number"
              min={0} max={9999} defaultValue={talent.sortOrder} className={INPUT} />
          </div>
        </div>
      </section>

      {/* Estado y visibilidad */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-4">Estado y visibilidad</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <fieldset>
            <legend className={LABEL}>Status</legend>
            <div className="space-y-2 mt-1">
              {(
                [
                  { value: 'active',    label: 'Activo',     desc: 'Streamer activo en actividad' },
                  { value: 'available', label: 'Disponible', desc: 'Abierto a nuevos tratos' },
                  { value: 'inactive',  label: 'Inactivo',   desc: 'Retirado / pausado' },
                ] as const
              ).map((opt) => (
                <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                  <input type="radio" name="status" value={opt.value}
                    defaultChecked={talent.status === opt.value}
                    className="mt-0.5 accent-sp-orange" />
                  <div>
                    <span className="text-sm font-semibold text-sp-admin-text">{opt.label}</span>
                    <p className="text-[11px] text-sp-admin-muted">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-4">
            <p className={LABEL}>Visibilidad pública</p>
            {/* Switch: Publicar perfil */}
            <label className="flex items-start justify-between gap-4 cursor-pointer group">
              <div className="flex-1">
                <span className="text-sm font-semibold text-sp-admin-text">Publicar perfil público</span>
                <p className="text-[11px] text-sp-admin-muted mt-0.5">
                  Permite acceder al perfil desde /talentos/{talent.slug}
                </p>
              </div>
              <input type="checkbox" name="isPublished" value="on"
                checked={isPublished}
                onChange={(e) => {
                  const v = e.target.checked;
                  setIsPublished(v);
                  if (!v) setShowInRoster(false);
                }}
                className="sr-only" />
              <div
                onClick={() => {
                  const v = !isPublished;
                  setIsPublished(v);
                  if (!v) setShowInRoster(false);
                }}
                className={`relative shrink-0 w-10 h-6 rounded-full border-2 transition-colors cursor-pointer ${isPublished ? 'bg-emerald-500 border-emerald-500' : 'bg-sp-admin-border border-sp-admin-border'}`}
                role="switch" aria-checked={isPublished} tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? (() => { const v = !isPublished; setIsPublished(v); if (!v) setShowInRoster(false); })() : undefined}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublished ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>

            {/* Switch: Mostrar en roster */}
            <label className={`flex items-start justify-between gap-4 cursor-pointer ${!isPublished ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex-1">
                <span className="text-sm font-semibold text-sp-admin-text">Mostrar en roster oficial</span>
                <p className="text-[11px] text-sp-admin-muted mt-0.5">
                  Muestra el talento en la página pública de talentos
                </p>
              </div>
              <input type="checkbox" name="showInRoster" value="on"
                checked={showInRoster}
                onChange={(e) => { if (isPublished) setShowInRoster(e.target.checked); }}
                className="sr-only"
                disabled={!isPublished} />
              <div
                onClick={() => { if (isPublished) setShowInRoster(!showInRoster); }}
                className={`relative shrink-0 w-10 h-6 rounded-full border-2 transition-colors cursor-pointer ${showInRoster ? 'bg-emerald-500 border-emerald-500' : 'bg-sp-admin-border border-sp-admin-border'}`}
                role="switch" aria-checked={showInRoster} tabIndex={isPublished ? 0 : -1}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && isPublished) setShowInRoster(!showInRoster); }}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showInRoster ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>

            {!isPublished && (
              <p className="text-[11px] text-amber-600">
                Para aparecer en el roster, el perfil debe estar publicado.
              </p>
            )}
            {isPublished && !showInRoster && (
              <p className="text-[11px] text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                <span className="font-semibold">Publicado · No listado:</span> accesible por enlace directo e indexable por Google, pero oculto del roster público.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Gradiente */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-4">Gradiente del perfil</h2>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label htmlFor="pf-c1" className={LABEL}>Color 1</label>
            <div className="flex items-center gap-2">
              <input type="color" id="pf-c1" name="gradientC1" value={c1}
                onChange={(e) => setC1(e.target.value)}
                className="w-10 h-9 rounded-lg cursor-pointer border border-sp-admin-border p-0.5" />
              <span className="text-xs font-mono text-sp-admin-muted">{c1}</span>
            </div>
          </div>
          <div>
            <label htmlFor="pf-c2" className={LABEL}>Color 2</label>
            <div className="flex items-center gap-2">
              <input type="color" id="pf-c2" name="gradientC2" value={c2}
                onChange={(e) => setC2(e.target.value)}
                className="w-10 h-9 rounded-lg cursor-pointer border border-sp-admin-border p-0.5" />
              <span className="text-xs font-mono text-sp-admin-muted">{c2}</span>
            </div>
          </div>
          <div className="flex-1 min-w-[140px]">
            <p className={LABEL}>Preview</p>
            <div className="h-9 rounded-lg border border-sp-admin-border"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
          </div>
        </div>
      </section>

      {/* Bio */}
      <section className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
        <h2 className="font-bold text-sp-admin-text text-sm mb-4">Bio</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="pf-bio" className={LABEL}>Bio corta (pública, máx. 5000 chars)</label>
            <textarea id="pf-bio" name="bio" rows={3} maxLength={5000}
              defaultValue={talent.bio ?? ''} className={INPUT} />
          </div>
          <div>
            <label htmlFor="pf-bioLong" className={LABEL}>Bio larga — markdown (perfil detallado)</label>
            <textarea id="pf-bioLong" name="bioLong" rows={6} maxLength={10000}
              defaultValue={talent.bioLong ?? ''} className={INPUT} />
          </div>
        </div>
      </section>

      {/* Acciones */}
      <div className="flex items-center gap-3 pb-4">
        <button
          type="submit"
          disabled={isPending}
          className="h-9 px-5 rounded-lg bg-sp-admin-accent text-white text-sm font-semibold hover:bg-sp-admin-accent/90 transition-colors disabled:opacity-60"
        >
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <a
          href={`/admin/talents/${talent.id}`}
          className="h-9 px-4 rounded-lg border border-sp-admin-border text-sm text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors flex items-center"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
