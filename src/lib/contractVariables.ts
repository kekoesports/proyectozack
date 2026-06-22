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
  { key: 'brand_name',       label: 'Nombre de la marca'    },
  { key: 'influencer_name',  label: 'Nombre del influencer' },
  { key: 'influencer_alias', label: 'Alias del influencer'  },
  { key: 'campaign_name',    label: 'Nombre de la campaña'  },
  { key: 'total_amount',     label: 'Importe total (€)'     },
  { key: 'commission',       label: 'Comisión agencia (€)'  },
  { key: 'talent_amount',    label: 'Importe talento (€)'   },
  { key: 'currency',         label: 'Divisa'                },
  { key: 'start_date',       label: 'Fecha de inicio'       },
  { key: 'end_date',         label: 'Fecha de fin'          },
  { key: 'deliverables',     label: 'Entregables'           },
  { key: 'agency_name',      label: 'Nombre agencia'        },
  { key: 'agency_entity',    label: 'Razón social agencia'  },
  { key: 'agency_taxid',     label: 'CIF agencia'           },
  { key: 'sector',           label: 'Sector'                },
  { key: 'geo',              label: 'GEO'                   },
  { key: 'today',            label: 'Fecha de hoy'          },
  { key: 'brand_country',    label: 'País de la marca'      },
  { key: 'payment_method',   label: 'Método de pago'        },
  { key: 'payment_terms',    label: 'Condiciones de pago'   },
  { key: 'exclusivity',      label: 'Exclusividad'          },
  { key: 'jurisdiction',     label: 'Jurisdicción'          },
] as const;

/** Mapa key→label para lookup rápido */
export const VARIABLE_LABEL: Readonly<Record<string, string>> = Object.fromEntries(
  AVAILABLE_VARIABLES.map(({ key, label }) => [key, label]),
);

/**
 * Extrae los placeholder {{...}} del contenido de una plantilla.
 * Devuelve un array de keys únicos en orden de aparición.
 */
export function detectPlaceholders(content: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of content.matchAll(/\{\{([^}]+)\}\}/g)) {
    const key = m[1]?.trim() ?? '';
    if (key && !seen.has(key)) { seen.add(key); result.push(key); }
  }
  return result;
}

/**
 * Construye las vars estáticas de la agencia (no dependen del trato).
 * Para contratos standalone donde el usuario llena el resto manualmente.
 */
export function buildAgencyVars(): Record<string, string> {
  return {
    agency_name:   'SocialPro Agency',
    agency_entity: 'ElevateX Agency PA SL',
    agency_taxid:  'B21821046',
    today:         new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
    currency:      'EUR',
  };
}
