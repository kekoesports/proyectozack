/**
 * FV.1 — la definición de ingreso, con datos sintéticos.
 *
 * Cubre el mecanismo que provocaba V1/V2/V3: el espejo emitida→interna. El
 * escenario base es el de la auditoría (una emitida de 12.100 € marcada cobrada
 * genera un movimiento interno idéntico): facturado real 12.100 €, no 24.200 €.
 *
 * La verificación contra las cifras reales de 2026 vive en
 * `revenue-real-2026.test.ts`, que no puede llevar sus datos al repo.
 */

import {
  aggregateRevenue,
  countsAsRevenue,
  isIssuedMirrorRow,
  isMirrorByFkOrPrefix,
  quarterOf,
  toEurAmount,
  type RevenueRow,
} from '@/lib/finance/revenue.shared';
import {
  ISSUED_MIRROR_CONCEPT_PREFIX,
  ISSUED_MIRROR_NOTES_PREFIX,
} from '@/lib/utils/invoice-status';

const USD_POR_EUR = 1.1576;
const FX = { USD: USD_POR_EUR } as const;

function row(overrides: Partial<RevenueRow> = {}): RevenueRow {
  return {
    source: 'internal',
    id: 1,
    issueDate: '2026-02-10',
    status: 'cobrada',
    currency: 'EUR',
    totalAmount: 1000,
    netAmount: 1000,
    eurEquivalent: null,
    counterparty: 'Cliente A',
    mirrorOfIssuedInvoiceId: null,
    notes: null,
    concept: 'Campaña de febrero',
    ...overrides,
  };
}

describe('countsAsRevenue — qué fila es facturación', () => {
  it('cuenta una emitida y un movimiento interno propio', () => {
    expect(countsAsRevenue(row({ source: 'issued', id: 10 }))).toBe(true);
    expect(countsAsRevenue(row())).toBe(true);
  });

  it('excluye el espejo identificado por FK', () => {
    const mirror = row({ id: 2, mirrorOfIssuedInvoiceId: 10 });
    expect(isIssuedMirrorRow(mirror)).toBe(true);
    expect(countsAsRevenue(mirror)).toBe(false);
  });

  it('excluye el espejo histórico por prefijo de notas o de concepto', () => {
    const porNotas = row({ id: 3, notes: `${ISSUED_MIRROR_NOTES_PREFIX} ES-2026-0012` });
    const porConcepto = row({ id: 4, concept: `${ISSUED_MIRROR_CONCEPT_PREFIX}ES-2026-0012` });
    expect(countsAsRevenue(porNotas)).toBe(false);
    expect(countsAsRevenue(porConcepto)).toBe(false);
  });

  it('no confunde una emitida con un espejo aunque su texto lo parezca', () => {
    // El espejo solo existe en el lado interno; la emitida es el original.
    const emitida = row({
      source: 'issued',
      id: 5,
      concept: `${ISSUED_MIRROR_CONCEPT_PREFIX}ES-2026-0012`,
    });
    expect(isIssuedMirrorRow(emitida)).toBe(false);
    expect(countsAsRevenue(emitida)).toBe(true);
  });

  it('excluye anuladas y borradores', () => {
    expect(countsAsRevenue(row({ status: 'anulada' }))).toBe(false);
    expect(countsAsRevenue(row({ status: 'borrador' }))).toBe(false);
  });

  it('isMirrorByFkOrPrefix da la misma respuesta sobre campos sueltos', () => {
    expect(isMirrorByFkOrPrefix(10, null, 'Campaña')).toBe(true);
    expect(isMirrorByFkOrPrefix(null, `${ISSUED_MIRROR_NOTES_PREFIX} X`, 'Campaña')).toBe(true);
    expect(isMirrorByFkOrPrefix(null, null, 'Campaña')).toBe(false);
    // Con `notes` a NULL la fila sigue contando: la versión SQL anterior la
    // perdía porque `NOT (NULL OR false)` es NULL, no true.
    expect(isMirrorByFkOrPrefix(null, null, null)).toBe(false);
  });
});

describe('aggregateRevenue — el escenario del espejo', () => {
  it('una venta emitida y cobrada suma una vez, no dos', () => {
    const emitida = row({ source: 'issued', id: 10, totalAmount: 12100, netAmount: 10000 });
    const espejo = row({ id: 11, totalAmount: 12100, mirrorOfIssuedInvoiceId: 10 });

    const totals = aggregateRevenue([emitida, espejo]);

    expect(totals.eur).toBe(12100);
    expect(totals.count).toBe(1);
  });

  it('sin la FK, el prefijo histórico sigue evitando el doble conteo', () => {
    const emitida = row({ source: 'issued', id: 10, totalAmount: 12100 });
    const espejo = row({
      id: 11,
      totalAmount: 12100,
      notes: `${ISSUED_MIRROR_NOTES_PREFIX} ES-2026-0012`,
    });

    expect(aggregateRevenue([emitida, espejo]).eur).toBe(12100);
  });
});

describe('aggregateRevenue — divisa', () => {
  it('convierte USD al tipo indicado', () => {
    const totals = aggregateRevenue([row({ currency: 'USD', totalAmount: 800 })], { fx: FX });
    expect(totals.eur).toBeCloseTo(800 / USD_POR_EUR, 2);
    expect(totals.eur).toBeCloseTo(691.09, 2);
    expect(totals.unconverted).toBe(0);
    expect(totals.nominalByCurrency).toEqual({ USD: 800 });
  });

  it('el contravalor fijado en la fila manda sobre el tipo del periodo', () => {
    const totals = aggregateRevenue(
      [row({ currency: 'USD', totalAmount: 800, eurEquivalent: 700 })],
      { fx: FX },
    );
    expect(totals.eur).toBe(700);
  });

  it('sin tipo de cambio suma 1:1 pero lo deja contado', () => {
    const totals = aggregateRevenue([row({ currency: 'USD', totalAmount: 800 })]);
    expect(totals.eur).toBe(800);
    expect(totals.unconverted).toBe(1);
  });

  it('con missingFx=exclude la fila no entra', () => {
    const totals = aggregateRevenue([row({ currency: 'USD', totalAmount: 800 })], {
      missingFx: 'exclude',
    });
    expect(totals.eur).toBe(0);
    expect(totals.count).toBe(0);
  });

  it('toEurAmount deja el importe en EUR intacto', () => {
    expect(toEurAmount(500, 'EUR', FX, null)).toEqual({ eur: 500, converted: true });
  });
});

describe('aggregateRevenue — desgloses', () => {
  it('reparte por trimestre en las fronteras exactas', () => {
    expect(quarterOf('2026-03-31')).toBe('T1');
    expect(quarterOf('2026-04-01')).toBe('T2');
    expect(quarterOf('2026-09-30')).toBe('T3');
    expect(quarterOf('2026-10-01')).toBe('T4');

    const totals = aggregateRevenue([
      row({ id: 1, issueDate: '2026-03-31', totalAmount: 100 }),
      row({ id: 2, issueDate: '2026-04-01', totalAmount: 200 }),
    ]);
    expect(totals.byQuarter).toEqual({ T1: 100, T2: 200, T3: 0, T4: 0 });
    expect(totals.byMonth).toEqual({ '2026-03': 100, '2026-04': 200 });
  });

  it('agrupa por contraparte, ordena por importe y conserva el nominal por divisa', () => {
    const totals = aggregateRevenue(
      [
        row({ id: 1, counterparty: 'Cliente A', totalAmount: 100 }),
        row({ id: 2, counterparty: 'Cliente B', totalAmount: 500 }),
        row({ id: 3, counterparty: 'Cliente B', currency: 'USD', totalAmount: 1000 }),
      ],
      { fx: FX },
    );

    expect(totals.byCounterparty[0]?.key).toBe('Cliente B');
    expect(totals.byCounterparty[0]?.count).toBe(2);
    expect(totals.byCounterparty[0]?.nominalByCurrency).toEqual({ EUR: 500, USD: 1000 });
    expect(totals.byCounterparty[1]?.key).toBe('Cliente A');
  });

  it('con basis=net agrega la base imponible', () => {
    const totals = aggregateRevenue([row({ totalAmount: 1210, netAmount: 1000 })], {
      basis: 'net',
    });
    expect(totals.eur).toBe(1000);
  });

  it('con basis=net cae a totalAmount si no hay base guardada', () => {
    const totals = aggregateRevenue([row({ totalAmount: 1210, netAmount: null })], {
      basis: 'net',
    });
    expect(totals.eur).toBe(1210);
  });

  it('no acumula error de redondeo línea a línea', () => {
    // Tres importes que redondeados por separado darían 100,02 en vez de 100,00.
    const rows = [
      row({ id: 1, totalAmount: 33.334 }),
      row({ id: 2, totalAmount: 33.333 }),
      row({ id: 3, totalAmount: 33.333 }),
    ];
    expect(aggregateRevenue(rows).eur).toBe(100);
  });
});
