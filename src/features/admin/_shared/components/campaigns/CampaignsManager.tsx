'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import type { CampaignWithRelations } from '@/types';
import {
  createCampaignAction,
  updateCampaignAction,
  deleteCampaignAction,
} from '@/app/admin/(dashboard)/campanas/campaign-actions';

// Re-exportar desde módulo compartido (importable en server y client)
import { STATUS_CONFIG, PAYMENT_METHODS, SECTORS, GEOS, formatMoney, StatusBadge, PaidBadge } from '@/lib/campaignHelpers';
export { STATUS_CONFIG, PAYMENT_METHODS, SECTORS, GEOS, formatMoney, StatusBadge, PaidBadge } from '@/lib/campaignHelpers';

export function calcNetMargin(c: CampaignWithRelations): number {
  const brand  = Number(c.amountBrand ?? 0);
  const talent = Number(c.amountTalent ?? 0);
  const fee    = Number(c.agencyFee ?? 0);
  return brand - talent - fee;
}

// ── Form con cálculo automático ───────────────────────────────────────

type BrandOption  = { id: number; name: string };
type TalentOption = { id: number; name: string };
type UserOption   = { id: string; name: string };

type CampaignFormProps = {
  readonly campaign: CampaignWithRelations | null;
  readonly brands:  readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly users:   readonly UserOption[];
  readonly onClose: () => void;
};

function CampaignForm({ campaign, brands, talents, users, onClose }: CampaignFormProps): React.ReactElement {
  const isEdit = campaign !== null;
  const [isPending, startTransition] = useTransition();

  // Campos económicos controlados para cálculo en tiempo real
  const [amountBrand,  setAmountBrand]  = useState(String(campaign?.amountBrand  ?? ''));
  const [amountTalent, setAmountTalent] = useState(String(campaign?.amountTalent ?? ''));
  const [agencyFee,    setAgencyFee]    = useState(String(campaign?.agencyFee    ?? ''));

  // Cálculos automáticos
  const bNum = parseFloat(amountBrand)  || 0;
  const tNum = parseFloat(amountTalent) || 0;
  const fNum = parseFloat(agencyFee)    || 0;
  const margin    = bNum - tNum - fNum;
  const marginPct = bNum > 0 ? ((bNum - tNum) / bNum * 100).toFixed(1) : '0';
  const autoFee   = bNum > 0 && tNum > 0 ? bNum - tNum : fNum;

  const handleSubmit = (fd: FormData): void => {
    fd.set('amountBrand',       amountBrand);
    fd.set('amountTalent',      amountTalent);
    fd.set('agencyFee',         String(autoFee));
    fd.set('agencyFeePercent',  marginPct);
    startTransition(async () => {
      if (isEdit) { await updateCampaignAction(fd); } else { await createCampaignAction(fd); }
      onClose();
    });
  };

  const INPUT = 'w-full rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-[13px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50';
  const LABEL = 'block text-[10px] font-bold uppercase tracking-[0.14em] text-sp-admin-muted mb-1';
  const COL2  = 'grid grid-cols-2 gap-3';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-sp-admin-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-sp-admin-border flex items-center justify-between sticky top-0 bg-sp-admin-card z-10">
          <h2 className="text-base font-bold text-sp-admin-text">{isEdit ? 'Editar trato' : 'Nuevo trato'}</h2>
          <button type="button" onClick={onClose} className="text-sp-admin-muted hover:text-sp-admin-text text-xl leading-none transition-colors">×</button>
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

          {/* Importes con cálculo automático */}
          <div className="rounded-xl border border-sp-admin-border bg-sp-admin-bg/50 p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-sp-admin-muted">Importes económicos</p>
            <div className={COL2}>
              <div>
                <label className={LABEL}>Pago de la marca (€)</label>
                <input type="number" step="0.01" value={amountBrand}
                  onChange={(e) => setAmountBrand(e.target.value)}
                  placeholder="0.00" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Pago al influencer (€)</label>
                <input type="number" step="0.01" value={amountTalent}
                  onChange={(e) => setAmountTalent(e.target.value)}
                  placeholder="0.00" className={INPUT} />
              </div>
            </div>
            {/* Calculados automáticamente */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-sp-admin-card border border-sp-admin-border px-3 py-2">
                <p className="text-[9px] font-bold text-sp-admin-muted uppercase tracking-wide">Fee agencia</p>
                <p className="text-[15px] font-bold mt-0.5" style={{ color: '#8b3aad' }}>
                  {bNum > 0 && tNum > 0 ? `${(bNum - tNum).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}` : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-sp-admin-card border border-sp-admin-border px-3 py-2">
                <p className="text-[9px] font-bold text-sp-admin-muted uppercase tracking-wide">% comisión</p>
                <p className="text-[15px] font-bold mt-0.5" style={{ color: '#f5632a' }}>
                  {bNum > 0 ? `${marginPct}%` : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-sp-admin-card border border-sp-admin-border px-3 py-2">
                <p className="text-[9px] font-bold text-sp-admin-muted uppercase tracking-wide">Margen neto</p>
                <p className="text-[15px] font-bold mt-0.5" style={{ color: margin >= 0 ? '#16a34a' : '#ef4444' }}>
                  {bNum > 0 ? `${margin.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}` : '—'}
                </p>
              </div>
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
            <textarea name="description" rows={2} defaultValue={campaign?.description ?? ''}
              placeholder="Descripción del trato…" className={`${INPUT} resize-none`} />
          </div>
          <div>
            <label className={LABEL}>Deliverables</label>
            <textarea name="deliverables" rows={2} defaultValue={campaign?.deliverables ?? ''}
              placeholder="Ej: 4 streams + 2 posts YouTube…" className={`${INPUT} resize-none`} />
          </div>
          <div>
            <label className={LABEL}>Notas internas</label>
            <textarea name="notes" rows={2} defaultValue={campaign?.notes ?? ''} className={`${INPUT} resize-none`} />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-sp-admin-border">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-sp-admin-border text-[13px] font-medium text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 rounded-lg bg-sp-admin-accent text-white text-[13px] font-semibold hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors">
              {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear trato'}
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
  readonly brands:  readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly users:   readonly UserOption[];
};

export function CampaignsManager({ campaigns: initialCampaigns, brands, talents, users }: CampaignsManagerProps): React.ReactElement {
  const [showCreate,   setShowCreate]   = useState(false);
  const [editing,      setEditing]      = useState<CampaignWithRelations | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBrand,  setFilterBrand]  = useState('');
  const [filterTalent, setFilterTalent] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterPaid,   setFilterPaid]   = useState<'all' | 'brand_paid' | 'brand_unpaid' | 'talent_unpaid'>('all');
  const [search,       setSearch]       = useState('');
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return initialCampaigns.filter((c) => {
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterBrand  && String(c.brandId)  !== filterBrand)  return false;
      if (filterTalent && String(c.talentId) !== filterTalent) return false;
      if (filterSector && c.sector !== filterSector) return false;
      if (filterPaid === 'brand_paid'    && !c.brandPaid)  return false;
      if (filterPaid === 'brand_unpaid'  && c.brandPaid)   return false;
      if (filterPaid === 'talent_unpaid' && c.talentPaid)  return false;
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
  }, [initialCampaigns, filterStatus, filterBrand, filterTalent, filterSector, filterPaid, search]);

  const totalRevenue      = filtered.reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);
  const pendingBrand      = filtered.filter((c) => !c.brandPaid).reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);
  const pendingTalent     = filtered.filter((c) => !c.talentPaid).reduce((s, c) => s + Number(c.amountTalent ?? 0), 0);
  const totalMargin       = filtered.reduce((s, c) => s + calcNetMargin(c), 0);
  const activeCount       = filtered.filter((c) => c.status === 'activa').length;
  const finishedCount     = filtered.filter((c) => c.status === 'finalizada').length;

  const eur = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const INPUT = 'h-8 rounded-lg border border-sp-admin-border bg-white px-3 text-[12px] text-sp-admin-text placeholder:text-sp-admin-muted/60 focus:outline-none focus:border-sp-admin-accent/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

  const handleDelete = (id: number, name: string): void => {
    if (!confirm(`¿Eliminar el trato "${name}"?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', String(id));
      await deleteCampaignAction(fd);
    });
  };

  return (
    <div className="space-y-4">
      {/* 6 KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Tratos',      value: String(filtered.length), color: '#f5632a' },
          { label: 'Activos',     value: String(activeCount),     color: '#16a34a' },
          { label: 'Finalizados', value: String(finishedCount),   color: '#5b9bd5' },
          { label: 'Revenue',     value: eur(totalRevenue),       color: '#8b3aad' },
          { label: 'Pdte. cobro', value: eur(pendingBrand),       color: '#f59e0b' },
          { label: 'Pdte. talent',value: eur(pendingTalent),      color: '#ef4444' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="h-[2px]" style={{ background: s.color }} />
            <div className="px-3 py-2.5">
              <p className="text-[8px] font-bold uppercase tracking-wide text-sp-admin-muted truncate">{s.label}</p>
              <p className="text-[15px] font-bold mt-0.5 tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar trato, marca, influencer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${INPUT} flex-1 min-w-[180px]`}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={INPUT}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className={INPUT}>
          <option value="">Todas las marcas</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterTalent} onChange={(e) => setFilterTalent(e.target.value)} className={INPUT}>
          <option value="">Todos los influencers</option>
          {talents.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)} className={INPUT}>
          <option value="">Todos los sectores</option>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPaid} onChange={(e) => setFilterPaid(e.target.value as typeof filterPaid)} className={INPUT}>
          <option value="all">Todos los pagos</option>
          <option value="brand_paid">Marca cobrada</option>
          <option value="brand_unpaid">Marca pendiente</option>
          <option value="talent_unpaid">Talent pendiente</option>
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
            <p className="text-sm font-medium text-sp-admin-muted">
              No hay tratos{search || filterStatus || filterBrand ? ' con esos filtros' : ' todavía'}
            </p>
            {!search && !filterStatus && !filterBrand && (
              <button type="button" onClick={() => setShowCreate(true)}
                className="mt-3 text-[12px] font-semibold text-sp-admin-accent hover:opacity-70 transition-opacity">
                Crear el primer trato →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-sp-admin-border bg-sp-admin-hover/40">
                  {[
                    'Trato', 'Marca · Influencer', 'Estado',
                    'Pago marca', 'Pago talent', 'Comisión', '% Margen',
                    'Cobro', 'Pago talent', '',
                  ].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-sp-admin-muted ${
                      i >= 3 && i <= 6 ? 'text-right' : i >= 7 && i <= 8 ? 'text-center' : 'text-left'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const margin    = calcNetMargin(c);
                  const marginPct = Number(c.amountBrand ?? 0) > 0
                    ? Math.round((margin / Number(c.amountBrand)) * 100)
                    : 0;
                  const commission = Number(c.amountBrand ?? 0) - Number(c.amountTalent ?? 0);
                  return (
                    <tr key={c.id} className="border-b border-sp-admin-border/40 last:border-0 hover:bg-sp-admin-hover transition-colors group/row">
                      {/* Trato — link al detalle */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <Link href={`/admin/campanas/${c.id}`}
                          className="text-[13px] font-semibold text-sp-admin-text hover:text-sp-admin-accent transition-colors truncate block">
                          {c.name}
                        </Link>
                        {(c.sector || c.geo) && (
                          <p className="text-[9px] text-sp-admin-muted mt-0.5">
                            {[c.sector, c.geo].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </td>
                      {/* Marca + Influencer */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          {c.brandName  && <p className="text-[12px] font-semibold text-sp-admin-text">{c.brandName}</p>}
                          {c.talentName && <p className="text-[11px] text-sp-admin-muted">{c.talentName}</p>}
                          {!c.brandName && !c.talentName && <span className="text-sp-admin-muted">—</span>}
                        </div>
                      </td>
                      {/* Estado */}
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      {/* Pago marca */}
                      <td className="px-4 py-3 text-right text-[13px] font-bold text-sp-admin-text tabular-nums">
                        {formatMoney(c.amountBrand)}
                      </td>
                      {/* Pago talent */}
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums text-sp-admin-muted">
                        {formatMoney(c.amountTalent)}
                      </td>
                      {/* Comisión agencia */}
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums" style={{ color: '#8b3aad' }}>
                        {Number(c.amountBrand ?? 0) > 0 && Number(c.amountTalent ?? 0) > 0
                          ? formatMoney(String(commission)) : '—'}
                      </td>
                      {/* % Margen */}
                      <td className="px-4 py-3 text-right">
                        <p className="text-[13px] font-bold tabular-nums" style={{ color: margin >= 0 ? '#16a34a' : '#ef4444' }}>
                          {Number(c.amountBrand ?? 0) > 0 ? `${marginPct}%` : '—'}
                        </p>
                      </td>
                      {/* Cobro marca */}
                      <td className="px-4 py-3 text-center"><PaidBadge paid={c.brandPaid} /></td>
                      {/* Pago talent */}
                      <td className="px-4 py-3 text-center"><PaidBadge paid={c.talentPaid} /></td>
                      {/* Acciones */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <Link href={`/admin/campanas/${c.id}`}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:bg-sp-admin-hover transition-colors">
                            Ver
                          </Link>
                          <button type="button" onClick={() => setEditing(c)}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-sp-admin-muted hover:text-sp-admin-accent hover:bg-sp-admin-hover transition-colors">
                            Editar
                          </button>
                          <button type="button" onClick={() => handleDelete(c.id, c.name)}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-red-400 hover:bg-red-50 transition-colors">
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filtered.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-sp-admin-border bg-sp-admin-hover/30">
                    <td colSpan={3} className="px-4 py-2.5 text-[10px] font-bold text-sp-admin-muted uppercase tracking-wide">
                      Total {filtered.length} tratos
                    </td>
                    <td className="px-4 py-2.5 text-right text-[13px] font-bold text-sp-admin-text tabular-nums">
                      {eur(totalRevenue)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[12px] text-sp-admin-muted tabular-nums">
                      {eur(filtered.reduce((s, c) => s + Number(c.amountTalent ?? 0), 0))}
                    </td>
                    <td colSpan={2} className="px-4 py-2.5 text-right text-[13px] font-bold tabular-nums"
                      style={{ color: totalMargin >= 0 ? '#16a34a' : '#ef4444' }}>
                      {eur(totalMargin)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
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
