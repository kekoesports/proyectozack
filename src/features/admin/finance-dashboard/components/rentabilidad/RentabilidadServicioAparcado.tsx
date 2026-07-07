/**
 * Bloque INFORMATIVO — no funcional a propósito.
 *
 * En el brief de PR 6A el usuario aprobó (Decisión 2 = C) aparcar el ranking
 * de rentabilidad por servicio: no existe un campo estructurado de servicio
 * en el schema y usar `category` / `concept` libres como proxy sería engañoso.
 */
export function RentabilidadServicioAparcado(): React.ReactElement {
  return (
    <section
      aria-labelledby="rentabilidad-servicio-title"
      className="rounded-2xl border border-dashed border-sp-border bg-sp-admin-card/50 p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg" aria-hidden>🧩</span>
        <h2 id="rentabilidad-servicio-title" className="text-sm font-bold text-sp-admin-fg">
          Rentabilidad por servicio
        </h2>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
          Aparcado
        </span>
      </div>
      <p className="text-[12px] text-sp-admin-muted leading-relaxed">
        Para calcular rentabilidad por servicio hace falta clasificar campañas o
        facturas por tipo de servicio de forma estructurada. Ahora mismo no
        existe un campo fiable, así que no se muestra para evitar datos
        engañosos.
      </p>
    </section>
  );
}
