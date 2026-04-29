import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invoiceParserTemplates } from '@/db/schema';
import type { ParsedRegions } from '@/lib/parsers/pdfHeuristics';

export type ParserTemplate = {
  readonly id: number;
  readonly issuerNif: string;
  readonly issuerName: string | null;
  readonly regions: ParsedRegions;
  readonly hints: Record<string, string> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

function rowToTemplate(row: {
  readonly id: number;
  readonly issuerNif: string;
  readonly issuerName: string | null;
  readonly regions: unknown;
  readonly hints: unknown;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}): ParserTemplate {
  return {
    id: row.id,
    issuerNif: row.issuerNif,
    issuerName: row.issuerName,
    regions: (row.regions ?? {}) as ParsedRegions,
    hints: (row.hints ?? null) as Record<string, string> | null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Devuelve la plantilla de parser PDF (regiones + hints) por NIF del emisor.
 * El NIF se normaliza a mayúsculas antes de la búsqueda.
 *
 * @cache none
 * @visibility admin
 * @returns `ParserTemplate` o `null` si no hay plantilla para ese NIF.
 */
export async function getParserTemplateByNif(nif: string): Promise<ParserTemplate | null> {
  const [row] = await db
    .select()
    .from(invoiceParserTemplates)
    .where(eq(invoiceParserTemplates.issuerNif, nif.toUpperCase()))
    .limit(1);
  return row ? rowToTemplate(row) : null;
}

type UpsertArgs = {
  readonly issuerNif: string;
  readonly issuerName?: string | null;
  readonly regions: ParsedRegions;
  readonly hints?: Record<string, string> | null;
};

/**
 * Upsert de plantilla de parser PDF por NIF (clave única). Actualiza nombre, regiones,
 * hints y `updatedAt`.
 *
 * @cache none
 * @visibility admin
 * @returns la `ParserTemplate` resultante.
 */
export async function upsertParserTemplate(args: UpsertArgs): Promise<ParserTemplate> {
  const [row] = await db
    .insert(invoiceParserTemplates)
    .values({
      issuerNif: args.issuerNif.toUpperCase(),
      issuerName: args.issuerName ?? null,
      regions: args.regions,
      hints: args.hints ?? null,
    })
    .onConflictDoUpdate({
      target: invoiceParserTemplates.issuerNif,
      set: {
        issuerName: args.issuerName ?? null,
        regions: args.regions,
        hints: args.hints ?? null,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  if (!row) throw new Error('Failed to upsert parser template');
  return rowToTemplate(row);
}
