'use client';

import { useRef, useState, useTransition } from 'react';
import {
  parseTrackerFileAction,
  importTrackerLinksAction,
  syncTrackerFromSheetUrlAction,
} from '@/app/admin/(dashboard)/entregables/tracker-actions';

type Mode = 'file' | 'sheets';
type Step = 'input' | 'map' | 'done';

type ImportResult = {
  inserted: number;
  duplicates: number;
  invalid: number;
};

type Props = {
  trackerId: number;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
};

export function ImportLinksModal({ trackerId, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode]     = useState<Mode>('sheets');
  const [step, setStep]     = useState<Step>('input');
  const [error, setError]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // File mode state
  const [headers, setHeaders]   = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [fileName, setFileName] = useState('');
  const [linkCol, setLinkCol]   = useState('');
  const [dateCol, setDateCol]   = useState('');
  const [notesCol, setNotesCol] = useState('');

  // Sheets mode state
  const [sheetUrl, setSheetUrl] = useState('');

  function switchMode(next: Mode) {
    setMode(next);
    setStep('input');
    setError(null);
  }

  // ── File mode handlers ──────────────────────────────────────────────────────

  function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Selecciona un archivo'); return; }
    const fd = new FormData();
    fd.append('file', file);
    setError(null);
    startTransition(async () => {
      const result = await parseTrackerFileAction(fd);
      if (!result.ok) { setError(result.error); return; }
      setHeaders(result.headers);
      setRowCount(result.rowCount);
      setFileName(result.fileName);
      const autoLink = result.headers.find((h) => /url|link|enlace|vod|stream|video/i.test(h)) ?? result.headers[0] ?? '';
      setLinkCol(autoLink);
      setStep('map');
    });
  }

  function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Archivo perdido — vuelve al paso anterior'); return; }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('trackerId', String(trackerId));
    fd.append('sourceFile', fileName);
    fd.append('linkColumn', linkCol);
    if (dateCol)  fd.append('dateColumn', dateCol);
    if (notesCol) fd.append('notesColumn', notesCol);
    setError(null);
    startTransition(async () => {
      const result = await importTrackerLinksAction(fd);
      if (!result.ok) { setError(result.error); return; }
      setStep('done');
      onImported({ inserted: result.inserted ?? 0, duplicates: result.duplicates ?? 0, invalid: result.invalid ?? 0 });
    });
  }

  // ── Sheets mode handler ─────────────────────────────────────────────────────

  function handleSheetSync(e: React.FormEvent) {
    e.preventDefault();
    if (!sheetUrl.trim()) { setError('Introduce la URL del Google Sheet'); return; }
    const fd = new FormData();
    fd.append('trackerId', String(trackerId));
    fd.append('sheetUrl', sheetUrl.trim());
    setError(null);
    startTransition(async () => {
      const result = await syncTrackerFromSheetUrlAction(fd);
      if (!result.ok) { setError(result.error); return; }
      setStep('done');
      onImported({ inserted: result.inserted ?? 0, duplicates: result.duplicates ?? 0, invalid: 0 });
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sp-border">
          <h2 className="text-base font-bold text-sp-dark">Importar links</h2>
          <button onClick={onClose} className="text-sp-muted hover:text-sp-dark text-xl leading-none">&times;</button>
        </div>

        {/* Mode tabs — solo en step input */}
        {step === 'input' && (
          <div className="flex border-b border-sp-border">
            <button
              onClick={() => switchMode('sheets')}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                mode === 'sheets'
                  ? 'border-b-2 border-sp-orange text-sp-orange'
                  : 'text-sp-muted hover:text-sp-dark'
              }`}
            >
              Google Sheets URL
            </button>
            <button
              onClick={() => switchMode('file')}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                mode === 'file'
                  ? 'border-b-2 border-sp-orange text-sp-orange'
                  : 'text-sp-muted hover:text-sp-dark'
              }`}
            >
              Archivo CSV / XLSX
            </button>
          </div>
        )}

        <div className="px-6 py-5">

          {/* ── Google Sheets mode ── */}
          {mode === 'sheets' && step === 'input' && (
            <form onSubmit={handleSheetSync} className="space-y-4">
              <p className="text-sm text-sp-muted">
                Pega el enlace del Google Sheet. Se detectarán y sincronizarán los links automáticamente.
              </p>
              <div>
                <label className="block text-xs font-semibold text-sp-muted mb-1">
                  URL de Google Sheets *
                </label>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  required
                  className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sp-orange/30"
                />
              </div>
              <p className="text-xs text-sp-muted">
                La hoja debe ser pública (cualquiera con el enlace puede ver). Se detectará automáticamente la columna de links.
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-sp-border hover:bg-sp-off">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white disabled:opacity-50">
                  {isPending ? 'Sincronizando…' : 'Sincronizar'}
                </button>
              </div>
            </form>
          )}

          {/* ── File mode — upload step ── */}
          {mode === 'file' && step === 'input' && (
            <form onSubmit={handleFileSubmit} className="space-y-4">
              <p className="text-sm text-sp-muted">Sube un archivo CSV o XLSX con los links del deal.</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv"
                required
                className="block w-full text-sm text-sp-muted border border-sp-border rounded-lg px-3 py-2 file:mr-3 file:border-0 file:bg-sp-off file:px-3 file:py-1 file:rounded-md file:text-xs file:font-semibold"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-sp-border hover:bg-sp-off">Cancelar</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white disabled:opacity-50">
                  {isPending ? 'Leyendo…' : 'Continuar'}
                </button>
              </div>
            </form>
          )}

          {/* ── File mode — map columns step ── */}
          {mode === 'file' && step === 'map' && (
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <p className="text-sm text-sp-muted">
                Archivo: <strong>{fileName}</strong> — {rowCount} filas detectadas.
              </p>
              <div>
                <label className="block text-xs font-semibold text-sp-muted mb-1">Columna con los links *</label>
                <select value={linkCol} onChange={(e) => setLinkCol(e.target.value)} required className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm">
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-sp-muted mb-1">Fecha (opcional)</label>
                  <select value={dateCol} onChange={(e) => setDateCol(e.target.value)} className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm">
                    <option value="">— Ninguna —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sp-muted mb-1">Notas (opcional)</label>
                  <select value={notesCol} onChange={(e) => setNotesCol(e.target.value)} className="w-full border border-sp-border rounded-lg px-3 py-2 text-sm">
                    <option value="">— Ninguna —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-between gap-3">
                <button type="button" onClick={() => setStep('input')} className="px-4 py-2 text-sm rounded-lg border border-sp-border hover:bg-sp-off">Atrás</button>
                <button type="submit" disabled={isPending || !linkCol} className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white disabled:opacity-50">
                  {isPending ? 'Importando…' : `Importar ${rowCount} filas`}
                </button>
              </div>
            </form>
          )}

          {/* ── Done step ── */}
          {step === 'done' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-sp-dark font-semibold">Sincronización completada</p>
              <button onClick={onClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white">
                Cerrar
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
