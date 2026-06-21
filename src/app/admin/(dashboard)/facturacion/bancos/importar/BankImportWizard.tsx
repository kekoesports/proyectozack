'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { analyzeImportFileAction, uploadAndImportAction } from './import-actions';
import type { BankAccount } from '@/types';
import type { BankMappableField, BankColumnMapping } from '@/lib/parsers/bankTransaction';

const FIELD_LABELS: Record<BankMappableField, string> = {
  bookingDate: 'Fecha operación *',
  valueDate: 'Fecha valor',
  amount: 'Importe *',
  currency: 'Moneda',
  direction: 'Tipo (Cargo/Abono)',
  description: 'Concepto *',
  counterpartyName: 'Nombre contraparte',
  counterpartyAccount: 'IBAN contraparte',
  reference: 'Referencia',
  category: 'Categoría',
};

const REQUIRED_FIELDS: BankMappableField[] = ['bookingDate', 'amount', 'description'];

type AnalyzeState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly headers?: readonly string[];
  readonly suggestedMapping?: BankColumnMapping;
};

type ImportState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly importId?: number;
  readonly totalRows?: number;
  readonly importedRows?: number;
  readonly duplicateRows?: number;
};

const initAnalyze: AnalyzeState = {};
const initImport: ImportState = {};

type Props = { readonly accounts: readonly BankAccount[] };

export function BankImportWizard({ accounts }: Props): React.ReactElement {
  const [analyzeState, analyzeAction, analyzePending] = useActionState(analyzeImportFileAction, initAnalyze);
  const [importState, importAction, importPending] = useActionState(uploadAndImportAction, initImport);

  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<BankColumnMapping>({});
  const [accountId, setAccountId] = useState<string>('');

  const headers = analyzeState.headers;
  const step = importState.success ? 3 : headers ? 2 : 1;

  function handleAnalyze(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!file) return;
    if (analyzeState.suggestedMapping) setMapping(analyzeState.suggestedMapping);
    const fd = new FormData();
    fd.set('file', file);
    if (accountId) fd.set('bankAccountId', accountId);
    analyzeAction(fd);
  }

  function handleImport(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    if (accountId) fd.set('bankAccountId', accountId);
    for (const [field, idx] of Object.entries(mapping)) {
      if (idx !== undefined) fd.set(field, String(idx));
    }
    importAction(fd);
  }

  // Apply suggested mapping when headers arrive
  if (headers && analyzeState.suggestedMapping && Object.keys(mapping).length === 0) {
    setMapping(analyzeState.suggestedMapping);
  }

  if (step === 3) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-2">
        <p className="text-2xl">✓</p>
        <p className="font-bold text-green-700">Importación completada</p>
        <p className="text-sm text-green-600">
          {importState.importedRows} transacciones importadas
          {(importState.duplicateRows ?? 0) > 0 && `, ${importState.duplicateRows} duplicadas omitidas`}
          {` de un total de ${importState.totalRows} filas`}
        </p>
        <div className="pt-2 flex gap-2 justify-center">
          <Link href="/admin/facturacion/bancos/conciliacion" className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors">
            Ir a conciliar →
          </Link>
          <Link href="/admin/facturacion/bancos" className="px-4 py-2 text-sm font-semibold rounded-lg border border-sp-border hover:bg-sp-admin-bg/40 transition-colors">
            Volver a cuentas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: File upload */}
      <div className={`rounded-xl border p-5 space-y-4 ${step >= 1 ? 'border-sp-border bg-sp-admin-card' : 'border-sp-border/40 opacity-50'}`}>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-sp-orange text-white">1</span>
          <p className="text-sm font-semibold">Seleccionar archivo</p>
        </div>
        <form onSubmit={handleAnalyze} className="space-y-3">
          {accounts.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-sp-admin-muted mb-1">Cuenta bancaria (opcional)</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-sp-border bg-sp-admin-bg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sp-orange/40"
              >
                <option value="">— Sin asignar —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.displayName}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-sp-admin-muted mb-1">Archivo CSV o XLSX *</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              required
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
              className="w-full text-sm text-sp-admin-muted file:mr-3 file:px-3 file:py-1 file:rounded-lg file:border-0 file:bg-sp-orange/10 file:text-sp-orange file:font-semibold hover:file:bg-sp-orange/20"
            />
          </div>
          {analyzeState.error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{analyzeState.error}</p>
          )}
          <button
            type="submit"
            disabled={analyzePending || !file}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 disabled:opacity-50 transition-colors"
          >
            {analyzePending ? 'Analizando…' : 'Analizar columnas →'}
          </button>
        </form>
      </div>

      {/* Step 2: Column mapping */}
      {headers && (
        <div className="rounded-xl border border-sp-border bg-sp-admin-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-sp-orange text-white">2</span>
            <p className="text-sm font-semibold">Confirmar mapeo de columnas</p>
          </div>
          <p className="text-xs text-sp-admin-muted">
            Detectadas {headers.length} columnas. Verifica que los campos obligatorios (*) están mapeados correctamente.
          </p>
          <form onSubmit={handleImport} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(FIELD_LABELS) as BankMappableField[]).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-sp-admin-muted mb-1">{FIELD_LABELS[field]}</label>
                  <select
                    value={mapping[field] !== undefined ? String(mapping[field]) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMapping((prev) => {
                        if (!val) {
                          const next = { ...prev };
                          delete next[field];
                          return next;
                        }
                        return { ...prev, [field]: Number(val) };
                      });
                    }}
                    className="w-full rounded-lg border border-sp-border bg-sp-admin-bg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sp-orange/40"
                  >
                    <option value="">— No mapear —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={String(i)}>{h || `Columna ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {importState.error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{importState.error}</p>
            )}
            {REQUIRED_FIELDS.some((f) => mapping[f] === undefined) && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Debes mapear los campos obligatorios: Fecha operación, Importe y Concepto.
              </p>
            )}
            <button
              type="submit"
              disabled={importPending || REQUIRED_FIELDS.some((f) => mapping[f] === undefined)}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 disabled:opacity-50 transition-colors"
            >
              {importPending ? 'Importando…' : 'Importar transacciones →'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
