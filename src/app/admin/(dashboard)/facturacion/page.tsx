import { IngresosCompoundPage } from '@/features/admin/invoices/pages/IngresosCompoundPage';

/**
 * Facturación — módulo operativo (URL canónica).
 *
 * Restaurado en 2026-07-07 como módulo propio tras PR #212, que había reducido
 * esta ruta a un redirect y ocultado el flujo de "crear factura". Separa
 * operativo (aquí) de análisis (Finanzas → Ingresos en /admin/finanzas/ingresos).
 *
 * Los sub-paths ya vigentes (import, bancos, bancos/importar, bancos/conciliacion,
 * exports) siguen funcionando sin cambios.
 *
 * El guard de permiso `facturacion:read` se aplica dentro de `IngresosCompoundPage`.
 */
export const metadata = { title: 'Facturación · SocialPro' };

export default async function FacturacionPage(): Promise<React.ReactElement> {
  return (
    <IngresosCompoundPage
      headerTitle="Facturación"
      headerSubtitle="Facturas emitidas, clientes, empresas emisoras e importación"
    />
  );
}
