'server-only';

/**
 * FV — la economía de un talento contra la base.
 *
 * Toda la decisión de qué se puede enseñar vive en `talentEconomics.shared.ts`.
 */

import { and, eq, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { campaigns, invoices, issuedInvoices, talents } from '@/db/schema';
import { NOT_ISSUED_MIRROR } from './revenue';
import { totalEurSql, withholdingEurSql } from './money';
import {
  calcularMargen,
  ESTADOS_CERRADOS,
  type CoberturaFacturas,
  type EconomicaTalento,
} from './talentEconomics.shared';

export * from './talentEconomics.shared';

/**
 * Qué dinero ha movido este talento.
 *
 * Cinco consultas cortas sobre índices que ya existen (`campaigns_talent_idx`,
 * `invoices` por `talent_id`). Ninguna escribe.
 *
 * @cache none
 * @visibility admin (talentos:read)
 */
export async function getEconomicaTalento(talentId: number): Promise<EconomicaTalento> {
  const noAnulada = ne(invoices.status, 'anulada');

  // El ingreso de una campaña vive en la factura emitida, no en `invoices`:
  // ahí solo queda su espejo interno, que FV.1 filtra por no ser un ingreso
  // nuevo. Mirar una sola de las dos tablas daba cero a talentos que sí habían
  // facturado — ERUBY tenía 2.775 € y salía a nada.
  const emitidasEur = sql`COALESCE(${issuedInvoices.eurEquivalent}, ${issuedInvoices.totalAmount})`;

  const [pagos, misCampanas, ingresoRows, costeRows, campanasFacturadas, emitidasRows] =
    await Promise.all([
    // 1. Lo pagado y lo retenido, en euros.
    db
      .select({
        pagado: sql<string>`COALESCE(SUM(${totalEurSql}), 0)::text`,
        retenido: sql<string>`COALESCE(SUM(${withholdingEurSql}), 0)::text`,
        n: sql<number>`COUNT(*)::int`,
        ultimo: sql<string | null>`MAX(${invoices.issueDate})::text`,
      })
      .from(invoices)
      .where(and(eq(invoices.kind, 'expense'), noAnulada, eq(invoices.talentId, talentId))),

    // 2. Sus campañas con el presupuesto pactado.
    //
    // Si tienen factura se resuelve aparte (consulta 5) en vez de con un
    // EXISTS correlacionado: la subconsulta devolvía `false` para todas porque
    // la referencia a la campaña no correlacionaba con la fila de fuera, y el
    // fallo era silencioso — cero facturas es una respuesta plausible.
    db
      .select({
        id: campaigns.id,
        status: campaigns.status,
        amountBrand: campaigns.amountBrand,
        amountTalent: campaigns.amountTalent,
      })
      .from(campaigns)
      .where(eq(campaigns.talentId, talentId)),

    // 3. Ingreso facturado de sus campañas.
    //
    // Con el filtro de espejo de FV.1: marcar como cobrada una factura emitida
    // crea una fila interna que no es un ingreso nuevo, y sin filtrarla el
    // talento contaría dos veces el mismo dinero.
    db
      .select({ total: sql<string>`COALESCE(SUM(${totalEurSql}), 0)::text` })
      .from(invoices)
      .innerJoin(campaigns, eq(campaigns.id, invoices.campaignId))
      .where(and(eq(campaigns.talentId, talentId), eq(invoices.kind, 'income'), noAnulada, NOT_ISSUED_MIRROR)),

    // 4. Coste facturado de sus campañas — el que se puede comparar contra el
    //    ingreso. No es lo mismo que lo pagado al talento: aquí entra también
    //    la producción, y quedan fuera los pagos sin campaña enlazada.
    db
      .select({ total: sql<string>`COALESCE(SUM(${totalEurSql}), 0)::text` })
      .from(invoices)
      .innerJoin(campaigns, eq(campaigns.id, invoices.campaignId))
      .where(and(eq(campaigns.talentId, talentId), eq(invoices.kind, 'expense'), noAnulada)),

    // 5. Qué campañas suyas tienen al menos una factura.
    db
      .selectDistinct({ campaignId: invoices.campaignId })
      .from(invoices)
      .innerJoin(campaigns, eq(campaigns.id, invoices.campaignId))
      .where(and(eq(campaigns.talentId, talentId), noAnulada)),

    // 6. Las facturas emitidas de sus campañas: el ingreso de verdad.
    db
      .select({
        campaignId: issuedInvoices.relatedDealId,
        total: sql<string>`COALESCE(SUM(${emitidasEur}), 0)::text`,
      })
      .from(issuedInvoices)
      .innerJoin(campaigns, eq(campaigns.id, issuedInvoices.relatedDealId))
      .where(and(eq(campaigns.talentId, talentId), ne(issuedInvoices.status, 'anulada')))
      .groupBy(issuedInvoices.relatedDealId),
  ]);

  const conFacturaIds = new Set(
    [
      ...campanasFacturadas.map((c) => c.campaignId),
      ...emitidasRows.map((e) => e.campaignId),
    ].filter((id): id is number => id !== null),
  );

  const ingresoEmitido = emitidasRows.reduce((acc, e) => acc + Number(e.total), 0);

  const porEstado = new Map<string, number>();
  let presupuestoMarca = 0;
  let presupuestoTalento = 0;
  let conFactura = 0;
  let cerradasSinFactura = 0;

  for (const c of misCampanas) {
    porEstado.set(c.status, (porEstado.get(c.status) ?? 0) + 1);
    presupuestoMarca += Number(c.amountBrand ?? 0);
    presupuestoTalento += Number(c.amountTalent ?? 0);
    if (conFacturaIds.has(c.id)) conFactura += 1;
    else if ((ESTADOS_CERRADOS as readonly string[]).includes(c.status)) cerradasSinFactura += 1;
  }

  const cobertura: CoberturaFacturas = {
    conFactura,
    total: misCampanas.length,
    cerradasSinFactura,
  };

  const p = pagos[0];
  return {
    talentId,
    pagado: Math.round(Number(p?.pagado ?? 0) * 100) / 100,
    retenido: Math.round(Number(p?.retenido ?? 0) * 100) / 100,
    pagos: p?.n ?? 0,
    ultimoPago: p?.ultimo ?? null,
    presupuesto: {
      marca: Math.round(presupuestoMarca * 100) / 100,
      talento: Math.round(presupuestoTalento * 100) / 100,
    },
    deals: {
      total: misCampanas.length,
      porEstado: [...porEstado].map(([estado, n]) => ({ estado, n })),
    },
    cobertura,
    margen: calcularMargen({
      ingresoFacturado: Number(ingresoRows[0]?.total ?? 0) + ingresoEmitido,
      costeFacturado: Number(costeRows[0]?.total ?? 0),
      cobertura,
    }),
  };
}

export type TalentoRanking = {
  readonly id: number;
  readonly nombre: string;
  readonly pagado: number;
  readonly retenido: number;
  readonly deals: number;
};

/**
 * Los talentos que más han cobrado, para la vista de conjunto.
 *
 * Ordena por lo pagado de verdad, no por presupuesto: es la única de las dos
 * cifras que corresponde a dinero que salió.
 *
 * @cache none
 * @visibility admin (facturacion:read)
 */
export async function listTalentosPorImporte(limite = 20): Promise<readonly TalentoRanking[]> {
  const rows = await db
    .select({
      id: talents.id,
      nombre: talents.name,
      pagado: sql<string>`COALESCE(SUM(${totalEurSql}), 0)::text`,
      retenido: sql<string>`COALESCE(SUM(${withholdingEurSql}), 0)::text`,
    })
    .from(talents)
    .innerJoin(
      invoices,
      and(eq(invoices.talentId, talents.id), eq(invoices.kind, 'expense'), ne(invoices.status, 'anulada')),
    )
    .groupBy(talents.id, talents.name)
    .orderBy(sql`SUM(${totalEurSql}) DESC`)
    .limit(limite);

  if (rows.length === 0) return [];

  const dealsRows = await db
    .select({ talentId: campaigns.talentId, n: sql<number>`COUNT(*)::int` })
    .from(campaigns)
    .where(and(isNotNull(campaigns.talentId), inArray(campaigns.talentId, rows.map((r) => r.id))))
    .groupBy(campaigns.talentId);

  const deals = new Map(dealsRows.map((d) => [d.talentId, d.n]));

  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    pagado: Math.round(Number(r.pagado) * 100) / 100,
    retenido: Math.round(Number(r.retenido) * 100) / 100,
    deals: deals.get(r.id) ?? 0,
  }));
}
