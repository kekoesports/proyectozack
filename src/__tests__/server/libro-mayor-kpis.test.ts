/**
 * Tests de los KPIs contables derivados del fixture sintético.
 */

import { calculateKpis } from '@/features/libro-mayor/normalizer/kpis';
import { loadSampleLedger } from '@/features/libro-mayor/__fixtures__/load-sample';

describe('calculateKpis — fixture sintético', () => {
  const report = loadSampleLedger();
  const kpis = calculateKpis(report);

  it('ingresos = 10.000 € (solo 705 con haber 10.000)', () => {
    expect(kpis.ingresos).toBeCloseTo(10000, 2);
  });

  it('gastos = 9.500 € (629 con 3.500 + 640 con 6.000)', () => {
    expect(kpis.gastos).toBeCloseTo(9500, 2);
  });

  it('resultado contable = 500 €', () => {
    expect(kpis.resultadoContable).toBeCloseTo(500, 2);
  });

  it('caja total = 645 € (banco 145 + caja 500)', () => {
    expect(kpis.cajaTotal).toBeCloseTo(645, 2);
  });

  it('clientes pendientes 430 = 9.500 € (Cliente A 8.000 + Cliente B 1.500)', () => {
    expect(kpis.clientesPendientes).toBeCloseTo(9500, 2);
  });

  it('proveedores pendientes 410 = 3.630 € (Proveedor X)', () => {
    expect(kpis.proveedoresPendientes).toBeCloseTo(3630, 2);
  });

  it('nóminas pendientes 465 = 3.000 € (junio no pagada)', () => {
    expect(kpis.nominasPendientes).toBeCloseTo(3000, 2);
  });

  it('partidas 555 = 250 € en 2 movimientos', () => {
    expect(kpis.partidas555Saldo).toBeCloseTo(250, 2);
    expect(kpis.partidas555Count).toBe(2);
  });
});
