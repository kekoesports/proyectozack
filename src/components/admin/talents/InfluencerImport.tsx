'use client';

import { useState, useRef, useTransition } from 'react';
import { parseImportFileAction, applyImportAction } from '@/app/admin/(dashboard)/talents/import/actions';
import type { ApplyImportResult } from '@/app/admin/(dashboard)/talents/import/actions';

// ── Constants ─────────────────────────────────────────────────────────

const TALENT_FIELDS: readonly { value: string; label: string }[] = [
  { value: '(ignorar)', label: '— Ignorar columna —' },
  { value: 'name', label: 'Nombre' },
  { value: 'slug', label: 'Slug / Handle único' },
  { value: 'platform', label: 'Plataforma principal (twitch|youtube)' },
  { value: 'youtubeHandle', label: 'Handle YouTube' },
  { value: 'twitchHandle', label: 'Handle Twitch' },
  { value: 'instagramHandle', label: 'Handle Instagram' },
  { value: 'tiktokHandle', label: 'Handle TikTok' },
  { value: 'kickHandle', label: 'Handle Kick' },
  { value: 'followers', label: 'Followers totales' },
  { value: 'country', label: 'País del creador (2 letras)' },
  { value: 'language', label: 'Idioma' },
  { value: 'vertical', label: 'Sector / Vertical' },
  { value: 'email', label: 'Email de contacto' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'notes', label: 'Notas internas' },
];

const PREVIEW_ROWS = 5;

// ── Types ─────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'preview' | 'done';

type PreviewRow = {
  readonly rowIndex: number;
  readonly mapped: Record<string, string>;
  readonly status: 'new' | 'update' | 'invalid';
  readonly invalidReason?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────

function applyMapping(
  rows: readonly Record<string, string>[],
  mapping: Record<string, string>,
): PreviewRow[] {
  return rows.map((raw, i) => {
    const mapped: Record<string, string> = {};
    for (const [csvHeader, talentField] of Object.entries(mapping)) {
      if (talentField && talentField !== '(ignorar)') {
        mapped[talentField] = raw[csvHeader] ?? '';
      }
    }

    const name = (mapped['name'] ?? '').trim();
    const slug = (mapped['slug'] ?? '').trim();

    if (!name) {
      return { rowIndex: i, mapped, status: 'invalid', invalidReason: 'Nombre vacío' };
    }
    if (!slug) {
      return { rowIndex: i, mapped, status: 'invalid', invalidReason: 'Slug vacío' };
    }

    // We can't know server-side duplicates here without a DB call,
    // so all valid rows show as 'new' in client preview.
    // The server action will resolve actual create vs update.
    return { rowIndex: i, mapped, status: 'new' };
  });
}

function guessMapping(headers: readonly string[]): Record<string, string> {
  const guess: Record<string, string> = {};
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const fieldAliases: Record<string, string[]> = {
    name: ['name', 'nombre', 'creator', 'influencer', 'talent'],
    slug: ['slug', 'handle', 'username', 'user', 'nick', 'nickname'],
    platform: ['platform', 'plataforma', 'primaryplatform', 'primary_platform'],
    youtubeHandle: ['youtubehandle', 'youtube', 'ythandle', 'yt'],
    twitchHandle: ['twitchhandle', 'twitch', 'twitchuser'],
    instagramHandle: ['instagramhandle', 'instagram', 'ig'],
    tiktokHandle: ['tiktokhandle', 'tiktok', 'tt'],
    kickHandle: ['kickhandle', 'kick'],
    followers: ['followers', 'seguidores', 'subs', 'subscribers'],
    country: ['country', 'pais', 'país', 'geo', 'location'],
    language: ['language', 'idioma', 'lang'],
    email: ['email', 'correo', 'mail', 'contactemail', 'contact_email'],
    telegram: ['telegram', 'tg'],
    notes: ['notes', 'notas', 'internalnotes', 'internal_notes'],
  };

  for (const header of headers) {
    const norm = normalize(header);
    let matched = '(ignorar)';
    for (const [field, aliases] of Object.entries(fieldAliases)) {
      if (aliases.includes(norm)) {
        matched = field;
        break;
      }
    }
    guess[header] = matched;
  }

  return guess;
}

// ── Component ─────────────────────────────────────────────────────────

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

  // Step 3 state
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);

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
    const rows = applyMapping(allRows, mapping);
    setPreviewRows(rows);
    setStep('preview');
  }

  // ── Step 3: Preview & Confirm ───────────────────────────────────────

  function handleConfirm(): void {
    const validRows = previewRows.filter((r) => r.status !== 'invalid');
    const rowsToSend = validRows.map((r) => {
      // Reconstruct raw row from mapped data (we need original raw rows)
      // Use allRows[r.rowIndex] to get the original raw row
      return allRows[r.rowIndex] ?? {};
    });

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
    setPreviewRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Render ──────────────────────────────────────────────────────────

  const toCreate = previewRows.filter((r) => r.status === 'new').length;
  const toUpdate = previewRows.filter((r) => r.status === 'update').length;
  const invalid = previewRows.filter((r) => r.status === 'invalid').length;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5 space-y-3">
            <h3 className="font-bold text-sp-admin-text text-sm">Importar CSV o Excel</h3>
            <p className="text-xs text-sp-admin-muted">
              Sube un archivo <code className="font-mono bg-sp-admin-bg px-1 py-0.5 rounded">.csv</code> o{' '}
              <code className="font-mono bg-sp-admin-bg px-1 py-0.5 rounded">.xlsx</code>.
              En el siguiente paso podrás mapear cada columna al campo correcto.
            </p>
            <p className="text-xs text-sp-admin-muted">
              Campos disponibles: <code className="font-mono">name</code>, <code className="font-mono">slug</code>,{' '}
              <code className="font-mono">platform</code>, handles de redes, followers, país, idioma, email, etc.
            </p>
          </div>

          <form
            onSubmit={handleUploadSubmit}
            className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5"
          >
            <label className="block text-xs uppercase tracking-wider font-semibold text-sp-admin-muted mb-2">
              Archivo CSV o Excel (máx 5MB)
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                onChange={handleFileChange}
                className="flex-1 text-sm text-sp-admin-text file:mr-3 file:rounded-full file:border-0 file:bg-sp-admin-accent file:text-sp-admin-bg file:px-4 file:py-2 file:text-xs file:font-bold file:cursor-pointer"
              />
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {isPending ? 'Leyendo…' : 'Siguiente →'}
              </button>
            </div>
            {uploadError && <p className="text-xs text-red-400 mt-3">{uploadError}</p>}
          </form>
        </div>
      )}

      {/* ── Step 2: Column Mapping ── */}
      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sp-admin-text text-sm">Mapeo de columnas</h3>
                <p className="text-xs text-sp-admin-muted mt-0.5">
                  {headers.length} columnas detectadas · {allRows.length} filas
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted border border-sp-admin-border hover:bg-sp-admin-hover cursor-pointer"
                >
                  ← Volver
                </button>
                <button
                  onClick={handleMappingNext}
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 cursor-pointer"
                >
                  Siguiente →
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <div className="w-48 shrink-0">
                    <span className="text-xs font-mono text-sp-admin-text bg-sp-admin-bg border border-sp-admin-border rounded px-2 py-1 block truncate">
                      {header}
                    </span>
                  </div>
                  <span className="text-sp-admin-muted text-xs">→</span>
                  <select
                    value={mapping[header] ?? '(ignorar)'}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    className="flex-1 text-xs bg-sp-admin-bg border border-sp-admin-border rounded px-2 py-1 text-sp-admin-text focus:outline-none focus:border-sp-admin-accent"
                  >
                    {TALENT_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview of first rows */}
          <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
            <div className="border-b border-sp-admin-border px-4 py-3">
              <h4 className="text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">
                Vista previa (primeras {Math.min(PREVIEW_ROWS, allRows.length)} filas)
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-sp-admin-bg/50 border-b border-sp-admin-border">
                    {headers.map((h) => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-sp-admin-muted whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allRows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <tr key={i} className="border-b border-sp-admin-border/50 last:border-0">
                      {headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-sp-admin-muted max-w-[160px] truncate">
                          {row[h] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview & Confirm ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-sp-admin-text text-sm">Confirmar importación</h3>
                <div className="flex gap-4 mt-1.5 text-xs">
                  <span className="text-emerald-400 font-semibold">{toCreate} a crear</span>
                  <span className="text-amber-400 font-semibold">{toUpdate} a actualizar</span>
                  <span className="text-red-400 font-semibold">{invalid} inválidas</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted border border-sp-admin-border hover:bg-sp-admin-hover cursor-pointer"
                >
                  ← Volver
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isPending || (toCreate + toUpdate) === 0}
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Importando…' : `Confirmar import (${toCreate + toUpdate} filas)`}
                </button>
              </div>
            </div>
          </div>

          {/* Preview table */}
          <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-sp-admin-bg/50 border-b border-sp-admin-border">
                    <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">#</th>
                    <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Nombre</th>
                    <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Slug</th>
                    <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Plataforma</th>
                    <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">País</th>
                    <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Followers</th>
                    <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r) => (
                    <tr
                      key={r.rowIndex}
                      className={`border-b border-sp-admin-border/50 last:border-0 ${
                        r.status === 'invalid'
                          ? 'bg-red-500/5'
                          : r.status === 'update'
                          ? 'bg-amber-500/5'
                          : 'bg-emerald-500/5'
                      }`}
                    >
                      <td className="px-3 py-2 text-sp-admin-muted font-mono">{r.rowIndex + 2}</td>
                      <td className="px-3 py-2 font-medium text-sp-admin-text">
                        {r.mapped['name'] || <em className="text-red-400">vacío</em>}
                      </td>
                      <td className="px-3 py-2 text-sp-admin-muted font-mono">
                        {r.mapped['slug'] || '—'}
                      </td>
                      <td className="px-3 py-2 text-sp-admin-muted">
                        {r.mapped['platform'] || '—'}
                      </td>
                      <td className="px-3 py-2 text-sp-admin-muted">
                        {r.mapped['country'] || '—'}
                      </td>
                      <td className="px-3 py-2 text-sp-admin-muted tabular-nums">
                        {r.mapped['followers'] || '—'}
                      </td>
                      <td className="px-3 py-2">
                        {r.status === 'invalid' ? (
                          <span className="text-red-400 font-semibold">✕ {r.invalidReason}</span>
                        ) : r.status === 'update' ? (
                          <span className="text-amber-400 font-semibold">↻ Actualizar</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">+ Nuevo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && result && (
        <div className="space-y-4">
          {result.success ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5">
              <p className="font-bold text-emerald-400 text-sm">
                ✓ Importación completada
              </p>
              <div className="flex gap-6 mt-2 text-xs">
                <span className="text-emerald-400">
                  <strong>{result.created ?? 0}</strong> creados
                </span>
                <span className="text-amber-400">
                  <strong>{result.updated ?? 0}</strong> actualizados
                </span>
                <span className="text-sp-admin-muted">
                  <strong>{result.skipped ?? 0}</strong> omitidos
                </span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-sp-admin-muted cursor-pointer font-semibold">
                    Ver errores ({result.errors.length})
                  </summary>
                  <ul className="text-xs text-red-400 mt-2 space-y-1 font-mono">
                    {result.errors.map((e, i) => (
                      <li key={i}>· {e}</li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="text-xs text-sp-admin-muted mt-3">
                Los talentos importados aparecen como <strong>inactive</strong> e <strong>internal</strong>.
                Revisa y activa desde la pestaña Tarjetas.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-5">
              <p className="font-bold text-red-400 text-sm">✕ Error en la importación</p>
              <p className="text-xs text-sp-admin-muted mt-1">{result.error}</p>
            </div>
          )}

          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 cursor-pointer"
          >
            Nueva importación
          </button>
        </div>
      )}
    </div>
  );
}

// ── StepIndicator ─────────────────────────────────────────────────────

type StepIndicatorProps = {
  readonly current: Step;
};

const STEPS: readonly { key: Step; label: string }[] = [
  { key: 'upload', label: '1. Subir archivo' },
  { key: 'mapping', label: '2. Mapear columnas' },
  { key: 'preview', label: '3. Confirmar' },
  { key: 'done', label: '✓ Listo' },
];

function StepIndicator({ current }: StepIndicatorProps): React.ReactElement {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const isActive = s.key === current;
        const isDone = i < currentIdx;
        return (
          <div key={s.key} className="flex items-center">
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-sp-admin-accent text-sp-admin-bg'
                  : isDone
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-sp-admin-bg text-sp-admin-muted border border-sp-admin-border'
              }`}
            >
              {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-6 ${isDone ? 'bg-emerald-500/40' : 'bg-sp-admin-border'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
