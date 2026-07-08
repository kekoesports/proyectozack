import { z } from 'zod';
import { AUDIT_ACTIONS, AUDIT_OUTCOMES } from '@/db/schema/giveawayAuditEvents';

/**
 * Schema para los searchParams de `/admin/giveaways/auditoria`.
 *
 * Regla 4 (typescript.md): TODOS los inputs externos incluidos URL
 * searchParams DEBEN pasar por Zod. Los helpers ad-hoc (parseDate, etc)
 * se sustituyen por este schema.
 *
 * Todas las claves son opcionales — la vista tolera "sin filtros".
 * `safeParse` devuelve valores normalizados; valores inválidos se
 * omiten (no lanzan) para no bloquear la vista si un cursor viejo o un
 * bookmark queda obsoleto.
 */

const AuditActionEnum = z.enum(AUDIT_ACTIONS);
const AuditOutcomeEnum = z.enum(AUDIT_OUTCOMES);

const DateStringToDate = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: 'invalid date' })
  .transform((v) => new Date(v));

const CountryIso2 = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2}$/));

const BoundedString = (max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1).max(max));

export const AuditSearchParamsSchema = z.object({
  from: DateStringToDate.optional(),
  to: DateStringToDate.optional(),
  action: AuditActionEnum.optional(),
  outcome: AuditOutcomeEnum.optional(),
  userId: BoundedString(200).optional(),
  refType: BoundedString(40).optional(),
  country: CountryIso2.optional(),
  cursor: BoundedString(500).optional(),
});

export type AuditSearchParams = z.infer<typeof AuditSearchParamsSchema>;

/**
 * Parse cursor base64url → `{ createdAt, id }`. Devuelve `null` si
 * el cursor es inválido — la vista simplemente ignora el cursor y
 * arranca desde la página 1.
 */
const CursorPayloadSchema = z.object({
  createdAt: DateStringToDate,
  id: z.number().int().positive(),
});

export function decodeCursor(raw: string | undefined): { createdAt: string; id: number } | null {
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const json = JSON.parse(decoded) as unknown;
    const parsed = CursorPayloadSchema.safeParse(json);
    if (!parsed.success) return null;
    return { createdAt: parsed.data.createdAt.toISOString(), id: parsed.data.id };
  } catch {
    return null;
  }
}

/**
 * Sanea searchParams "en bruto" a valores tipados. Nunca lanza — si algún
 * campo es inválido, se prueba campo por campo y se retiene solo lo válido.
 */
export function parseAuditSearch(raw: Readonly<Record<string, string | undefined>>): AuditSearchParams {
  const parsed = AuditSearchParamsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  // Fallback tolerante: probar cada campo por separado con el schema completo
  // (pasando solo esa clave). Descarta claves inválidas silenciosamente.
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'string') continue;
    const single = AuditSearchParamsSchema.safeParse({ [k]: v });
    if (single.success && k in single.data) {
      clean[k] = v;
    }
  }
  return AuditSearchParamsSchema.parse(clean);
}
