import { permanentRedirect } from 'next/navigation';

// PR 2 finanzas rediseño (2026-07-06): la ruta canónica de gastos es
// /admin/finanzas/gastos (tab del nuevo hub de Finanzas), no la
// subvista /gastos-operativos.
export default function AdminGastosLegacyPage(): never {
  permanentRedirect('/admin/finanzas/gastos');
}
