'use client';

import { useState } from 'react';
import { Globe, Plus, X } from 'lucide-react';
import { FilesList } from '@/components/admin/files/FilesList';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { uploadGeoStatsAction, deleteTalentFileAction } from '@/app/admin/(dashboard)/talents/[id]/files/actions';
import type { FileRecord, TalentSocial } from '@/types';

type Props = {
  readonly talentId: number;
  readonly geoFiles: FileRecord[];
  readonly socials: TalentSocial[];
  readonly isManager: boolean;
};

type UploadStatus = 'idle' | 'sending' | 'ok' | 'error';

export function TalentGeoFiles({ talentId, geoFiles, socials, isManager }: Props): React.ReactElement {
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [includeGeos, setIncludeGeos] = useState(false);

  const platformOptions = socials.map((s) => s.platform);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    const fd = new FormData(e.currentTarget);
    fd.set('talentId', String(talentId));

    const result = await uploadGeoStatsAction(fd);
    if (result.success) {
      setStatus('ok');
      setShowForm(false);
      setIncludeGeos(false);
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('error');
      setErrorMsg(result.error ?? 'Error al subir');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sp-admin-text text-sm">Archivos GEO Stats</h3>
          <p className="text-xs text-sp-admin-muted mt-0.5">
            PDFs, CSVs o capturas con distribución geográfica de audiencia.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setStatus('idle'); setErrorMsg(''); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sp-admin-accent text-sp-admin-bg hover:opacity-90 transition-opacity cursor-pointer"
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? 'Cancelar' : 'Subir GEO stats'}
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5 space-y-4"
        >
          <h4 className="font-semibold text-sp-admin-text text-sm">Subir archivo GEO</h4>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1">
              Archivo <span className="text-red-400">*</span>
            </label>
            <input
              name="file"
              type="file"
              required
              accept=".pdf,.csv,.xlsx,.png,.jpg,.jpeg"
              className="w-full text-sm text-sp-admin-text file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sp-admin-border file:text-sp-admin-text hover:file:opacity-80 file:cursor-pointer"
            />
          </div>

          {platformOptions.length > 0 && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1">
                Plataforma
              </label>
              <select
                name="platform"
                className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
              >
                <option value="">Sin plataforma</option>
                {platformOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1">
              Notas (opcional)
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Fuente, período, contexto..."
              className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors resize-none"
            />
          </div>

          {/* Doble actualización GEO */}
          <div className="rounded-xl border border-sp-admin-border/50 bg-sp-admin-bg/50 p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeGeos}
                onChange={(e) => setIncludeGeos(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs font-semibold text-sp-admin-text">
                Incluir datos GEO estructurados (actualización doble)
              </span>
            </label>
            {includeGeos && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1">
                  Top GEOs (JSON)
                </label>
                <textarea
                  name="topGeos"
                  rows={4}
                  placeholder={'[{"country":"ES","pct":45},{"country":"MX","pct":30}]'}
                  className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-xs font-mono text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors resize-none"
                />
                <p className="text-[10px] text-sp-admin-muted mt-1">
                  Formato: array JSON con objetos {'{country, pct}'}. Crea snapshot histórico y actualiza talentSocials.topGeos.
                </p>
              </div>
            )}
          </div>

          {status === 'error' && (
            <p className="text-xs text-red-400">{errorMsg}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-sp-admin-border text-sp-admin-muted hover:text-sp-admin-text transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-sp-admin-accent text-sp-admin-bg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {status === 'sending' ? 'Subiendo...' : 'Subir archivo'}
            </button>
          </div>
        </form>
      )}

      {status === 'ok' && (
        <p className="text-xs text-emerald-400">Archivo subido correctamente.</p>
      )}

      {/* Files list */}
      {geoFiles.length === 0 && !showForm ? (
        <EmptyState
          icon={<Globe size={32} />}
          title="Sin archivos GEO"
          description="Sube PDFs, CSVs o capturas con la distribución geográfica de la audiencia."
        />
      ) : (
        <FilesList
          files={geoFiles}
          talentId={talentId}
          isManager={isManager}
          deleteAction={deleteTalentFileAction}
        />
      )}
    </div>
  );
}
