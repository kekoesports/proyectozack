'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { runCreatorDiscoveryNowAction } from '@/app/admin/(dashboard)/targets/discovery-actions';
import { DirectProfileDiscovery } from './DirectProfileDiscovery';
import { TwitchTargetDiscovery } from './TwitchTargetDiscovery';
import { YouTubeTargetDiscovery } from './YouTubeTargetDiscovery';
import { PLATFORM_LABELS } from './targets-constants';
import type { PlatformValue } from './targets-constants';

const TABS: readonly { value: PlatformValue; label: string; automated: boolean }[] = [
  { value: 'youtube', label: 'YouTube', automated: true },
  { value: 'twitch', label: 'Twitch', automated: true },
  { value: 'instagram', label: 'Instagram', automated: false },
  { value: 'kick', label: 'Kick', automated: true },
];

export function CreatorDiscoveryHub({ tab, platforms, onTabChange }: {
  readonly tab: PlatformValue;
  readonly platforms: readonly PlatformValue[];
  readonly onTabChange: (platform: PlatformValue) => void;
}): React.ReactElement {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runNow = (): void => {
    setMessage(null);
    startTransition(async () => {
      const result = await runCreatorDiscoveryNowAction();
      setMessage(result.status === 'failed'
        ? 'No se pudo consultar ninguna plataforma. Revisa el detalle del último intento.'
        : `${result.inserted} leads nuevos y ${result.updated} perfiles actualizados. ${result.qualified} compatibles de ${result.found} revisados.`);
      router.refresh();
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-sp-admin-border bg-sp-admin-card">
      <div className="flex flex-col gap-4 border-b border-sp-admin-border p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-bold text-sp-admin-text">Buscador multicanal</h2>
          <p className="mt-1 max-w-3xl text-xs text-sp-admin-muted">
            Configura las búsquedas en perfiles; cada plataforma requiere conexión y permiso de uso antes de ejecutarse. Instagram permite revisar perfiles concretos según el acceso disponible.
          </p>
        </div>
        <button
          type="button"
          onClick={runNow}
          disabled={isPending}
          className="shrink-0 rounded-lg bg-sp-admin-accent px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {isPending ? 'Buscando y verificando…' : 'Buscar candidatos ahora'}
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-sp-admin-border px-4 pt-3">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onTabChange(item.value)}
            aria-pressed={tab === item.value}
            className={`rounded-t-lg border-b-2 px-4 py-2.5 text-xs font-semibold ${
              tab === item.value
                ? 'border-sp-admin-accent bg-sp-admin-hover text-sp-admin-text'
                : 'border-transparent text-sp-admin-muted hover:text-sp-admin-text'
            }`}
          >
            {item.label}
            <span className={`ml-2 rounded px-1.5 py-0.5 text-[9px] ${item.automated ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
              {item.automated ? 'BÚSQUEDA' : 'PERFIL'}
            </span>
          </button>
        ))}
      </div>

      <p className="mx-5 mt-3 text-xs text-sp-admin-muted" aria-live="polite">
        Tabla: {platforms.length > 0 ? platforms.map((platform) => PLATFORM_LABELS[platform]).join(' + ') : 'todas las redes'}
      </p>

      {message && (
        <p className="mx-5 mt-4 rounded-lg border border-sp-admin-border bg-sp-admin-bg px-3 py-2 text-xs text-sp-admin-muted">
          {message}
        </p>
      )}

      <div className="p-5">
        {tab === 'youtube' && <YouTubeTargetDiscovery embedded />}
        {tab === 'twitch' && <TwitchTargetDiscovery />}
        {tab === 'instagram' && <DirectProfileDiscovery platform="instagram" />}
        {tab === 'kick' && <DirectProfileDiscovery platform="kick" />}
      </div>
    </section>
  );
}
