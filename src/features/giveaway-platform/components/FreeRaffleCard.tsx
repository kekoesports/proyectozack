'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { participateInGiveaway } from '@/app/sorteos/plataforma/actions';
import { ParticipantsModal } from './ParticipantsModal';
import type { FreeRaffleCardData } from '@/types/giveawayPlatform';

interface PreviewParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  enteredAt: string;
}

interface Props {
  raffle: FreeRaffleCardData;
  isLoggedIn: boolean;
  /**
   * Modo preview/QA: no ejecuta la Server Action al pulsar "Participar",
   * y forwarda los participantes al modal como fixtures.
   * Solo se usa en `/sorteos/preview/*`, nunca en producción.
   */
  preview?: {
    participants: readonly PreviewParticipant[];
  };
}

function formatEndsAt(endsAt: Date | null): string {
  if (!endsAt) return 'Sin fecha límite';
  const now = new Date();
  const diffMs = new Date(endsAt).getTime() - now.getTime();
  if (diffMs <= 0) return 'Finalizado';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  if (days > 0) return `Finaliza en ${days}d ${hours}h`;
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  return `Finaliza en ${hours}h ${minutes}m`;
}

export function FreeRaffleCard({ raffle, isLoggedIn, preview }: Props): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);

  const isEnded = raffle.status === 'ended' || raffle.status === 'cancelled'
    || (raffle.endsAt && new Date(raffle.endsAt) <= new Date());

  function handleParticipate() {
    if (!isLoggedIn || isEnded || raffle.userHasEntered) return;
    if (preview) {
      setMsg({ type: 'success', text: '[Preview] Participación simulada. No se ha escrito en DB.' });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const result = await participateInGiveaway({ giveawayId: raffle.id });
      if (result.ok) {
        setMsg({ type: 'success', text: 'Participación registrada. ¡Suerte!' });
        router.refresh();
      } else {
        setMsg({ type: 'error', text: result.error });
      }
    });
  }

  return (
    <>
      <article className={`gp-free-raffle-card${isEnded ? ' is-ended' : ''}`}>
        <div className="gp-free-raffle-card-img">
          {raffle.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={raffle.imageUrl} alt={raffle.rewardName} />
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Sin imagen</span>
          )}
          <span className="gp-free-raffle-badge">GRATIS</span>
        </div>

        <h3 className="gp-free-raffle-title">{raffle.title}</h3>

        <div className="gp-free-raffle-meta">
          <span>{formatEndsAt(raffle.endsAt)}</span>
          <span className="gp-free-raffle-progress">
            👥 <b>{raffle.entryCount.toLocaleString('es-ES')}</b> participante{raffle.entryCount === 1 ? '' : 's'}
          </span>
        </div>

        {raffle.winner && isEnded ? (
          <div className="gp-free-raffle-winner">
            🏆 Ganador: <b>{raffle.winner.displayName}</b>
          </div>
        ) : null}

        {msg ? (
          <p className={`gp-free-raffle-msg is-${msg.type}`} role="status">{msg.text}</p>
        ) : null}

        {isEnded ? (
          <button type="button" disabled className="gp-free-raffle-cta is-ended">
            Finalizado
          </button>
        ) : !isLoggedIn ? (
          <Link href="/sorteos" className="gp-free-raffle-cta" style={{ textAlign: 'center', textDecoration: 'none' }}>
            Iniciar sesión con Steam
          </Link>
        ) : raffle.userHasEntered ? (
          <button type="button" disabled className="gp-free-raffle-cta is-entered">
            Ya participas
          </button>
        ) : (
          <button
            type="button"
            onClick={handleParticipate}
            disabled={isPending}
            className="gp-free-raffle-cta"
          >
            {isPending ? 'Participando…' : 'Participar gratis'}
          </button>
        )}

        {raffle.entryCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowParticipants(true)}
            className="gp-free-raffle-view-participants"
          >
            Ver participantes →
          </button>
        ) : null}

        <p className="gp-free-raffle-notice">Participación gratuita. No consume puntos.</p>
      </article>

      {showParticipants && (
        <ParticipantsModal
          raffleId={raffle.id}
          totalCount={raffle.entryCount}
          onClose={() => setShowParticipants(false)}
          {...(preview?.participants ? { previewParticipants: preview.participants } : {})}
        />
      )}
    </>
  );
}
