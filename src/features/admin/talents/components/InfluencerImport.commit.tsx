'use client';

import type {
  ApplyImportResult,
  MatchedRow,
  MatchDocumentResult,
} from '@/app/admin/(dashboard)/talents/import/actions';
import {
  SummaryCard,
  TabButton,
  EmptyState,
  StatusBadge,
} from './InfluencerImport.parts';
import { MatchedRowCard, NewRowCard } from './InfluencerImport.preview';

export function MatchingStep({
  matchResult,
  matchedWithDiffs,
  matchedNoDiffs,
  selectedMatched,
  selectedNew,
  matchTab,
  totalToApply,
  onMatchTabChange,
  onToggleMatched,
  onToggleNew,
  onBack,
  onNext,
}: {
  readonly matchResult: MatchDocumentResult;
  readonly matchedWithDiffs: readonly MatchedRow[];
  readonly matchedNoDiffs: readonly MatchedRow[];
  readonly selectedMatched: ReadonlySet<number>;
  readonly selectedNew: ReadonlySet<number>;
  readonly matchTab: 'matched' | 'new' | 'dbOnly';
  readonly totalToApply: number;
  readonly onMatchTabChange: (tab: 'matched' | 'new' | 'dbOnly') => void;
  readonly onToggleMatched: (rowIndex: number) => void;
  readonly onToggleNew: (rowIndex: number) => void;
  readonly onBack: () => void;
  readonly onNext: () => void;
}): React.ReactElement {
  return (
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
            onClick={() => onMatchTabChange('matched')}
            label={`Coincidencias (${matchResult.matched.length})`}
          />
          <TabButton
            active={matchTab === 'new'}
            onClick={() => onMatchTabChange('new')}
            label={`Nuevos (${matchResult.newRows.length})`}
          />
          <TabButton
            active={matchTab === 'dbOnly'}
            onClick={() => onMatchTabChange('dbOnly')}
            label={`Solo BD (${matchResult.dbOnly.length})`}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted border border-sp-admin-border hover:bg-sp-admin-hover cursor-pointer"
          >
            Volver
          </button>
          <button
            onClick={onNext}
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
                      onToggle={() => onToggleMatched(m.rowIndex)}
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
                onToggle={() => onToggleNew(r.rowIndex)}
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
  );
}

export function ConfirmStep({
  matchResult,
  selectedMatched,
  selectedNew,
  totalToApply,
  isPending,
  onBack,
  onConfirm,
}: {
  readonly matchResult: MatchDocumentResult;
  readonly selectedMatched: ReadonlySet<number>;
  readonly selectedNew: ReadonlySet<number>;
  readonly totalToApply: number;
  readonly isPending: boolean;
  readonly onBack: () => void;
  readonly onConfirm: () => void;
}): React.ReactElement {
  return (
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
              onClick={onBack}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted border border-sp-admin-border hover:bg-sp-admin-hover cursor-pointer"
            >
              Volver
            </button>
            <button
              onClick={onConfirm}
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
  );
}

export function DoneStep({
  result,
  onReset,
}: {
  readonly result: ApplyImportResult;
  readonly onReset: () => void;
}): React.ReactElement {
  return (
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
        onClick={onReset}
        className="px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 cursor-pointer"
      >
        Nueva importacion
      </button>
    </div>
  );
}
