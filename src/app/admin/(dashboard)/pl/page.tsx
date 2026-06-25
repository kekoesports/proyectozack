import { redirect } from 'next/navigation';

// Redirige permanentemente a la nueva sección financiera unificada
export default function PnLPage(): never {
  redirect('/admin/finanzas/pl');
}
