'use client';

import { useState, useTransition, useMemo } from 'react';
import type { YouTubeChannelPreview } from '@/lib/services/youtube';
import {
  searchYouTubeAction,
  importYouTubeChannelsAction,
  enrichYouTubeAvgViewsAction,
} from '@/app/admin/(dashboard)/targets/youtube-actions';

import type {
  YouTubeSearchParams,
  YouTubeRegionCode,
  AvgViewsRecord,
} from '@/app/admin/(dashboard)/targets/youtube-actions';

import { YT_RED, DEFAULT_PARAMS, YouTubeResultsTable } from './YouTubeSearch.parts';

/**
 * Buscador avanzado de canales en la API de YouTube (idioma, país, suscriptores, palabras clave).
 * Permite previsualizar resultados, seleccionarlos y materializarlos como targets.
 *
 * @kind client
 * @feature admin/targets
 * @route /admin/targets
 */
export function YouTubeSearch(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [params, setParams] = useState<YouTubeSearchParams>(DEFAULT_PARAMS);
  const [results, setResults] = useState<YouTubeChannelPreview[]>([]);
  const [fetchedResults, setFetchedResults] = useState<YouTubeChannelPreview[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMeta, setSearchMeta] = useState<{ fetchedCount: number; filteredCount: number } | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number } | null>(null);
  const [avgViews, setAvgViews] = useState<AvgViewsRecord>({});
  const [isEnriching, setIsEnriching] = useState(false);
  const [minAvgViews, setMinAvgViews] = useState(0);
  const [maxAvgViews, setMaxAvgViews] = useState(0);
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof YouTubeSearchParams>(key: K, value: YouTubeSearchParams[K]): void => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleEnrichAvgViews = (): void => {
    const visibleRows = results.length > 0 ? results : fetchedResults;
    const ids = visibleRows.map((r) => r.channelId);
    if (ids.length === 0) return;
    setIsEnriching(true);
    setError(null);
    startTransition(async () => {
      try {
        const res = await enrichYouTubeAvgViewsAction(ids);
        if (!res.ok) {
          setError(res.error ?? 'Error al obtener vistas medias');
        } else {
          setAvgViews(res.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al obtener vistas medias');
      } finally {
        setIsEnriching(false);
      }
    });
  };

  const handleSearch = (): void => {
    if (!params.query.trim()) return;
    setError(null);
    setImportResult(null);
    setSearchMeta(null);
    setAvgViews({});
    setHasSearched(true);
    startTransition(async () => {
      try {
        const result = await searchYouTubeAction(params);
        setSearchMeta({
          fetchedCount: result.fetchedCount,
          filteredCount: result.filteredCount,
        });
        setFetchedResults(result.fetchedResults);
        if (!result.ok) {
          setError(result.error ?? 'Error buscando en YouTube');
          setResults([]);
          return;
        }

        setResults(result.results);
        setSelected(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error buscando en YouTube');
        setSearchMeta(null);
        setFetchedResults([]);
        setResults([]);
      }
    });
  };

  const toggleOne = (channelId: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  };

  const displayedResults = useMemo(() => {
    if (minAvgViews === 0 && maxAvgViews === 0) return results;
    return results.filter((ch) => {
      const avg = avgViews[ch.channelId]?.avgViews ?? null;
      if (avg === null) return true;
      if (minAvgViews > 0 && avg < minAvgViews) return false;
      if (maxAvgViews > 0 && avg > maxAvgViews) return false;
      return true;
    });
  }, [results, avgViews, minAvgViews, maxAvgViews]);
  const hasResults = displayedResults.length > 0 || results.length > 0;

  const allSelected = displayedResults.length > 0 && displayedResults.every((r) => selected.has(r.channelId));

  const toggleAll = (): void => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(displayedResults.map((r) => r.channelId)));
  };

  const handleImport = (): void => {
    const visibleRows = displayedResults.length > 0 ? displayedResults : fetchedResults;
    const toImport = visibleRows.filter((r) => selected.has(r.channelId));
    if (toImport.length === 0) return;
    const fd = new FormData();
    fd.set('channels', JSON.stringify(toImport));
    setError(null);
    startTransition(async () => {
      try {
        const result = await importYouTubeChannelsAction(fd);
        setImportResult(result);
        setResults([]);
        setFetchedResults([]);
        setSelected(new Set());
        setParams(DEFAULT_PARAMS);
        setSearchMeta(null);
        setAvgViews({});
        setMinAvgViews(0);
        setMaxAvgViews(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error importando canales');
      }
    });
  };

  const handleUseFetchedResults = (): void => {
    setResults(fetchedResults.slice(0, params.limit));
    setSelected(new Set());
  };

  return (
    <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-sp-admin-hover transition-colors text-left"
      >
        {/* YT icon badge */}
        <div
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: YT_RED }}
        >
          <svg aria-hidden="true" className="w-4 h-4" viewBox="0 0 24 24" fill="white">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-sp-admin-text leading-none">Buscar canales en YouTube</p>
          <p className="text-[11px] text-sp-admin-muted mt-0.5">
            Busca por nombre, tema o nicho e importa canales directamente
          </p>
        </div>

        {isPending && (
          <span className="text-[10px] font-semibold text-[#FF0000] uppercase tracking-wide animate-pulse shrink-0">
            Buscando...
          </span>
        )}

        <svg
          aria-hidden="true"
          className={`w-4 h-4 text-sp-admin-muted transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-sp-admin-border">
          {/* ── Search row ───────────────────────────────────────────────────── */}
          <div className="px-5 pt-4 pb-3 flex gap-2.5">
            <div className="relative flex-1">
              <svg
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sp-admin-muted/50 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <circle cx={11} cy={11} r={8} />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                id="youtube-query"
                type="text"
                value={params.query}
                onChange={(e) => set('query', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Nombre de canal, tema, handle..."
                className="w-full bg-sp-admin-bg rounded-lg pl-9 pr-3 py-2.5 text-sm text-sp-admin-text placeholder:text-sp-admin-muted/40 border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-[#FF0000]/30 transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={isPending || !params.query.trim()}
              className="shrink-0 px-5 py-2.5 rounded-lg text-white text-[12px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: YT_RED }}
            >
              Buscar
            </button>
          </div>

          {/* ── Filters ──────────────────────────────────────────────────────── */}
          <div className="px-5 pb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div>
              <label htmlFor="youtube-min-subs" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sp-admin-muted/70 mb-1">
                Min. suscriptores
              </label>
              <input
                id="youtube-min-subs"
                type="number"
                min="0"
                value={params.minSubscribers || ''}
                onChange={(e) => set('minSubscribers', parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full bg-sp-admin-bg rounded-md px-3 py-2 text-sm text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-[#FF0000]/30 placeholder:text-sp-admin-muted/40"
              />
            </div>
            <div>
              <label htmlFor="youtube-max-subs" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sp-admin-muted/70 mb-1">
                Max. suscriptores
              </label>
              <input
                id="youtube-max-subs"
                type="number"
                min="0"
                value={params.maxSubscribers || ''}
                onChange={(e) => set('maxSubscribers', parseInt(e.target.value, 10) || 0)}
                placeholder="ilimitado"
                className="w-full bg-sp-admin-bg rounded-md px-3 py-2 text-sm text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-[#FF0000]/30 placeholder:text-sp-admin-muted/40"
              />
            </div>
            <div>
              <label htmlFor="youtube-description" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sp-admin-muted/70 mb-1">
                Descripción contiene
              </label>
              <input
                id="youtube-description"
                type="text"
                value={params.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="casino, betting..."
                className="w-full bg-sp-admin-bg rounded-md px-3 py-2 text-sm text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-[#FF0000]/30 placeholder:text-sp-admin-muted/40"
              />
            </div>
            <div>
              <label htmlFor="youtube-limit" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sp-admin-muted/70 mb-1">
                Límite
              </label>
              <input
                id="youtube-limit"
                type="number"
                min="1"
                max="25"
                value={params.limit}
                onChange={(e) => set('limit', parseInt(e.target.value, 10) || 10)}
                className="w-full bg-sp-admin-bg rounded-md px-3 py-2 text-sm text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-[#FF0000]/30"
              />
            </div>
            <div>
              <label htmlFor="youtube-min-avg" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sp-admin-muted/70 mb-1">
                Min. vistas medias
              </label>
              <input
                id="youtube-min-avg"
                type="number"
                min="0"
                value={minAvgViews || ''}
                onChange={(e) => setMinAvgViews(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-full bg-sp-admin-bg rounded-md px-3 py-2 text-sm text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-[#FF0000]/30 placeholder:text-sp-admin-muted/40"
              />
            </div>
            <div>
              <label htmlFor="youtube-max-avg" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sp-admin-muted/70 mb-1">
                Max. vistas medias
              </label>
              <input
                id="youtube-max-avg"
                type="number"
                min="0"
                value={maxAvgViews || ''}
                onChange={(e) => setMaxAvgViews(parseInt(e.target.value, 10) || 0)}
                placeholder="ilimitado"
                className="w-full bg-sp-admin-bg rounded-md px-3 py-2 text-sm text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-[#FF0000]/30 placeholder:text-sp-admin-muted/40"
              />
            </div>
            <div>
              <label htmlFor="youtube-region" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sp-admin-muted/70 mb-1">
                Región
              </label>
              <select
                id="youtube-region"
                value={params.regionCode}
                onChange={(e) => set('regionCode', e.target.value as YouTubeRegionCode)}
                className="w-full bg-sp-admin-bg rounded-md px-3 py-2 text-sm text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-[#FF0000]/30"
              >
                <option value="">Todas</option>
                <option value="hispano">Hispanoamérica</option>
                <option value="ES">España</option>
                <option value="MX">México</option>
                <option value="AR">Argentina</option>
                <option value="CL">Chile</option>
                <option value="CO">Colombia</option>
                <option value="PE">Perú</option>
              </select>
            </div>
            <div>
              <label htmlFor="youtube-language" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-sp-admin-muted/70 mb-1">
                Idioma
              </label>
              <select
                id="youtube-language"
                value={params.relevanceLanguage}
                onChange={(e) => set('relevanceLanguage', e.target.value)}
                className="w-full bg-sp-admin-bg rounded-md px-3 py-2 text-sm text-sp-admin-text border border-sp-admin-border focus:outline-none focus:ring-1 focus:ring-[#FF0000]/30"
              >
                <option value="">Todos</option>
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
          </div>

          {/* ── Checkbox option ──────────────────────────────────────────────── */}
          <div className="px-5 pb-4 -mt-1">
            <label className="inline-flex items-center gap-2 text-[12px] text-sp-admin-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={params.requiresHandle}
                onChange={(e) => set('requiresHandle', e.target.checked)}
                className="rounded border-sp-admin-border bg-sp-admin-bg accent-[#FF0000]"
              />
              Solo canales con handle (@)
            </label>
          </div>

          {/* ── Error ────────────────────────────────────────────────────────── */}
          {error && (
            <p className="px-5 pb-3 text-xs text-red-400">{error}</p>
          )}

          {/* ── Empty state ──────────────────────────────────────────────────── */}
          {hasSearched && !error && results.length === 0 && !isPending && (
            <div className="px-5 pb-4 border-t border-sp-admin-border/60 pt-3 space-y-1">
              {searchMeta && (
                <p className="text-xs text-sp-admin-muted">
                  YouTube devolvió {searchMeta.fetchedCount} canales; los filtros dejaron {searchMeta.filteredCount}.
                </p>
              )}
              <p className="text-xs text-sp-admin-muted">Sin resultados con esos filtros.</p>
              {fetchedResults.length > 0 && (
                <button
                  type="button"
                  onClick={handleUseFetchedResults}
                  className="text-[11px] text-[#FF0000] hover:opacity-80 transition-opacity"
                >
                  Ver los {fetchedResults.length} canales sin filtros
                </button>
              )}
            </div>
          )}

          {/* ── Import feedback ──────────────────────────────────────────────── */}
          {importResult && (
            <div className="px-5 pb-3 flex items-center gap-4 text-xs border-t border-sp-admin-border/60 pt-3">
              <span className="text-emerald-400">
                Importados: <strong>{importResult.imported}</strong>
              </span>
              {importResult.updated > 0 && (
                <span className="text-blue-400">
                  Actualizados: <strong>{importResult.updated}</strong>
                </span>
              )}
            </div>
          )}

          {/* ── Results ──────────────────────────────────────────────────────── */}
          {hasResults && (
            <>
              {/* Results toolbar */}
              <div className="px-5 py-2.5 flex items-center justify-between border-t border-sp-admin-border bg-sp-admin-bg/30">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-sp-admin-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-sp-admin-border bg-sp-admin-bg accent-[#FF0000]"
                    />
                    Todos
                  </label>
                  <span className="text-[11px] text-sp-admin-muted tabular-nums">
                    {displayedResults.length} canales
                    {searchMeta && searchMeta.fetchedCount !== results.length && (
                      <span className="opacity-60"> · {searchMeta.fetchedCount} traídos</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEnrichAvgViews}
                    disabled={isPending || isEnriching || results.length === 0}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text transition-colors disabled:opacity-40"
                  >
                    {isEnriching ? 'Enriqueciendo…' : 'Avg. views'}
                  </button>
                  {selected.size > 0 && (
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-lg text-white text-[11px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: YT_RED }}
                    >
                      Importar {selected.size} {selected.size === 1 ? 'canal' : 'canales'}
                    </button>
                  )}
                </div>
              </div>

              <YouTubeResultsTable
                results={displayedResults}
                selected={selected}
                avgViews={avgViews}
                toggleOne={toggleOne}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
