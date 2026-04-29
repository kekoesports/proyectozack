'use client';

import type { CampaignRow } from '@/types';
import type { CampaignFilterState } from '@/features/admin/campaigns/components/CampaignFilters';
import type { CampaignStatus } from '@/lib/schemas/campaign';
import type { Tone } from '@/features/admin/_shared/components/StateBadge';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BrandOption = { readonly id: number; readonly name: string };
export type TalentOption = { readonly id: number; readonly name: string };
export type StaffOption = { readonly id: string; readonly name: string };

// ── Status → tone mapping ─────────────────────────────────────────────────────

export type StatusToneConfig = {
  readonly tone: Tone;
  readonly variant?: 'soft' | 'solid' | 'dot';
};

export const STATUS_TONE: Record<CampaignStatus, StatusToneConfig> = {
  propuesta: { tone: 'info' },
  negociacion: { tone: 'info' },
  aprobada: { tone: 'success' },
  activa: { tone: 'success' },
  completada: { tone: 'success', variant: 'solid' },
  pagada: { tone: 'success', variant: 'solid' },
  pendiente_pago: { tone: 'warning' },
  cancelada: { tone: 'neutral' },
};

// ── EUR formatter ─────────────────────────────────────────────────────────────

export const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

// ── Filter logic ──────────────────────────────────────────────────────────────

export function applyFilters(
  campaigns: readonly CampaignRow[],
  f: CampaignFilterState,
  brandMap: Map<number, string>,
  talentMap: Map<number, string>,
): readonly CampaignRow[] {
  return campaigns.filter((c) => {
    // Archived toggle
    if (!f.showArchived && c.archivedAt !== null) return false;
    if (f.showArchived && c.archivedAt === null) return false;

    // Search by name
    if (f.search !== '') {
      const q = f.search.toLowerCase();
      const name = c.name.toLowerCase();
      const brand = (brandMap.get(c.brandId) ?? '').toLowerCase();
      const talent = (talentMap.get(c.talentId) ?? '').toLowerCase();
      if (!name.includes(q) && !brand.includes(q) && !talent.includes(q)) return false;
    }

    if (f.status !== '' && c.status !== f.status) return false;
    if (f.brandId !== '' && c.brandId !== Number(f.brandId)) return false;
    if (f.talentId !== '' && c.talentId !== Number(f.talentId)) return false;
    if (f.responsibleUserId !== '' && c.responsibleUserId !== f.responsibleUserId) return false;
    if (f.sector !== '' && c.sector !== f.sector) return false;
    if (f.geo !== '' && c.geo !== f.geo) return false;

    return true;
  });
}
