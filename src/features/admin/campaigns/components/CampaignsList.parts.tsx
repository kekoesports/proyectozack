'use client';

import type { CampaignRow, CampaignWithRelations } from '@/types';
import type { CampaignFilterState } from '@/features/admin/campaigns/components/CampaignFilters';
import type { CampaignStatus } from '@/lib/schemas/campaign';
import type { Tone } from '@/features/admin/_shared/components/StateBadge';
import { toEUR } from '@/lib/currency';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BrandOption = { readonly id: number; readonly name: string };
export type TalentOption = { readonly id: number; readonly name: string };
export type StaffOption  = { readonly id: string; readonly name: string };

// ── Status → tone ─────────────────────────────────────────────────────────────

export type StatusToneConfig = {
  readonly tone: Tone;
  readonly variant?: 'soft' | 'solid' | 'dot';
};

export const STATUS_TONE: Record<CampaignStatus, StatusToneConfig> = {
  propuesta:     { tone: 'info' },
  negociacion:   { tone: 'warning' },
  aprobada:      { tone: 'success' },
  activa:        { tone: 'success' },
  completada:    { tone: 'success', variant: 'solid' },
  pagada:        { tone: 'success', variant: 'solid' },
  pendiente_pago: { tone: 'warning' },
  cancelada:     { tone: 'neutral' },
};

// ── EUR formatter ─────────────────────────────────────────────────────────────

export const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// ── KPI calculations ──────────────────────────────────────────────────────────

export type CampaignKpis = {
  total:           number;
  activos:         number;
  negociacion:     number;
  finalizados:     number;
  revenueBruto:    number;
  pendienteCobro:  number;
  pendienteTalent: number;
  margenTotal:     number;
};

const ACTIVE_STATUSES   = new Set<CampaignStatus>(['activa', 'aprobada']);
const FINISHED_STATUSES = new Set<CampaignStatus>(['completada', 'pagada']);
const PAID_STATUSES     = new Set<CampaignStatus>(['pagada', 'cancelada']);

export function computeKpis(campaigns: readonly CampaignWithRelations[], rate?: number): CampaignKpis {
  let activos = 0, negociacion = 0, finalizados = 0;
  let revenueBruto = 0, pendienteCobro = 0, pendienteTalent = 0, margenTotal = 0;

  for (const c of campaigns) {
    if (c.archivedAt !== null) continue;

    const cur    = c.currency ?? 'EUR';
    const brand  = toEUR(c.amountBrand  ?? 0, cur, rate);
    const talent = toEUR(c.amountTalent ?? 0, cur, rate);

    if (ACTIVE_STATUSES.has(c.status))   activos++;
    if (c.status === 'negociacion')       negociacion++;
    if (FINISHED_STATUSES.has(c.status)) finalizados++;

    revenueBruto += brand;
    margenTotal  += brand - talent;

    if (!PAID_STATUSES.has(c.status)) {
      pendienteCobro  += brand;
      pendienteTalent += talent;
    }
  }

  const active = campaigns.filter((c) => c.archivedAt === null);
  return { total: active.length, activos, negociacion, finalizados, revenueBruto, pendienteCobro, pendienteTalent, margenTotal };
}

// ── Payment badge helpers ─────────────────────────────────────────────────────

export type PayBadge = { label: string; color: string };

export function brandPayBadge(c: CampaignRow): PayBadge {
  if (c.status === 'pagada')        return { label: 'Cobrado',   color: '#16a34a' };
  if (c.status === 'pendiente_pago') return { label: 'Pendiente', color: '#f59e0b' };
  if (c.status === 'cancelada')     return { label: 'Cancelado', color: '#9ca3af' };
  if (Number(c.amountBrand ?? 0) === 0) return { label: '—', color: '#9ca3af' };
  return { label: 'Sin cobrar', color: '#f59e0b' };
}

export function talentPayBadge(c: CampaignRow): PayBadge {
  if (c.status === 'pagada')        return { label: 'Pagado',    color: '#16a34a' };
  if (c.status === 'pendiente_pago') return { label: 'Pendiente', color: '#f59e0b' };
  if (c.status === 'cancelada')     return { label: 'Cancelado', color: '#9ca3af' };
  if (Number(c.amountTalent ?? 0) === 0) return { label: '—', color: '#9ca3af' };
  return { label: 'Sin pagar', color: '#ef4444' };
}

// ── Filter logic ──────────────────────────────────────────────────────────────

export function applyFilters(
  campaigns: readonly CampaignWithRelations[],
  f: CampaignFilterState,
  brandMap: Map<number, string>,
  talentMap: Map<number, string>,
): readonly CampaignWithRelations[] {
  return campaigns.filter((c) => {
    if (!f.showArchived && c.archivedAt !== null) return false;
    if (f.showArchived  && c.archivedAt === null)  return false;

    if (f.search !== '') {
      const q      = f.search.toLowerCase();
      const name   = c.name.toLowerCase();
      const brand  = (brandMap.get(c.brandId)   ?? '').toLowerCase();
      const talent = (talentMap.get(c.talentId) ?? '').toLowerCase();
      if (!name.includes(q) && !brand.includes(q) && !talent.includes(q)) return false;
    }

    if (f.status      !== '' && c.status            !== f.status)                   return false;
    if (f.brandId     !== '' && c.brandId            !== Number(f.brandId))          return false;
    if (f.talentId    !== '' && c.talentId           !== Number(f.talentId))         return false;
    if (f.responsibleUserId !== '' && c.responsibleUserId !== f.responsibleUserId)   return false;
    if (f.sector      !== '' && c.sector             !== f.sector)                   return false;
    if (f.geo         !== '' && c.geo                !== f.geo)                      return false;

    // Cobro marca
    if (f.cobroMarca === 'cobrado'   && c.brandPaid  === 'no') return false;
    if (f.cobroMarca === 'pendiente' && c.brandPaid  !== 'no') return false;

    // Pago talento
    if (f.pagoTalento === 'pagado'   && c.talentPaid === 'no') return false;
    if (f.pagoTalento === 'pendiente' && c.talentPaid !== 'no') return false;

    return true;
  });
}
