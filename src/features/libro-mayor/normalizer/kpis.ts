import type { LedgerReport } from '@/features/libro-mayor/parser/types';
import { accountsByPrefix, sumTotals } from './aggregate';

/**
 * KPIs contables derivados del LedgerReport.
 *
 * Todos los importes son en euros. `resultadoContable` es una aproximación
 * (ingresos - gastos operativos) — NO es el resultado del ejercicio oficial
 * (ese lo calcula la gestoría con amortizaciones, ajustes fiscales, etc.).
 *
 * `partidas555Count` = número de movimientos en cuentas 555 (para alerta).
 */
export type LedgerKpis = {
  readonly ingresos: number;
  readonly gastos: number;
  readonly resultadoContable: number;
  readonly cajaTotal: number;
  readonly clientesPendientes: number;
  readonly proveedoresPendientes: number;
  readonly nominasPendientes: number;
  readonly partidas555Saldo: number;
  readonly partidas555Count: number;
};

const INGRESO_PREFIXES = ['705', '755', '769', '778'] as const;
const GASTO_PREFIXES = ['623', '629', '640', '662', '678'] as const;
const CAJA_PREFIXES = ['570', '572'] as const;

export function calculateKpis(report: LedgerReport): LedgerKpis {
  // Ingresos: saldo acreedor de las cuentas 7xx principales.
  let ingresos = 0;
  for (const p of INGRESO_PREFIXES) {
    const totals = sumTotals(accountsByPrefix(report, p));
    // Ingresos son cuentas acreedoras — saldo negativo (haber > debe) = ingreso real.
    ingresos += Math.max(0, totals.totalHaber - totals.totalDebe);
  }

  // Gastos: saldo deudor de las cuentas 6xx principales.
  let gastos = 0;
  for (const p of GASTO_PREFIXES) {
    const totals = sumTotals(accountsByPrefix(report, p));
    // Gastos son cuentas deudoras — saldo positivo (debe > haber) = gasto real.
    gastos += Math.max(0, totals.totalDebe - totals.totalHaber);
  }

  const resultadoContable = ingresos - gastos;

  // Caja total: saldo real de bancos + caja (incluye arrastres de saldos anteriores).
  let cajaTotal = 0;
  for (const p of CAJA_PREFIXES) {
    for (const a of accountsByPrefix(report, p)) {
      cajaTotal += a.totalSaldo;
    }
  }

  // Clientes 430 pendientes: cuentas con saldo deudor real (incluye arrastre).
  let clientesPendientes = 0;
  for (const a of accountsByPrefix(report, '430')) {
    if (a.totalSaldo > 0) clientesPendientes += a.totalSaldo;
  }

  // Proveedores 410 pendientes: cuentas con saldo acreedor (mostrado positivo).
  let proveedoresPendientes = 0;
  for (const a of accountsByPrefix(report, '410')) {
    if (a.totalSaldo < 0) proveedoresPendientes += -a.totalSaldo;
  }

  // Nóminas 465 pendientes: saldo acreedor (mostrado positivo).
  let nominasPendientes = 0;
  for (const a of accountsByPrefix(report, '465')) {
    if (a.totalSaldo < 0) nominasPendientes += -a.totalSaldo;
  }

  // Partidas 555 pendientes.
  const cuentas555 = accountsByPrefix(report, '555');
  let partidas555Saldo = 0;
  for (const a of cuentas555) partidas555Saldo += a.totalSaldo;
  const partidas555Count = sumTotals(cuentas555).count;

  return {
    ingresos,
    gastos,
    resultadoContable,
    cajaTotal,
    clientesPendientes,
    proveedoresPendientes,
    nominasPendientes,
    partidas555Saldo,
    partidas555Count,
  };
}
