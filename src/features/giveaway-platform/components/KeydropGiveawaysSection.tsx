import Image from 'next/image';
import type { KeydropCard, KeydropSections } from '@/lib/keydrop/types';
import { formatCurrency } from '@/lib/keydrop/mappers';

interface Props {
  sections: KeydropSections;
  creatorDisplayName: string;
}

/**
 * Sección de sorteos KeyDrop del creador ZACKETIZOR.
 *
 * Reglas UI:
 *   - Solo lectura. Botón "Ver sorteo" abre en nueva pestaña.
 *   - Sin monedas ni tickets internos — este bloque no interactúa con
 *     coin_transactions ni giveaway_entries.
 *   - Si `status !== 'ok'` o no hay sorteos → no renderiza nada.
 *   - Activos arriba; finalizados en <details> colapsable debajo.
 */
export function KeydropGiveawaysSection({ sections, creatorDisplayName }: Props) {
  if (sections.status !== 'ok') return null;
  if (sections.active.length === 0 && sections.finished.length === 0) return null;

  const promoCode = sections.active[0]?.promoCode ?? sections.finished[0]?.promoCode ?? 'ZACKCSGO';

  return (
    <section aria-labelledby="keydrop-section" className="gp-keydrop-section">
      <div className="gp-legacy-block">
        <div className="gp-keydrop-head">
          <div>
            <h2 id="keydrop-section">Sorteos KeyDrop de {creatorDisplayName}</h2>
            <p className="gp-mission-head">
              Datos en directo desde KeyDrop · usa el código{' '}
              <b className="gp-keydrop-code">{promoCode}</b>
            </p>
          </div>
          <div className="gp-keydrop-badge">
            <Image
              src="/images/brands/keydrop.png"
              alt="KeyDrop"
              width={110}
              height={26}
            />
          </div>
        </div>

        {sections.active.length > 0 ? (
          <div className="gp-sorteos-grid">
            {sections.active.map((g) => (
              <KeydropCardArticle key={g.id} card={g} />
            ))}
          </div>
        ) : (
          <p className="gp-mission-head">No hay sorteos activos ahora mismo.</p>
        )}

        {sections.finished.length > 0 ? (
          <details className="gp-keydrop-finished">
            <summary>
              Ver {sections.finished.length} sorteo{sections.finished.length === 1 ? '' : 's'} finalizado
              {sections.finished.length === 1 ? '' : 's'}
            </summary>
            <div className="gp-sorteos-grid">
              {sections.finished.map((g) => (
                <KeydropCardArticle key={g.id} card={g} finished />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function KeydropCardArticle({ card, finished = false }: { card: KeydropCard; finished?: boolean }) {
  return (
    <article className="gp-sorteo-card gp-keydrop-card">
      <div className="gp-sorteo-glow" aria-hidden />
      <div className="gp-sorteo-fg">
        <div className="gp-keydrop-tag" aria-hidden>
          <span>KeyDrop</span>
          <span className={`gp-keydrop-status gp-keydrop-status-${card.status}`}>
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
          {card.subtitle ? <span className="gp-keydrop-sub"> · {card.subtitle}</span> : null}
        </h3>
        <div className="gp-sorteo-value">
          {formatCurrency(card.totalValue, card.currency)}
          {card.prizeCount > 1 ? (
            <span className="gp-keydrop-multi">  · +{card.prizeCount - 1} premios</span>
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
        {card.deadlineTimestamp ? (
          <div className="gp-keydrop-deadline">
            Finaliza: {formatDeadline(card.deadlineTimestamp)}
          </div>
        ) : null}
        <div className="gp-sorteo-cta">
          <a
            className="gp-social-btn gp-social-btn-primary"
            href={card.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver en KeyDrop
          </a>
        </div>
        {finished && card.winners.length > 0 ? (
          <div className="gp-keydrop-winners">
            <span className="gp-keydrop-winners-label">🏆 Ganadores:</span>
            <span className="gp-keydrop-winners-list">
              {card.winners.slice(0, 3).map((w) => w.username).join(', ')}
              {card.winners.length > 3 ? `, +${card.winners.length - 3}` : ''}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function statusLabel(status: KeydropCard['status'], finished: boolean): string {
  if (finished) return 'Finalizado';
  switch (status) {
    case 'new':     return 'En preparación';
    case 'started': return 'En curso';
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
