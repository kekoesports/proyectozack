import 'server-only';

import { eq } from 'drizzle-orm';

import { campaigns } from '@/db/schema/campaigns';
import { crmBrands } from '@/db/schema/crmBrands';
import { talents } from '@/db/schema/talents';
import { db } from '@/lib/db';
import { createDealTrackingSheet } from '@/lib/drive/deal-tracking-sheet';
import { attachAutomatedDealSheet } from '@/lib/queries/automationDeals';

export type EnsureDealSheetOutcome =
  | { readonly status: 'created'; readonly url: string; readonly name: string }
  | { readonly status: 'already_had_sheet' }
  | { readonly status: 'skipped'; readonly reason: string }
  | { readonly status: 'failed'; readonly reason: string };

/**
 * Genera la hoja de seguimiento de un trato recién creado, si procede.
 *
 * Tres reglas que hacen esto seguro de llamar en cualquier sitio:
 *
 * 1. **Nunca lanza.** Un trato creado sin hoja es un estado válido y previsto:
 *    el digest lo clasifica como `missing_sheet`, que es exactamente la señal
 *    de "hay que darle una hoja". Un fallo de Drive no puede tumbar la creación
 *    del trato, que es el dato importante y ya está guardado.
 *
 * 2. **Idempotente.** Si el trato ya tiene `trackingSheetUrl`, no hace nada.
 *    Sin esta guarda, aprobar dos veces un borrador o reintentar una llamada
 *    dejaría hojas huérfanas en Drive que nadie asocia a ningún trato.
 *
 * 3. **No-op sin configuración.** En local las credenciales no están puestas;
 *    la ausencia se trata como "no toca", no como error.
 */
export async function ensureDealTrackingSheet(campaignId: number): Promise<EnsureDealSheetOutcome> {
  try {
    const [row] = await db
      .select({
        trackingSheetUrl: campaigns.trackingSheetUrl,
        brandName: crmBrands.name,
        talentName: talents.name,
      })
      .from(campaigns)
      .innerJoin(crmBrands, eq(campaigns.brandId, crmBrands.id))
      .innerJoin(talents, eq(campaigns.talentId, talents.id))
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!row) return { status: 'skipped', reason: 'trato no encontrado' };
    if (row.trackingSheetUrl) return { status: 'already_had_sheet' };

    const sheet = await createDealTrackingSheet(row.brandName, row.talentName);
    if (!sheet.ok) {
      if (sheet.reason === 'missing-config') {
        return { status: 'skipped', reason: sheet.detail };
      }
      // 'no-access' es lo que se verá hasta que la plantilla y la carpeta estén
      // compartidas con la cuenta de servicio.
      console.error(`[deal-sheet] no se pudo crear la hoja del trato ${campaignId}: ${sheet.reason}`);
      return { status: 'failed', reason: sheet.detail };
    }

    await attachAutomatedDealSheet(campaignId, sheet.url);
    return { status: 'created', url: sheet.url, name: sheet.name };
  } catch (err) {
    // Cualquier imprevisto se traga aquí a propósito: el trato ya existe.
    console.error(`[deal-sheet] error inesperado generando la hoja del trato ${campaignId}`);
    return { status: 'failed', reason: err instanceof Error ? err.message : 'error desconocido' };
  }
}
