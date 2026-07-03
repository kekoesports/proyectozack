import Image from 'next/image';
import { ExternalGiveawayCard } from './ExternalGiveawayCard';
import { ProviderRankingPlaceholder } from './ProviderRankingPlaceholder';
import { getProvider } from '@/lib/external-giveaways/providers';
import type { ExternalGiveawaySections } from '@/lib/external-giveaways/types';

interface Props {
  sections: ExternalGiveawaySections;
  creatorDisplayName: string;
}

/**
 * Sección genérica de sorteos externos para un creador.
 * Consume `ExternalGiveawaySections` (activos + finalizados + providerKey +
 * status). Resuelve la metadata visual del provider desde el registry
 * central `PROVIDERS`.
 *
 * Reglas UI:
 *   - Solo lectura. Botón CTA abre en nueva pestaña.
 *   - Sin monedas ni tickets internos — este bloque no interactúa con
 *     coin_transactions ni giveaway_entries.
 *   - Si `status !== 'ok'` o no hay sorteos → no renderiza nada (degradación
 *     silenciosa).
 *   - Activos arriba; finalizados en <details> colapsable debajo.
 */
export function ExternalGiveawaysSection({ sections, creatorDisplayName }: Props) {
  if (sections.status !== 'ok') return null;
  if (sections.active.length === 0 && sections.finished.length === 0) return null;
  if (!sections.providerKey) return null;

  const provider = getProvider(sections.providerKey);
  if (!provider) return null;

  const promoCode = sections.active[0]?.promoCode ?? sections.finished[0]?.promoCode ?? '';
  const ctaLabel = `Ver en ${provider.displayName}`;

  return (
    <section aria-labelledby="external-section" className="gp-external-section">
      <div className="gp-legacy-block">
        <div className="gp-external-head">
          <div>
            <h2 id="external-section">
              Sorteos {provider.displayName} de {creatorDisplayName}
            </h2>
            <p className="gp-mission-head">
              Datos en directo desde {provider.displayName}
              {promoCode ? (
                <>
                  {' · usa el código '}
                  <b className="gp-external-code">{promoCode}</b>
                </>
              ) : null}
            </p>
          </div>
          <div className="gp-external-badge">
            <Image
              src={provider.logoAsset}
              alt={provider.displayName}
              width={110}
              height={26}
            />
          </div>
        </div>

        {sections.active.length > 0 ? (
          <div className="gp-sorteos-grid">
            {sections.active.map((g) => (
              <ExternalGiveawayCard
                key={g.id}
                card={g}
                providerDisplayName={provider.displayName}
                ctaLabel={ctaLabel}
              />
            ))}
          </div>
        ) : (
          <p className="gp-mission-head">No hay sorteos activos ahora mismo.</p>
        )}

        {sections.finished.length > 0 ? (
          <details className="gp-external-finished">
            <summary>
              Ver {sections.finished.length} sorteo{sections.finished.length === 1 ? '' : 's'} finalizado
              {sections.finished.length === 1 ? '' : 's'}
            </summary>
            <div className="gp-sorteos-grid">
              {sections.finished.map((g) => (
                <ExternalGiveawayCard
                  key={g.id}
                  card={g}
                  finished
                  providerDisplayName={provider.displayName}
                  ctaLabel={ctaLabel}
                />
              ))}
            </div>
          </details>
        ) : null}

        <ProviderRankingPlaceholder
          providerDisplayName={provider.displayName}
          creatorDisplayName={creatorDisplayName}
        />
      </div>
    </section>
  );
}
