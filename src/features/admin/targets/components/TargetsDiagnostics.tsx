'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';

import {
  getTargetsDiagnosticsAction,
} from '@/app/admin/(dashboard)/targets/diagnostics-actions';

import type {
  TargetsDiagnostics as TargetsDiagnosticsState,
} from '@/app/admin/(dashboard)/targets/diagnostics-actions';

type Tone = 'ok' | 'warn' | 'error';

function toneClasses(tone: Tone): string {
  if (tone === 'ok') return 'bg-emerald-900/30 text-emerald-400';
  if (tone === 'warn') return 'bg-amber-900/30 text-amber-400';
  return 'bg-red-900/30 text-red-400';
}

type ItemProps = {
  readonly label: string;
  readonly status: string;
  readonly message: string;
  readonly tone: Tone;
};

function DiagnosticsItem({
  label,
  status,
  message,
  tone,
}: ItemProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-sp-admin-border bg-sp-admin-bg/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sp-admin-muted">
            {label}
          </p>
          <p className="mt-2 text-sm font-semibold text-sp-admin-text">{message}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${toneClasses(tone)}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

/**
 * Panel de diagnóstico de calidad de datos de targets (duplicados, perfiles inválidos, métricas faltantes…).
 * Carga el estado vía getTargetsDiagnosticsAction y permite refrescar.
 *
 * @kind client
 * @feature admin/targets
 * @route /admin/targets
 */
export function TargetsDiagnostics(): React.ReactElement {
  const [diagnostics, setDiagnostics] = useState<TargetsDiagnosticsState | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback((): void => {
    startTransition(async () => {
      const next = await getTargetsDiagnosticsAction();
      setDiagnostics(next);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [refresh]);

  const youtubeTone: Tone = diagnostics?.youtubeConfigured ? 'ok' : 'error';
  const twitchTone: Tone = diagnostics?.twitchConfigured ? 'ok' : 'error';

  return (
    <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-sp-admin-border px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-sp-admin-text">Diagnostico de servicios</p>
          <p className="text-xs text-sp-admin-muted">
            Estado en tiempo real de YouTube y Twitch
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isPending}
          className="text-[11px] text-sp-admin-muted hover:text-sp-admin-text transition-colors disabled:opacity-40"
        >
          {isPending ? 'Comprobando...' : 'Actualizar'}
        </button>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2">
        <DiagnosticsItem
          label="YouTube API"
          status={diagnostics?.youtubeConfigured ? 'OK' : 'FALTA CLAVE'}
          message={diagnostics?.youtubeMessage ?? 'Comprobando configuracion...'}
          tone={youtubeTone}
        />
        <DiagnosticsItem
          label="Twitch API"
          status={diagnostics?.twitchConfigured ? 'OK' : 'FALTA CLAVE'}
          message={diagnostics?.twitchMessage ?? 'Comprobando configuracion...'}
          tone={twitchTone}
        />
      </div>
    </div>
  );
}
