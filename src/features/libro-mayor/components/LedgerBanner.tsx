/**
 * Banner permanente arriba de /admin/finanzas/contabilidad.
 *
 * Comunica de forma inequívoca que:
 *   - la vista es solo lectura
 *   - los datos son de demostración (fixture sintético)
 *   - no representa la contabilidad oficial
 *   - no modifica el CRM
 *
 * Se retira/cambia cuando se conecte a datos reales en PR 2+.
 */
export function LedgerBanner(): React.ReactElement {
  return (
    <div
      role="note"
      aria-label="Aviso de contabilidad en solo lectura"
      className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-[11px] font-black text-amber-300"
        >
          !
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
            Vista de contabilidad en solo lectura
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-100/90">
            Los datos mostrados en esta primera versión son de demostración y no representan la
            contabilidad oficial de ELEVATEX. No se crean ni modifican facturas, gastos, nóminas
            ni movimientos del CRM.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-amber-100/70">
            Base de conciliación contable: el Libro Mayor se utiliza para <span className="font-semibold">contrastar</span> la
            información del CRM, no para sustituir facturas, gastos ni nóminas existentes.
          </p>
        </div>
      </div>
    </div>
  );
}
