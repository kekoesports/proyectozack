'use client';

import { useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import {
  generateHistoricalRows,
  generateRecurringTemplates,
  summarize,
  calcTotal,
  DEFAULT_HISTORICAL_CONFIG,
} from '@/lib/finance/setup2026/generator';
import { previewSetup2026Action, applySetup2026Action } from '@/app/admin/(dashboard)/finanzas/setup-2026/actions';
import { EXPENSE_SUBTYPES_OPERATIONAL, EXPENSE_SUBTYPE_LABELS } from '@/lib/schemas/invoice';
import type { HistoricalExpenseRow, RecurringExpenseRow } from '@/lib/finance/setup2026/types';
import type { ExpenseSubtypeValue } from '@/lib/schemas/invoice';

type Props = {
  readonly existingTxIds: readonly string[];
};

type Step = 'config' | 'preview' | 'confirm' | 'result';

type ConfigState = {
  nomina_pablo_net: string;
  nomina_pablo_irpf: string;
  nomina_pablo_name: string;
  nomina_pablo_months: string;
  nomina_alfonso_net: string;
  nomina_alfonso_irpf: string;
  nomina_alfonso_name: string;
  nomina_alfonso_months: string;
  autonomo_pablo_amount: string;
  autonomo_pablo_name: string;
  autonomo_pablo_months: string;
  autonomo_alfonso_amount: string;
  autonomo_alfonso_name: string;
  autonomo_alfonso_months: string;
  gestoria_amount: string;
  gestoria_vat: string;
  gestoria_withholding: string;
  gestoria_name: string;
  gestoria_months: string;
  seguro_amount: string;
  seguro_name: string;
  seguro_months: string;
  create_historical: boolean;
  create_recurring: boolean;
  recurring_start: string;
};

const MONTHS_JAN_MAR = '2026-01,2026-02,2026-03';
const MONTHS_JAN_JUN = '2026-01,2026-02,2026-03,2026-04,2026-05,2026-06';

const DEFAULT_CONFIG: ConfigState = {
  nomina_pablo_net: '1000.00',
  nomina_pablo_irpf: '22',
  nomina_pablo_name: 'Pablo García',
  nomina_pablo_months: MONTHS_JAN_MAR,
  nomina_alfonso_net: '1000.00',
  nomina_alfonso_irpf: '6',
  nomina_alfonso_name: 'Alfonso',
  nomina_alfonso_months: MONTHS_JAN_MAR,
  autonomo_pablo_amount: '',
  autonomo_pablo_name: 'RETA Pablo García',
  autonomo_pablo_months: MONTHS_JAN_JUN,
  autonomo_alfonso_amount: '',
  autonomo_alfonso_name: 'RETA Alfonso',
  autonomo_alfonso_months: MONTHS_JAN_JUN,
  gestoria_amount: '180.00',
  gestoria_vat: '21.00',
  gestoria_withholding: '0.00',
  gestoria_name: 'Gestoría',
  gestoria_months: MONTHS_JAN_JUN,
  seguro_amount: '54.00',
  seguro_name: 'Aseguradora',
  seguro_months: MONTHS_JAN_JUN,
  create_historical: true,
  create_recurring: true,
  recurring_start: '2026-07-01',
};

function parseMonths(csv: string): string[] {
  return csv.split(',').map((m) => m.trim()).filter(Boolean);
}

function configToHistoricalConfig(c: ConfigState) {
  return {
    nomina: {
      pablo: { netSalary: c.nomina_pablo_net, irpfRate: c.nomina_pablo_irpf, months: parseMonths(c.nomina_pablo_months), counterpartyName: c.nomina_pablo_name },
      alfonso: { netSalary: c.nomina_alfonso_net, irpfRate: c.nomina_alfonso_irpf, months: parseMonths(c.nomina_alfonso_months), counterpartyName: c.nomina_alfonso_name },
    },
    autonomo: {
      pablo: { amount: c.autonomo_pablo_amount, months: parseMonths(c.autonomo_pablo_months), counterpartyName: c.autonomo_pablo_name, expenseSubtype: 'cuota_autonomo' as const },
      alfonso: { amount: c.autonomo_alfonso_amount, months: parseMonths(c.autonomo_alfonso_months), counterpartyName: c.autonomo_alfonso_name, expenseSubtype: 'cuota_autonomo' as const },
    },
    gestoria: { amount: c.gestoria_amount, vatPct: c.gestoria_vat, withholdingPct: c.gestoria_withholding, months: parseMonths(c.gestoria_months), counterpartyName: c.gestoria_name },
    seguro: { amount: c.seguro_amount, months: parseMonths(c.seguro_months), counterpartyName: c.seguro_name },
  } satisfies typeof DEFAULT_HISTORICAL_CONFIG;
}

function fmt(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] text-sp-admin-muted uppercase tracking-wider font-semibold">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'text-xs border border-sp-admin-border rounded px-2 py-1 bg-sp-admin-bg text-sp-admin-fg w-full';

// ── Step 1 — Config ───────────────────────────────────────────────────────────

function Step1Config({ config, onChange, onNext }: {
  config: ConfigState;
  onChange: (patch: Partial<ConfigState>) => void;
  onNext: () => void;
}) {
  const set = (k: keyof ConfigState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="space-y-6">
      {/* Opciones globales */}
      <div className="border border-sp-admin-border rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-sp-admin-fg">Opciones</h2>
        <div className="flex gap-6 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-sp-admin-fg cursor-pointer">
            <input type="checkbox" checked={config.create_historical} onChange={set('create_historical')} className="rounded" />
            Crear facturas históricas (ene–jun 2026)
          </label>
          <label className="flex items-center gap-2 text-xs text-sp-admin-fg cursor-pointer">
            <input type="checkbox" checked={config.create_recurring} onChange={set('create_recurring')} className="rounded" />
            Crear templates recurrentes (gestoría + seguro)
          </label>
        </div>
        {config.create_recurring && (
          <Field label="Inicio templates recurrentes">
            <input type="date" value={config.recurring_start} onChange={set('recurring_start')} className={INPUT_CLS} />
          </Field>
        )}
      </div>

      {/* Nóminas */}
      <div className="border border-sp-admin-border rounded-xl p-4 space-y-4">
        <h2 className="text-xs font-semibold text-sp-admin-fg">Nóminas (nomina_socio)</h2>
        {(['pablo', 'alfonso'] as const).map((p) => (
          <div key={p} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label={`Nombre ${p}`}>
              <input value={config[`nomina_${p}_name`]} onChange={set(`nomina_${p}_name`)} className={INPUT_CLS} />
            </Field>
            <Field label="Neto mensual (€)">
              <input type="number" step="0.01" value={config[`nomina_${p}_net`]} onChange={set(`nomina_${p}_net`)} className={INPUT_CLS} />
            </Field>
            <Field label="IRPF (%)">
              <input type="number" step="0.01" value={config[`nomina_${p}_irpf`]} onChange={set(`nomina_${p}_irpf`)} className={INPUT_CLS} />
            </Field>
            <Field label="Meses (YYYY-MM separados por coma)">
              <input value={config[`nomina_${p}_months`]} onChange={set(`nomina_${p}_months`)} className={INPUT_CLS} placeholder="2026-01,2026-02,2026-03" />
            </Field>
          </div>
        ))}
      </div>

      {/* Cuotas autónomo */}
      <div className="border border-sp-admin-border rounded-xl p-4 space-y-4">
        <h2 className="text-xs font-semibold text-sp-admin-fg">Cuotas autónomo societario RETA (cuota_autonomo)</h2>
        <p className="text-[10px] text-sp-admin-muted">VAT 0%, retención 0%. Pago directo a Seguridad Social.</p>
        {(['pablo', 'alfonso'] as const).map((p) => (
          <div key={p} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label={`Nombre ${p}`}>
              <input value={config[`autonomo_${p}_name`]} onChange={set(`autonomo_${p}_name`)} className={INPUT_CLS} />
            </Field>
            <Field label="Importe mensual (€) — dejar vacío si desconocido">
              <input type="number" step="0.01" value={config[`autonomo_${p}_amount`]} onChange={set(`autonomo_${p}_amount`)} className={INPUT_CLS} placeholder="ej. 294.00" />
            </Field>
            <Field label="Meses">
              <input value={config[`autonomo_${p}_months`]} onChange={set(`autonomo_${p}_months`)} className={INPUT_CLS} />
            </Field>
          </div>
        ))}
      </div>

      {/* Gestoría */}
      <div className="border border-sp-admin-border rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-sp-admin-fg">Gestoría (gestoria)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Nombre/proveedor">
            <input value={config.gestoria_name} onChange={set('gestoria_name')} className={INPUT_CLS} />
          </Field>
          <Field label="Importe neto (€)">
            <input type="number" step="0.01" value={config.gestoria_amount} onChange={set('gestoria_amount')} className={INPUT_CLS} />
          </Field>
          <Field label="IVA (%)">
            <input type="number" step="0.01" value={config.gestoria_vat} onChange={set('gestoria_vat')} className={INPUT_CLS} />
          </Field>
          <Field label="Retención (%)">
            <input type="number" step="0.01" value={config.gestoria_withholding} onChange={set('gestoria_withholding')} className={INPUT_CLS} />
          </Field>
          <Field label="Meses" >
            <input value={config.gestoria_months} onChange={set('gestoria_months')} className={`${INPUT_CLS} col-span-3`} />
          </Field>
        </div>
      </div>

      {/* Seguro médico */}
      <div className="border border-sp-admin-border rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-sp-admin-fg">Seguro médico (seguro_medico)</h2>
        <p className="text-[10px] text-sp-admin-muted">VAT 0%, retención 0%.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Aseguradora">
            <input value={config.seguro_name} onChange={set('seguro_name')} className={INPUT_CLS} />
          </Field>
          <Field label="Importe mensual (€)">
            <input type="number" step="0.01" value={config.seguro_amount} onChange={set('seguro_amount')} className={INPUT_CLS} />
          </Field>
          <Field label="Meses">
            <input value={config.seguro_months} onChange={set('seguro_months')} className={INPUT_CLS} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onNext} className="text-sm px-4 py-2 rounded-lg bg-sp-orange text-white font-semibold hover:bg-sp-orange/90 transition-colors">
          Generar preview →
        </button>
      </div>
    </div>
  );
}

// ── Step 2 — Preview ──────────────────────────────────────────────────────────

function Step2Preview({ rows, recurringRows, existingTxIds, onRowChange, onBack, onNext }: {
  rows: HistoricalExpenseRow[];
  recurringRows: RecurringExpenseRow[];
  existingTxIds: ReadonlySet<string>;
  onRowChange: (idx: number, patch: Partial<HistoricalExpenseRow>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const summary = summarize(rows);

  return (
    <div className="space-y-5">
      <p className="text-xs text-sp-admin-muted">
        Revisa y edita los gastos propuestos. Los marcados con <span className="text-amber-400 font-semibold">⚠ ya existe</span> se omitirán.
        Desmarca las filas que no quieras crear.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-sp-admin-border text-sp-admin-muted text-left">
              <th className="py-1.5 pr-2 w-6">✓</th>
              <th className="py-1.5 pr-3">Concepto</th>
              <th className="py-1.5 pr-2">Fecha</th>
              <th className="py-1.5 pr-2">Proveedor</th>
              <th className="py-1.5 pr-2">Neto €</th>
              <th className="py-1.5 pr-2">IVA%</th>
              <th className="py-1.5 pr-2">Ret%</th>
              <th className="py-1.5 pr-2">Total €</th>
              <th className="py-1.5 pr-2">Subtipo</th>
              <th className="py-1.5">Notas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isExisting = existingTxIds.has(row.txId);
              const rowCls = isExisting
                ? 'opacity-50 bg-sp-admin-hover/30'
                : row.include ? '' : 'opacity-40';
              return (
                <tr key={row.txId} className={`border-b border-sp-admin-border/50 ${rowCls}`}>
                  <td className="py-1 pr-2">
                    <input
                      type="checkbox"
                      checked={row.include && !isExisting}
                      disabled={isExisting}
                      onChange={(e) => onRowChange(idx, { include: e.target.checked })}
                      className="rounded"
                    />
                  </td>
                  <td className="py-1 pr-3">
                    {isExisting && <span className="text-amber-400 mr-1">⚠</span>}
                    <input
                      value={row.concept}
                      onChange={(e) => onRowChange(idx, { concept: e.target.value })}
                      disabled={isExisting}
                      className="bg-transparent border-b border-transparent hover:border-sp-admin-border focus:border-sp-orange outline-none w-48"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="date"
                      value={row.issueDate}
                      onChange={(e) => onRowChange(idx, { issueDate: e.target.value })}
                      disabled={isExisting}
                      className="bg-transparent border-b border-transparent hover:border-sp-admin-border focus:border-sp-orange outline-none w-28"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      value={row.counterpartyName}
                      onChange={(e) => onRowChange(idx, { counterpartyName: e.target.value })}
                      disabled={isExisting}
                      className="bg-transparent border-b border-transparent hover:border-sp-admin-border focus:border-sp-orange outline-none w-32"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.netAmount}
                      disabled={isExisting}
                      onChange={(e) => {
                        const net = Number(e.target.value);
                        const total = calcTotal(net, Number(row.vatPct), Number(row.withholdingPct));
                        onRowChange(idx, { netAmount: e.target.value, totalAmount: total });
                      }}
                      className="bg-transparent border-b border-transparent hover:border-sp-admin-border focus:border-sp-orange outline-none w-20 text-right"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.vatPct}
                      disabled={isExisting}
                      onChange={(e) => {
                        const total = calcTotal(Number(row.netAmount), Number(e.target.value), Number(row.withholdingPct));
                        onRowChange(idx, { vatPct: e.target.value, totalAmount: total });
                      }}
                      className="bg-transparent border-b border-transparent hover:border-sp-admin-border focus:border-sp-orange outline-none w-12 text-right"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.withholdingPct}
                      disabled={isExisting}
                      onChange={(e) => {
                        const total = calcTotal(Number(row.netAmount), Number(row.vatPct), Number(e.target.value));
                        onRowChange(idx, { withholdingPct: e.target.value, totalAmount: total });
                      }}
                      className="bg-transparent border-b border-transparent hover:border-sp-admin-border focus:border-sp-orange outline-none w-12 text-right"
                    />
                  </td>
                  <td className="py-1 pr-2 font-mono text-right">{fmt(Number(row.totalAmount))}</td>
                  <td className="py-1 pr-2">
                    <select
                      value={row.expenseSubtype}
                      disabled={isExisting}
                      onChange={(e) => onRowChange(idx, { expenseSubtype: e.target.value })}
                      className="bg-transparent border-b border-transparent hover:border-sp-admin-border focus:border-sp-orange outline-none text-xs"
                    >
                      {EXPENSE_SUBTYPES_OPERATIONAL.map((s) => (
                        <option key={s} value={s}>{EXPENSE_SUBTYPE_LABELS[s as ExpenseSubtypeValue] ?? s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1">
                    <input
                      value={row.notes}
                      onChange={(e) => onRowChange(idx, { notes: e.target.value })}
                      disabled={isExisting}
                      className="bg-transparent border-b border-transparent hover:border-sp-admin-border focus:border-sp-orange outline-none w-40"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recurring templates */}
      {recurringRows.length > 0 && (
        <div className="border border-sp-admin-border rounded-xl p-4 space-y-2">
          <h2 className="text-xs font-semibold text-sp-admin-fg">Templates recurrentes a crear</h2>
          {recurringRows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 text-xs text-sp-admin-muted">
              <span className="font-medium text-sp-admin-fg">{r.label}</span>
              <span>— {r.amount} € | IVA {r.vatPct}% | Ret {r.withholdingPct}%</span>
              <span>desde {r.startDate}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mini-resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
        {Object.entries(summary.totalBySubtype).map(([sub, total]) => (
          <div key={sub} className="border border-sp-admin-border rounded-lg p-3 space-y-1">
            <div className="text-sp-admin-muted">{EXPENSE_SUBTYPE_LABELS[sub as ExpenseSubtypeValue] ?? sub}</div>
            <div className="font-semibold text-sp-admin-fg">{fmt(total)} €</div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-sp-admin-muted">
        <span><span className="font-semibold text-sp-admin-fg">{summary.invoiceCount}</span> facturas seleccionadas</span>
        <span>Total caja: <span className="font-semibold text-sp-admin-fg">{fmt(summary.grandTotal)} €</span> | Impacto EBITDA: <span className="font-semibold text-sp-orange">{fmt(summary.ebitdaImpact)} €</span></span>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="text-xs px-3 py-1.5 border border-sp-admin-border rounded hover:bg-sp-admin-hover transition-colors">
          ← Volver a configuración
        </button>
        <button
          onClick={onNext}
          disabled={summary.invoiceCount === 0}
          className="text-sm px-4 py-2 rounded-lg bg-sp-orange text-white font-semibold hover:bg-sp-orange/90 disabled:opacity-50 transition-colors"
        >
          Revisar y confirmar →
        </button>
      </div>
    </div>
  );
}

// ── Step 3 — Confirm ──────────────────────────────────────────────────────────

function Step3Confirm({ rows, recurringRows, onBack, onApply, isPending, previewData }: {
  rows: HistoricalExpenseRow[];
  recurringRows: RecurringExpenseRow[];
  onBack: () => void;
  onApply: () => void;
  isPending: boolean;
  previewData: { existing: readonly string[]; toCreate: number; recurringToCreate: number } | null;
}) {
  const summary = summarize(rows);
  const included = rows.filter((r) => r.include);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 space-y-1">
        <p className="font-semibold">⚠ Esta operación insertará datos reales en la base de datos.</p>
        <p>Los registros ya existentes (mismo txId) serán ignorados automáticamente.</p>
      </div>

      {/* Resumen por subtipo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(summary.totalBySubtype).map(([sub, total]) => (
          <div key={sub} className="border border-sp-admin-border rounded-xl p-3 space-y-1">
            <div className="text-[10px] text-sp-admin-muted uppercase tracking-wider">{EXPENSE_SUBTYPE_LABELS[sub as ExpenseSubtypeValue] ?? sub}</div>
            <div className="text-base font-bold text-sp-admin-fg">{fmt(total)} €</div>
          </div>
        ))}
      </div>

      {/* Resumen por mes */}
      <div className="border border-sp-admin-border rounded-xl p-4">
        <h3 className="text-xs font-semibold text-sp-admin-fg mb-3">Total por mes</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Object.entries(summary.totalByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => (
            <div key={month} className="text-center">
              <div className="text-[10px] text-sp-admin-muted">{month.slice(5)}/{month.slice(0, 4)}</div>
              <div className="text-xs font-semibold text-sp-admin-fg">{fmt(total)} €</div>
            </div>
          ))}
        </div>
      </div>

      {/* Totales globales */}
      <div className="flex gap-6 text-sm">
        <div>
          <div className="text-sp-admin-muted text-xs">Facturas a crear</div>
          <div className="font-bold text-sp-admin-fg">{previewData?.toCreate ?? included.length}</div>
        </div>
        {recurringRows.filter(r => r.include).length > 0 && (
          <div>
            <div className="text-sp-admin-muted text-xs">Templates recurrentes</div>
            <div className="font-bold text-sp-admin-fg">{previewData?.recurringToCreate ?? recurringRows.filter(r => r.include).length}</div>
          </div>
        )}
        {(previewData?.existing.length ?? 0) > 0 && (
          <div>
            <div className="text-sp-admin-muted text-xs">Ya existentes (omitir)</div>
            <div className="font-bold text-amber-400">{previewData?.existing.length}</div>
          </div>
        )}
        <div>
          <div className="text-sp-admin-muted text-xs">Total caja</div>
          <div className="font-bold text-sp-admin-fg">{fmt(summary.grandTotal)} €</div>
        </div>
        <div>
          <div className="text-sp-admin-muted text-xs">Impacto EBITDA</div>
          <div className="font-bold text-sp-orange">{fmt(summary.ebitdaImpact)} €</div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} disabled={isPending} className="text-xs px-3 py-1.5 border border-sp-admin-border rounded hover:bg-sp-admin-hover transition-colors disabled:opacity-50">
          ← Volver al preview
        </button>
        <button
          onClick={onApply}
          disabled={isPending || (previewData?.toCreate === 0 && (previewData?.recurringToCreate ?? 0) === 0)}
          className="text-sm px-6 py-2 rounded-lg bg-sp-orange text-white font-semibold hover:bg-sp-orange/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Aplicando…' : `Confirmar y aplicar ${previewData?.toCreate ?? included.length} facturas`}
        </button>
      </div>
    </div>
  );
}

// ── Step 4 — Result ───────────────────────────────────────────────────────────

function Step4Result({ result, onReset }: {
  result: { invoicesCreated: number; invoicesSkipped: number; recurringCreated: number; recurringSkipped: number };
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-xs text-green-300 space-y-1">
        <p className="font-semibold text-sm">✓ Operación completada</p>
        <p>{result.invoicesCreated} facturas creadas, {result.invoicesSkipped} omitidas (ya existían).</p>
        {result.recurringCreated > 0 && <p>{result.recurringCreated} templates recurrentes creados.</p>}
        {result.recurringSkipped > 0 && <p>{result.recurringSkipped} templates omitidos (ya existían).</p>}
      </div>
      <div className="flex gap-3">
        <Link href="/admin/finanzas/gastos-operativos" className="text-xs px-3 py-1.5 border border-sp-admin-border rounded hover:bg-sp-admin-hover transition-colors text-sp-admin-fg">
          Ver gastos operativos →
        </Link>
        <button onClick={onReset} className="text-xs px-3 py-1.5 text-sp-admin-muted hover:text-sp-admin-fg transition-colors">
          Volver a configuración
        </button>
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export function Setup2026Wizard({ existingTxIds }: Props) {
  const existingSet = new Set(existingTxIds);
  const [step, setStep] = useState<Step>('config');
  const [config, setConfig] = useState<ConfigState>(DEFAULT_CONFIG);
  const [rows, setRows] = useState<HistoricalExpenseRow[]>([]);
  const [recurringRows, setRecurringRows] = useState<RecurringExpenseRow[]>([]);
  const [previewData, setPreviewData] = useState<{ existing: readonly string[]; toCreate: number; recurringToCreate: number } | null>(null);
  const [applyResult, setApplyResult] = useState<{ invoicesCreated: number; invoicesSkipped: number; recurringCreated: number; recurringSkipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const patchConfig = useCallback((patch: Partial<ConfigState>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const patchRow = useCallback((idx: number, patch: Partial<HistoricalExpenseRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }, []);

  function handleNext1() {
    const histConfig = configToHistoricalConfig(config);
    const generated = generateHistoricalRows(histConfig);
    setRows(generated);

    if (config.create_recurring) {
      const recurring = generateRecurringTemplates(
        { ...histConfig.gestoria, startDate: config.recurring_start },
        { ...histConfig.seguro, startDate: config.recurring_start },
      );
      setRecurringRows(recurring);
    } else {
      setRecurringRows([]);
    }

    setStep('preview');
    setError(null);
  }

  function handleNext2() {
    setError(null);
    startTransition(async () => {
      const payload = JSON.stringify({ historical: rows, recurring: recurringRows });
      const result = await previewSetup2026Action(payload);
      if (!result.ok) { setError(result.error); return; }
      setPreviewData(result.data);
      setStep('confirm');
    });
  }

  function handleApply() {
    setError(null);
    startTransition(async () => {
      const payload = JSON.stringify({ historical: rows, recurring: recurringRows });
      const result = await applySetup2026Action(payload);
      if (!result.ok) { setError(result.error); return; }
      setApplyResult(result.data);
      setStep('result');
    });
  }

  function handleReset() {
    setStep('config');
    setRows([]);
    setRecurringRows([]);
    setPreviewData(null);
    setApplyResult(null);
    setError(null);
  }

  const STEP_LABELS: Record<Step, string> = {
    config: '1. Configuración',
    preview: '2. Preview',
    confirm: '3. Confirmar',
    result: '4. Resultado',
  };

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <div className="flex gap-1 text-[10px] text-sp-admin-muted">
        {(Object.keys(STEP_LABELS) as Step[]).map((s) => (
          <span key={s} className={step === s ? 'text-sp-orange font-semibold' : ''}>
            {STEP_LABELS[s]}{s !== 'result' ? ' →' : ''}
          </span>
        ))}
      </div>

      {error && (
        <div className="text-xs text-red-400 border border-red-400/30 rounded-lg px-3 py-2">{error}</div>
      )}

      {step === 'config' && (
        <Step1Config config={config} onChange={patchConfig} onNext={handleNext1} />
      )}
      {step === 'preview' && (
        <Step2Preview
          rows={rows}
          recurringRows={recurringRows}
          existingTxIds={existingSet}
          onRowChange={patchRow}
          onBack={() => setStep('config')}
          onNext={handleNext2}
        />
      )}
      {step === 'confirm' && (
        <Step3Confirm
          rows={rows}
          recurringRows={recurringRows}
          onBack={() => setStep('preview')}
          onApply={handleApply}
          isPending={isPending}
          previewData={previewData}
        />
      )}
      {step === 'result' && applyResult && (
        <Step4Result result={applyResult} onReset={handleReset} />
      )}
    </div>
  );
}
