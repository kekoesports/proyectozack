'server-only';

/**
 * FV.5 — acceso a datos del asistente de gastos.
 * Toda la lógica de validación vive en `expenseAssistant.shared.ts`.
 */

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import { sugerirTipoFiscal, type PerfilFiscal } from './expenseAssistant.shared';

export * from './expenseAssistant.shared';

const PERFIL_COLUMNS = {
  talentId: talents.id,
  nombre: talents.name,
  taxType: talents.taxType,
  iaeActividad: talents.iaeActividad,
  iaeEpigrafe: talents.iaeEpigrafe,
  nif: talents.nif,
  creatorCountry: talents.creatorCountry,
} as const;

/**
 * Perfil fiscal de un talento. `null` si no existe la ficha.
 *
 * Devuelve los campos tal cual están, con sus `null` incluidos: el validador
 * distingue "no retiene" de "no sabemos si retiene", y rellenar huecos aquí con
 * valores por defecto rompería esa distinción.
 *
 * @cache none
 * @visibility admin (facturacion:read)
 */
export async function getPerfilFiscal(talentId: number): Promise<PerfilFiscal | null> {
  const [row] = await db
    .select(PERFIL_COLUMNS)
    .from(talents)
    .where(eq(talents.id, talentId))
    .limit(1);

  return row ?? null;
}

/**
 * Los perfiles de varios talentos de una vez, indexados por id.
 *
 * Para pantallas que validan una lista de gastos: una consulta en lugar de una
 * por fila.
 *
 * @cache none
 * @visibility admin (facturacion:read)
 */
export async function getPerfilesFiscales(
  talentIds: readonly number[],
): Promise<ReadonlyMap<number, PerfilFiscal>> {
  if (talentIds.length === 0) return new Map();

  const rows = await db
    .select(PERFIL_COLUMNS)
    .from(talents)
    .where(inArray(talents.id, [...talentIds]));

  return new Map(rows.map((r) => [r.talentId, r]));
}

/**
 * Talentos con pagos registrados a los que les falta el perfil fiscal.
 *
 * Es la lista de trabajo para dejar de ver avisos de "perfil desconocido": cada
 * ficha que se rellena silencia los avisos de todas sus facturas, pasadas y
 * futuras.
 *
 * @cache none
 * @visibility admin (facturacion:read)
 */
export async function listTalentosSinPerfilFiscal(): Promise<readonly TalentoSinPerfil[]> {
  const rows = await db
    .select({
      id: talents.id,
      nombre: talents.name,
      taxType: talents.taxType,
      iaeActividad: talents.iaeActividad,
      creatorCountry: talents.creatorCountry,
    })
    .from(talents);

  return rows
    .map((r) => {
      const huecos: string[] = [];
      if (r.taxType === null) huecos.push('tipo fiscal');
      // La sección del IAE solo hace falta para autónomos españoles: es el único
      // caso donde cambia si la factura lleva retención.
      const esAutonomoEs = r.taxType === 'autonomo_es' || r.taxType === 'autonomo_es_nuevo';
      if (esAutonomoEs && r.iaeActividad === null) huecos.push('sección del IAE');
      return {
        id: r.id,
        nombre: r.nombre,
        falta: huecos.join(' y '),
        pais: r.creatorCountry,
        sugerencia: sugerirTipoFiscal(r.creatorCountry),
      };
    })
    .filter((r) => r.falta !== '');
}

export type TalentoSinPerfil = {
  readonly id: number;
  readonly nombre: string;
  /** Qué campos le faltan, en lenguaje de la ficha. */
  readonly falta: string;
  readonly pais: string | null;
  /** Punto de partida derivado del país. NO es la respuesta: hay que confirmarla. */
  readonly sugerencia: string | null;
};
