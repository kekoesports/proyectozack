'use client';

import { useState, useTransition } from 'react';
import { dismissTrackerAlertAction } from '@/app/admin/(dashboard)/actions';

type AlertItem = {
  readonly id: number;
  readonly title: string;
  readonly description: string | null;
  readonly relatedEntityId: number | null;
};

type Props = { readonly alerts: AlertItem[] };

export function CompletedDealsModal({ alerts: initialAlerts }: Props) {
  const [queue, setQueue] = useState(initialAlerts);
  const [isPending, startTransition] = useTransition();

  const current = queue[0];
  if (!current) return null;

  function dismiss() {
    if (!current) return;
    const id = current.id;
    startTransition(async () => {
      await dismissTrackerAlertAction(id);
      setQueue((prev) => prev.filter((a) => a.id !== id));
    });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-neutral-900 border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-sp-grad flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white mb-1">Deal completado</h2>
            <p className="text-white/80 font-semibold text-sm leading-snug">{current.title}</p>
            {current.description && (
              <p className="text-white/50 text-xs mt-1 leading-relaxed">{current.description}</p>
            )}
            {queue.length > 1 && (
              <p className="text-white/40 text-xs mt-3">
                {queue.length - 1} más pendiente{queue.length - 1 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          {current.relatedEntityId !== null && (
            <a
              href={`/admin/entregables/${current.relatedEntityId}`}
              className="px-4 py-2 text-sm rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
            >
              Ver tracker
            </a>
          )}
          <button
            onClick={dismiss}
            disabled={isPending}
            className="px-6 py-2 text-sm font-semibold rounded-lg bg-sp-grad text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isPending ? 'Cerrando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
