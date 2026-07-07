import { permanentRedirect } from 'next/navigation';

/**
 * `/admin/finanzas/ingresos/gestor` → `/admin/facturacion` (URL canónica).
 *
 * Tras restaurar Facturación como módulo operativo propio (2026-07-07), esta
 * ruta se mantiene como alias con 308 permanente para preservar bookmarks del
 * equipo y accesos rápidos internos que apuntaban aquí desde PR #212.
 */
export default function FinanzasIngresosGestorAlias(): never {
  permanentRedirect('/admin/facturacion');
}
