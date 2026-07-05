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
 *   - Sin binding externo → no renderiza (creador usa sorteos internos).
 *   - Con binding pero API no disponible (`not_configured` en preview,
 *     `error`/`timeout`/`network`/`http`/`parse` en producción) →
 *     renderiza fallback visible informativo, no null silencioso.
 *   - Activos arriba; finalizados en <details> colapsable debajo.
 */
export function ExternalGiveawaysSection({ sections, creatorDisplayName }: Props) {
  // Sin binding externo → creador usa sorteos internos, section silenciosa.
  if (!sections.providerKey) return null;

  const provider = getProvider(sections.providerKey);
  if (!provider) return null;

  // Con binding pero fetch falló o falta la key: fallback visible.
  // (`no_binding` es imposible aquí — arriba ya retornamos si no hay
  // providerKey — pero lo excluimos del cast para satisfacer al type
  // checker.)
  if (sections.status !== 'ok' && sections.status !== 'no_binding') {
    return (
      <FallbackShell
        providerDisplayName={provider.displayName}
        providerLogo={provider.logoAsset}
        creatorDisplayName={creatorDisplayName}
        status={sections.status}
      />
    );
  }

  const promoCode = sections.active[0]?.promoCode ?? sections.finished[0]?.promoCode ?? '';
  const ctaLabel = `Ver en ${provider.displayName}`;

  // Estado OK pero sin sorteos — poco frecuente. Renderizamos shell con
  // "no hay sorteos ahora mismo" en lugar de null silencioso.
  const isEmpty = sections.active.length === 0 && sections.finished.length === 0;

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

        {isEmpty ? (
          <p className="gp-mission-head">No hay sorteos ahora mismo.</p>
        ) : sections.active.length > 0 ? (
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

/**
 * Shell del fallback informativo — se muestra cuando el creador tiene
 * binding con un provider externo pero la API no responde con datos.
 *
 * Casos cubiertos:
 *   - `not_configured` — la env var con la API key no está en este
 *     entorno (típicamente Preview de Vercel). Copy explica que la
 *     integración está montada y en producción se ven los sorteos.
 *   - `error` / `timeout` / `network` / `http` / `parse` — la API falló
 *     en runtime. Copy genérico "temporalmente no disponibles".
 *
 * Nunca inventa sorteos ni datos — solo comunica estado del provider.
 */
function FallbackShell({
  providerDisplayName,
  providerLogo,
  creatorDisplayName,
  status,
}: {
  providerDisplayName: string;
  providerLogo: string;
  creatorDisplayName: string;
  status: Exclude<ExternalGiveawaySections['status'], 'ok' | 'no_binding'>;
}) {
  const title = `Sorteos ${providerDisplayName} no disponibles en este entorno`;
  const body =
    status === 'not_configured'
      ? `Los sorteos se cargan automáticamente desde la API del partner. En producción están activos, pero este entorno de preview no tiene la API key configurada.`
      : `Los sorteos se cargan automáticamente desde la API del partner. La conexión ha fallado temporalmente — vuelve en unos minutos.`;

  return (
    <section aria-labelledby="external-section" className="gp-external-section">
      <div className="gp-legacy-block">
        <div className="gp-external-head">
          <div>
            <h2 id="external-section">
              Sorteos {providerDisplayName} de {creatorDisplayName}
            </h2>
            <p className="gp-mission-head">Datos en directo desde {providerDisplayName}</p>
          </div>
          <div className="gp-external-badge">
            <Image src={providerLogo} alt={providerDisplayName} width={110} height={26} />
          </div>
        </div>
        <div className="gp-external-fallback" role="status">
          <div className="gp-external-fallback-icon" aria-hidden>⚠️</div>
          <div className="gp-external-fallback-body">
            <p className="gp-external-fallback-title">{title}</p>
            <p className="gp-external-fallback-text">{body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
