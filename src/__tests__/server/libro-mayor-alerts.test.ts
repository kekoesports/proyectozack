/**
 * Tests de las alertas contables — thresholds aprobados en PR 1.
 */

import { calculateAlerts, ALERT_THRESHOLDS } from '@/features/libro-mayor/normalizer/alerts';
import { calculateKpis } from '@/features/libro-mayor/normalizer/kpis';
import { loadSampleLedger } from '@/features/libro-mayor/__fixtures__/load-sample';
import type { LedgerReport } from '@/features/libro-mayor/parser/types';

function withReport(fn: (r: LedgerReport) => LedgerReport) {
  const original = loadSampleLedger();
  return fn(structuredClone(original));
}

describe('calculateAlerts — thresholds aprobados', () => {
  it('threshold cliente concentración = 30%', () => {
    expect(ALERT_THRESHOLDS.clienteConcentracionPct).toBe(30);
  });
  it('threshold proveedor min = 2.000 €', () => {
    expect(ALERT_THRESHOLDS.proveedorMinAmount).toBe(2000);
  });
  it('threshold caja vs clientes = 20%', () => {
    expect(ALERT_THRESHOLDS.cajaVsClientesPct).toBe(20);
  });
});

describe('calculateAlerts — con fixture sintético (dispara múltiples alertas)', () => {
  const report = loadSampleLedger();
  const kpis = calculateKpis(report);
  const alerts = calculateAlerts(report, kpis);

  it('dispara alerta crítica PARTIDAS_555_PENDING', () => {
    const found = alerts.find((a) => a.code === 'PARTIDAS_555_PENDING');
    expect(found).toBeDefined();
    expect(found?.level).toBe('critical');
  });

  it('dispara alerta warning CLIENTE_CONCENTRATED (Cliente A > 30% del pendiente)', () => {
    const found = alerts.find((a) => a.code === 'CLIENTE_CONCENTRATED');
    expect(found).toBeDefined();
    expect(found?.level).toBe('warning');
    expect(found?.title).toContain('43000001');
  });

  it('dispara alerta warning PROVEEDOR_HIGH_PENDING (Proveedor X con 3.630 €)', () => {
    const found = alerts.find((a) => a.code === 'PROVEEDOR_HIGH_PENDING');
    expect(found).toBeDefined();
    expect(found?.level).toBe('warning');
    expect(found?.title).toContain('41000001');
  });

  it('dispara alerta warning NOMINAS_PENDING (465 con 3.000 €)', () => {
    const found = alerts.find((a) => a.code === 'NOMINAS_PENDING');
    expect(found).toBeDefined();
    expect(found?.level).toBe('warning');
  });

  it('dispara alerta warning CASH_LOW_VS_RECEIVABLES (caja 645 € < 20% de 9.500)', () => {
    const found = alerts.find((a) => a.code === 'CASH_LOW_VS_RECEIVABLES');
    expect(found).toBeDefined();
    expect(found?.level).toBe('warning');
  });

  it('NO dispara DOUBLE_ENTRY_MISMATCH (el fixture cuadra)', () => {
    const found = alerts.find((a) => a.code === 'DOUBLE_ENTRY_MISMATCH');
    expect(found).toBeUndefined();
  });
});

describe('calculateAlerts — reporte modificado', () => {
  it('DOUBLE_ENTRY_MISMATCH aparece si desbalanceamos un asiento', () => {
    const brokenReport = withReport((r) => {
      const acc = r.accounts.find((a) => a.code === '43000001');
      if (acc?.movements[0]) acc.movements[0].debe = 5001; // +1 desbalance
      return r;
    });
    const kpis = calculateKpis(brokenReport);
    const alerts = calculateAlerts(brokenReport, kpis);
    const found = alerts.find((a) => a.code === 'DOUBLE_ENTRY_MISMATCH');
    expect(found).toBeDefined();
    expect(found?.level).toBe('error');
  });

  it('CLIENTE_CONCENTRATED NO aparece cuando ningún cliente supera el 30%', () => {
    // 4 clientes con 25% cada uno — nadie supera el threshold 30%.
    const diversifiedReport = withReport((r) => {
      // Modificar los 2 clientes existentes para tener saldo bajo.
      const a = r.accounts.find((x) => x.code === '43000001');
      const b = r.accounts.find((x) => x.code === '43000002');
      if (a) { a.totalDebe = 2500; a.totalHaber = 0; a.totalSaldo = 2500; a.movements = []; }
      if (b) { b.totalDebe = 2500; b.totalHaber = 0; b.totalSaldo = 2500; b.movements = []; }
      // Añadir 2 clientes nuevos.
      r.accounts.push(
        { code: '43000003', name: 'TEST_CLIENTE_C', saldoAnterior: 0, totalDebe: 2500, totalHaber: 0, totalSaldo: 2500, movements: [] },
        { code: '43000004', name: 'TEST_CLIENTE_D', saldoAnterior: 0, totalDebe: 2500, totalHaber: 0, totalSaldo: 2500, movements: [] },
      );
      return r;
    });
    const kpis = calculateKpis(diversifiedReport);
    const alerts = calculateAlerts(diversifiedReport, kpis);
    const found = alerts.find((a) => a.code === 'CLIENTE_CONCENTRATED');
    expect(found).toBeUndefined();
  });
});
