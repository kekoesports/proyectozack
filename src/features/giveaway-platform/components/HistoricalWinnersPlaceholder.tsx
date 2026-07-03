/**
 * Placeholder pequeño del histórico de ganadores SocialPro.
 * Se mostrará debajo del ranking mensual global. No inventa datos: comunica
 * el estado real hasta que cerremos el primer ciclo mensual.
 */
export function HistoricalWinnersPlaceholder() {
  return (
    <aside className="gp-hist-winners-mini" aria-live="off">
      <span className="gp-hist-winners-mini-icon" aria-hidden>🥇</span>
      <span className="gp-hist-winners-mini-body">
        <b>Histórico de ganadores próximamente.</b>
        <span>Se activará cuando cerremos el primer ranking mensual.</span>
      </span>
    </aside>
  );
}
