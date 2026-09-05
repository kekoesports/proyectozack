'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { CreatorSearchProfile } from '@/lib/queries/creatorSearchProfiles';
import { DEFAULT_CREATOR_SEARCH_PROFILE, type CreatorSearchConfig } from '@/lib/schemas/creator-search-profile';
import { CreatorSearchProfileEditor } from './CreatorSearchProfileEditor';
import { PLATFORM_LABELS } from './targets-constants';

type ActionResult = Readonly<{ ok: boolean; error: string | null }>;
export type CreatorSearchProfileView = Pick<CreatorSearchProfile, 'id' | 'name' | 'config' | 'enabled' | 'version' | 'nextRunAt' | 'lastRunAt'>;
const BUTTON = 'rounded-lg border border-sp-admin-border px-3 py-2 text-xs font-semibold text-sp-admin-text disabled:opacity-40';

export function CreatorSearchProfiles({ profiles, canWrite, saveAction, runAction }: {
  readonly profiles: readonly CreatorSearchProfileView[];
  readonly canWrite: boolean;
  readonly saveAction: (input: unknown, identity?: { id: number; version: number }) => Promise<ActionResult>;
  readonly runAction: (id: number) => Promise<ActionResult>;
}): React.ReactElement {
  const router = useRouter();
  // Ephemeral editor selection; saved configuration remains server-owned, not duplicated global state.
  const [editing, setEditing] = useState<CreatorSearchProfileView | 'new' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const perform = (operation: () => Promise<ActionResult>, success: string): void => {
    if (!canWrite || pending) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await operation();
        setMessage(result.error ?? (result.ok ? success : 'No se pudo completar la operación.'));
        if (result.ok) { setEditing(null); router.refresh(); }
      } catch {
        setMessage('Resultado no confirmado. Recarga para comprobar el estado antes de repetir.');
      }
    });
  };

  const save = (config: CreatorSearchConfig): void => {
    const identity = editing && editing !== 'new' ? { id: editing.id, version: editing.version } : undefined;
    perform(() => saveAction(config, identity), 'Perfil guardado. No se ha ejecutado ninguna búsqueda.');
  };

  return (
    <details className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
      <summary className="cursor-pointer text-sm font-bold text-sp-admin-text">Perfiles de búsqueda ({profiles.length})</summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs text-sp-admin-muted">Configuración diaria reutilizable. Activar requiere al menos una plataforma con conexión y permiso de uso verificados; las demás no quedan habilitadas por activar el perfil. Una hora configurada no demuestra ejecución. No se envían mensajes a creadores.</p>
        {canWrite && <button type="button" disabled={pending} onClick={() => { setEditing('new'); setMessage(null); }} className={BUTTON}>Crear perfil de búsqueda</button>}
        {!canWrite && <p className="text-xs text-sp-admin-muted">Solo lectura: no tienes permiso para modificar búsquedas.</p>}
        {message && <p role="status" className="text-xs text-sp-admin-muted">{message}</p>}
        {profiles.length === 0 && <p className="text-xs text-sp-admin-muted">Todavía no hay perfiles guardados.</p>}
        {profiles.map((profile) => (
          <article key={profile.id} className="rounded-lg border border-sp-admin-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-sp-admin-text">{profile.name}</h3>
                <p className="mt-1 text-xs text-sp-admin-muted">{profile.enabled ? 'Activo' : 'Pausado'} · Redes solicitadas: {profile.config.platforms.map((platform) => PLATFORM_LABELS[platform]).join(' + ')} · {profile.config.scheduleTime} ({profile.config.timezone})</p>
                <p className="mt-1 text-xs text-sp-admin-muted">{profile.config.markets.join(', ')} · {profile.config.languages.length > 0 ? profile.config.languages.join(', ') : 'Cualquier idioma'} · {profile.config.windowDays} días · mediana objetivo {profile.config.targetMedianViews.toLocaleString('es-ES')}</p>
                <p className="mt-1 text-xs text-sp-admin-muted">Próxima fecha registrada: {formatProfileDate(profile.nextRunAt)} · Última ejecución registrada: {formatProfileDate(profile.lastRunAt)}</p>
              </div>
              {canWrite && <div className="flex flex-wrap gap-2">
                <button type="button" disabled={pending} className={BUTTON} onClick={() => { setEditing(profile); setMessage(null); }}>Editar {profile.name}</button>
                <button type="button" disabled={pending} className={BUTTON}
                  onClick={() => perform(() => saveAction({ ...profile.config, enabled: !profile.enabled }, { id: profile.id, version: profile.version }), profile.enabled ? 'Perfil pausado.' : 'Perfil activado tras las comprobaciones del servidor.')}>
                  {profile.enabled ? 'Pausar' : 'Activar'} {profile.name}
                </button>
                <button type="button" disabled={pending || !profile.enabled} className={BUTTON}
                  onClick={() => perform(() => runAction(profile.id), 'Solicitud completada. Revisa el registro para ver cobertura e incidencias.')}>
                  Ejecutar {profile.name}
                </button>
              </div>}
            </div>
          </article>
        ))}
        {editing && canWrite && <CreatorSearchProfileEditor
          key={editing === 'new' ? 'new' : `${editing.id}:${editing.version}`}
          initial={editing === 'new' ? { ...DEFAULT_CREATOR_SEARCH_PROFILE, name: '', enabled: false } : { ...editing.config, enabled: editing.enabled }}
          pending={pending} onSave={save} onCancel={() => setEditing(null)}
        />}
      </div>
    </details>
  );
}

function formatProfileDate(value: Date | null): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Sin dato';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(value));
}
