'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeTaskAction } from '@/app/admin/(dashboard)/tareas/actions';
import type { AlertResolveHint } from '@/lib/queries/alerts';

type Props = {
  readonly hint:     AlertResolveHint;
  readonly compact?: boolean;
};

/**
 * Botón "Resolver" para alertas de tareas.
 * Llama completeTaskAction y refresca la página al completarse.
 *
 * @kind client
 * @feature admin/dashboard
 */
export function AlertResolveButton({ hint, compact = false }: Props): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleResolve(): void {
    if (hint.type !== 'complete_task') return;
    startTransition(async () => {
      const result = await completeTaskAction(hint.taskId);
      if (!result?.error) {
        router.refresh();
      }
    });
  }

  if (hint.type !== 'complete_task') return <></>;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleResolve}
        disabled={isPending}
        className="shrink-0 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline disabled:opacity-50 whitespace-nowrap"
        aria-label="Marcar tarea como completada"
      >
        {isPending ? '...' : '✓ Hecha'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleResolve}
      disabled={isPending}
      className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full border border-emerald-200 bg-emerald-50 text-[9px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors shrink-0"
      aria-label="Marcar tarea como completada"
    >
      {isPending ? (
        <span className="inline-block w-2.5 h-2.5 border border-emerald-500 border-t-transparent rounded-full animate-spin" aria-hidden />
      ) : (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
          <path d="M1.5 4l1.5 1.5 3-3"/>
        </svg>
      )}
      {isPending ? 'Resolviendo…' : 'Resolver'}
    </button>
  );
}
