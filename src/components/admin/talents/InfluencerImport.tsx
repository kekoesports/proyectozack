'use client';

import { useState, useRef, useTransition } from 'react';
import {
  parseImportFileAction,
  applyImportAction,
  matchDocumentAction,
} from '@/app/admin/(dashboard)/talents/import/actions';
import type {
  ApplyImportResult,
  MatchedRow,
  UnmatchedDocRow,
  ExistingTalentData,
  MatchDocumentResult,
} from '@/app/admin/(dashboard)/talents/import/actions';

// ── Constants ─────────────────────────────────────────────────────────

const TALENT_FIELDS: readonly { value: string; label: string }[] = [
  { value: '(ignorar)', label: '--- Ignorar columna ---' },
  { value: 'name', label: 'Nombre' },
  { value: 'slug', label: 'Slug / Handle unico' },
  { value: 'platform', label: 'Plataforma principal (twitch|youtube)' },
  { value: 'youtubeHandle', label: 'Handle YouTube' },
  { value: 'twitchHandle', label: 'Handle Twitch' },
  { value: 'instagramHandle', label: 'Handle Instagram' },
  { value: 'tiktokHandle', label: 'Handle TikTok' },
  { value: 'kickHandle', label: 'Handle Kick' },
  { value: 'followers', label: 'Followers totales' },
  { value: 'country', label: 'Pais del creador (2 letras)' },
  { value: 'language', label: 'Idioma' },
  { value: 'vertical', label: 'Sector / Vertical' },
  { value: 'email', label: 'Email de contacto' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'notes', label: 'Notas internas' },
];

const PREVIEW_ROWS = 5;

// ── Types ─────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'matching' | 'confirm' | 'done';

// ── Helpers ───────────────────────────────────────────────────────────

function guessMapping(headers: readonly string[]): Record<string, string> {
  const guess: Record<string, string> = {};
  const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

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

function matchTypeLabel(type: 'slug' | 'name' | 'handle'): string {
  switch (type) {
    case 'slug': return 'por slug';
    case 'name': return 'por nombre';
    case 'handle': return 'por handle';
  }
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

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5 space-y-3">
            <h3 className="font-bold text-sp-admin-text text-sm">Importar y cruzar documento</h3>
            <p className="text-xs text-sp-admin-muted">
              Sube un archivo <code className="font-mono bg-sp-admin-bg px-1 py-0.5 rounded">.csv</code> o{' '}
              <code className="font-mono bg-sp-admin-bg px-1 py-0.5 rounded">.xlsx</code>.
              El sistema cruzara los datos del documento con los influencers que ya tenemos en la base de datos.
            </p>
            <p className="text-xs text-sp-admin-muted">
              Podras ver las coincidencias, diferencias, nuevos creadores y los que solo estan en nuestra BD.
            </p>
          </div>

          <form
            onSubmit={handleUploadSubmit}
            className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5"
          >
            <label className="block text-xs uppercase tracking-wider font-semibold text-sp-admin-muted mb-2">
              Archivo CSV o Excel (max 5MB)
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
                {isPending ? 'Leyendo...' : 'Siguiente'}
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
                  {headers.length} columnas detectadas / {allRows.length} filas
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted border border-sp-admin-border hover:bg-sp-admin-hover cursor-pointer"
                >
                  Volver
                </button>
                <button
                  onClick={handleMappingNext}
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Cruzando datos...' : 'Cruzar con BD'}
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
                  <span className="text-sp-admin-muted text-xs">-&gt;</span>
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

      {/* ── Step 3: Matching / Comparison ── */}
      {step === 'matching' && matchResult && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard
              label="Coincidencias"
              count={matchResult.matched.length}
              sublabel={`${matchedWithDiffs.length} con diferencias`}
              color="blue"
            />
            <SummaryCard
              label="Nuevos en doc"
              count={matchResult.newRows.length}
              sublabel="no estan en BD"
              color="emerald"
            />
            <SummaryCard
              label="Solo en BD"
              count={matchResult.dbOnly.length}
              sublabel="no estan en doc"
              color="amber"
            />
            <SummaryCard
              label="Invalidas"
              count={matchResult.invalidRows.length}
              sublabel="datos incompletos"
              color="red"
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <TabButton
                active={matchTab === 'matched'}
                onClick={() => setMatchTab('matched')}
                label={`Coincidencias (${matchResult.matched.length})`}
              />
              <TabButton
                active={matchTab === 'new'}
                onClick={() => setMatchTab('new')}
                label={`Nuevos (${matchResult.newRows.length})`}
              />
              <TabButton
                active={matchTab === 'dbOnly'}
                onClick={() => setMatchTab('dbOnly')}
                label={`Solo BD (${matchResult.dbOnly.length})`}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('mapping')}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted border border-sp-admin-border hover:bg-sp-admin-hover cursor-pointer"
              >
                Volver
              </button>
              <button
                onClick={handleMatchingNext}
                disabled={totalToApply === 0}
                className="px-4 py-1.5 rounded-full text-xs font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                Aplicar seleccion ({totalToApply})
              </button>
            </div>
          </div>

          {/* Tab: Matched */}
          {matchTab === 'matched' && (
            <div className="space-y-3">
              {matchResult.matched.length === 0 ? (
                <EmptyState text="Ninguna fila del documento coincide con influencers existentes." />
              ) : (
                <>
                  {/* Matched with diffs */}
                  {matchedWithDiffs.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">
                        Con diferencias ({matchedWithDiffs.length})
                      </h4>
                      {matchedWithDiffs.map((m) => (
                        <MatchedRowCard
                          key={m.rowIndex}
                          row={m}
                          selected={selectedMatched.has(m.rowIndex)}
                          onToggle={() => toggleMatched(m.rowIndex)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Matched without diffs */}
                  {matchedNoDiffs.length > 0 && (
                    <details className="group">
                      <summary className="text-xs font-semibold text-sp-admin-muted uppercase tracking-wider cursor-pointer hover:text-sp-admin-text">
                        Sin diferencias ({matchedNoDiffs.length}) — datos identicos
                      </summary>
                      <div className="mt-2 space-y-2">
                        {matchedNoDiffs.map((m) => (
                          <div
                            key={m.rowIndex}
                            className="rounded-xl bg-sp-admin-card border border-sp-admin-border/50 px-4 py-3 flex items-center gap-3"
                          >
                            <span className="text-xs font-medium text-sp-admin-text">{m.existing.name}</span>
                            <span className="text-[10px] text-sp-admin-muted font-mono">@{m.existing.slug}</span>
                            <span className="ml-auto text-[10px] text-emerald-400 font-semibold">Identico</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab: New */}
          {matchTab === 'new' && (
            <div className="space-y-2">
              {matchResult.newRows.length === 0 ? (
                <EmptyState text="Todas las filas del documento coinciden con influencers existentes." />
              ) : (
                matchResult.newRows.map((r) => (
                  <NewRowCard
                    key={r.rowIndex}
                    row={r}
                    selected={selectedNew.has(r.rowIndex)}
                    onToggle={() => toggleNew(r.rowIndex)}
                  />
                ))
              )}
            </div>
          )}

          {/* Tab: DB Only */}
          {matchTab === 'dbOnly' && (
            <div className="space-y-2">
              {matchResult.dbOnly.length === 0 ? (
                <EmptyState text="Todos los influencers de la BD aparecen en el documento." />
              ) : (
                <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-sp-admin-bg/50 border-b border-sp-admin-border">
                          <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Nombre</th>
                          <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Slug</th>
                          <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Plataforma</th>
                          <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Estado</th>
                          <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Pais</th>
                          <th className="text-left px-3 py-2 font-semibold text-sp-admin-muted">Redes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchResult.dbOnly.map((t) => (
                          <tr key={t.id} className="border-b border-sp-admin-border/50 last:border-0">
                            <td className="px-3 py-2 font-medium text-sp-admin-text">{t.name}</td>
                            <td className="px-3 py-2 font-mono text-sp-admin-muted">{t.slug}</td>
                            <td className="px-3 py-2 text-sp-admin-muted">{t.platform}</td>
                            <td className="px-3 py-2">
                              <StatusBadge status={t.status} />
                            </td>
                            <td className="px-3 py-2 text-sp-admin-muted">{t.creatorCountry ?? '—'}</td>
                            <td className="px-3 py-2 text-sp-admin-muted">
                              {t.socials.map((s) => `${s.platform}: @${s.handle}`).join(', ') || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Confirm ── */}
      {step === 'confirm' && matchResult && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-sp-admin-text text-sm">Confirmar importacion</h3>
                <div className="flex gap-4 mt-1.5 text-xs">
                  <span className="text-blue-400 font-semibold">
                    {selectedMatched.size} a actualizar
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    {selectedNew.size} a crear
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep('matching')}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted border border-sp-admin-border hover:bg-sp-admin-hover cursor-pointer"
                >
                  Volver
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isPending || totalToApply === 0}
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Importando...' : `Confirmar (${totalToApply} filas)`}
                </button>
              </div>
            </div>
          </div>

          {/* Summary of what will be applied */}
          <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
            <div className="border-b border-sp-admin-border px-4 py-3">
              <h4 className="text-xs font-semibold text-sp-admin-muted uppercase tracking-wider">
                Resumen de cambios
              </h4>
            </div>
            <div className="divide-y divide-sp-admin-border/50">
              {matchResult.matched
                .filter((m) => selectedMatched.has(m.rowIndex))
                .map((m) => (
                  <div key={m.rowIndex} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-sp-admin-text">{m.existing.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
                        actualizar
                      </span>
                    </div>
                    {m.diffs.length > 0 && (
                      <div className="space-y-1 mt-1">
                        {m.diffs.map((d) => (
                          <div key={d.field} className="text-[11px] flex gap-2">
                            <span className="text-sp-admin-muted w-24 shrink-0">{d.label}:</span>
                            <span className="text-red-400 line-through">{d.dbValue || '(vacio)'}</span>
                            <span className="text-sp-admin-muted">-&gt;</span>
                            <span className="text-emerald-400">{d.docValue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              {matchResult.newRows
                .filter((r) => selectedNew.has(r.rowIndex))
                .map((r) => (
                  <div key={r.rowIndex} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-sp-admin-text">
                        {r.mapped['name'] ?? `Fila ${r.rowIndex + 2}`}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                        nuevo
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 5: Done ── */}
      {step === 'done' && result && (
        <div className="space-y-4">
          {result.success ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5">
              <p className="font-bold text-emerald-400 text-sm">
                Importacion completada
              </p>
              <div className="flex gap-6 mt-2 text-xs">
                <span className="text-emerald-400">
                  <strong>{result.created ?? 0}</strong> creados
                </span>
                <span className="text-blue-400">
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
                      <li key={i}>- {e}</li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="text-xs text-sp-admin-muted mt-3">
                Los talentos nuevos aparecen como <strong>inactive</strong> e <strong>internal</strong>.
                Revisa y activa desde la pestana Tarjetas.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-5">
              <p className="font-bold text-red-400 text-sm">Error en la importacion</p>
              <p className="text-xs text-sp-admin-muted mt-1">{result.error}</p>
            </div>
          )}

          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 cursor-pointer"
          >
            Nueva importacion
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

type StepIndicatorProps = {
  readonly current: Step;
};

const STEPS: readonly { key: Step; label: string }[] = [
  { key: 'upload', label: '1. Subir' },
  { key: 'mapping', label: '2. Mapear' },
  { key: 'matching', label: '3. Cruzar' },
  { key: 'confirm', label: '4. Confirmar' },
  { key: 'done', label: 'Listo' },
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
                className={`h-px w-4 ${isDone ? 'bg-emerald-500/40' : 'bg-sp-admin-border'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({
  label,
  count,
  sublabel,
  color,
}: {
  readonly label: string;
  readonly count: number;
  readonly sublabel: string;
  readonly color: 'blue' | 'emerald' | 'amber' | 'red';
}): React.ReactElement {
  const colorMap = {
    blue: 'border-blue-500/30 bg-blue-500/5',
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
    red: 'border-red-500/30 bg-red-500/5',
  };
  const textMap = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };

  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <p className={`text-2xl font-black tabular-nums ${textMap[color]}`}>{count}</p>
      <p className="text-xs font-semibold text-sp-admin-text mt-0.5">{label}</p>
      <p className="text-[10px] text-sp-admin-muted">{sublabel}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly label: string;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
        active
          ? 'bg-sp-admin-accent text-sp-admin-bg'
          : 'text-sp-admin-muted hover:bg-sp-admin-hover'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ text }: { readonly text: string }): React.ReactElement {
  return (
    <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-8 text-center">
      <p className="text-xs text-sp-admin-muted">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { readonly status: string }): React.ReactElement {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    available: 'bg-blue-500/10 text-blue-400',
    inactive: 'bg-sp-admin-bg text-sp-admin-muted',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${styles[status] ?? styles['inactive']}`}>
      {status}
    </span>
  );
}

function MatchedRowCard({
  row,
  selected,
  onToggle,
}: {
  readonly row: MatchedRow;
  readonly selected: boolean;
  readonly onToggle: () => void;
}): React.ReactElement {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        selected
          ? 'bg-blue-500/5 border-blue-500/30'
          : 'bg-sp-admin-card border-sp-admin-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-0.5 accent-blue-500 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-sp-admin-text">{row.existing.name}</span>
            <span className="text-[10px] font-mono text-sp-admin-muted">@{row.existing.slug}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">
              {matchTypeLabel(row.matchType)}
            </span>
            <StatusBadge status={row.existing.status} />
          </div>

          {/* Diffs table */}
          {row.diffs.length > 0 && (
            <div className="mt-3 rounded-lg bg-sp-admin-bg border border-sp-admin-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-sp-admin-border">
                    <th className="text-left px-3 py-1.5 font-semibold text-sp-admin-muted w-28">Campo</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-sp-admin-muted">En BD</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-sp-admin-muted">En documento</th>
                  </tr>
                </thead>
                <tbody>
                  {row.diffs.map((d) => (
                    <tr key={d.field} className="border-b border-sp-admin-border/50 last:border-0">
                      <td className="px-3 py-1.5 text-sp-admin-muted font-medium">{d.label}</td>
                      <td className="px-3 py-1.5 text-red-400">
                        {d.dbValue || <span className="italic text-sp-admin-muted">(vacio)</span>}
                      </td>
                      <td className="px-3 py-1.5 text-emerald-400 font-medium">{d.docValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Current socials info */}
          {row.existing.socials.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {row.existing.socials.map((s, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-sp-admin-bg border border-sp-admin-border text-sp-admin-muted"
                >
                  {s.platform}: @{s.handle} ({s.followersDisplay})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewRowCard({
  row,
  selected,
  onToggle,
}: {
  readonly row: UnmatchedDocRow;
  readonly selected: boolean;
  readonly onToggle: () => void;
}): React.ReactElement {
  const name = row.mapped['name'] ?? '';
  const slug = row.mapped['slug'] ?? '';

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        selected
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-sp-admin-card border-sp-admin-border'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-0.5 accent-emerald-500 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-sp-admin-text">{name || '(sin nombre)'}</span>
            {slug && <span className="text-[10px] font-mono text-sp-admin-muted">@{slug}</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
              nuevo
            </span>
          </div>

          {/* Show all mapped fields */}
          <div className="mt-2 flex gap-2 flex-wrap">
            {Object.entries(row.mapped)
              .filter(([, v]) => v.trim())
              .map(([field, value]) => (
                <span
                  key={field}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-sp-admin-bg border border-sp-admin-border text-sp-admin-muted"
                >
                  {DIFF_LABELS_MAP[field] ?? field}: {value}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const DIFF_LABELS_MAP: Record<string, string> = {
  name: 'Nombre',
  slug: 'Slug',
  platform: 'Plataforma',
  country: 'Pais',
  language: 'Idioma',
  followers: 'Followers',
  email: 'Email',
  telegram: 'Telegram',
  twitchHandle: 'Twitch',
  youtubeHandle: 'YouTube',
  instagramHandle: 'Instagram',
  tiktokHandle: 'TikTok',
  kickHandle: 'Kick',
  notes: 'Notas',
};
