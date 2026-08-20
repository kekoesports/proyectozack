/**
 * FV.1 — contraste contra el libro real 2026 (el que ven Pablo y su socio).
 *
 * El fixture NO está en el repo, y no debe estarlo: lleva clientes con su NIF,
 * proveedores, nóminas con IRPF y la facturación completa del año, y este
 * repositorio ha sido público. Vive en `.scratch/finanzas/fixtures/`
 * (gitignored) y llega con el paquete de finanzas.
 *
 * Sin fixture el bloque se salta, así que CI no depende de datos que no puede
 * ver. La lógica que estos números ejercitan está cubierta por `revenue.test.ts`
 * con datos sintéticos; lo que se comprueba aquí es que reproduce la realidad.
 *
 * Para ejecutarlo: copia el paquete en `.scratch/finanzas/` y lanza
 *   npx jest src/lib/finance --selectProjects server
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { aggregateRevenue, type RevenueRow } from '@/lib/finance/revenue.shared';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const FIXTURES = path.join(ROOT, '.scratch', 'finanzas', 'fixtures');
const LIBRO = path.join(FIXTURES, 'fixture-finanzas-2026.json');
const ESPERADO = path.join(FIXTURES, 'esperado-2026.json');

/** Tolerancia del paquete: ±0,06 € por redondeo por línea sobre el año. */
const TOL = 0.06;

const LineaSchema = z.object({
  fecha: z.string(),
  tipo: z.string(),
  contraparte: z.string(),
  divisa: z.string(),
  base: z.number(),
  total: z.number(),
});

const LibroSchema = z.object({
  fx_usd_por_eur: z.number().positive(),
  lineas: z.array(LineaSchema),
});

const EsperadoSchema = z.object({
  ingresos: z.object({
    ytd_eur: z.number(),
    eur_nominal: z.number(),
    usd_nominal: z.number(),
    num_facturas: z.number(),
    por_trimestre_eur: z.object({ T1: z.number(), T2: z.number(), T3: z.number() }),
    por_cliente_eur_nominal: z.record(z.string(), z.number()),
    por_cliente_usd_nominal: z.record(z.string(), z.number()),
  }),
});

const disponible = fs.existsSync(LIBRO) && fs.existsSync(ESPERADO);

// `describe.skip` no vale aquí: jest evalúa el cuerpo igualmente para registrar
// los tests, y sin fixture la lectura del fichero reventaría antes de saltarlos.
if (!disponible) {
  // Deja rastro en la salida, para que un "todo verde" no se confunda con
  // "las cifras reales están comprobadas".
  describe('FV.1 — ingresos reales 2026', () => {
    it.skip(`omitido: falta ${path.relative(ROOT, LIBRO)} (fixture fuera del repo)`, () => undefined);
  });
} else {
describe('FV.1 — ingresos reales 2026 desde el libro de la gestoría', () => {
  const libro = LibroSchema.parse(JSON.parse(fs.readFileSync(LIBRO, 'utf-8')));
  const esperado = EsperadoSchema.parse(JSON.parse(fs.readFileSync(ESPERADO, 'utf-8')));

  const rows: readonly RevenueRow[] = libro.lineas
    .filter((l) => l.tipo === 'INGRESO')
    .map((l, i) => ({
      source: 'issued' as const,
      id: i + 1,
      issueDate: l.fecha,
      status: 'cobrada',
      currency: l.divisa,
      totalAmount: l.total,
      netAmount: l.base,
      eurEquivalent: null,
      counterparty: l.contraparte,
      mirrorOfIssuedInvoiceId: null,
      notes: null,
      concept: null,
    }));

  // Hasta FV.4 (fx por fecha de operación) se inyecta el tipo fijo del fixture.
  const totals = aggregateRevenue(rows, { fx: { USD: libro.fx_usd_por_eur } });

  it('el libro trae las 20 facturas del año', () => {
    expect(rows).toHaveLength(esperado.ingresos.num_facturas);
    expect(totals.count).toBe(esperado.ingresos.num_facturas);
  });

  it('factura 50.357,65 € YTD, no los 18.219 € que enseña hoy el CRM', () => {
    expect(totals.eur).toBeCloseTo(esperado.ingresos.ytd_eur, 1);
    expect(Math.abs(totals.eur - esperado.ingresos.ytd_eur)).toBeLessThanOrEqual(TOL);
  });

  it('reparte por trimestre: 10.745,00 / 21.393,93 / 18.218,72', () => {
    for (const q of ['T1', 'T2', 'T3'] as const) {
      expect(Math.abs(totals.byQuarter[q] - esperado.ingresos.por_trimestre_eur[q])).toBeLessThanOrEqual(TOL);
    }
    // Agosto es el último mes con datos: T4 aún no existe.
    expect(totals.byQuarter.T4).toBe(0);
  });

  it('separa el nominal por divisa (47.994,99 € + 2.735 $)', () => {
    expect(totals.nominalByCurrency.EUR).toBeCloseTo(esperado.ingresos.eur_nominal, 2);
    expect(totals.nominalByCurrency.USD).toBeCloseTo(esperado.ingresos.usd_nominal, 2);
    expect(totals.unconverted).toBe(0);
  });

  it('el desglose por cliente cuadra con el esperado, cliente a cliente', () => {
    const porCliente = new Map(totals.byCounterparty.map((c) => [c.key, c.nominalByCurrency]));
    for (const [cliente, eurEsperado] of Object.entries(esperado.ingresos.por_cliente_eur_nominal)) {
      const nominal = porCliente.get(cliente) ?? {};
      expect({ cliente, eur: nominal.EUR ?? 0 }).toEqual({ cliente, eur: eurEsperado });
    }
    for (const [cliente, usdEsperado] of Object.entries(esperado.ingresos.por_cliente_usd_nominal)) {
      const nominal = porCliente.get(cliente) ?? {};
      expect({ cliente, usd: nominal.USD ?? 0 }).toEqual({ cliente, usd: usdEsperado });
    }
  });

  it('la suma de los trimestres es el total del año', () => {
    const suma = totals.byQuarter.T1 + totals.byQuarter.T2 + totals.byQuarter.T3 + totals.byQuarter.T4;
    expect(Math.abs(suma - totals.eur)).toBeLessThanOrEqual(TOL);
  });
});
}
