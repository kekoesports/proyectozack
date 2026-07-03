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
        <div className="gp-sorteo-img gp-external-img">
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
          {card.prizeCount > 1 ? (
            <div className="gp-external-prize-strip" aria-hidden>
              {card.prizesPreview.slice(1, 5).map((p) => (
                <div key={String(p.id)} className="gp-external-prize-thumb" title={p.title}>
                  <Image
                    src={p.imageUrl}
                    alt=""
                    width={44}
                    height={32}
                    unoptimized
                  />
                </div>
              ))}
              {card.prizeCount > 5 ? (
                <div className="gp-external-prize-more">+{card.prizeCount - 5}</div>
              ) : null}
            </div>
          ) : null}
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
        <div className="gp-external-participants">
          <div className="gp-external-participants-row">
            <span className="gp-external-participants-icon" aria-hidden>👥</span>
            <b className="gp-external-participants-count">
              {card.participantCount.toLocaleString('es-ES')}
            </b>
            <span className="gp-external-participants-label">participantes</span>
          </div>
          {card.minUsers > 0 && card.participantCount < card.minUsers ? (
            <>
              <div
                className="gp-external-participants-bar"
                role="progressbar"
                aria-valuenow={card.participantCount}
                aria-valuemin={0}
                aria-valuemax={card.minUsers}
                aria-label="Progreso hacia el mínimo para arrancar"
              >
                <span
                  className="gp-external-participants-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.round((card.participantCount / card.minUsers) * 100))}%`,
                  }}
                />
              </div>
              <span className="gp-external-participants-min">
                Arranca en {(card.minUsers - card.participantCount).toLocaleString('es-ES')} más
              </span>
            </>
          ) : card.minUsers > 0 ? (
            <span className="gp-external-participants-ready">✓ Mínimo alcanzado — arranca ya</span>
          ) : null}
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
