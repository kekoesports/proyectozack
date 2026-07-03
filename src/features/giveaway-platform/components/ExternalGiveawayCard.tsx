import Image from 'next/image';
import type { ExternalGiveawayCard as CardData } from '@/lib/external-giveaways/types';
import { formatCurrency } from '@/lib/external-giveaways/providers/keydrop/mapper';

interface Props {
  card: CardData;
  finished?: boolean;
  providerDisplayName: string;
  ctaLabel: string;
}

/**
 * Card puramente presentacional. No sabe qué provider vino — solo
 * consume la shape común `ExternalGiveawayCard`. Toda la metadata visual
 * específica del provider (nombre, badge, CTA) llega como props.
 *
 * Reutiliza las clases `.gp-sorteo-card` + `.gp-external-*` definidas
 * en `platform-external-giveaways.css`.
 */
export function ExternalGiveawayCard({ card, finished = false, providerDisplayName, ctaLabel }: Props) {
  return (
    <article className="gp-sorteo-card gp-external-card">
      <div className="gp-sorteo-glow" aria-hidden />
      <div className="gp-sorteo-fg">
        <div className="gp-external-tag" aria-hidden>
          <span>{providerDisplayName}</span>
          <span className={`gp-external-status gp-external-status-${card.status}`}>
            {statusLabel(card.status, finished)}
          </span>
        </div>
        <div className="gp-sorteo-img">
          {card.imageUrl ? (
            <Image
              src={card.imageUrl}
              alt={card.imageAlt}
              width={220}
              height={128}
              unoptimized
            />
          ) : (
            <div className="gp-sorteo-img-empty">📷 Sin imagen</div>
          )}
        </div>
        <h3 className="gp-sorteo-title">
          ★ {card.title}
          {card.subtitle ? <span className="gp-external-sub"> · {card.subtitle}</span> : null}
        </h3>
        <div className="gp-sorteo-value">
          {formatCurrency(card.totalValue, card.currency)}
          {card.prizeCount > 1 ? (
            <span className="gp-external-multi">  · +{card.extraPrizeCount} premios</span>
          ) : null}
        </div>
        <div className="gp-sorteo-meta">
          👥 <b>{card.participantCount.toLocaleString('es-ES')}</b> participantes
          {card.minUsers > 0 ? <> · <span>arranca en {card.minUsers}</span></> : null}
        </div>
        <div className="gp-sorteo-reward">
          Depósito mín. <b>{formatCurrency(card.depositRequired, card.depositCurrency)}</b>
          {' · código '}
          <b>{card.promoCode}</b>
        </div>
        {card.endsAt ? (
          <div className="gp-external-deadline">
            Finaliza: {formatDeadline(card.endsAt)}
          </div>
        ) : null}
        <div className="gp-sorteo-cta">
          <a
            className="gp-social-btn gp-social-btn-primary"
            href={card.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {ctaLabel}
          </a>
        </div>
        {finished && card.winners.length > 0 ? (
          <div className="gp-external-winners">
            <span className="gp-external-winners-label">🏆 Ganadores:</span>
            <span className="gp-external-winners-list">
              {card.winners.slice(0, 3).map((w) => w.username).join(', ')}
              {card.winners.length > 3 ? `, +${card.winners.length - 3}` : ''}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function statusLabel(status: CardData['status'], finished: boolean): string {
  if (finished) return 'Finalizado';
  switch (status) {
    case 'active':  return 'En curso';
    case 'ended':   return 'Finalizado';
    case 'unknown': return 'Sorteo';
    default:        return 'Sorteo';
  }
}

function formatDeadline(d: Date): string {
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
