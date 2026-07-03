interface Props {
  providerDisplayName: string;
  creatorDisplayName: string;
}

/**
 * Placeholder pequeño y honesto del ranking por provider externo.
 *
 * Motivación (post-QA PR #170): la variante previa con 5 filas placeholder
 * parecía "bloque vacío". Reducimos a un banner de 1 línea que comunica el
 * estado real: el endpoint `/api/giveaway/:idGiveaway` de KeyDrop existe
 * pero solo devuelve `participantCount` (ya lo tenemos en cada card) —
 * sin lista de participantes verificable. Documentado en
 * docs/keydrop-single-giveaway-endpoint.md.
 */
export function ProviderRankingPlaceholder({ providerDisplayName, creatorDisplayName }: Props) {
  return (
    <aside className="gp-provider-rank-mini" aria-live="off">
      <span className="gp-provider-rank-mini-icon" aria-hidden>🏆</span>
      <span className="gp-provider-rank-mini-body">
        <b>Ranking {providerDisplayName} próximamente.</b>
        <span>
          Se activará cuando podamos leer participantes verificables de los
          sorteos de {creatorDisplayName}.
        </span>
      </span>
    </aside>
  );
}
