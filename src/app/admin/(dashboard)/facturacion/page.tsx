import { permanentRedirect } from 'next/navigation';

// PR 2 finanzas rediseño (2026-07-06): la ruta canónica es
// /admin/finanzas/ingresos. Este redirect preserva bookmarks del equipo.
// El contenido vive en `@/features/admin/invoices/pages/IngresosCompoundPage`.
export default function FacturacionLegacyPage(): never {
  permanentRedirect('/admin/finanzas/ingresos');
}
