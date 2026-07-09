import type { LedgerReport } from '@/features/libro-mayor/parser/types';
import { accountsByPrefix } from './aggregate';
import type { LedgerKpis } from './kpis';

/**
 * Alertas contables. Solo señalización — nunca modifica nada.
 *
 * Thresholds aprobados en la definición PR 1. Si en PR 2 se hacen
 * configurables por env/DB, cambiar solo este archivo.
 */

export type AlertLevel = 'error' | 'critical' | 'warning' | 'info';

export type Alert = {
  readonly level: AlertLevel;
  readonly code: string;
  readonly title: string;
  readonly description: string;
};

const THRESHOLDS = {
  clienteConcentracionPct: 30,
  proveedorMinAmount: 2000,
  cajaVsClientesPct: 20,
  doubleEntryTolerance: 0.02,
} as const;

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function calculateAlerts(report: LedgerReport, kpis: LedgerKpis): readonly Alert[] {
  const alerts: Alert[] = [];

  // ── error · Debe/Haber no cuadra ──
  let totalDebe = 0;
  let totalHaber = 0;
  for (const a of report.accounts) {
    for (const m of a.movements) {
      totalDebe += m.debe;
      totalHaber += m.haber;
    }
  }
  const delta = totalDebe - totalHaber;
  if (Math.abs(delta) >= THRESHOLDS.doubleEntryTolerance) {
    alerts.push({
      level: 'error',
      code: 'DOUBLE_ENTRY_MISMATCH',
      title: 'La partida doble no cuadra',
      description: `Debe (${EUR.format(totalDebe)}) ≠ Haber (${EUR.format(totalHaber)}). Delta ${EUR.format(delta)}. Revisar fuente.`,
    });
  }

  // ── critical · 555 con saldo > 0 ──
  if (kpis.partidas555Count > 0 && Math.abs(kpis.partidas555Saldo) > 0.02) {
    alerts.push({
      level: 'critical',
      code: 'PARTIDAS_555_PENDING',
      title: 'Partidas pendientes de aplicación (555)',
      description: `${kpis.partidas555Count} movimiento${kpis.partidas555Count === 1 ? '' : 's'} sin clasificar por ${EUR.format(kpis.partidas555Saldo)}. Priorizar con gestoría.`,
    });
  }

  // ── warning · Cliente 430 concentrado > 30% del total ──
  const clientes430 = accountsByPrefix(report, '430');
  const total430Deudor = clientes430.reduce((s, a) => s + Math.max(0, a.totalSaldo), 0);
  if (total430Deudor > 0) {
    for (const a of clientes430) {
      if (a.totalSaldo <= 0) continue;
      const pct = (a.totalSaldo / total430Deudor) * 100;
      if (pct > THRESHOLDS.clienteConcentracionPct) {
        alerts.push({
          level: 'warning',
          code: 'CLIENTE_CONCENTRATED',
          title: `Cliente ${a.code} concentra el ${pct.toFixed(1)}% del pendiente de cobro`,
          description: `${a.name} · ${EUR.format(a.totalSaldo)} pendiente. Riesgo de concentración de cartera.`,
        });
      }
    }
  }

  // ── warning · Proveedor 410 > 2.000 € pendiente ──
  for (const a of accountsByPrefix(report, '410')) {
    if (a.totalSaldo >= 0) continue;
    const pendiente = -a.totalSaldo;
    if (pendiente > THRESHOLDS.proveedorMinAmount) {
      alerts.push({
        level: 'warning',
        code: 'PROVEEDOR_HIGH_PENDING',
        title: `Proveedor ${a.code} con ${EUR.format(pendiente)} pendiente`,
        description: `${a.name}. Verificar fecha de vencimiento y planificar cashflow.`,
      });
    }
  }

  // ── warning · 465 remuneraciones pendientes > 0 ──
  if (kpis.nominasPendientes > 0.02) {
    alerts.push({
      level: 'warning',
      code: 'NOMINAS_PENDING',
      title: 'Remuneraciones pendientes de pago (465)',
      description: `${EUR.format(kpis.nominasPendientes)} en nóminas devengadas no pagadas. Verificar si es timing normal o atraso.`,
    });
  }

  // ── warning · Caja < 20% de clientes pendientes ──
  if (kpis.clientesPendientes > 0) {
    const ratio = kpis.cajaTotal / kpis.clientesPendientes;
    if (ratio < THRESHOLDS.cajaVsClientesPct / 100) {
      alerts.push({
        level: 'warning',
        code: 'CASH_LOW_VS_RECEIVABLES',
        title: 'Caja baja frente a cuentas por cobrar',
        description: `Caja ${EUR.format(kpis.cajaTotal)} vs pendiente cobro ${EUR.format(kpis.clientesPendientes)} (${(ratio * 100).toFixed(1)}%). Working capital ajustado.`,
      });
    }
  }

  return alerts;
}

export const ALERT_THRESHOLDS = THRESHOLDS;

/**
 * Suma total del pendiente 430 — expuesto para tests y para el resumen.
 * Duplicado con `kpis.clientesPendientes` pero conveniente para tablas.
 */
export function totalClientes430Pendiente(report: LedgerReport): number {
  return accountsByPrefix(report, '430')
    .reduce((s, a) => s + Math.max(0, a.totalSaldo), 0);
}
