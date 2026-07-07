import type { RentabilidadData } from '@/lib/queries/financeDashboard/rentabilidad';

/**
 * Bullets de lectura rápida — solo si los datos existen. No inventa nada.
 */
export function RentabilidadLecturaRapida({ data }: { readonly data: RentabilidadData }): React.ReactElement {
  const { rows, kpis } = data;
  const bullets: string[] = [];

  if (rows.length === 0) {
    bullets.push('Sin campañas en el período seleccionado.');
  } else {
    if (kpis.campanasMargenBajo + kpis.campanasNegativas > 0) {
      const bajos = kpis.campanasMargenBajo;
      const negs  = kpis.campanasNegativas;
      const parts: string[] = [];
      if (bajos > 0) parts.push(`${bajos} con margen bajo`);
      if (negs  > 0) parts.push(`${negs} negativa${negs === 1 ? '' : 's'}`);
      bullets.push(`Hay ${parts.join(' y ')} de ${rows.length} campañas.`);
    }

    if (kpis.mayorDesviacionNegativa) {
      const w = kpis.mayorDesviacionNegativa;
      bullets.push(`La mayor desviación negativa es "${w.name}" (${w.deviation.toFixed(1)}%).`);
    }

    // Campaña más rentable por margen real % (con ingresos > 0)
    const bestReal = [...rows]
      .filter((r) => r.margenRealPct !== null && r.estado === 'rentable')
      .sort((a, b) => (b.margenRealPct ?? 0) - (a.margenRealPct ?? 0))[0];
    if (bestReal && bestReal.margenRealPct !== null) {
      bullets.push(`La campaña más rentable por margen real es "${bestReal.name}" (${bestReal.margenRealPct.toFixed(1)}%).`);
    }

    if (kpis.margenPactadoMedio !== null && kpis.margenRealMedio !== null) {
      bullets.push(
        `El margen pactado medio es ${kpis.margenPactadoMedio.toFixed(1)}%, frente a un margen real medio del ${kpis.margenRealMedio.toFixed(1)}%.`,
      );
    }
  }

  return (
    <section aria-labelledby="lectura-rapida-title" className="rounded-2xl border border-sp-border bg-sp-admin-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg" aria-hidden>📊</span>
        <h2 id="lectura-rapida-title" className="text-sm font-bold text-sp-admin-fg">
          Lectura rápida de rentabilidad
        </h2>
      </div>
      {bullets.length === 0 ? (
        <p className="text-[12px] text-sp-admin-muted italic">
          Aún no hay señales relevantes para este período.
        </p>
      ) : (
        <ul className="space-y-1 text-[13px] text-sp-admin-fg">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-sp-admin-muted shrink-0" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
