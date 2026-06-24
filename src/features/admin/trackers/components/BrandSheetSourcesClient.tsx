'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createSheetSourceAction } from '@/app/admin/(dashboard)/entregables/source-actions';
import type { SheetSourceSummary } from '@/lib/queries/brand-sheet-sources';

type Props = {
  sources: SheetSourceSummary[];
  brands: Array<{ id: number; name: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  active:  'Activa',
  paused:  'Pausada',
  error:   'Error',
};

const STATUS_COLORS: Record<string, string> = {
  active:  'bg-emerald-100 text-emerald-800',
  paused:  'bg-yellow-100 text-yellow-800',
  error:   'bg-red-100 text-red-800',
};

export function BrandSheetSourcesClient({ sources, brands }: Props) {
  const [showForm, setShowForm]     = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createSheetSourceAction(formData);
      if (!result.ok) {
        setErrorMsg(result.error);
      } else {
        setShowForm(false);
        setErrorMsg(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-sp-dark">Fuentes de Google Sheets</h1>
          <p className="text-sm text-sp-muted mt-0.5">
            Configura hojas de cálculo de marcas para importar entregables automáticamente.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 transition-colors"
        >
          + Nueva fuente
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-sp-border p-6 space-y-4">
          <h2 className="text-base font-bold text-sp-dark">Nueva fuente de Google Sheet</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-sp-muted uppercase">
                  Nombre de la marca *
                </label>
                <input
                  name="brandName"
                  required
                  maxLength={200}
                  className="border border-sp-border rounded-lg px-3 py-2 text-sm text-sp-dark outline-none focus:border-sp-orange"
                  placeholder="Ej: 1WIN"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-sp-muted uppercase">
                  Marca CRM (opcional)
                </label>
                <select
                  name="crmBrandId"
                  className="border border-sp-border rounded-lg px-3 py-2 text-sm text-sp-dark outline-none focus:border-sp-orange"
                >
                  <option value="">Sin vincular</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs font-semibold text-sp-muted uppercase">
                  URL de Google Sheets *
                </label>
                <input
                  name="googleSheetUrl"
                  required
                  type="url"
                  className="border border-sp-border rounded-lg px-3 py-2 text-sm text-sp-dark outline-none focus:border-sp-orange"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-sp-muted uppercase">
                  Título interno (opcional)
                </label>
                <input
                  name="sourceTitle"
                  maxLength={300}
                  className="border border-sp-border rounded-lg px-3 py-2 text-sm text-sp-dark outline-none focus:border-sp-orange"
                  placeholder="Ej: 1WIN Q2 2026"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-sp-muted uppercase">
                  Modo de parseo
                </label>
                <select
                  name="parseMode"
                  defaultValue="socialpro_blocks"
                  className="border border-sp-border rounded-lg px-3 py-2 text-sm text-sp-dark outline-none focus:border-sp-orange"
                >
                  <option value="socialpro_blocks">SocialPro Blocks (default)</option>
                  <option value="simple_columns">Columnas simples</option>
                </select>
              </div>
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-orange text-white hover:bg-sp-orange/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Guardando...' : 'Crear fuente'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setErrorMsg(null); }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-sp-off text-sp-dark hover:bg-sp-border transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sources list */}
      {sources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sp-border p-12 text-center">
          <p className="text-sp-muted text-sm">No hay fuentes configuradas todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => (
            <div
              key={source.id}
              className="bg-white rounded-2xl border border-sp-border p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-sp-dark leading-tight">
                    {source.brandName}
                  </h3>
                  {source.sourceTitle && (
                    <p className="text-xs text-sp-muted mt-0.5">{source.sourceTitle}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 ${STATUS_COLORS[source.status] ?? 'bg-sp-off text-sp-muted'}`}
                >
                  {STATUS_LABELS[source.status] ?? source.status}
                </span>
              </div>

              <p className="text-xs text-sp-muted truncate">{source.googleSheetUrl}</p>

              <div className="flex items-center gap-3 text-xs text-sp-muted">
                <span>{source.trackerCount} tracker{source.trackerCount !== 1 ? 's' : ''}</span>
                {source.lastScannedAt && (
                  <span>
                    Escaneado {new Date(source.lastScannedAt).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>

              <Link
                href={`/admin/entregables/fuentes/${source.id}`}
                className="block w-full text-center text-sm font-semibold py-2 rounded-lg border border-sp-border hover:bg-sp-off transition-colors text-sp-dark"
              >
                Ver detalle
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
