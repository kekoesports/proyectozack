interface Props {
  providerDisplayName: string;
  creatorDisplayName: string;
}

/**
 * Placeholder read-only del ranking mensual por provider externo.
 * Los providers (KeyDrop, CSGORoll, etc.) no exponen endpoints públicos de
 * top-participantes de forma estable; hasta que llegue esa integración
 * mostramos un skeleton de 5 puestos + copy claro de "próximamente".
 *
 * Renderiza dentro de la sección de ExternalGiveaways debajo de la
 * collapsible de finalizados. Sin efectos, sin datos reales: solo shell.
 */
export function ProviderRankingPlaceholder({ providerDisplayName, creatorDisplayName }: Props) {
  const rows = Array.from({ length: 5 }, (_, i) => i + 1);
  return (
    <section className="gp-provider-rank">
      <h3 className="gp-provider-rank-title">
        🏆 Top participantes en {providerDisplayName} · {creatorDisplayName}
      </h3>
      <p className="gp-provider-rank-note">
        Próximamente. El ranking mensual por provider externo se activará cuando conectemos su
        endpoint de participantes / ganadores. Este bloque quedará poblado con datos reales sin
        cambiar la UI.
      </p>
      <ol className="gp-provider-rank-list">
        {rows.map((n) => (
          <li key={n} aria-hidden>
            <span className="num">{n}</span>
            <span className="skeleton skeleton-name" />
            <span className="skeleton skeleton-value" />
          </li>
        ))}
      </ol>
    </section>
  );
}
