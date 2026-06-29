'use client';

import React, { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  parsePayrollPdfAction,
  ocrPayrollPdfAction,
  applyPayrollImportAction,
} from '@/app/admin/(dashboard)/finanzas/nominas/importar/actions';
import type { PayrollImportRow, PayrollApplyResult, FilenameWarning } from '@/lib/finance/payroll/types';
import { emptyManualRow, manualRowToPayrollRow } from '@/lib/finance/payroll/manualRow';
import type { ManualRow } from '@/lib/finance/payroll/manualRow';

// ── Step discriminator ────────────────────────────────────────────────────────

type Step =
  | { id: 0 }
  | { id: 1; mode: 'parsed'; rows: PayrollImportRow[]; file: File; fileName: string; filenameWarning?: FilenameWarning }
  | { id: 1; mode: 'needs-ocr'; file: File; fileName: string; pageCount: number; suggestedYearMonth?: string }
  | { id: 1; mode: 'ocr-preview'; rows: PayrollImportRow[]; file: File; fileName: string }
  | { id: 1; mode: 'manual'; file: File; fileName: string; pageCount: number; suggestedYearMonth?: string }
  | { id: 2; rows: PayrollImportRow[]; file: File; sourceMode: 'parsed' | 'ocr-preview' | 'manual'; pageCount?: number; suggestedYearMonth?: string; filenameWarning?: FilenameWarning }
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
      if (res.mode === 'needs-ocr') {
        setStep({
          id: 1, mode: 'needs-ocr',
          file: file as File, fileName: res.fileName,
          pageCount: res.pageCount,
          ...(res.suggestedYearMonth !== undefined ? { suggestedYearMonth: res.suggestedYearMonth } : {}),
        });
      } else {
        setStep({
          id: 1, mode: 'parsed',
          rows: res.rows, file: file as File, fileName: res.fileName,
          ...(res.filenameWarning ? { filenameWarning: res.filenameWarning } : {}),
        });
      }
    });
  }

  // ── Step 1 (needs-ocr) → OCR ──────────────────────────────────────────────
  function handleOcr(): void {
    if (step.id !== 1 || step.mode !== 'needs-ocr') return;
    const { file } = step;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('pdf', file);
      const res = await ocrPayrollPdfAction(fd);
      if (!res.ok) { setError(res.error); return; }
      setStep({ id: 1, mode: 'ocr-preview', rows: res.rows, file, fileName: res.fileName });
    });
  }

  // ── Step 1 (needs-ocr) → manual ───────────────────────────────────────────
  function handleGoManual(): void {
    if (step.id !== 1 || step.mode !== 'needs-ocr') return;
    setStep({
      id: 1, mode: 'manual',
      file: step.file, fileName: step.fileName,
      pageCount: step.pageCount,
      ...(step.suggestedYearMonth !== undefined ? { suggestedYearMonth: step.suggestedYearMonth } : {}),
    });
  }

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────
  function goToConfirmParsed(rows: PayrollImportRow[], file: File, filenameWarning?: FilenameWarning): void {
    setStep({ id: 2, rows, file, sourceMode: 'parsed', ...(filenameWarning ? { filenameWarning } : {}) });
  }

  function goToConfirmOcr(rows: PayrollImportRow[], file: File): void {
    setStep({ id: 2, rows, file, sourceMode: 'ocr-preview' });
  }

  function goToConfirmManual(rows: PayrollImportRow[], file: File): void {
    if (step.id !== 1 || step.mode !== 'manual') return;
    setStep({
      id: 2, rows, file, sourceMode: 'manual',
      pageCount: step.pageCount,
      ...(step.suggestedYearMonth !== undefined ? { suggestedYearMonth: step.suggestedYearMonth } : {}),
    });
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

  // ── Step 2 → 1: back ──────────────────────────────────────────────────────
  function handleConfirmBack(rows: PayrollImportRow[]): void {
    if (step.id !== 2) return;
    if (step.sourceMode === 'ocr-preview') {
      setStep({ id: 1, mode: 'ocr-preview', rows, file: step.file, fileName: step.file.name });
    } else if (step.sourceMode === 'manual') {
      setStep({
        id: 1, mode: 'manual',
        file: step.file, fileName: step.file.name,
        pageCount: step.pageCount ?? 1,
        ...(step.suggestedYearMonth !== undefined ? { suggestedYearMonth: step.suggestedYearMonth } : {}),
      });
    } else {
      setStep({
        id: 1, mode: 'parsed', rows, file: step.file, fileName: step.file.name,
        ...(step.filenameWarning ? { filenameWarning: step.filenameWarning } : {}),
      });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (step.id === 0) {
    return <StepUpload onSubmit={handleUpload} error={error} isPending={isPending} fileRef={fileRef} />;
  }

  if (step.id === 1 && step.mode === 'needs-ocr') {
    return (
      <StepNeedsOcr
        file={step.file}
        fileName={step.fileName}
        pageCount={step.pageCount}
        onBack={() => setStep({ id: 0 })}
        onOcr={handleOcr}
        onManual={handleGoManual}
        isOcrPending={isPending}
        error={error}
      />
    );
  }

  if (step.id === 1 && step.mode === 'parsed') {
    return (
      <StepPreview
        rows={step.rows}
        file={step.file}
        fileName={step.fileName}
        existingTxIds={existingTxIds}
        onBack={() => setStep({ id: 0 })}
        onConfirm={(rows, file) => goToConfirmParsed(rows, file, step.filenameWarning)}
        isPending={isPending}
        {...(step.filenameWarning ? { filenameWarning: step.filenameWarning } : {})}
      />
    );
  }

  if (step.id === 1 && step.mode === 'ocr-preview') {
    return (
      <StepPreview
        rows={step.rows}
        file={step.file}
        fileName={step.fileName}
        existingTxIds={existingTxIds}
        onBack={() => {
          if (step.id === 1 && step.mode === 'ocr-preview') {
            setStep({ id: 1, mode: 'needs-ocr', file: step.file, fileName: step.fileName, pageCount: step.rows.length });
          }
        }}
        onConfirm={goToConfirmOcr}
        isPending={isPending}
        isOcr
      />
    );
  }

  if (step.id === 1 && step.mode === 'manual') {
    return (
      <StepManualEntry
        file={step.file}
        fileName={step.fileName}
        pageCount={step.pageCount}
        existingTxIds={existingTxIds}
        onBack={() => setStep({ id: 0 })}
        onConfirm={goToConfirmManual}
        isPending={isPending}
        {...(step.suggestedYearMonth !== undefined ? { suggestedYearMonth: step.suggestedYearMonth } : {})}
      />
    );
  }

  if (step.id === 2) {
    return (
      <StepConfirm
        rows={step.rows}
        file={step.file}
        existingTxIds={existingTxIds}
        error={error}
        onBack={handleConfirmBack}
        onApply={handleApply}
        isPending={isPending}
      />
    );
  }

  if (step.id === 3) {
    return <StepDone result={step.result} onReset={() => setStep({ id: 0 })} />;
  }

  return <StepUpload onSubmit={handleUpload} error={error} isPending={isPending} fileRef={fileRef} />;
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

// ── Step 1: Needs OCR (PDF vectorizado sin texto) ─────────────────────────────

type NeedsOcrProps = {
  file: File;
  fileName: string;
  pageCount: number;
  onBack: () => void;
  onOcr: () => void;
  onManual: () => void;
  isOcrPending: boolean;
  error: string | null;
};

function StepNeedsOcr({ fileName, pageCount, onBack, onOcr, onManual, isOcrPending, error }: NeedsOcrProps): React.ReactElement {
  return (
    <div className="space-y-4 max-w-lg">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1.5">
        <p className="font-semibold">PDF sin texto seleccionable</p>
        <p>
          <strong>{fileName}</strong>
          {pageCount > 0 ? ` (${pageCount} página${pageCount !== 1 ? 's' : ''})` : ''} es un PDF
          vectorizado o escaneado. No se pudo extraer texto directamente.
        </p>
        <p>Elige cómo continuar:</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isOcrPending}
          onClick={onOcr}
          className="flex flex-col items-start gap-1.5 rounded-lg border border-sp-border bg-sp-admin-surface p-4 text-left hover:border-sp-orange/60 disabled:opacity-50 transition-colors"
        >
          <span className="text-sm font-medium text-sp-admin-fg">
            {isOcrPending ? 'Procesando OCR…' : 'Autocompletar con OCR'}
          </span>
          <span className="text-xs text-sp-admin-muted">
            Reconocimiento óptico automático. Puede tardar 20–40 s. Revisa los datos antes de confirmar.
          </span>
        </button>
        <button
          type="button"
          disabled={isOcrPending}
          onClick={onManual}
          className="flex flex-col items-start gap-1.5 rounded-lg border border-sp-border bg-sp-admin-surface p-4 text-left hover:border-sp-orange/60 disabled:opacity-50 transition-colors"
        >
          <span className="text-sm font-medium text-sp-admin-fg">Introducir manualmente</span>
          <span className="text-xs text-sp-admin-muted">
            Escribe los importes directamente desde el PDF. Sin errores de OCR.
          </span>
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="button"
        onClick={onBack}
        disabled={isOcrPending}
        className="text-xs text-sp-admin-muted hover:text-sp-admin-fg disabled:opacity-50"
      >
        ← Volver
      </button>
    </div>
  );
}

// ── Step 1: Preview (parsed or ocr-preview mode) ──────────────────────────────

type PreviewProps = {
  rows: PayrollImportRow[];
  file: File;
  fileName: string;
  filenameWarning?: FilenameWarning;
  existingTxIds: string[];
  onBack: () => void;
  onConfirm: (rows: PayrollImportRow[], file: File) => void;
  isPending: boolean;
  isOcr?: boolean;
};

function StepPreview({ rows, file, fileName, filenameWarning, existingTxIds, onBack, onConfirm, isPending, isOcr }: PreviewProps): React.ReactElement {
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

      {isOcr && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>Datos completados por OCR</strong> — revisa nombre, período y coste empresa fila a fila
          antes de continuar. Los campos son editables.
        </div>
      )}

      {filenameWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>Aviso:</strong> El archivo parece llamarse <strong>{filenameWarning.filenameMonth}</strong>,
          pero el periodo detectado en el PDF es <strong>{filenameWarning.detectedPeriod}</strong>.
          Se importará como <strong>{filenameWarning.detectedPeriod}</strong> si confirmas.
        </div>
      )}

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
                    {!alreadyExists && !row.warning && isOcr && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        OCR
                      </span>
                    )}
                    {!alreadyExists && !row.warning && !isOcr && (
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

// ── Step 1: Manual Entry ──────────────────────────────────────────────────────

type ManualEntryProps = {
  file: File;
  fileName: string;
  pageCount: number;
  suggestedYearMonth?: string;
  existingTxIds: string[];
  onBack: () => void;
  onConfirm: (rows: PayrollImportRow[], file: File) => void;
  isPending: boolean;
};

function StepManualEntry({ file, fileName, pageCount, suggestedYearMonth, existingTxIds, onBack, onConfirm, isPending }: ManualEntryProps): React.ReactElement {
  const initialCount = Math.max(1, Math.min(pageCount, 10));
  const [manualRows, setManualRows] = useState<ManualRow[]>(() =>
    Array.from({ length: initialCount }, (_, i) => emptyManualRow(i + 1, suggestedYearMonth)),
  );

  const existingSet = new Set(existingTxIds);

  function addRow(): void {
    setManualRows((prev) => [...prev, emptyManualRow(prev.length + 1, suggestedYearMonth)]);
  }

  function removeRow(id: number): void {
    setManualRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateManualField(id: number, field: keyof ManualRow, value: string): void {
    setManualRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function handleConfirm(): void {
    const rows = manualRows.map((r) => manualRowToPayrollRow(r));
    onConfirm(rows, file);
  }

  const payrollRows = manualRows.map((r) => manualRowToPayrollRow(r));
  const canContinue = payrollRows.some((r) => r.include && !existingSet.has(r.txId));

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">Introducción manual de nóminas</p>
        <p>
          El archivo <strong>{fileName}</strong>{pageCount > 0 ? ` (${pageCount} página${pageCount !== 1 ? 's' : ''})` : ''} no
          tiene texto seleccionable. Introduce los importes desde el PDF impreso o en pantalla.
        </p>
        <p>Puedes pedir a ELEVATEX una versión exportada directamente desde el software de nóminas para evitar este paso.</p>
      </div>

      <div className="space-y-3">
        {manualRows.map((row, idx) => {
          const payrollRow = payrollRows[idx];
          const alreadyExists = payrollRow ? existingSet.has(payrollRow.txId) : false;
          return (
            <div key={row.id} className="rounded-lg border border-sp-border bg-sp-admin-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-sp-admin-fg">Trabajador {idx + 1}</p>
                {manualRows.length > 1 && (
                  <button type="button" onClick={() => removeRow(row.id)} className="text-xs text-red-500 hover:text-red-700">
                    Eliminar
                  </button>
                )}
              </div>

              {alreadyExists && (
                <p className="text-[10px] text-yellow-700 bg-yellow-50 rounded px-2 py-1">
                  ⚠ Ya existe una nómina importada para este trabajador y período ({payrollRow?.txId})
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="space-y-1 col-span-2">
                  <span className="text-sp-admin-muted">Trabajador *</span>
                  <input
                    type="text"
                    value={row.counterpartyName}
                    onChange={(e) => updateManualField(row.id, 'counterpartyName', e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full rounded border border-sp-border bg-transparent px-2 py-1 focus:outline-none focus:border-sp-orange"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sp-admin-muted">Mes/Año * (YYYY-MM)</span>
                  <input
                    type="text"
                    value={row.yearMonth}
                    onChange={(e) => updateManualField(row.id, 'yearMonth', e.target.value)}
                    placeholder="2026-01"
                    className="w-full rounded border border-sp-border bg-transparent px-2 py-1 focus:outline-none focus:border-sp-orange font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sp-admin-muted font-semibold text-sp-orange">Coste empresa * (EBITDA)</span>
                  <input
                    type="text"
                    value={row.costoEmpresa}
                    onChange={(e) => updateManualField(row.id, 'costoEmpresa', e.target.value)}
                    placeholder="Ej. 1.696,55"
                    autoComplete="off"
                    className="w-full rounded border border-sp-border bg-transparent px-2 py-1 focus:outline-none focus:border-sp-orange font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sp-admin-muted">Líquido a percibir</span>
                  <input
                    type="text"
                    value={row.liquidoPercibir}
                    onChange={(e) => updateManualField(row.id, 'liquidoPercibir', e.target.value)}
                    placeholder="Ej. 1.000,00"
                    autoComplete="off"
                    className="w-full rounded border border-sp-border bg-transparent px-2 py-1 focus:outline-none focus:border-sp-orange font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sp-admin-muted">Total devengado</span>
                  <input
                    type="text"
                    value={row.totalDevengado}
                    onChange={(e) => updateManualField(row.id, 'totalDevengado', e.target.value)}
                    placeholder="Ej. 1.696,55"
                    autoComplete="off"
                    className="w-full rounded border border-sp-border bg-transparent px-2 py-1 focus:outline-none focus:border-sp-orange font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sp-admin-muted">Total a deducir</span>
                  <input
                    type="text"
                    value={row.totalDeducciones}
                    onChange={(e) => updateManualField(row.id, 'totalDeducciones', e.target.value)}
                    placeholder="Ej. 696,55"
                    autoComplete="off"
                    className="w-full rounded border border-sp-border bg-transparent px-2 py-1 focus:outline-none focus:border-sp-orange font-mono"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sp-admin-muted">IRPF %</span>
                  <input
                    type="text"
                    value={row.irpfPct}
                    onChange={(e) => updateManualField(row.id, 'irpfPct', e.target.value)}
                    placeholder="Ej. 22,49"
                    autoComplete="off"
                    className="w-full rounded border border-sp-border bg-transparent px-2 py-1 focus:outline-none focus:border-sp-orange font-mono"
                  />
                </label>
                <label className="space-y-1 col-span-2">
                  <span className="text-sp-admin-muted">Notas adicionales</span>
                  <input
                    type="text"
                    value={row.notes}
                    onChange={(e) => updateManualField(row.id, 'notes', e.target.value)}
                    placeholder="Observaciones opcionales"
                    className="w-full rounded border border-sp-border bg-transparent px-2 py-1 focus:outline-none focus:border-sp-orange"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="text-xs text-sp-orange hover:underline"
      >
        + Añadir trabajador
      </button>

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
          disabled={isPending || !canContinue}
          onClick={handleConfirm}
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
