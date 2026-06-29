'use client';

import { useTransition } from 'react';
import {
  reviewTrackerItemAction,
  deleteTrackerItemAction,
} from '@/app/admin/(dashboard)/entregables/tracker-actions';
import type { dealDeliverableItems } from '@/db/schema/dealDeliverableTrackers';

type Item = typeof dealDeliverableItems.$inferSelect;

type Props = {
  trackerId: number;
  items: Item[];
};

const PLATFORM_LABELS: Record<string, string> = {
  twitch:    'Twitch',
  kick:      'Kick',
  youtube:   'YouTube',
  instagram: 'Instagram',
  tiktok:    'TikTok',
  other:     'Otro',
};

const SUBTYPE_LABELS: Record<string, string> = {
  dedicated_video: 'Video',
  preroll:         'Preroll',
  stream:          'Stream',
};

const STATUS_CLASSES: Record<string, string> = {
  detected:  'text-gray-400',
  valid:     'text-emerald-600 font-semibold',
  duplicate: 'text-amber-500',
  invalid:   'text-red-500',
  approved:  'text-purple-600 font-semibold',
  rejected:  'text-red-400 line-through',
};

export function TrackerItemsTable({ trackerId, items }: Props) {
  const [isPending, startTransition] = useTransition();

  function deleteItem(itemId: number) {
    const fd = new FormData();
    fd.append('itemId', String(itemId));
    fd.append('trackerId', String(trackerId));
    startTransition(async () => {
      await deleteTrackerItemAction(fd);
    });
  }

  function review(itemId: number, status: 'valid' | 'invalid' | 'approved' | 'rejected') {
    const fd = new FormData();
    fd.append('itemId', String(itemId));
    fd.append('status', status);
    fd.append('trackerId', String(trackerId));
    startTransition(async () => {
      await reviewTrackerItemAction(fd);
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-sp-muted text-center py-8">No hay links importados todavía.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-sp-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-sp-off text-xs text-sp-muted uppercase tracking-wide">
            <th className="px-4 py-2 text-left font-semibold">#</th>
            <th className="px-4 py-2 text-left font-semibold">Plataforma</th>
            <th className="px-4 py-2 text-left font-semibold">Tipo</th>
            <th className="px-4 py-2 text-left font-semibold">URL</th>
            <th className="px-4 py-2 text-left font-semibold">Fecha</th>
            <th className="px-4 py-2 text-left font-semibold">Estado</th>
            <th className="px-4 py-2 text-left font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sp-border">
          {items.map((item, idx) => (
            <tr key={item.id} className="hover:bg-sp-off/50 transition-colors">
              <td className="px-4 py-2 text-sp-muted">{idx + 1}</td>
              <td className="px-4 py-2">
                <span className="text-xs font-medium text-sp-dark">
                  {PLATFORM_LABELS[item.platform] ?? item.platform}
                </span>
              </td>
              <td className="px-4 py-2">
                <span className="text-xs text-sp-muted">
                  {item.deliverableSubtype ? (SUBTYPE_LABELS[item.deliverableSubtype] ?? item.deliverableSubtype) : '—'}
                </span>
              </td>
              <td className="px-4 py-2 max-w-xs">
                <a
                  href={item.normalizedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sp-blue hover:underline truncate block max-w-[280px]"
                  title={item.originalUrl}
                >
                  {item.normalizedUrl}
                </a>
              </td>
              <td className="px-4 py-2 text-sp-muted">{item.contentDate ?? '—'}</td>
              <td className="px-4 py-2">
                <span className={`text-xs ${STATUS_CLASSES[item.status] ?? ''}`}>
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  {(item.status === 'valid' || item.status === 'detected') && (
                    <>
                      <button
                        onClick={() => review(item.id, 'approved')}
                        disabled={isPending}
                        className="text-xs px-2 py-0.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => review(item.id, 'invalid')}
                        disabled={isPending}
                        className="text-xs px-2 py-0.5 rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40"
                      >
                        Invalidar
                      </button>
                    </>
                  )}
                  {item.status === 'duplicate' && (
                    <button
                      onClick={() => review(item.id, 'valid')}
                      disabled={isPending}
                      className="text-xs px-2 py-0.5 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                    >
                      Marcar válido
                    </button>
                  )}
                  {(item.status === 'invalid' || item.status === 'rejected') && (
                    <button
                      onClick={() => review(item.id, 'valid')}
                      disabled={isPending}
                      className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Reactivar
                    </button>
                  )}
                  <button
                    onClick={() => deleteItem(item.id)}
                    disabled={isPending}
                    title="Eliminar este link"
                    className="text-xs px-1.5 py-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
