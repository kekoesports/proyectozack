'use client';

import { useState, useMemo } from 'react';
import type { CampaignWithRelations } from '@/types';
import {
  createCampaignAction,
  updateCampaignAction,
  deleteCampaignAction,
  markBrandPaidAction,
  markTalentPaidAction,
} from '@/app/admin/(dashboard)/campanas/campaign-actions';

// ── Constantes ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  negociacion:     { label: 'Negociación',   color: '#8b3aad', bg: '#8b3aad14' },
  activa:          { label: 'Activa',        color: '#16a34a', bg: '#16a34a14' },
  pausada:         { label: 'Pausada',       color: '#f59e0b', bg: '#f59e0b14' },
  finalizada:      { label: 'Finalizada',    color: '#5b9bd5', bg: '#5b9bd514' },
  cancelada:       { label: 'Cancelada',     color: '#ef4444', bg: '#ef444414' },
};

const PAYMENT_METHODS = [
  'Crypto agencia', 'Crypto Zack', 'Banco SocialPro', 'Banco Stark', 'Otro',
];

const SECTORS = ['CS2 Cases', 'Marketplace CS2', 'Casino', 'Casas de apuestas', 'Periféricos', 'Gaming', 'Esports', 'Otros'];
const GEOS = ['LATAM', 'Spain', 'Europa', 'Turquía', 'India', 'Japón', 'Global', 'Otro'];

function formatMoney(n: string | number | null | undefined): string {
  if (!n) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n));
}

function calcNetMargin(c: CampaignWithRelations): number {
  const brand = Number(c.amountBrand ?? 0);
  const talent = Number(c.amountTalent ?? 0);
  const fee = Number(c.agencyFee ?? 0);
  return brand - talent - fee;
}

// ── Status badge ──────────────────────────────────────────────────────

function StatusBadge({ status }: { readonly status: string }): React.ReactElement {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#72728a', bg: '#72728a14' };
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

// ── Payment indicator ─────────────────────────────────────────────────

function PaidBadge({ paid, label }: { readonly paid: boolean; readonly label: string }): React.ReactElement {
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide ${paid ? 'text-emerald-600' : 'text-sp-admin-muted'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${paid ? 'bg-emerald-500' : 'bg-sp-admin-muted/40'}`} />
      {label}
    </span>
  );
}

// ── Campaign form modal ────────────────────────────────────────────────

type BrandOption = { id: number; name: string };
type TalentOption = { id: number; name: string };
type UserOption = { id: string; name: string };

type CampaignFormProps = {
  readonly campaign: CampaignWithRelations | null;
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly users: readonly UserOption[];
  readonly onClose: () => void;
};

function CampaignForm({ campaign, brands, talents, users, onClose }: CampaignFormProps): React.ReactElement {
  const isEdit = campaign !== null;

  async function handleSubmit(fd: FormData): Promise<void> {
    if (isEdit) { await updateCampaignAction(fd); } else { await createCampaignAction(fd); }
    onClose();
  }

  const INPUT = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[13px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50';
  const LABEL = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
  const COL2 = 'grid grid-cols-2 gap-3';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-sp-admin-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-sp-admin-border flex items-center justify-between sticky top-0 bg-sp-admin-card z-10">
          <h2 className="text-base font-bold text-sp-admin-text">{isEdit ? 'Editar trato' : 'Nuevo trato'}</h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none">×</button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-4">
          {isEdit && <input type="hidden" name="id" value={campaign.id} />}

          {/* Nombre + Estado */}
          <div className={COL2}>
            <div>
              <label className={LABEL}>Nombre del trato *</label>
              <input name="name" required defaultValue={campaign?.name ?? ''} placeholder="Ej: Winamax Q2 2026" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Estado</label>
              <select name="status" defaultValue={campaign?.status ?? 'negociacion'} className={INPUT}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Marca + Talento */}
          <div className={COL2}>
            <div>
              <label className={LABEL}>Marca</label>
              <select name="brandId" defaultValue={campaign?.brandId ?? ''} className={INPUT}>
                <option value="">— Sin marca —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Influencer</label>
              <select name="talentId" defaultValue={campaign?.talentId ?? ''} className={INPUT}>
                <option value="">— Sin influencer —</option>
                {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Sector + GEO + Fechas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={LABEL}>Sector</label>
              <select name="sector" defaultValue={campaign?.sector ?? ''} className={INPUT}>
                <option value="">—</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>GEO</label>
              <select name="geo" defaultValue={campaign?.geo ?? ''} className={INPUT}>
                <option value="">—</option>
                {GEOS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Inicio</label>
              <input type="date" name="startDate" defaultValue={campaign?.startDate ?? ''} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fin</label>
              <input type="date" name="endDate" defaultValue={campaign?.endDate ?? ''} className={INPUT} />
            </div>
          </div>

          {/* Importes */}
          <div className={COL2}>
            <div>
              <label className={LABEL}>Pago marca (€)</label>
              <input type="number" step="0.01" name="amountBrand" defaultValue={campaign?.amountBrand ?? ''} placeholder="0.00" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Pago influencer (€)</label>
              <input type="number" step="0.01" name="amountTalent" defaultValue={campaign?.amountTalent ?? ''} placeholder="0.00" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fee agencia (€)</label>
              <input type="number" step="0.01" name="agencyFee" defaultValue={campaign?.agencyFee ?? ''} placeholder="0.00" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>% comisión</label>
              <input type="number" step="0.01" name="agencyFeePercent" defaultValue={campaign?.agencyFeePercent ?? ''} placeholder="0.00" className={INPUT} />
            </div>
          </div>

          {/* Responsable */}
          {users.length > 0 && (
            <div>
              <label className={LABEL}>Responsable</label>
              <select name="responsibleUserId" defaultValue={campaign?.responsibleUserId ?? ''} className={INPUT}>
                <option value="">— Sin asignar —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}

          {/* Descripción + Deliverables */}
          <div>
            <label className={LABEL}>Descripción</label>
            <textarea name="description" rows={2} defaultValue={campaign?.description ?? ''} placeholder="Descripción del trato…" className={`${INPUT} resize-none`} />
          </div>
          <div>
            <label className={LABEL}>Deliverables</label>
            <textarea name="deliverables" rows={2} defaultValue={campaign?.deliverables ?? ''} placeholder="Ej: 4 streams + 2 posts YouTube…" className={`${INPUT} resize-none`} />
          </div>
          <div>
            <label className={LABEL}>Notas internas</label>
            <textarea name="notes" rows={2} defaultValue={campaign?.notes ?? ''} className={`${INPUT} resize-none`} />
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-sp-admin-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-sp-admin-border text-[13px] font-medium text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:bg-sp-admin-accent/90 transition-colors">
              {isEdit ? 'Guardar cambios' : 'Crear trato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Manager principal ──────────────────────────────────────────────────

type CampaignsManagerProps = {
  readonly campaigns: readonly CampaignWithRelations[];
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly users: readonly UserOption[];
};

export function CampaignsManager({ campaigns: initialCampaigns, brands, talents, users }: CampaignsManagerProps): React.ReactElement {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<CampaignWithRelations | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterBrand, setFilterBrand] = useState<string>('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return initialCampaigns.filter((c) => {
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterBrand && String(c.brandId) !== filterBrand) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.brandName ?? '').toLowerCase().includes(q) ||
          (c.talentName ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [initialCampaigns, filterStatus, filterBrand, search]);

  const totalRevenue = filtered.reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);
  const totalPending = filtered.filter((c) => !c.brandPaid).reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);
  const activeCount = filtered.filter((c) => c.status === 'activa').length;

  const INPUT = 'rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-1.5 text-[12px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50';

  return (
    <div className="space-y-4">
      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tratos totales', value: filtered.length, color: '#f5632a' },
          { label: 'Activos', value: activeCount, color: '#16a34a' },
          { label: 'Revenue total', value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalRevenue), color: '#8b3aad' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-[2px]" style={{ background: s.color }} />
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{s.label}</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros + CTA */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar trato, marca, influencer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${INPUT} flex-1 min-w-[200px]`}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={INPUT}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className={INPUT}>
          <option value="">Todas las marcas</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors"
        >
          + Nuevo trato
        </button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-sp-admin-muted">No hay tratos{search || filterStatus || filterBrand ? ' con esos filtros' : ' todavía'}</p>
            {!search && !filterStatus && !filterBrand && (
              <button type="button" onClick={() => setShowCreate(true)} className="mt-3 text-[12px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity">
                Crear el primer trato →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
                  {['Trato', 'Marca', 'Influencer', 'Estado', 'Pago marca', 'Margen', 'Cobrado', 'Pagado', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const margin = calcNetMargin(c);
                  return (
                    <tr key={c.id} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-sp-admin-text truncate max-w-[160px]">{c.name}</p>
                        {c.sector && <p className="text-[9px] text-sp-admin-muted">{c.sector}</p>}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-sp-admin-text">{c.brandName ?? '—'}</td>
                      <td className="px-4 py-3 text-[12px] text-sp-admin-text">{c.talentName ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-sp-admin-text tabular-nums">{formatMoney(c.amountBrand)}</td>
                      <td className="px-4 py-3 text-[12px] font-semibold tabular-nums" style={{ color: margin >= 0 ? '#16a34a' : '#ef4444' }}>
                        {formatMoney(String(margin))}
                      </td>
                      <td className="px-4 py-3"><PaidBadge paid={c.brandPaid} label="Marca" /></td>
                      <td className="px-4 py-3"><PaidBadge paid={c.talentPaid} label="Talent" /></td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setEditing(c)}
                          className="text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showCreate || editing) && (
        <CampaignForm
          campaign={editing}
          brands={brands}
          talents={talents}
          users={users}
          onClose={() => { setShowCreate(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
