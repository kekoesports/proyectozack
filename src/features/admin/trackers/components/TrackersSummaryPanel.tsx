'use client';

import Link from 'next/link';
import type { TrackerSummary } from '@/lib/queries/deal-trackers';

type Props = { trackers: TrackerSummary[] };

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isStale(t: TrackerSummary): boolean {
  if (t.status !== 'active') return false;
  if (!t.lastSyncedAt) return true;
  return Date.now() - new Date(t.lastSyncedAt).getTime() > SEVEN_DAYS_MS;
}

export function TrackersSummaryPanel({ trackers }: Props) {
  const total      = trackers.length;
  const active     = trackers.filter((t) => t.status === 'active').length;
  const revision   = trackers.filter((t) => t.status === 'review_pending').length;
  const approved   = trackers.filter((t) => t.status === 'approved').length;
  const paid       = trackers.filter((t) => t.status === 'paid').length;
  const completed  = trackers.filter((t) => t.currentCount >= t.targetCount && t.targetCount > 0).length;
  const stale      = trackers.filter(isStale);

  const totalCurrent = trackers.reduce((s, t) => s + t.currentCount, 0);
  const totalTarget  = trackers.reduce((s, t) => s + t.targetCount,  0);
  const globalPct    = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  return (
    <div className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total',       value: total,    color: 'text-sp-dark' },
          { label: 'Activos',     value: active,   color: 'text-sp-orange' },
          { label: 'Revisión',    value: revision, color: 'text-amber-600' },
          { label: 'Aprobados',   value: approved, color: 'text-emerald-600' },
          { label: 'Pagados',     value: paid,     color: 'text-emerald-700' },
          { label: 'Completados', value: completed, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-sp-border p-4 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-sp-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Progreso global */}
      <div className="bg-white rounded-xl border border-sp-border p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-sp-muted uppercase tracking-wide">Progreso global del trato</p>
          <p className="text-sm font-black text-sp-dark tabular-nums">
            {totalCurrent} / {totalTarget} <span className="text-sp-muted font-normal">links</span>
          </p>
        </div>
        <div className="h-3 bg-sp-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${globalPct}%`,
              background: globalPct >= 100
                ? '#10b981'
                : 'linear-gradient(90deg,#f5632a 0%,#e03070 50%,#8b3aad 100%)',
            }}
          />
        </div>
        <p className="text-right text-xs text-sp-muted mt-1">{globalPct}%</p>
      </div>

      {/* Estado de cobro */}
      <div className="bg-white rounded-xl border border-sp-border p-4">
        <p className="text-xs font-semibold text-sp-muted uppercase tracking-wide mb-3">Estado de cobro</p>
        <div className="space-y-2">
          {[
            { label: 'Pagados',   count: paid,     dot: 'bg-emerald-500' },
            { label: 'Aprobados', count: approved,  dot: 'bg-emerald-300' },
            { label: 'En revisión', count: revision, dot: 'bg-amber-400' },
            { label: 'Activos',   count: active,   dot: 'bg-sp-orange' },
          ].map(({ label, count, dot }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <div className="flex-1 h-1.5 bg-sp-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${dot}`}
                  style={{ width: total > 0 ? `${Math.round((count / total) * 100)}%` : '0%' }}
                />
              </div>
              <span className="text-xs text-sp-muted tabular-nums w-14 text-right">
                {count} <span className="opacity-60">({total > 0 ? Math.round((count / total) * 100) : 0}%)</span>
              </span>
              <span className="text-xs text-sp-muted w-20">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas: sin actualizar en +7 días */}
      {stale.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
              Sin actualizar en más de 7 días — {stale.length} tracker{stale.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-1">
            {stale.map((t) => (
              <Link
                key={t.id}
                href={`/admin/entregables/${t.id}`}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-900 truncate">{t.dealName}</p>
                  <p className="text-xs text-amber-700">{t.brandName}{t.talentName ? ` · ${t.talentName}` : ''}</p>
                </div>
                <div className="shrink-0 text-right ml-4">
                  <p className="text-xs font-semibold text-amber-800 tabular-nums">{t.currentCount}/{t.targetCount}</p>
                  <p className="text-[11px] text-amber-600">
                    {t.lastSyncedAt
                      ? `Último sync: ${new Date(t.lastSyncedAt).toLocaleDateString('es-ES')}`
                      : 'Nunca sincronizado'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {stale.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-xs font-semibold text-emerald-800">Todos los trackers activos están al día.</p>
        </div>
      )}
    </div>
  );
}
