'use client';

import { useState, useRef, useTransition } from 'react';
import {
  parseImportFileAction,
  applyImportAction,
  matchDocumentAction,
} from '@/app/admin/(dashboard)/talents/import/actions';
import type {
  ApplyImportResult,
  MatchDocumentResult,
} from '@/app/admin/(dashboard)/talents/import/actions';
import {
  type Step,
  guessMapping,
  StepIndicator,
} from './InfluencerImport.parts';
import { UploadStep, MappingStep } from './InfluencerImport.upload';
import { MatchingStep, ConfirmStep, DoneStep } from './InfluencerImport.commit';

/**
 * Wizard de importación CSV de creadores: parser, preview, mapeo de columnas y subida masiva al roster.
 *
 * @kind client
 * @feature admin/talents
 * @route /admin/talents/import
 * @example
 * ```tsx
 * <InfluencerImport />
 * ```
 */
export function InfluencerImport(): React.ReactElement {
  const [step, setStep] = useState<Step>('upload');
  const [isPending, startTransition] = useTransition();

  // Step 1 state
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<readonly string[]>([]);
  const [allRows, setAllRows] = useState<readonly Record<string, string>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Step 3 state (matching)
  const [matchResult, setMatchResult] = useState<MatchDocumentResult | null>(null);
  const [selectedMatched, setSelectedMatched] = useState<Set<number>>(new Set());
  const [selectedNew, setSelectedNew] = useState<Set<number>>(new Set());
  const [matchTab, setMatchTab] = useState<'matched' | 'new' | 'dbOnly'>('matched');

  // Done state
  const [result, setResult] = useState<ApplyImportResult | null>(null);

  // ── Step 1: Upload ──────────────────────────────────────────────────

  function handleFileChange(): void {
    setUploadError(null);
  }

  function handleUploadSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await parseImportFileAction(formData);
      if (!res.success || !res.headers || !res.rows) {
        setUploadError(res.error ?? 'Error desconocido al parsear el archivo');
        return;
      }
      setHeaders(res.headers);
      setAllRows(res.rows);
      const guessed = guessMapping(res.headers);
      setMapping(guessed);
      setStep('mapping');
    });
  }

  // ── Step 2: Mapping ─────────────────────────────────────────────────

  function handleMappingChange(header: string, value: string): void {
    setMapping((prev) => ({ ...prev, [header]: value }));
  }

  function handleMappingNext(): void {
    startTransition(async () => {
      const res = await matchDocumentAction({ rows: allRows, mapping });
      if (!res.success) {
        setUploadError(res.error ?? 'Error al cruzar datos');
        return;
      }
      setMatchResult(res);

      // Pre-select all matched rows that have diffs, and all new rows
      const matchedSet = new Set<number>();
      for (const m of res.matched) {
        if (m.diffs.length > 0) matchedSet.add(m.rowIndex);
      }
      setSelectedMatched(matchedSet);
      setSelectedNew(new Set(res.newRows.map((r) => r.rowIndex)));

      // Default to the tab with most content
      if (res.matched.length > 0) setMatchTab('matched');
      else if (res.newRows.length > 0) setMatchTab('new');
      else setMatchTab('dbOnly');

      setStep('matching');
    });
  }

  // ── Step 3: Matching ────────────────────────────────────────────────

  function toggleMatched(rowIndex: number): void {
    setSelectedMatched((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }

  function toggleNew(rowIndex: number): void {
    setSelectedNew((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }

  function handleMatchingNext(): void {
    setStep('confirm');
  }

  // ── Step 4: Confirm ─────────────────────────────────────────────────

  function handleConfirm(): void {
    if (!matchResult) return;

    // Build the rows to send: selected matched + selected new
    const rowsToSend: Record<string, string>[] = [];

    for (const m of matchResult.matched) {
      if (selectedMatched.has(m.rowIndex)) {
        rowsToSend.push(allRows[m.rowIndex] ?? {});
      }
    }
    for (const n of matchResult.newRows) {
      if (selectedNew.has(n.rowIndex)) {
        rowsToSend.push(allRows[n.rowIndex] ?? {});
      }
    }

    startTransition(async () => {
      const res = await applyImportAction({ rows: rowsToSend, mapping });
      setResult(res);
      setStep('done');
    });
  }

  function handleReset(): void {
    setStep('upload');
    setUploadError(null);
    setHeaders([]);
    setAllRows([]);
    setMapping({});
    setMatchResult(null);
    setSelectedMatched(new Set());
    setSelectedNew(new Set());
    setMatchTab('matched');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Computed ────────────────────────────────────────────────────────

  const matchedWithDiffs = matchResult?.matched.filter((m) => m.diffs.length > 0) ?? [];
  const matchedNoDiffs = matchResult?.matched.filter((m) => m.diffs.length === 0) ?? [];
  const totalToApply = selectedMatched.size + selectedNew.size;

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <StepIndicator current={step} />

      {step === 'upload' && (
        <UploadStep
          isPending={isPending}
          uploadError={uploadError}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onSubmit={handleUploadSubmit}
        />
      )}

      {step === 'mapping' && (
        <MappingStep
          headers={headers}
          allRows={allRows}
          mapping={mapping}
          isPending={isPending}
          onMappingChange={handleMappingChange}
          onReset={handleReset}
          onNext={handleMappingNext}
        />
      )}

      {step === 'matching' && matchResult && (
        <MatchingStep
          matchResult={matchResult}
          matchedWithDiffs={matchedWithDiffs}
          matchedNoDiffs={matchedNoDiffs}
          selectedMatched={selectedMatched}
          selectedNew={selectedNew}
          matchTab={matchTab}
          totalToApply={totalToApply}
          onMatchTabChange={setMatchTab}
          onToggleMatched={toggleMatched}
          onToggleNew={toggleNew}
          onBack={() => setStep('mapping')}
          onNext={handleMatchingNext}
        />
      )}

      {step === 'confirm' && matchResult && (
        <ConfirmStep
          matchResult={matchResult}
          selectedMatched={selectedMatched}
          selectedNew={selectedNew}
          totalToApply={totalToApply}
          isPending={isPending}
          onBack={() => setStep('matching')}
          onConfirm={handleConfirm}
        />
      )}

      {step === 'done' && result && (
        <DoneStep result={result} onReset={handleReset} />
      )}
    </div>
  );
}
