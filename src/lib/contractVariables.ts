import type { CampaignWithRelations } from '@/lib/queries/campaigns';

/** Extrae las variables del trato para rellenar la plantilla */
export function buildContractVars(c: CampaignWithRelations): Record<string, string> {
  const fmt = (n: string | number | null | undefined) =>
    n ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(Number(n)) : '—';

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return {
    // Campaña
    campaign_name:     c.name,
    sector:            c.sector       ?? '—',
    geo:               c.geo          ?? '—',
    start_date:        fmtDate(c.startDate),
    end_date:          fmtDate(c.endDate),
    deliverables:      c.notes        ?? '—',
    campaign_notes:    c.notes        ?? '—',

    // Financiero
    total_amount:      fmt(c.amountBrand),
    commission:        fmt(Number(c.amountBrand ?? 0) - Number(c.amountTalent ?? 0)),
    talent_amount:     fmt(c.amountTalent),
    currency:          'EUR',

    // Marca
    brand_name:        c.brand.name,
    brand_country:     c.brand.geo ?? '—',

    // Influencer
    influencer_name:   c.talent.name,
    influencer_alias:  c.talent.name,

    // Agencia
    agency_name:       'SocialPro Agency',
    agency_entity:     'ElevateX Agency PA SL',
    agency_taxid:      'B21821046',

    // Fecha de hoy
    today:             new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
  };
}

/** Sustituye las variables {{var}} en el contenido de la plantilla */
export function fillTemplate(content: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, val]) => text.replaceAll(`{{${key}}}`, val),
    content,
  );
}

/** Lista de variables disponibles para mostrar en la UI */
export const AVAILABLE_VARIABLES = [
  { key: 'brand_name',      label: 'Nombre de la marca' },
  { key: 'influencer_name', label: 'Nombre del influencer' },
  { key: 'influencer_alias',label: 'Alias del influencer' },
  { key: 'campaign_name',   label: 'Nombre de la campaña' },
  { key: 'total_amount',    label: 'Importe total (€)' },
  { key: 'commission',      label: 'Comisión agencia (€)' },
  { key: 'currency',        label: 'Divisa' },
  { key: 'start_date',      label: 'Fecha de inicio' },
  { key: 'end_date',        label: 'Fecha de fin' },
  { key: 'deliverables',    label: 'Entregables' },
  { key: 'agency_name',     label: 'Nombre agencia' },
  { key: 'agency_entity',   label: 'Razón social agencia' },
  { key: 'agency_taxid',    label: 'CIF agencia' },
  { key: 'sector',          label: 'Sector' },
  { key: 'geo',             label: 'GEO' },
  { key: 'today',           label: 'Fecha de hoy' },
] as const;
