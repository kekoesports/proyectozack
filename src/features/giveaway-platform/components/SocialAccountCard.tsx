'use client';

import Image from 'next/image';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { disconnectSocialAccount } from '@/app/sorteos/plataforma/perfil/actions';

interface Props {
  providerKey: string;
  displayName: string;
  status: 'connected' | 'available' | 'planned' | 'not_configured';
  username?: string | null;
  avatarUrl?: string | null;
  reasonIfPlanned?: string;
  connectHref?: string;
  disableDisconnect?: boolean;
  updatedAt?: string | null;
}

/**
 * Tarjeta de una cuenta social. Estados:
 *   - connected     → muestra username/avatar + botón Desconectar (server action)
 *   - available     → botón Conectar (link a /api/social/[provider]/connect)
 *   - planned       → texto "Próximamente" + botón deshabilitado + razón (tooltip)
 *   - not_configured→ texto "No configurado todavía" + botón deshabilitado
 */
export function SocialAccountCard(props: Props) {
  const {
    providerKey,
    displayName,
    status,
    username,
    avatarUrl,
    reasonIfPlanned,
    connectHref,
    disableDisconnect,
    updatedAt,
  } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onDisconnect() {
    startTransition(async () => {
      const result = await disconnectSocialAccount({ provider: providerKey });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className={`gp-social-card gp-social-${status}`}>
      <div className="gp-social-head">
        <div className="gp-social-avatar" aria-hidden>
          {status === 'connected' && avatarUrl ? (
            <Image src={avatarUrl} alt="" width={40} height={40} unoptimized />
          ) : (
            <span>{providerIcon(providerKey)}</span>
          )}
        </div>
        <div className="gp-social-body">
          <div className="gp-social-name">{displayName}</div>
          {status === 'connected' ? (
            <>
              <div className="gp-social-username">{username ?? '—'}</div>
              {updatedAt ? <div className="gp-social-meta">Actualizado: {formatDate(updatedAt)}</div> : null}
            </>
          ) : status === 'planned' ? (
            <div className="gp-social-meta" title={reasonIfPlanned}>Próximamente</div>
          ) : status === 'not_configured' ? (
            <div className="gp-social-meta">No configurado todavía</div>
          ) : (
            <div className="gp-social-meta">No conectado</div>
          )}
        </div>
      </div>
      <div className="gp-social-cta">
        {status === 'connected' && !disableDisconnect ? (
          <button
            type="button"
            className="gp-social-btn gp-social-btn-danger"
            onClick={onDisconnect}
            disabled={isPending}
          >
            {isPending ? 'Desconectando…' : 'Desconectar'}
          </button>
        ) : null}
        {status === 'available' && connectHref ? (
          <a className="gp-social-btn gp-social-btn-primary" href={connectHref}>
            Conectar
          </a>
        ) : null}
        {status === 'planned' || status === 'not_configured' ? (
          <button type="button" className="gp-social-btn" disabled>
            {status === 'planned' ? 'Próximamente' : 'No disponible'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function providerIcon(key: string): string {
  switch (key) {
    case 'steam': return '🎮';
    case 'discord': return '💬';
    case 'google': return '▶️';
    case 'x': return '𝕏';
    case 'instagram': return '📷';
    default: return '•';
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}
