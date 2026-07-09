import { z } from 'zod';

/**
 * Tipos y esquemas Zod del Libro Mayor.
 *
 * Fuente de verdad para toda la feature. El parser produce `LedgerReport`,
 * el resto de módulos (mapping, normalize, componentes) consume estos tipos.
 *
 * Todo pasa por Zod al llegar del parser XLSX — es un boundary externo aunque
 * el archivo esté local (regla 4 del TypeScript hard rules).
 */

export const LedgerMovementSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO date required'),
  concept: z.string(),
  document: z.string(),
  debe: z.number().nonnegative(),
  haber: z.number().nonnegative(),
  saldo: z.number(),
  contrapartida: z.string(),
});
export type LedgerMovement = z.infer<typeof LedgerMovementSchema>;

export const LedgerAccountSchema = z.object({
  code: z.string().min(1),
  name: z.string(),
  saldoAnterior: z.number(),
  totalDebe: z.number().nonnegative(),
  totalHaber: z.number().nonnegative(),
  totalSaldo: z.number(),
  movements: z.array(LedgerMovementSchema),
});
export type LedgerAccount = z.infer<typeof LedgerAccountSchema>;

export const LedgerMetadataSchema = z.object({
  empresa: z.string(),
  periodoFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodoTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type LedgerMetadata = z.infer<typeof LedgerMetadataSchema>;

export const LedgerReportSchema = z.object({
  metadata: LedgerMetadataSchema,
  accounts: z.array(LedgerAccountSchema),
});
export type LedgerReport = z.infer<typeof LedgerReportSchema>;
