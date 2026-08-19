import { z } from 'zod';

/**
 * Entradas de las server actions de revisión de borradores en el CRM.
 *
 * Distinto de `AutomationDealDraftReview` (src/lib/schemas/automationDeal.ts), que
 * valida el body del endpoint que consume n8n: allí el revisor viaja en el payload
 * porque quien actúa es un bot de Discord. Aquí el actor es la sesión del CRM, así
 * que sólo se acepta el id.
 */

export const reviewDraftSchema = z.object({
  id: z.number().int().positive(),
});

export type ReviewDraftInput = z.infer<typeof reviewDraftSchema>;
