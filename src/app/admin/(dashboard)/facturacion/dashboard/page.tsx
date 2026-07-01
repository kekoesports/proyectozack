import { permanentRedirect } from 'next/navigation';

export default function FacturacionDashboardLegacyPage(): never {
  permanentRedirect('/admin/finanzas/resumen');
}
