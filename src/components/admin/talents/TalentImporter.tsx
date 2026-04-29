'use client';

import { useActionState, useRef, useState } from 'react';
import {
  previewTalentImportAction,
  confirmTalentImportAction,
} from '@/app/admin/(dashboard)/talents/import-actions';
import type { TalentImportPreview as TalentImportPreviewType, TalentImportResult } from '@/app/admin/(dashboard)/talents/import-actions';
import { TalentImportPreview } from './TalentImportPreview';

// Definido localmente para no importar constantes de archivos 'use server'
const EMPTY_PREVIEW: TalentImportPreviewType = {
  rows: [], mappedColumns: [], unmappedColumns: [],
  summary: { total: 0, create: 0, update: 0, review: 0, errors: 0 },
};
const EMPTY_RESULT: TalentImportResult = {};

export function TalentImporter(): React.ReactElement {
  const [preview, previewAction, previewPending] = useActionState(previewTalentImportAction, EMPTY_PREVIEW);
  const [result,  confirmAction, confirmPending] = useActionState(confirmTalentImportAction, EMPTY_RESULT);

  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasPreview = preview.rows.length > 0;

  function handleReset(): void {
    setFileName(null);
    formRef.current?.reset();
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|csv)$/i)) { alert('Solo se aceptan archivos .xlsx o .csv'); return; }
    setFileName(file.name);
    const dt = new DataTransfer();
    dt.items.add(file);
    if (inputRef.current) {
      inputRef.current.files = dt.files;
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Instrucciones */}
      <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-5 space-y-3">
        <h3 className="font-bold text-sp-admin-text text-sm">Importar desde Google Sheets / Excel</h3>
        <p className="text-[12px] text-sp-admin-muted">
          Sube tu archivo exportado desde Google Sheets en formato <strong>.xlsx</strong> o <strong>.csv</strong>. El sistema detectará las columnas automáticamente y te mostrará una vista previa antes de crear o actualizar talentos.
        </p>
        <div className="rounded-lg bg-sp-admin-bg border border-sp-admin-border p-3 text-[11px] text-sp-admin-muted space-y-1">
          <p className="font-semibold text-sp-admin-text text-[11px] mb-1.5">Columnas reconocidas automáticamente:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-0.5">
            {[
              ['Nombre / Talent / Creator'],
              ['País / Country / ISO'],
              ['Twitch, Twitch URL, Twitch Followers, CCV'],
              ['YouTube, YouTube URL, YouTube Subs, Avg Views'],
              ['Instagram, IG, Instagram Followers'],
              ['TikTok, TikTok Followers'],
              ['Kick, Kick Followers'],
              ['Twitter / X'],
              ['Telegram / TG, Discord, Email'],
              ['Sector / Sectores / Verticales'],
              ['Notas / Notes'],
              ['Alias / Handle / Usuario'],
            ].map(([label]) => (
              <p key={label} className="truncate">· {label}</p>
            ))}
          </div>
          <p className="mt-2 text-sp-admin-muted/60">Los nombres de columnas son flexibles — «YT Subs», «Avg TW», «Twitch Avg», etc. también funcionan.</p>
        </div>
      </div>

      {!hasPreview ? (
        /* ── Zona de carga ── */
        <form ref={formRef} action={previewAction} className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer p-10 text-center ${
              dragging ? 'border-sp-admin-accent bg-sp-admin-accent/5' : 'border-sp-admin-border hover:border-sp-admin-accent/40 bg-sp-admin-card'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              className="sr-only"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <div className="space-y-2 pointer-events-none select-none">
              <p className="text-3xl">📊</p>
              {fileName ? (
                <>
                  <p className="font-bold text-sp-admin-text text-sm">{fileName}</p>
                  <p className="text-[11px] text-sp-admin-muted">Archivo listo — pulsa Analizar para continuar</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-sp-admin-text text-sm">Arrastra tu archivo aquí</p>
                  <p className="text-[11px] text-sp-admin-muted">o haz clic para seleccionar · .xlsx · .csv · máx 10 MB</p>
                </>
              )}
            </div>
          </div>

          {preview.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 font-medium">
              ⚠ {preview.error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={previewPending || !fileName}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-sp-admin-accent hover:bg-sp-admin-accent/90 disabled:opacity-50 transition-colors"
            >
              {previewPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                  Analizando…
                </span>
              ) : 'Analizar archivo →'}
            </button>
          </div>
        </form>
      ) : (
        /* ── Vista previa ── */
        <TalentImportPreview
          preview={preview}
          result={result}
          isPending={confirmPending}
          formAction={confirmAction}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
