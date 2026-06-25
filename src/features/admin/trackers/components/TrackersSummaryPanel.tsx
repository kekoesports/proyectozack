'use client';

import Link from 'next/link';
import type { TrackerSummary } from '@/lib/queries/deal-trackers';

type Props = { trackers: TrackerSummary[] };

const DELIVERABLE_LABELS: Record<string, string> = {
  stream_integration: 'streams',
  video_youtube:      'videos',
  short_reel_tiktok:  'shorts/reels',
  story_instagram:    'stories',
  tweet_x:            'tweets',
  post_instagram:     'posts',
  otro:               'entregables',
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function TrackersSummaryPanel({ trackers }: Props) {
  const active = trackers.filter((t) => t.status === 'active' || t.status === 'review_pending');
  const paid     = trackers.filter((t) => t.status === 'paid').length;
  const approved = trackers.filter((t) => t.status === 'approved').length;

  // Group active trackers by brand
  const byBrand = active.reduce<Record<string, TrackerSummary[]>>((acc, t) => {
    if (!acc[t.brandName]) acc[t.brandName] = [];
    acc[t.brandName]!.push(t);
    return acc;
  }, {});
  const brandNames = Object.keys(byBrand).sort();

  function handleDownload() {
    const lines: string[] = [
      `Resumen de entregables — ${new Date().toLocaleDateString('es-ES')}`,
      `Generado: ${new Date().toLocaleString('es-ES')}`,
      '',
    ];

    for (const brand of brandNames) {
      lines.push(brand.toUpperCase());
      for (const t of byBrand[brand]!) {
        const remaining = Math.max(0, t.targetCount - t.currentCount);
        const type = DELIVERABLE_LABELS[t.deliverableType] ?? 'entregables';
        const name = t.talentName ?? t.dealName;
        if (remaining === 0) {
          lines.push(`  [OK] ${name}: completado (${t.currentCount}/${t.targetCount} ${type})`);
        } else {
          lines.push(`  [!]  ${name}: faltan ${remaining} ${type} (${t.currentCount}/${t.targetCount})`);
        }
      }
      lines.push('');
    }

    if (approved > 0 || paid > 0) {
      lines.push('---');
      if (approved > 0) lines.push(`Aprobados pendientes de cobro: ${approved}`);
      if (paid > 0)     lines.push(`Pagados: ${paid}`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `entregables-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-2xl border border-sp-border p-5 space-y-5">

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm text-sp-muted flex-wrap">
          <span>
            <strong className="text-sp-orange">{active.length}</strong> pendientes
          </span>
          <span className="text-sp-border">·</span>
          <span>
            <strong className="text-emerald-600">{approved}</strong> aprobados
          </span>
          <span className="text-sp-border">·</span>
          <span>
            <strong className="text-emerald-700">{paid}</strong> pagados
          </span>
        </div>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-sp-border hover:bg-sp-off transition-colors text-sp-dark"
        >
          Descargar resumen (.txt)
        </button>
      </div>

      {/* Text report */}
      {active.length === 0 ? (
        <div className="flex items-center gap-2 py-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-sm font-semibold text-emerald-700">No hay tratos activos pendientes.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {brandNames.map((brand) => (
            <div key={brand}>
              <p className="text-[11px] font-black text-sp-muted uppercase tracking-widest mb-2">{brand}</p>
              <div className="space-y-1.5">
                {byBrand[brand]!.map((t) => {
                  const remaining = Math.max(0, t.targetCount - t.currentCount);
                  const type      = DELIVERABLE_LABELS[t.deliverableType] ?? 'entregables';
                  const done      = remaining === 0;
                  const stale     = !done && t.status === 'active' && (
                    !t.lastSyncedAt ||
                    Date.now() - new Date(t.lastSyncedAt).getTime() > SEVEN_DAYS_MS
                  );

                  return (
                    <Link
                      key={t.id}
                      href={`/admin/entregables/${t.id}`}
                      className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-sp-off transition-colors"
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                        done  ? 'bg-emerald-100 text-emerald-600'
                             : stale ? 'bg-amber-100 text-amber-700'
                             : 'bg-sp-off text-sp-muted'
                      }`}>
                        {done ? '✓' : '!'}
                      </div>

                      <span className="font-semibold text-sp-dark text-sm min-w-0 truncate flex-1">
                        {t.talentName ?? t.dealName}
                      </span>

                      {done ? (
                        <span className="text-sm text-emerald-600 shrink-0">completado</span>
                      ) : (
                        <span className="text-sm text-sp-muted shrink-0">
                          faltan{' '}
                          <strong className={stale ? 'text-amber-700' : 'text-sp-dark'}>
                            {remaining}
                          </strong>{' '}
                          {type}
                          <span className="ml-2 text-xs opacity-50">
                            ({t.currentCount}/{t.targetCount})
                          </span>
                          {stale && (
                            <span className="ml-1 text-xs text-amber-600">· sin sync</span>
                          )}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
