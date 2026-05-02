'use client';

import { useActionState, useState } from 'react';
import {
  createBrandAction,
  updateBrandAction,
} from '@/app/admin/(dashboard)/brands/crm-actions';
import {
  CRM_BRAND_STATUSES,
  CRM_BRAND_TIPOS,
  CRM_BRAND_SECTORES,
  CRM_BRAND_GEOS,
  LOOKING_FOR_OPTIONS,
  DEAL_TYPE_OPTIONS,
  SECTOR_LABELS,
  GEO_LABELS,
  type CrmBrandStatus,
} from '@/lib/schemas/crmBrand';
import type { CrmBrandRow } from '@/types';

const STATUS_LABELS: Record<CrmBrandStatus, string> = {
  lead:           'Lead',
  contactada:     'Contactada',
  en_negociacion: 'En negociación',
  activa:         'Activa',
  inactiva:       'Inactiva',
  perdida:        'Perdida',
  pausada:        'Pausada',
  cerrada:        'Cerrada',
  no_interesa:    'No interesa',
  archivada:      'Archivada',
};

type Props =
  | { readonly brand?: undefined; readonly onClose: () => void }
  | { readonly brand: CrmBrandRow;  readonly onClose: () => void };

const INPUT   = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[13px] text-sp-admin-text outline-none focus:border-sp-admin-accent/60 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]';
const LABEL   = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
const SECTION = 'text-[9px] font-black uppercase tracking-[0.2em] text-sp-admin-muted/70 pb-1 mb-3 border-b border-sp-admin-border/60';
const BTN_P   = 'px-4 py-2 rounded-lg text-sm font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors cursor-pointer';
const BTN_G   = 'px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer border border-sp-admin-border';

function parseList(val: string | null | undefined): string[] {
  return (val ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

// ── Selector de chips ─────────────────────────────────────────────────

type ChipOption = { readonly value: string; readonly label: string };
type ChipsProps = {
  readonly options: readonly ChipOption[];
  readonly selected: readonly string[];
  readonly onChange: (next: string[]) => void;
};

function MultiChips({ options, selected, onChange }: ChipsProps): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() =>
              onChange(on ? selected.filter((v) => v !== opt.value) : [...selected, opt.value])
            }
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              on
                ? 'bg-sp-admin-accent text-white border-sp-admin-accent'
                : 'bg-white text-sp-admin-muted border-sp-admin-border hover:border-sp-admin-accent/50 hover:text-sp-admin-text'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────

export function BrandFormModal({ brand, onClose }: Props): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-sp-admin-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-admin-border sticky top-0 bg-sp-admin-card z-10">
          <h2 className="text-base font-bold text-sp-admin-text">
            {brand ? `Editar — ${brand.name}` : '+ Nueva marca'}
          </h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none transition-colors">×</button>
        </div>
        {brand
          ? <BrandForm mode="edit" brand={brand} onDone={onClose} />
          : <BrandForm mode="create" onDone={onClose} />}
      </div>
    </div>
  );
}

// ── Formulario interno ────────────────────────────────────────────────

type FormProps =
  | { readonly mode: 'create'; readonly brand?: undefined; readonly onDone: () => void }
  | { readonly mode: 'edit';   readonly brand: CrmBrandRow;  readonly onDone: () => void };

function BrandForm(props: FormProps): React.ReactElement {
  const { mode, brand, onDone } = props;
  const action = mode === 'create' ? createBrandAction : updateBrandAction;
  const [state, formAction, isPending] = useActionState(action, {});

  // Multi-select chips state
  const [geoTargets, setGeoTargets] = useState<string[]>(
    parseList(brand?.geoTargets) || (brand?.geo ? [brand.geo] : []),
  );
  const [lookingFor, setLookingFor] = useState<string[]>(parseList(brand?.lookingFor));
  const [dealTypes,  setDealTypes]  = useState<string[]>(parseList(brand?.dealTypes));
  const [legalOpen,  setLegalOpen]  = useState(
    !!(brand?.legalName || brand?.taxId || brand?.address || brand?.country),
  );

  if (state.success && !isPending) setTimeout(onDone, 0);

  return (
    <form action={formAction} className="p-6 space-y-6">
      {props.mode === 'edit' && <input type="hidden" name="id" value={props.brand.id} />}

      {/* Hidden inputs para multi-select */}
      <input type="hidden" name="geoTargets" value={geoTargets.join(',')} />
      <input type="hidden" name="lookingFor"  value={lookingFor.join(',')} />
      <input type="hidden" name="dealTypes"   value={dealTypes.join(',')} />

      {/* ── Bloque 1: Información principal ── */}
      <div>
        <p className={SECTION}>1 · Información principal</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className={LABEL}>Nombre *</label>
            <input name="name" required defaultValue={brand?.name} placeholder="Nombre comercial de la marca" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Tipo</label>
            <select name="tipo" defaultValue={brand?.tipo ?? ''} className={INPUT}>
              <option value="">— Sin especificar —</option>
              {CRM_BRAND_TIPOS.map((t) => (
                <option key={t} value={t}>{t === 'agencia' ? 'Agencia' : 'Marca'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Sector</label>
            <select name="sector" defaultValue={brand?.sector ?? ''} className={INPUT}>
              <option value="">— Sin especificar —</option>
              {CRM_BRAND_SECTORES.map((s) => (
                <option key={s} value={s}>{SECTOR_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Estado</label>
            <select name="status" defaultValue={brand?.status ?? 'lead'} className={INPUT}>
              {CRM_BRAND_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className={LABEL}>GEO objetivo</label>
            <MultiChips
              options={CRM_BRAND_GEOS.map((g) => ({ value: g, label: GEO_LABELS[g] }))}
              selected={geoTargets}
              onChange={setGeoTargets}
            />
          </div>
        </div>
      </div>

      {/* ── Bloque 2: Contacto principal (solo en creación) ── */}
      {mode === 'create' && (
        <div>
          <p className={SECTION}>2 · Contacto principal</p>
          <p className="text-[10px] text-sp-admin-muted/70 mb-3 -mt-1">Se creará automáticamente como contacto principal de la marca.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={LABEL}>Nombre del contacto</label>
              <input name="contactName" placeholder="Nombre y apellidos" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Rol / Cargo</label>
              <input name="contactRole" placeholder="Affiliate Manager, CEO…" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Telegram</label>
              <input name="contactTelegram" placeholder="@usuario" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Discord</label>
              <input name="contactDiscord" placeholder="usuario" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input name="contactEmail" type="email" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Teléfono</label>
              <input name="contactPhone" placeholder="+34 …" className={INPUT} />
            </div>
          </div>
        </div>
      )}

      {/* ── Bloque 3: Información de negocio ── */}
      <div>
        <p className={SECTION}>{mode === 'create' ? '3' : '2'} · Información de negocio</p>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>¿Qué buscan?</label>
            <MultiChips options={[...LOOKING_FOR_OPTIONS]} selected={lookingFor} onChange={setLookingFor} />
          </div>
          <div>
            <label className={LABEL}>Tipo de deals</label>
            <MultiChips options={[...DEAL_TYPE_OPTIONS]} selected={dealTypes} onChange={setDealTypes} />
          </div>
          <div>
            <label className={LABEL}>Web</label>
            <input name="website" type="url" placeholder="https://…" defaultValue={brand?.website ?? ''} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Notas internas</label>
            <textarea name="notes" rows={3} defaultValue={brand?.notes ?? ''} placeholder="Contexto comercial, preferencias, condiciones…" className={INPUT} />
          </div>
        </div>
      </div>

      {/* ── Bloque 4: Información legal (colapsado) ── */}
      <div>
        <button
          type="button"
          onClick={() => setLegalOpen((v) => !v)}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-sp-admin-muted/70 pb-1 border-b border-sp-admin-border/60 w-full text-left hover:text-sp-admin-muted transition-colors"
        >
          <span className={`transition-transform text-[10px] ${legalOpen ? 'rotate-90' : ''}`}>▸</span>
          {mode === 'create' ? '4' : '3'} · Información legal
          {!legalOpen && (
            <span className="ml-auto text-[9px] font-semibold text-sp-admin-muted/50 normal-case tracking-normal">
              opcional — razón social, CIF, dirección
            </span>
          )}
        </button>
        {legalOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={LABEL}>Razón social</label>
              <input name="legalName" defaultValue={brand?.legalName ?? ''} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>CIF / VAT</label>
              <input name="taxId" placeholder="B12345678 / ES-…" defaultValue={brand?.taxId ?? ''} className={INPUT} />
            </div>
            <div className="md:col-span-2">
              <label className={LABEL}>Dirección</label>
              <input name="address" defaultValue={brand?.address ?? ''} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>País (ISO 2)</label>
              <input name="country" maxLength={2} placeholder="ES" defaultValue={brand?.country ?? ''} className={INPUT} />
            </div>
          </div>
        )}
      </div>

      {state.error && <p className="text-xs text-red-400 font-medium">{state.error}</p>}

      <div className="flex items-center gap-2 justify-end pt-2 border-t border-sp-admin-border/60">
        <button type="button" onClick={onDone} className={BTN_G}>Cancelar</button>
        <button type="submit" disabled={isPending} className={BTN_P}>
          {isPending ? 'Guardando…' : mode === 'create' ? 'Crear marca' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
