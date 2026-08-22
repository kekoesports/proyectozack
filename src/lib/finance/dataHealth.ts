'server-only';

/**
 * FV.7 — los chequeos de salud del dato contra la base.
 *
 * Toda la clasificación vive en `dataHealth.shared.ts`. Aquí solo se consulta.
 */

import { and, eq, gte, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { campaigns, invoicePayments, invoices, issuedInvoices } from '@/db/schema';
import { totalEurSql } from './money';
import { ESTADOS_CERRADOS } from './talentEconomics.shared';
import {
  ordenarChequeos,
  resumirSalud,
  type Chequeo,
  type FilaChequeo,
  type ResumenSalud,
} from './dataHealth.shared';

export * from './dataHealth.shared';

export type SaludDelDato = {
  readonly period: { readonly from: string; readonly to: string };
  readonly chequeos: readonly Chequeo[];
  readonly resumen: ResumenSalud;
};

/** Cuántas filas se listan por chequeo. El resto se cuenta. */
const MAX_FILAS = 12;

function suma(filas: readonly FilaChequeo[]): number {
  return Math.round(filas.reduce((s, f) => s + (f.importe ?? 0), 0) * 100) / 100;
}

/**
 * Salud del dato financiero del período.
 *
 * Los chequeos se lanzan en paralelo — son consultas cortas sobre índices
 * existentes — y ninguno escribe nada.
 *
 * @cache none
 * @visibility admin (facturacion:read)
 */
export async function getSaludDelDato(period: {
  readonly from: string;
  readonly to: string;
}): Promise<SaludDelDato> {
  const enPeriodo = and(
    gte(invoices.issueDate, period.from),
    lte(invoices.issueDate, period.to),
    ne(invoices.status, 'anulada'),
  );

  const [
    espejosSinFk,
    sinClasificar,
    liquidadasSinPago,
    pagosSinFicha,
    divisaSinContravalor,
    sinMetodoPago,
    campanasSinCoste,
    cerradasSinFactura,
    hayPagosAplicados,
  ] = await Promise.all([
    // 1. Espejos detectados por texto que nunca recibieron su FK.
    db
      .select({ id: invoices.id, issueDate: invoices.issueDate, concept: invoices.concept, importe: totalEurSql })
      .from(invoices)
      .where(
        and(
          isNull(invoices.mirrorOfIssuedInvoiceId),
          or(
            sql`${invoices.notes} LIKE 'Espejo%'`,
            sql`${invoices.concept} LIKE 'Cobro factura%'`,
          ),
        ),
      ),

    // 2. Gastos sin grupo o sin subtipo: no entran en ningún desglose.
    db
      .select({ id: invoices.id, issueDate: invoices.issueDate, counterpartyName: invoices.counterpartyName, concept: invoices.concept, importe: totalEurSql })
      .from(invoices)
      .where(and(eq(invoices.kind, 'expense'), enPeriodo, or(isNull(invoices.expenseGroup), isNull(invoices.expenseSubtype)))),

    // 3. Marcadas como liquidadas sin ningún pago conciliado detrás.
    db
      .select({ id: invoices.id, kind: invoices.kind, issueDate: invoices.issueDate, status: invoices.status, counterpartyName: invoices.counterpartyName, importe: totalEurSql })
      .from(invoices)
      .leftJoin(invoicePayments, eq(invoicePayments.invoiceId, invoices.id))
      .where(and(inArray(invoices.status, ['cobrada', 'pagada']), enPeriodo, isNull(invoicePayments.id))),

    // 4. Pagos a talento que no apuntan a ninguna ficha.
    db
      .select({ id: invoices.id, issueDate: invoices.issueDate, counterpartyName: invoices.counterpartyName, concept: invoices.concept, importe: totalEurSql })
      .from(invoices)
      .where(and(eq(invoices.kind, 'expense'), enPeriodo, eq(invoices.expenseSubtype, 'pago_talento'), isNull(invoices.talentId))),

    // 5. Divisa sin tipo de cambio fijado: su importe no se puede sumar.
    db
      .select({ id: invoices.id, issueDate: invoices.issueDate, currency: invoices.currency, counterpartyName: invoices.counterpartyName, importe: invoices.totalAmount })
      .from(invoices)
      .where(and(ne(invoices.currency, 'EUR'), enPeriodo, or(isNull(invoices.fxRate), isNull(invoices.eurEquivalent)))),

    // 6. Sin método de pago: rompe la trazabilidad de los cobros en cripto.
    db
      .select({ id: invoices.id, issueDate: invoices.issueDate, counterpartyName: invoices.counterpartyName, concept: invoices.concept, importe: totalEurSql })
      .from(invoices)
      .where(and(enPeriodo, isNull(invoices.paymentMethod))),

    // 7. Campañas con ingreso y sin un solo gasto asociado.
    db
      .select({ id: campaigns.id, name: campaigns.name, importe: sql<string>`SUM(${totalEurSql})` })
      .from(campaigns)
      .innerJoin(invoices, and(eq(invoices.campaignId, campaigns.id), eq(invoices.kind, 'income'), ne(invoices.status, 'anulada')))
      .where(sql`NOT EXISTS (SELECT 1 FROM ${invoices} e WHERE e.campaign_id = ${campaigns.id} AND e.kind = 'expense' AND e.status <> 'anulada')`)
      .groupBy(campaigns.id, campaigns.name),

    // 8. Campañas ya cerradas sin una sola factura enlazada.
    //
    // Es distinto de "sin coste": aquí no hay NADA, ni ingreso ni gasto, en una
    // campaña que el CRM da por pagada o completada. Y es lo que impide
    // calcular la rentabilidad de cada talento — sin factura enlazada no hay
    // con qué comparar lo que se le pagó.
    //
    // Deliberadamente NO incluye las campañas en negociación o aprobadas: que
    // un trato del pipeline no tenga facturas es lo normal, y meterlas aquí
    // convertiría el chequeo en 79 filas que nadie mira.
    db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        importe: campaigns.amountBrand,
      })
      .from(campaigns)
      .where(
        and(
          inArray(campaigns.status, [...ESTADOS_CERRADOS]),
          sql`NOT EXISTS (
            SELECT 1 FROM ${invoices} f WHERE f.campaign_id = ${campaigns.id} AND f.status <> 'anulada'
          )`,
          sql`NOT EXISTS (
            SELECT 1 FROM ${issuedInvoices} e WHERE e.related_deal_id = ${campaigns.id} AND e.status <> 'anulada'
          )`,
        ),
      ),

    // Sonda: ¿existe algún pago conciliado? Decide si el chequeo 3 es evaluable.
    db.select({ id: invoicePayments.id }).from(invoicePayments).limit(1),
  ]);

  const fila = (r: {
    id: number;
    issueDate?: string;
    counterpartyName?: string | null;
    concept?: string | null;
    currency?: string;
    status?: string;
    kind?: string;
    importe: unknown;
  }): FilaChequeo => ({
    id: r.id,
    etiqueta: r.counterpartyName ?? r.concept ?? `#${r.id}`,
    detalle: [r.issueDate, r.kind, r.status, r.currency].filter(Boolean).join(' · ') || null,
    importe: r.importe == null ? null : Number(r.importe),
  });

  const recortar = (filas: readonly FilaChequeo[]): readonly FilaChequeo[] =>
    [...filas].sort((a, b) => (b.importe ?? 0) - (a.importe ?? 0)).slice(0, MAX_FILAS);

  const construir = (
    base: Omit<Chequeo, 'estado' | 'filas' | 'totalFilas' | 'importe'>,
    filas: readonly FilaChequeo[],
  ): Chequeo => ({
    ...base,
    estado: filas.length === 0 ? 'limpio' : 'con-hallazgos',
    filas: recortar(filas),
    totalFilas: filas.length,
    importe: filas.length === 0 ? null : suma(filas),
  });

  const chequeos: Chequeo[] = [
    construir(
      {
        id: 'espejos-sin-fk',
        titulo: 'Espejos de cobro sin su factura de origen',
        explicacion:
          'Marcar una factura emitida como cobrada crea una fila interna "espejo" que no es un ingreso nuevo. Si no guarda la FK a su origen, solo se la reconoce por el texto — y cualquier cambio de redacción la convierte en ingreso duplicado.',
        severidad: 'cuentas',
        queHacer: 'Rellenar `mirror_of_issued_invoice_id` con la factura emitida que le corresponde.',
      },
      espejosSinFk.map(fila),
    ),

    construir(
      {
        id: 'gastos-sin-clasificar',
        titulo: 'Gastos sin grupo o sin subtipo',
        explicacion:
          'Un gasto sin clasificar no aparece en ningún desglose: ni en costes directos, ni en operativos, ni en el reparto por proveedor. Suma al total y desaparece del detalle.',
        severidad: 'higiene',
        queHacer: 'Clasificarlos desde /admin/finanzas/gastos — el bloque "sin clasificar" propone categoría.',
      },
      sinClasificar.map(fila),
    ),

    construir(
      {
        id: 'pagos-sin-ficha',
        titulo: 'Pagos a talento sin ficha vinculada',
        explicacion:
          'Sin `talent_id` no hay perfil fiscal contra el que contrastar la factura: no se puede decir si la retención que lleva es la que le toca, ni cuánto se le ha pagado a esa persona en el año.',
        severidad: 'cuentas',
        queHacer: 'Vincular cada factura a su talento, o crear la ficha si no existe.',
      },
      pagosSinFicha.map(fila),
    ),

    construir(
      {
        id: 'divisa-sin-contravalor',
        titulo: 'Facturas en divisa sin tipo de cambio fijado',
        explicacion:
          'Sin `fx_rate` ni `eur_equivalent`, el importe se suma como si fueran euros. Mil dólares cuentan como mil euros en todos los totales.',
        severidad: 'cuentas',
        queHacer: 'Correr `scripts/backfill-fx-rates.ts`, que fija el tipo del BCE de la fecha de cada operación.',
      },
      divisaSinContravalor.map(fila),
    ),

    construir(
      {
        id: 'sin-metodo-pago',
        titulo: 'Movimientos sin método de pago anotado',
        explicacion:
          'No mueve ninguna cifra, pero sin él no se puede rastrear qué salió por banco y qué por wallet. Los pagos a creadores de LATAM van en cripto, y son justo los que menos rastro dejan.',
        severidad: 'higiene',
        queHacer: 'Anotar el método al registrar el movimiento; en los antiguos, al revisarlos.',
      },
      sinMetodoPago.map(fila),
    ),

    construir(
      {
        id: 'cerradas-sin-factura',
        titulo: 'Campañas cerradas sin ninguna factura',
        explicacion:
          'Una campaña marcada como pagada o completada debería tener su dinero registrado — en un sentido o en el otro. Si no tiene ninguna factura, ese trato no existe en la contabilidad, y la rentabilidad del talento que lo hizo no se puede calcular. No cuenta el pipeline: una campaña en negociación sin facturas es lo normal.',
        severidad: 'cuentas',
        queHacer: 'Enlazar la factura emitida a la campaña (campo "trato" de la factura), o registrar la que falte.',
      },
      cerradasSinFactura.map((r) => ({
        id: r.id,
        etiqueta: r.name,
        detalle: r.status,
        importe: r.importe === null ? null : Number(r.importe),
      })),
    ),

    construir(
      {
        id: 'campanas-sin-coste',
        titulo: 'Campañas con ingreso y sin ningún coste',
        explicacion:
          'Su margen sale al 100%, que casi nunca es verdad. La causa habitual y conocida: los pagos a creadores de LATAM se hacen en cripto y no se facturan, así que el coste existe pero no está registrado como factura.',
        severidad: 'esperado',
      },
      campanasSinCoste.map((r) => ({
        id: r.id,
        etiqueta: r.name,
        detalle: null,
        importe: Number(r.importe ?? 0),
      })),
    ),
  ];

  // El chequeo de liquidadas solo significa algo si existe conciliación. Sin un
  // solo pago aplicado, las 116 filas que devuelve no son 116 problemas: es que
  // nadie ha importado un extracto todavía.
  const hayConciliacion = hayPagosAplicados.length > 0;
  const liquidadasBase = {
    id: 'liquidadas-sin-pago',
    titulo: 'Marcadas como cobradas o pagadas sin pago conciliado',
    explicacion:
      'Una factura liquidada debería tener detrás un movimiento bancario aplicado. Si no lo tiene, el estado se puso a mano y la caja no lo respalda.',
    severidad: 'cuentas' as const,
    queHacer: 'Conciliar el extracto y aplicar el cobro o el pago desde /admin/facturacion/bancos/conciliacion.',
  };

  chequeos.push(
    hayConciliacion
      ? construir(liquidadasBase, liquidadasSinPago.map(fila))
      : {
          ...liquidadasBase,
          estado: 'no-evaluable',
          filas: [],
          totalFilas: 0,
          importe: null,
          porQueNoEvaluable:
            'No hay ni un pago conciliado en el sistema, así que este chequeo señalaría todas las facturas liquidadas del período. Empieza a significar algo en cuanto se importe el primer extracto bancario.',
        },
  );

  const ordenados = ordenarChequeos(chequeos);
  return { period, chequeos: ordenados, resumen: resumirSalud(ordenados) };
}
