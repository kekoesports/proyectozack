'use client';

import { useState } from 'react';
import { BarChart2, Plus } from 'lucide-react';
import { EditDrawer } from '@/features/admin/_shared/components/EditDrawer';
import { EmptyState } from '@/features/admin/_shared/components/EmptyState';
import type { TalentMetricSnapshot } from '@/types';

const METRIC_LABELS: Record<string, string> = {
  followers: 'Seguidores',
  subscribers: 'Suscriptores',
  avg_viewers_30d: 'Viewers promedio (30d)',
  peak_viewers: 'Viewers pico',
  hours_broadcast: 'Horas emitidas',
  avg_views: 'Vistas promedio',
  engagement_pct: 'Engagement (%)',
  geo_distribution: 'Distribución GEO',
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter / X',
};

type Props = {
  readonly talentId: number;
  readonly snapshotsByPlatform: Record<string, TalentMetricSnapshot[]>;
};

type DrawerState = {
  open: boolean;
  platform: string;
};

/**
 * Stats del talent agrupadas por plataforma (Twitch, YouTube, Instagram, TikTok, Kick) con histórico de snapshots.
 *
 * @kind client
 * @feature admin/talents
 * @route /admin/talents/[id]
 * @example
 * ```tsx
 * <TalentStatsByPlatform talentId={talent.id} snapshotsByPlatform={snapshotsByPlatform} />
 * ```
 */
export function TalentStatsByPlatform({ talentId, snapshotsByPlatform }: Props): React.ReactElement {
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, platform: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const platforms = Object.keys(snapshotsByPlatform);

  const openDrawer = (platform: string): void => {
    setDrawer({ open: true, platform });
    setStatus('idle');
    setErrorMsg('');
  };

  const closeDrawer = (): void => setDrawer({ open: false, platform: '' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setStatus('sending');
    const fd = new FormData(e.currentTarget);
    try {
      const { insertSnapshotAction } = await import('@/app/admin/(dashboard)/talents/[id]/stats/stats-actions');
      const result = await insertSnapshotAction(fd);
      if (result.success) {
        setStatus('ok');
        setTimeout(closeDrawer, 1200);
      } else {
        setStatus('error');
        setErrorMsg(result.error ?? 'Error al guardar');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  if (platforms.length === 0) {
    return (
      <EmptyState
        icon={<BarChart2 size={32} />}
        title="Sin snapshots de métricas"
        description="Aún no hay datos de estadísticas registrados para este talento."
      />
    );
  }

  return (
    <div className="space-y-8">
      {platforms.map((platform) => {
        const snapshots = snapshotsByPlatform[platform] ?? [];
        // Get latest value per metricType
        const latestByMetric = new Map<string, TalentMetricSnapshot>();
        for (const snap of snapshots) {
          if (!latestByMetric.has(snap.metricType)) {
            latestByMetric.set(snap.metricType, snap);
          }
        }

        return (
          <section key={platform} className="rounded-2xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sp-admin-border">
              <h3 className="font-bold text-sp-admin-text text-sm">
                {PLATFORM_LABELS[platform] ?? platform}
              </h3>
              <button
                type="button"
                onClick={() => openDrawer(platform)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sp-admin-accent text-sp-admin-bg hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus size={12} />
                Actualizar stats
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sp-admin-border">
                    <th className="text-left px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
                      Métrica
                    </th>
                    <th className="text-right px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
                      Valor
                    </th>
                    <th className="text-right px-5 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(latestByMetric.entries()).map(([metricType, snap]) => (
                    <tr key={metricType} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-border/10 transition-colors">
                      <td className="px-5 py-3 text-sp-admin-text">
                        {METRIC_LABELS[metricType] ?? metricType}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sp-admin-text">
                        {metricType === 'engagement_pct'
                          ? `${snap.value.toFixed(2)}%`
                          : snap.value.toLocaleString('es-ES')}
                      </td>
                      <td className="px-5 py-3 text-right text-sp-admin-muted text-xs">
                        {snap.snapshotDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <EditDrawer
        isOpen={drawer.open}
        onClose={closeDrawer}
        title={`Actualizar stats — ${PLATFORM_LABELS[drawer.platform] ?? drawer.platform}`}
      >
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <input type="hidden" name="talentId" value={talentId} />
          <input type="hidden" name="platform" value={drawer.platform} />

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1">
              Tipo de métrica
            </label>
            <select
              name="metricType"
              required
              className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
            >
              {Object.entries(METRIC_LABELS)
                .filter(([k]) => k !== 'geo_distribution')
                .map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1">
              Valor
            </label>
            <input
              name="value"
              type="number"
              min={0}
              required
              placeholder="Ej: 125000"
              className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1">
              Fecha del snapshot
            </label>
            <input
              name="snapshotDate"
              type="date"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
              className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1">
              Notas (opcional)
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Fuente, contexto..."
              className="w-full rounded-xl border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-sm text-sp-admin-text outline-none focus:border-sp-admin-accent transition-colors resize-none"
            />
          </div>

          {status === 'error' && (
            <p className="text-xs text-red-400">{errorMsg}</p>
          )}
          {status === 'ok' && (
            <p className="text-xs text-emerald-400">Snapshot guardado correctamente.</p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-sp-admin-accent text-sp-admin-bg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {status === 'sending' ? 'Guardando...' : 'Guardar snapshot'}
          </button>
        </form>
      </EditDrawer>
    </div>
  );
}
