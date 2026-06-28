'use client';

import React, { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { parsePayrollPdfAction, applyPayrollImportAction } from '@/app/admin/(dashboard)/finanzas/nominas/importar/actions';
import type { PayrollImportRow, PayrollApplyResult } from '@/lib/finance/payroll/types';

type Step =
  | { id: 0 }
  | { id: 1; rows: PayrollImportRow[]; file: File; fileName: string }
  | { id: 2; rows: PayrollImportRow[]; file: File }
  | { id: 3; result: PayrollApplyResult };

type Props = { existingTxIds: string[] };

export function PayrollImportWizard({ existingTxIds }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>({ id: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Step 0 → 1: parse PDF ──────────────────────────────────────────────────
  function handleUpload(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get('pdf');
    if (!(file instanceof File) || file.size === 0) {
      setError('Selecciona un archivo PDF antes de continuar.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await parsePayrollPdfAction(fd);
      if (!res.ok) { setError(res.error); return; }
      setStep({ id: 1, rows: res.rows, file: file as File, fileName: res.fileName });
    });
  }

  // ── Step 1 → 2: confirm preview ───────────────────────────────────────────
  function goToConfirm(rows: PayrollImportRow[], file: File): void {
    setStep({ id: 2, rows, file });
  }

  // ── Step 2 → 3: apply ─────────────────────────────────────────────────────
  function handleApply(rows: PayrollImportRow[], file: File): void {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('pdf', file);
      fd.append('rows', JSON.stringify(rows));
      const res = await applyPayrollImportAction(fd);
      if (!res.ok) { setError(res.error); return; }
      setStep({ id: 3, result: res.result });
    });
  }

  if (step.id === 0) return <StepUpload onSubmit={handleUpload} error={error} isPending={isPending} fileRef={fileRef} />;
  if (step.id === 1) return <StepPreview rows={step.rows} file={step.file} fileName={step.fileName} existingTxIds={existingTxIds} onBack={() => setStep({ id: 0 })} onConfirm={goToConfirm} isPending={isPending} />;
  if (step.id === 2) return <StepConfirm rows={step.rows} file={step.file} existingTxIds={existingTxIds} error={error} onBack={(rows) => setStep({ id: 1, rows, file: step.file, fileName: step.file.name })} onApply={handleApply} isPending={isPending} />;
  return <StepDone result={step.result} onReset={() => setStep({ id: 0 })} />;
}

// ── Step 0: Upload ────────────────────────────────────────────────────────────

type UploadProps = {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  error: string | null;
  isPending: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
};

function StepUpload({ onSubmit, error, isPending, fileRef }: UploadProps): React.ReactElement {
  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div className="border-2 border-dashed border-sp-border rounded-lg p-8 text-center">
        <p className="text-sm text-sp-admin-muted mb-3">Arrastra o selecciona el PDF de nóminas ELEVATEX</p>
        <input
          ref={fileRef}
          name="pdf"
          type="file"
          accept="application/pdf,.pdf"
          className="block w-full text-sm text-sp-admin-muted
            file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
            file:text-sm file:font-medium file:bg-sp-orange file:text-white
            hover:file:bg-sp-orange/90 cursor-pointer"
          required
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded bg-sp-orange text-white text-sm font-medium disabled:opacity-50"
      >
        {isPending ? 'Procesando PDF…' : 'Analizar PDF'}
      </button>
    </form>
  );
}

// ── Step 1: Preview ───────────────────────────────────────────────────────────

type PreviewProps = {
  rows: PayrollImportRow[];
  file: File;
  fileName: string;
  existingTxIds: string[];
  onBack: () => void;
  onConfirm: (rows: PayrollImportRow[], file: File) => void;
  isPending: boolean;
};

function StepPreview({ rows, file, fileName, existingTxIds, onBack, onConfirm, isPending }: PreviewProps): React.ReactElement {
  const [editRows, setEditRows] = useState<PayrollImportRow[]>(() => rows);

  function toggleInclude(page: number): void {
    setEditRows((prev) =>
      prev.map((r) => (r.page === page ? { ...r, include: !r.include } : r)),
    );
  }

  function updateField(page: number, field: keyof PayrollImportRow, value: string): void {
    setEditRows((prev) =>
      prev.map((r) => (r.page === page ? { ...r, [field]: value } : r)),
    );
  }

  const existingSet = new Set(existingTxIds);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-sp-admin-muted">
        <span>PDF: <strong className="text-sp-admin-fg">{fileName}</strong></span>
        <span>·</span>
        <span>{rows.length} página{rows.length !== 1 ? 's' : ''} detectada{rows.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto rounded border border-sp-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-sp-admin-surface border-b border-sp-border">
              <th className="px-3 py-2 text-left font-medium text-sp-admin-muted">Incluir</th>
              <th className="px-3 py-2 text-left font-medium text-sp-admin-muted">Pág.</th>
              <th className="px-3 py-2 text-left font-medium text-sp-admin-muted">Empleado</th>
              <th className="px-3 py-2 text-left font-medium text-sp-admin-muted">Período</th>
              <th className="px-3 py-2 text-right font-medium text-sp-admin-muted">Coste empresa</th>
              <th className="px-3 py-2 text-left font-medium text-sp-admin-muted">Concepto</th>
              <th className="px-3 py-2 text-left font-medium text-sp-admin-muted">Estado</th>
            </tr>
          </thead>
          <tbody>
            {editRows.map((row) => {
              const alreadyExists = existingSet.has(row.txId);
              return (
                <tr
                  key={row.page}
                  className={`border-b border-sp-border last:border-0 ${alreadyExists ? 'opacity-50' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.include && !alreadyExists}
                      disabled={alreadyExists}
                      onChange={() => toggleInclude(row.page)}
                      className="rounded border-sp-border"
                    />
                  </td>
                  <td className="px-3 py-2 text-sp-admin-muted">{row.page}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.counterpartyName}
                      onChange={(e) => updateField(row.page, 'counterpartyName', e.target.value)}
                      className="w-32 rounded border border-sp-border bg-transparent px-1.5 py-0.5 text-xs focus:outline-none focus:border-sp-orange"
                      placeholder="Nombre"
                    />
                  </td>
                  <td className="px-3 py-2 text-sp-admin-muted font-mono">{row.yearMonth}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="text"
                      value={row.netAmount}
                      onChange={(e) => {
                        updateField(row.page, 'netAmount', e.target.value);
                        updateField(row.page, 'totalAmount', e.target.value);
                      }}
                      className="w-24 rounded border border-sp-border bg-transparent px-1.5 py-0.5 text-xs text-right focus:outline-none focus:border-sp-orange font-mono"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.concept}
                      onChange={(e) => updateField(row.page, 'concept', e.target.value)}
                      className="w-48 rounded border border-sp-border bg-transparent px-1.5 py-0.5 text-xs focus:outline-none focus:border-sp-orange"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {alreadyExists && (
                      <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                        ⚠ ya existe
                      </span>
                    )}
                    {!alreadyExists && row.warning && (
                      <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                        ⚠ {row.warning}
                      </span>
                    )}
                    {!alreadyExists && !row.warning && (
                      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded border border-sp-border text-sm text-sp-admin-muted hover:text-sp-admin-fg"
        >
          Volver
        </button>
        <button
          type="button"
          disabled={isPending || editRows.every((r) => !r.include || existingSet.has(r.txId))}
          onClick={() => onConfirm(editRows, file)}
          className="px-4 py-2 rounded bg-sp-orange text-white text-sm font-medium disabled:opacity-50"
        >
          Continuar a revisión →
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Confirm ───────────────────────────────────────────────────────────

type ConfirmProps = {
  rows: PayrollImportRow[];
  file: File;
  existingTxIds: string[];
  error: string | null;
  onBack: (rows: PayrollImportRow[]) => void;
  onApply: (rows: PayrollImportRow[], file: File) => void;
  isPending: boolean;
};

function StepConfirm({ rows, file, existingTxIds, error, onBack, onApply, isPending }: ConfirmProps): React.ReactElement {
  const existingSet = new Set(existingTxIds);
  const toCreate = rows.filter((r) => r.include && !existingSet.has(r.txId));
  const toSkip = rows.filter((r) => existingSet.has(r.txId));
  const totalAmount = toCreate.reduce((acc, r) => acc + Number(r.netAmount), 0);

  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded-lg border border-sp-border bg-sp-admin-surface p-4 space-y-3">
        <h3 className="text-sm font-semibold text-sp-admin-fg">Resumen de la operación</h3>
        <dl className="space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-sp-admin-muted">Facturas a crear</dt>
            <dd className="font-mono font-semibold text-sp-admin-fg">{toCreate.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sp-admin-muted">Total coste empresa</dt>
            <dd className="font-mono font-semibold text-sp-admin-fg">{totalAmount.toFixed(2)} €</dd>
          </div>
          {toSkip.length > 0 && (
            <div className="flex justify-between">
              <dt className="text-sp-admin-muted">Omitidas (ya existen)</dt>
              <dd className="font-mono text-yellow-600">{toSkip.length}</dd>
            </div>
          )}
        </dl>
        <ul className="space-y-0.5">
          {toCreate.map((r) => (
            <li key={r.txId} className="flex justify-between text-xs py-0.5 border-t border-sp-border/50">
              <span className="text-sp-admin-fg truncate max-w-[60%]">{r.concept}</span>
              <span className="font-mono text-sp-admin-muted">{r.netAmount} €</span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-sp-admin-muted border-t border-sp-border pt-2">
          El PDF se subirá a Blob y quedará adjunto a cada factura. Acción no reversible desde aquí.
        </p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onBack(rows)}
          disabled={isPending}
          className="px-4 py-2 rounded border border-sp-border text-sm text-sp-admin-muted hover:text-sp-admin-fg disabled:opacity-50"
        >
          Volver
        </button>
        <button
          type="button"
          disabled={isPending || toCreate.length === 0}
          onClick={() => onApply(rows, file)}
          className="px-4 py-2 rounded bg-sp-orange text-white text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Creando facturas…' : `Confirmar y crear ${toCreate.length} factura${toCreate.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Done ──────────────────────────────────────────────────────────────

type DoneProps = {
  result: PayrollApplyResult;
  onReset: () => void;
};

function StepDone({ result, onReset }: DoneProps): React.ReactElement {
  return (
    <div className="space-y-4 max-w-md">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
        <p className="text-sm font-semibold text-green-800">
          ✓ {result.invoicesCreated} factura{result.invoicesCreated !== 1 ? 's' : ''} creada{result.invoicesCreated !== 1 ? 's' : ''} correctamente
        </p>
        {result.invoicesSkipped > 0 && (
          <p className="text-xs text-green-700">{result.invoicesSkipped} omitida{result.invoicesSkipped !== 1 ? 's' : ''} (ya existían)</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 rounded border border-sp-border text-sm text-sp-admin-muted hover:text-sp-admin-fg"
        >
          Importar otro PDF
        </button>
        <Link
          href="/admin/finanzas/gastos-operativos"
          className="px-4 py-2 rounded bg-sp-orange text-white text-sm font-medium"
        >
          Ver gastos operativos
        </Link>
      </div>
    </div>
  );
}
